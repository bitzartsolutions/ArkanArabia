const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const cors = require('cors');
const sharp = require('sharp');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = String(process.env.FRONTEND_ORIGIN || '').trim();
const ALLOWED_ORIGINS = FRONTEND_ORIGIN
  ? FRONTEND_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];
const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'arkan2026';
const ADMIN_REQUIRE_USERNAME = String(process.env.ADMIN_REQUIRE_USERNAME || 'false').toLowerCase() === 'true';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
// Falls back to ADMIN_PASSWORD if JWT_SECRET isn't set so this works without
// extra config, but set a dedicated JWT_SECRET env var for real deployments.
const JWT_SECRET = String(process.env.JWT_SECRET || ADMIN_PASSWORD || 'arkan-arabia-dev-secret').trim();
const INQUIRY_TO_EMAIL = String(process.env.INQUIRY_TO_EMAIL || 'info@arkanarabialogistics.com').trim() || 'info@arkanarabialogistics.com';
const SMTP_HOST = String(process.env.SMTP_HOST || '').trim();
const SMTP_PORT = Number.parseInt(String(process.env.SMTP_PORT || '587').trim(), 10) || 587;
const SMTP_SECURE = String(process.env.SMTP_SECURE || '').trim().toLowerCase() === 'true';
const SMTP_USER = String(process.env.SMTP_USER || '').trim();
const SMTP_PASS = String(process.env.SMTP_PASS || '').trim();
const SMTP_FROM_EMAIL = String(process.env.SMTP_FROM_EMAIL || SMTP_USER || '').trim();
const BREVO_API_KEY = String(process.env.BREVO_API_KEY || '').trim();
const USE_CLOUDINARY = String(process.env.USE_CLOUDINARY || 'false').toLowerCase() === 'true';
const CLOUDINARY_CLOUD_NAME = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
const CLOUDINARY_API_KEY = String(process.env.CLOUDINARY_API_KEY || '').trim();
const CLOUDINARY_API_SECRET = String(process.env.CLOUDINARY_API_SECRET || '').trim();

const BACKEND_DIR = __dirname;
const IS_VERCEL = Boolean(process.env.VERCEL);
// The deployed bundle is read-only on Vercel (writes there hang rather than
// erroring), so local disk can only be used for scratch space, never as the
// source of truth. Gallery/blog records live in Postgres (see db.js) so they
// persist reliably across cold starts and across Vercel's many instances.
const UPLOADS_DIR = IS_VERCEL ? '/tmp/uploads' : path.join(BACKEND_DIR, 'uploads');

const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;
let inquiryTransporter = null;

// Configure Cloudinary if enabled
if (USE_CLOUDINARY && CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
  });
  console.log('✓ Cloudinary configured successfully');
} else if (USE_CLOUDINARY) {
  console.warn('⚠ USE_CLOUDINARY is true but credentials are missing. Falling back to local storage.');
}

function imageFileFilter(_req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only image files are allowed'));
    return;
  }
  cb(null, true);
}

// Cloudinary storage for gallery
const galleryCloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'arkan-arabia/gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      { width: 1080, height: 1080, crop: 'fill', gravity: 'auto' },
      { quality: 'auto:good', fetch_format: 'auto' }
    ]
  }
});

// Cloudinary storage for blog
const blogCloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'arkan-arabia/blog',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      { width: 1080, height: 1080, crop: 'fill', gravity: 'auto' },
      { quality: 'auto:good', fetch_format: 'auto' }
    ]
  }
});

