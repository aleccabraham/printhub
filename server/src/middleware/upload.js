const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { randomUUID } = require('crypto');

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
const TMP_DIR = path.join(UPLOADS_ROOT, 'tmp');
const JOBS_DIR = path.join(UPLOADS_ROOT, 'jobs');

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(JOBS_DIR, { recursive: true });

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
