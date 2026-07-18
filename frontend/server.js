const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.FRONTEND_PORT || 3000;

function resolveStaticRoot() {
  const candidates = [
    __dirname,
    process.cwd(),
    path.join(process.cwd(), 'frontend')
  ];

  return candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) || __dirname;
}

const ROOT = resolveStaticRoot();

const routes = {
  '/': 'index.html',
  '/home': 'index.html',
  '/about': 'pages/about.html',
  '/services': 'pages/services.html',
  '/industries': 'pages/industries.html',
  '/network': 'pages/network.html',
  '/solutions': 'pages/solutions.html',
  '/gallery': 'pages/gallery.html',
  '/blog': 'pages/blog.html',
  '/news': 'pages/news.html',
  '/contact': 'pages/contact.html',
  '/track': 'pages/track.html',
  '/customs-clearance': 'pages/customs-clearance.html',
  '/customs-clearance.html': 'pages/customs-clearance.html',
  '/land-transportation': 'pages/service-detail.html',
  '/warehousing': 'pages/service-detail.html',
  '/project-cargo': 'pages/service-detail.html',
  '/construction-logistics': 'pages/service-detail.html',
  '/cold-chain': 'pages/service-detail.html',
  '/retail-distribution': 'pages/service-detail.html',
  '/terminal-services': 'pages/service-detail.html',
  '/packing-moving': 'pages/service-detail.html',
  '/stuffing-lashing': 'pages/service-detail.html',
  '/cross-border-moving': 'pages/service-detail.html',
  '/admin': 'pages/admin.html',
  '/login/admin': 'login/admin/index.html'
};

app.use(express.static(ROOT));
app.use('/frontend', express.static(ROOT));

function sendRouteFile(res, file) {
  const target = path.join(ROOT, file);
  res.sendFile(target, (err) => {
    if (!err) return;
    res.status(err.statusCode || 404).send('Not Found');
  });
}

Object.entries(routes).forEach(([route, file]) => {
  app.get(route, (_req, res) => sendRouteFile(res, file));

  const prefixedRoute = route === '/' ? '/frontend' : `/frontend${route}`;
  app.get(prefixedRoute, (_req, res) => sendRouteFile(res, file));
});

module.exports = app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Arkan Arabia frontend running on http://localhost:${PORT}`);
  });
}
