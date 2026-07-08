const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { randomUUID } = require('crypto');
const config = require('../config/env');

// Static assets checked into git (e.g. the payment QR image) live here.
const CHECKED_IN_UPLOADS = path.join(__dirname, '..', '..', 'uploads');
const UPLOADS_ROOT = path.join(config.dataDir, 'uploads');
const TMP_DIR = path.join(UPLOADS_ROOT, 'tmp');
const JOBS_DIR = path.join(UPLOADS_ROOT, 'jobs');

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(JOBS_DIR, { recursive: true });

// When DATA_DIR points at a separate persistent volume (e.g. on Railway),
// seed any git-checked-in static assets (like the payment QR image) into it
// on first boot, without ever overwriting real uploaded job data.
if (path.resolve(CHECKED_IN_UPLOADS) !== path.resolve(UPLOADS_ROOT)) {
  for (const entry of fs.readdirSync(CHECKED_IN_UPLOADS, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const dest = path.join(UPLOADS_ROOT, entry.name);
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(CHECKED_IN_UPLOADS, entry.name), dest);
  }
}

const DOCUMENT_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

function tmpStorage() {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, TMP_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ext}`);
    },
  });
}

const documentUpload = multer({
  storage: tmpStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!DOCUMENT_EXTENSIONS.has(ext)) {
      return cb(new Error('Unsupported file type. Allowed: PDF, DOC, DOCX, PNG, JPG.'));
    }
    cb(null, true);
  },
}).single('document');

const screenshotUpload = multer({
  storage: tmpStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) {
      return cb(new Error('Payment screenshot must be a PNG or JPG image.'));
    }
    cb(null, true);
  },
}).single('screenshot');

module.exports = { documentUpload, screenshotUpload, UPLOADS_ROOT, TMP_DIR, JOBS_DIR };