// Local disk storage for gallery (fallback)
const galleryDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'gallery');
    fs.mkdir(dir, { recursive: true }).then(() => cb(null, dir)).catch((err) => cb(err));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `gallery-${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

// Local disk storage for blog (fallback)
const blogDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'blog');
    fs.mkdir(dir, { recursive: true }).then(() => cb(null, dir)).catch((err) => cb(err));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `blog-${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

// Choose storage based on configuration
const galleryStorage = USE_CLOUDINARY && CLOUDINARY_CLOUD_NAME ? galleryCloudinaryStorage : galleryDiskStorage;
const blogStorage = USE_CLOUDINARY && CLOUDINARY_CLOUD_NAME ? blogCloudinaryStorage : blogDiskStorage;

const uploadGallery = multer({
  storage: galleryStorage,
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter: imageFileFilter
});

const uploadBlog = multer({
  storage: blogStorage,
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter: imageFileFilter
});

app.use(express.json({ limit: '5mb' }));

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (!ALLOWED_ORIGINS.length) {
    return true;
  }

  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // Allow Vercel preview and production subdomains when deploying static frontend on Vercel.
  try {
    const hostname = new URL(origin).hostname;
    if (hostname.endsWith('.vercel.app')) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

app.use(cors({
  origin: (origin, cb) => {
    if (isAllowedOrigin(origin)) {
      cb(null, true);
      return;
    }

    cb(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-token']
}));
app.use('/uploads', express.static(UPLOADS_DIR));

function toPublicUploadPath(req, filePath) {
  const relative = path.relative(UPLOADS_DIR, filePath).replaceAll(path.sep, '/');
  return `${req.protocol}://${req.get('host')}/uploads/${relative}`;
}

function normalizeLegacyUploadUrl(req, value) {
  const raw = String(value || '').trim();
  if (!raw) return raw;

  return raw.replace(
    /^https?:\/\/(localhost|127\.0\.0\.1):4000\/uploads\//i,
    `${req.protocol}://${req.get('host')}/uploads/`
  );
}

async function ensurePath() {
  await fs.mkdir(path.join(UPLOADS_DIR, 'gallery'), { recursive: true });
  await fs.mkdir(path.join(UPLOADS_DIR, 'blog'), { recursive: true });
}

async function optimizeUploadedImage(filePath, type) {
  const parsed = path.parse(filePath);
  const outputPath = path.join(parsed.dir, `${parsed.name}.jpg`);

  const transformer = sharp(filePath).rotate();
  // Standardize uploads to Instagram-style square posts.
  transformer.resize({ width: 1080, height: 1080, fit: 'cover', position: 'center' });

  await transformer.jpeg({ quality: 82, mozjpeg: true }).toFile(outputPath);

  if (outputPath !== filePath) {
    await fs.unlink(filePath).catch(() => {});
  }

  return outputPath;
}

function issueToken() {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: Math.floor(TOKEN_TTL_MS / 1000) });
}

function authMiddleware(req, res, next) {
  const token = req.header('x-admin-token');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Session expired' : 'Unauthorized';
    return res.status(401).json({ error: message });
  }

  next();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toSafeValue(value, maxLength = 1000) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'N/A';
  if (trimmed.length > maxLength) {
    return `${trimmed.slice(0, maxLength)}...`;
  }
  return trimmed;
}

function getInquiryTransporter() {
  if (inquiryTransporter) return inquiryTransporter;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM_EMAIL) {
    return null;
  }

  inquiryTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  return inquiryTransporter;
}

async function sendInquiryWithBrevoApi({ subject, htmlBody, textBody, replyToEmail }) {
  if (!BREVO_API_KEY) return false;

  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is unavailable in this Node runtime.');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: {
        email: SMTP_FROM_EMAIL,
        name: 'Arkan Arabia'
      },
      to: [{ email: INQUIRY_TO_EMAIL }],
      replyTo: replyToEmail && replyToEmail !== 'N/A' ? { email: replyToEmail } : undefined,
      subject,
      htmlContent: htmlBody,
      textContent: textBody
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => 'Unknown Brevo API error');
    throw new Error(`Brevo API send failed (${response.status}): ${details}`);
  }

  return true;
}

