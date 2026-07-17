const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const cors = require('cors');
const sharp = require('sharp');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'arkan2026';
const ADMIN_REQUIRE_USERNAME = String(process.env.ADMIN_REQUIRE_USERNAME || 'false').toLowerCase() === 'true';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

const BACKEND_DIR = __dirname;
const DATA_DIR = path.join(BACKEND_DIR, 'data');
const UPLOADS_DIR = path.join(BACKEND_DIR, 'uploads');
const GALLERY_FILE = path.join(DATA_DIR, 'gallery.json');
const BLOG_FILE = path.join(DATA_DIR, 'blog.json');

const activeTokens = new Map();
const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;

function imageFileFilter(_req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only image files are allowed'));
    return;
  }
  cb(null, true);
}

const galleryStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(UPLOADS_DIR, 'gallery')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `gallery-${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

const blogStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(UPLOADS_DIR, 'blog')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `blog-${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

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
app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-token']
}));
app.use('/uploads', express.static(UPLOADS_DIR));

function toPublicUploadPath(req, filePath) {
  const relative = path.relative(UPLOADS_DIR, filePath).replaceAll(path.sep, '/');
  return `${req.protocol}://${req.get('host')}/uploads/${relative}`;
}

async function ensurePath() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(path.join(UPLOADS_DIR, 'gallery'), { recursive: true });
  await fs.mkdir(path.join(UPLOADS_DIR, 'blog'), { recursive: true });
}

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function optimizeUploadedImage(filePath, type) {
  const parsed = path.parse(filePath);
  const outputPath = path.join(parsed.dir, `${parsed.name}.jpg`);

  const transformer = sharp(filePath).rotate();
  if (type === 'gallery') {
    // Standardize gallery uploads to Instagram-style square posts.
    transformer.resize({ width: 1080, height: 1080, fit: 'cover', position: 'center' });
  } else {
    transformer.resize({ width: 1600, height: 900, fit: 'cover', position: 'center' });
  }

  await transformer.jpeg({ quality: 82, mozjpeg: true }).toFile(outputPath);

  if (outputPath !== filePath) {
    await fs.unlink(filePath).catch(() => {});
  }

  return outputPath;
}

function issueToken() {
  const token = crypto.randomUUID();
  activeTokens.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

function authMiddleware(req, res, next) {
  const token = req.header('x-admin-token');
  if (!token || !activeTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const expiry = activeTokens.get(token);
  if (Date.now() > expiry) {
    activeTokens.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }

  activeTokens.set(token, Date.now() + TOKEN_TTL_MS);
  next();
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
  const token = req.header('x-admin-token');
  activeTokens.delete(token);
  return res.json({ ok: true });
});

app.get('/api/gallery', async (_req, res) => {
  const gallery = await readJson(GALLERY_FILE);
  res.json(gallery);
});

app.post('/api/gallery', authMiddleware, uploadGallery.single('file'), async (req, res) => {
  const gallery = await readJson(GALLERY_FILE);
  const title = String(req.body?.title || '').trim();
  const category = String(req.body?.category || '').trim();
  const srcFromBody = String(req.body?.src || '').trim();

  if (!title || !category) {
    return res.status(400).json({ error: 'Title and category are required' });
  }

  let src = srcFromBody;
  if (req.file) {
    const optimizedPath = await optimizeUploadedImage(req.file.path, 'gallery');
    src = toPublicUploadPath(req, optimizedPath);
  }

  if (!src) {
    return res.status(400).json({ error: 'Image source is required' });
  }

  const item = {
    id: `g${Date.now()}`,
    src,
    category,
    title
  };

  gallery.push(item);
  await writeJson(GALLERY_FILE, gallery);
  res.status(201).json(item);
});

app.delete('/api/gallery/:id', authMiddleware, async (req, res) => {
  const gallery = await readJson(GALLERY_FILE);
  const before = gallery.length;
  const next = gallery.filter((item) => item.id !== req.params.id);

  if (next.length === before) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  await writeJson(GALLERY_FILE, next);
  res.json({ ok: true });
});

app.get('/api/blog', async (_req, res) => {
  const posts = await readJson(BLOG_FILE);
  res.json(posts);
});

app.post('/api/blog', authMiddleware, uploadBlog.single('coverFile'), async (req, res) => {
  const posts = await readJson(BLOG_FILE);
  const title = String(req.body?.title || '').trim();
  const category = String(req.body?.category || '').trim();

  if (!title || !category) {
    return res.status(400).json({ error: 'Title and category are required' });
  }

  let coverImage = String(req.body?.coverImage || '').trim();
  if (req.file) {
    const optimizedPath = await optimizeUploadedImage(req.file.path, 'blog');
    coverImage = toPublicUploadPath(req, optimizedPath);
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

  posts.unshift(post);
  await writeJson(BLOG_FILE, posts);
  res.status(201).json(post);
});

app.put('/api/blog/:id', authMiddleware, uploadBlog.single('coverFile'), async (req, res) => {
  const posts = await readJson(BLOG_FILE);
  const idx = posts.findIndex((p) => p.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const current = posts[idx];
  let coverImage = String(req.body?.coverImage || '').trim();

  if (req.file) {
    const optimizedPath = await optimizeUploadedImage(req.file.path, 'blog');
    coverImage = toPublicUploadPath(req, optimizedPath);
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

  posts[idx] = updated;
  await writeJson(BLOG_FILE, posts);
  res.json(updated);
});

app.delete('/api/blog/:id', authMiddleware, async (req, res) => {
  const posts = await readJson(BLOG_FILE);
  const before = posts.length;
  const next = posts.filter((p) => p.id !== req.params.id);

  if (next.length === before) {
    return res.status(404).json({ error: 'Post not found' });
  }

  await writeJson(BLOG_FILE, next);
  res.json({ ok: true });
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

ensurePath()
  .then(async () => {
    const [galleryExists, blogExists] = await Promise.all([
      fs.access(GALLERY_FILE).then(() => true).catch(() => false),
      fs.access(BLOG_FILE).then(() => true).catch(() => false)
    ]);

    if (!galleryExists) await writeJson(GALLERY_FILE, []);
    if (!blogExists) await writeJson(BLOG_FILE, []);

    app.listen(PORT, () => {
      console.log(`Arkan Arabia backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
