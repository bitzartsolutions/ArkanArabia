const { Pool } = require('pg');

const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();

if (!DATABASE_URL) {
  console.warn('⚠ DATABASE_URL is not set. Gallery/blog storage will fail.');
}

const pool = new Pool({
  connectionString: DATABASE_URL || undefined,
  ssl: DATABASE_URL ? { rejectUnauthorized: false } : false
});

let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS gallery (
        id TEXT PRIMARY KEY,
        item JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS blog (
        id TEXT PRIMARY KEY,
        item JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        item JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        item JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }
  return schemaReady;
}

async function query(text, params) {
  await ensureSchema();
  return pool.query(text, params);
}

async function getAllGallery() {
  const { rows } = await query('SELECT item FROM gallery ORDER BY created_at ASC');
  return rows.map((r) => r.item);
}

async function insertGallery(item) {
  await query('INSERT INTO gallery (id, item) VALUES ($1, $2)', [item.id, JSON.stringify(item)]);
}

async function deleteGallery(id) {
  const { rowCount } = await query('DELETE FROM gallery WHERE id = $1', [id]);
  return rowCount > 0;
}

async function getAllBlog() {
  const { rows } = await query('SELECT item FROM blog ORDER BY created_at DESC');
  return rows.map((r) => r.item);
}

async function getBlogById(id) {
  const { rows } = await query('SELECT item FROM blog WHERE id = $1', [id]);
  return rows[0] ? rows[0].item : null;
}

async function insertBlog(post) {
  await query('INSERT INTO blog (id, item) VALUES ($1, $2)', [post.id, JSON.stringify(post)]);
}

async function updateBlog(id, post) {
  const { rowCount } = await query('UPDATE blog SET item = $2 WHERE id = $1', [id, JSON.stringify(post)]);
  return rowCount > 0;
}

async function deleteBlog(id) {
  const { rowCount } = await query('DELETE FROM blog WHERE id = $1', [id]);
  return rowCount > 0;
}

async function getAllJobs() {
  const { rows } = await query('SELECT item FROM jobs ORDER BY created_at DESC');
  return rows.map((r) => r.item);
}

async function getJobById(id) {
  const { rows } = await query('SELECT item FROM jobs WHERE id = $1', [id]);
  return rows[0] ? rows[0].item : null;
}

async function insertJob(job) {
  await query('INSERT INTO jobs (id, item) VALUES ($1, $2)', [job.id, JSON.stringify(job)]);
}

async function updateJob(id, job) {
  const { rowCount } = await query('UPDATE jobs SET item = $2 WHERE id = $1', [id, JSON.stringify(job)]);
  return rowCount > 0;
}

async function deleteJob(id) {
  const { rowCount } = await query('DELETE FROM jobs WHERE id = $1', [id]);
  return rowCount > 0;
}

async function getAllApplications() {
  const { rows } = await query('SELECT item FROM applications ORDER BY created_at DESC');
  return rows.map((r) => r.item);
}

async function getApplicationsForJob(jobId) {
  const { rows } = await query('SELECT item FROM applications WHERE job_id = $1 ORDER BY created_at DESC', [jobId]);
  return rows.map((r) => r.item);
}

async function insertApplication(application) {
  await query('INSERT INTO applications (id, job_id, item) VALUES ($1, $2, $3)', [
    application.id,
    application.jobId,
    JSON.stringify(application)
  ]);
}

async function deleteApplication(id) {
  const { rowCount } = await query('DELETE FROM applications WHERE id = $1', [id]);
  return rowCount > 0;
}

async function deleteApplicationsForJob(jobId) {
  await query('DELETE FROM applications WHERE job_id = $1', [jobId]);
}

module.exports = {
  getAllGallery,
  insertGallery,
  deleteGallery,
  getAllBlog,
  getBlogById,
  insertBlog,
  updateBlog,
  deleteBlog,
  getAllJobs,
  getJobById,
  insertJob,
  updateJob,
  deleteJob,
  getAllApplications,
  getApplicationsForJob,
  insertApplication,
  deleteApplication,
  deleteApplicationsForJob
};