app.post('/api/admin/login', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  const hasUsername = username.length > 0;
  const usernameMatches = !hasUsername || username === ADMIN_USERNAME;
  const usernameProvidedWhenRequired = !ADMIN_REQUIRE_USERNAME || hasUsername;

  if (!usernameProvidedWhenRequired || !usernameMatches || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  return res.json({ token: issueToken() });
});

app.post('/api/admin/logout', authMiddleware, (req, res) => {
  return res.json({ ok: true });
});

app.get('/api/gallery', async (req, res) => {
  const gallery = await db.getAllGallery();
  const normalized = gallery.map((item) => ({
    ...item,
    src: normalizeLegacyUploadUrl(req, item.src)
  }));
  res.json(normalized);
});

app.post('/api/gallery', authMiddleware, uploadGallery.single('file'), async (req, res) => {
  const title = String(req.body?.title || '').trim();
  const category = String(req.body?.category || '').trim();
  const description = String(req.body?.description || '').trim();
  const srcFromBody = String(req.body?.src || '').trim();

  if (!title || !category) {
    return res.status(400).json({ error: 'Title and category are required' });
  }

  let src = srcFromBody;
  if (req.file) {
    if (USE_CLOUDINARY && req.file.path) {
      // Cloudinary returns the full URL in req.file.path
      src = req.file.path;
    } else {
      // Local storage - optimize and get public path
      const optimizedPath = await optimizeUploadedImage(req.file.path, 'gallery');
      src = toPublicUploadPath(req, optimizedPath);
    }
  }

  if (!src) {
    return res.status(400).json({ error: 'Image source is required' });
  }

  const item = {
    id: `g${Date.now()}`,
    src,
    category,
    title,
    description
  };

  await db.insertGallery(item);
  res.status(201).json(item);
});

app.delete('/api/gallery/:id', authMiddleware, async (req, res) => {
  const deleted = await db.deleteGallery(req.params.id);

  if (!deleted) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  res.json({ ok: true });
});

app.get('/api/blog', async (req, res) => {
  const posts = await db.getAllBlog();
  const normalized = posts.map((post) => ({
    ...post,
    coverImage: normalizeLegacyUploadUrl(req, post.coverImage)
  }));
  res.json(normalized);
});

app.post('/api/blog', authMiddleware, uploadBlog.single('coverFile'), async (req, res) => {
  const title = String(req.body?.title || '').trim();
  const category = String(req.body?.category || '').trim();

  if (!title || !category) {
    return res.status(400).json({ error: 'Title and category are required' });
  }

  let coverImage = String(req.body?.coverImage || '').trim();
  if (req.file) {
    if (USE_CLOUDINARY && req.file.path) {
      // Cloudinary returns the full URL in req.file.path
      coverImage = req.file.path;
    } else {
      // Local storage - optimize and get public path
      const optimizedPath = await optimizeUploadedImage(req.file.path, 'blog');
      coverImage = toPublicUploadPath(req, optimizedPath);
    }
  }

  const post = {
    id: `b${Date.now()}`,
    title,
    category,
    excerpt: String(req.body?.excerpt || '').trim(),
    body: String(req.body?.body || '').trim(),
    author: String(req.body?.author || 'Arkan Arabia Team').trim() || 'Arkan Arabia Team',
    readTime: String(req.body?.readTime || '5 min').trim() || '5 min',
    coverImage,
    date: new Date().toISOString().split('T')[0]
  };

  await db.insertBlog(post);
  res.status(201).json(post);
});

