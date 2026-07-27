# Cloudinary Integration Guide

This guide explains how to integrate Cloudinary for storing gallery and blog images uploaded from the admin panel.

## Why Cloudinary?

Cloudinary provides:
- **Persistent Storage**: Images won't be lost when the server restarts or redeploys
- **CDN Delivery**: Fast image loading worldwide
- **Automatic Optimization**: Image compression and format conversion
- **Transformations**: Resize, crop, and optimize images on-the-fly
- **Free Tier**: 25GB storage and 25GB bandwidth per month

## Setup Instructions

### 1. Create a Cloudinary Account

1. Go to [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Sign up for a free account
3. After logging in, go to your Dashboard
4. Copy your credentials:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 2. Install Cloudinary Package

Run this command in the `backend` directory:

```bash
npm install cloudinary multer-storage-cloudinary
```

### 3. Update Environment Variables

Add these variables to your `backend/.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
USE_CLOUDINARY=true
```

Replace the placeholder values with your actual Cloudinary credentials from step 1.

### 4. Update server.js

Replace the multer storage configuration in `backend/server.js` with the Cloudinary implementation below.

#### Add Cloudinary imports (after line 9):

```javascript
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
```

#### Add Cloudinary configuration (after line 28):

```javascript
const USE_CLOUDINARY = String(process.env.USE_CLOUDINARY || 'false').toLowerCase() === 'true';
const CLOUDINARY_CLOUD_NAME = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
const CLOUDINARY_API_KEY = String(process.env.CLOUDINARY_API_KEY || '').trim();
const CLOUDINARY_API_SECRET = String(process.env.CLOUDINARY_API_SECRET || '').trim();

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
```

#### Replace storage configurations (lines 48-62):

```javascript
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
  destination: (_req, _file, cb) => cb(null, path.join(UPLOADS_DIR, 'gallery')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `gallery-${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

// Local disk storage for blog (fallback)
const blogDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(UPLOADS_DIR, 'blog')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `blog-${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

// Choose storage based on configuration
const galleryStorage = USE_CLOUDINARY && CLOUDINARY_CLOUD_NAME ? galleryCloudinaryStorage : galleryDiskStorage;
const blogStorage = USE_CLOUDINARY && CLOUDINARY_CLOUD_NAME ? blogCloudinaryStorage : blogDiskStorage;
```

#### Update gallery POST endpoint (around line 291):

```javascript
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
    title
  };

  gallery.push(item);
  await writeJson(GALLERY_FILE, gallery);
  res.status(201).json(item);
});
```

#### Update blog POST endpoint (around line 345):

```javascript
app.post('/api/blog', authMiddleware, uploadBlog.single('coverFile'), async (req, res) => {
  const posts = await readJson(BLOG_FILE);
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

  posts.unshift(post);
  await writeJson(BLOG_FILE, posts);
  res.status(201).json(post);
});
```

#### Update blog PUT endpoint (around line 377):

```javascript
app.put('/api/blog/:id', authMiddleware, uploadBlog.single('coverFile'), async (req, res) => {
  const posts = await readJson(BLOG_FILE);
  const idx = posts.findIndex((p) => p.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const current = posts[idx];
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

  posts[idx] = updated;
  await writeJson(BLOG_FILE, posts);
  res.json(updated);
});
```

### 5. Restart the Backend Server

After making the changes:

```bash
cd backend
npm start
```

You should see: `✓ Cloudinary configured successfully`

## Testing

1. Log in to the admin panel
2. Upload a new gallery image
3. Check your Cloudinary dashboard - you should see the image in the `arkan-arabia/gallery` folder
4. The image URL will be a Cloudinary URL (e.g., `https://res.cloudinary.com/your-cloud/image/upload/...`)

## Benefits

✅ **No more lost images** - Images are stored permanently on Cloudinary
✅ **Automatic optimization** - Images are compressed and served in optimal formats
✅ **Fast delivery** - CDN ensures fast loading worldwide
✅ **Automatic backups** - Cloudinary handles backups
✅ **Easy migration** - Can switch between local and Cloudinary storage with one environment variable

## Fallback Mode

If Cloudinary credentials are not configured or `USE_CLOUDINARY=false`, the system automatically falls back to local disk storage. This ensures the application continues to work even without Cloudinary.

## Troubleshooting

### Images not uploading to Cloudinary

1. Check your `.env` file has correct credentials
2. Verify `USE_CLOUDINARY=true`
3. Check the backend console for error messages
4. Verify your Cloudinary account is active

### Images still saving locally

1. Restart the backend server after updating `.env`
2. Check the console for "✓ Cloudinary configured successfully"
3. If you see a warning, check your credentials

### Need help?

Contact the development team or check Cloudinary documentation at [https://cloudinary.com/documentation](https://cloudinary.com/documentation)