app.put('/api/blog/:id', authMiddleware, uploadBlog.single('coverFile'), async (req, res) => {
  const current = await db.getBlogById(req.params.id);

  if (!current) {
    return res.status(404).json({ error: 'Post not found' });
  }

  let coverImage = String(req.body?.coverImage || '').trim();

  if (req.file) {
    if (USE_CLOUDINARY && req.file.path) {
      // Cloudinary returns the full URL in req.file.path
      coverImage = req.file.path;
    } else {
      // Local storage - optimize and get public path
      const optimizedPath = await optimizeUploadedImage(req.file.path, 'blog');
      coverImage = toPublicUploadPath(req, optimizedPath);
    }
  }

  const updated = {
    ...current,
    title: String(req.body?.title || current.title).trim(),
    category: String(req.body?.category || current.category).trim(),
    excerpt: String(req.body?.excerpt || '').trim(),
    body: String(req.body?.body || '').trim(),
    author: String(req.body?.author || current.author || 'Arkan Arabia Team').trim() || 'Arkan Arabia Team',
    readTime: String(req.body?.readTime || current.readTime || '5 min').trim() || '5 min',
    coverImage: coverImage || current.coverImage
  };

  await db.updateBlog(req.params.id, updated);
  res.json(updated);
});

app.delete('/api/blog/:id', authMiddleware, async (req, res) => {
  const deleted = await db.deleteBlog(req.params.id);

  if (!deleted) {
    return res.status(404).json({ error: 'Post not found' });
  }

  res.json({ ok: true });
});

app.post('/api/inquiries', async (req, res) => {
  const fullName = toSafeValue(req.body?.fullName, 160);
  const company = toSafeValue(req.body?.company, 160);
  const email = toSafeValue(req.body?.email, 160);
  const phone = toSafeValue(req.body?.phone, 80);
  const country = toSafeValue(req.body?.country, 100);
  const service = toSafeValue(req.body?.service, 120);
  const message = toSafeValue(req.body?.message, 4000);

  if (fullName === 'N/A' || email === 'N/A' || message === 'N/A') {
    return res.status(400).json({ error: 'Full name, email, and message are required.' });
  }

  const subject = `Website Inquiry${service !== 'N/A' ? ` - ${service}` : ''}`;
  const textBody = [
    'New inquiry from Arkan Arabia website',
    '',
    `Full Name: ${fullName}`,
    `Company: ${company}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Country: ${country}`,
    `Service: ${service}`,
    '',
    'Message:',
    message
  ].join('\n');

  const htmlBody = `
    <h2>New inquiry from Arkan Arabia website</h2>
    <p><strong>Full Name:</strong> ${escapeHtml(fullName)}</p>
    <p><strong>Company:</strong> ${escapeHtml(company)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Country:</strong> ${escapeHtml(country)}</p>
    <p><strong>Service:</strong> ${escapeHtml(service)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replaceAll('\n', '<br/>')}</p>
  `;

  try {
    const sentByBrevoApi = await sendInquiryWithBrevoApi({
      subject,
      htmlBody,
      textBody,
      replyToEmail: email
    });

    if (!sentByBrevoApi) {
      const transporter = getInquiryTransporter();
      if (!transporter) {
        return res.status(503).json({ error: 'Inquiry email service is not configured.' });
      }

      await transporter.sendMail({
        from: SMTP_FROM_EMAIL,
        to: INQUIRY_TO_EMAIL,
        replyTo: email !== 'N/A' ? email : undefined,
        subject,
        text: textBody,
        html: htmlBody
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to send inquiry email:', err);
    return res.status(500).json({ error: 'Failed to send inquiry email.' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image too large. Max size is 8MB.' });
    }
    return res.status(400).json({ error: 'Invalid upload request.' });
  }
  return res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;

// fs.mkdir/writeFile below need a writable filesystem, which Vercel's
// serverless runtime doesn't provide outside /tmp. Only run local
// bootstrap (and only ever call app.listen()) when NOT running on Vercel.
if (!process.env.VERCEL) {
  ensurePath()
    .then(async () => {
      const server = app.listen(PORT, () => {
        console.log(`Arkan Arabia backend running on http://localhost:${PORT}`);
      });

      server.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
          console.error(`Backend port ${PORT} is already in use. Stop the other process or set PORT.`);
        } else {
          console.error('Failed to start backend server:', err);
        }
        process.exit(1);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}
