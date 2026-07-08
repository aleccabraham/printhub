const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const db = require('../db/db');
const { documentUpload, screenshotUpload, TMP_DIR, JOBS_DIR } = require('../middleware/upload');
const { countPages, resolvePageSelection } = require('../services/pageParser');
const { calcTotal, PER_PAGE_RATES, BINDING_FEES } = require('../services/pricing');
const { sendAdminNotification } = require('../services/email');
const { getBaseUrl } = require('../utils/baseUrl');
const config = require('../config/env');

const router = express.Router();

// Public config the client needs: QR image path + the pricing table (so the
// live price estimate in Step 2 can be computed client-side without a round trip).
router.get('/config', (req, res) => {
  res.json({
    paymentQrImageUrl: `/${config.paymentQrImage}`,
    perPageRates: PER_PAGE_RATES,
    bindingFees: BINDING_FEES,
  });
});

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// --- Step 1: document upload -------------------------------------------------
router.post('/documents', (req, res) => {
  documentUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No document uploaded' });

    try {
      const totalPages = await countPages(req.file.path, req.file.originalname);
      res.json({
        fileId: req.file.filename,
        fileName: req.file.originalname,
        fileSizeBytes: req.file.size,
        totalPages,
      });
    } catch (e) {
      fs.unlink(req.file.path, () => {});
      res.status(400).json({ error: `Could not parse document: ${e.message}` });
    }
  });
});

// --- Step 2 helper: validate/resolve a page range against a known total ----
router.post('/page-range/resolve', (req, res) => {
  const { rangeType, rangeString, totalPages } = req.body;
  if (!totalPages || totalPages < 1) return res.status(400).json({ error: 'totalPages is required' });

  const result = resolvePageSelection({ rangeType, rangeString, totalPages: Number(totalPages) });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

// --- Step 3: submit job (payment proof) --------------------------------------
router.post('/jobs', (req, res) => {
  screenshotUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Payment screenshot is required' });

    const screenshotTmpPath = req.file.path;

    try {
      const {
        studentName,
        registerNo,
        studentEmail,
        fileId,
        fileName,
        fileSizeBytes,
        totalPages,
        paperSize,
        printMode,
        sides,
        copies,
        binding,
        pageRangeType,
        pageRange,
        upiReferenceId,
      } = req.body;

      const required = { studentName, registerNo, studentEmail, fileId, fileName, fileSizeBytes, totalPages, paperSize, printMode, sides, copies, binding, pageRangeType, upiReferenceId };
      for (const [key, val] of Object.entries(required)) {
        if (val === undefined || val === null || val === '') {
          throw Object.assign(new Error(`Missing field: ${key}`), { status: 400 });
        }
      }

      const docTmpPath = path.join(TMP_DIR, fileId);
      if (!fs.existsSync(docTmpPath)) {
        throw Object.assign(new Error('Uploaded document not found — please re-upload'), { status: 400 });
      }

      const totalPagesNum = Number(totalPages);
      const resolved = resolvePageSelection({ rangeType: pageRangeType, rangeString: pageRange, totalPages: totalPagesNum });
      if (resolved.error) {
        throw Object.assign(new Error(resolved.error), { status: 400 });
      }

      const { perPageRate, bindingFee, totalAmount } = calcTotal({
        pagesToPrint: resolved.pagesToPrint,
        printMode,
        paperSize,
        copies: Number(copies),
        binding,
      });

      const jobId = `job-${randomUUID()}`;
      const jobDir = path.join(JOBS_DIR, jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      const docExt = path.extname(fileId);
      const finalDocName = `document${docExt}`;
      const finalDocPath = path.join(jobDir, finalDocName);
      fs.renameSync(docTmpPath, finalDocPath);

      const shotExt = path.extname(req.file.filename);
      const finalShotName = `screenshot${shotExt}`;
      const finalShotPath = path.join(jobDir, finalShotName);
      fs.renameSync(screenshotTmpPath, finalShotPath);

      const relDocPath = `uploads/jobs/${jobId}/${finalDocName}`;
      const relShotPath = `uploads/jobs/${jobId}/${finalShotName}`;

      const approvalToken = randomUUID();
      const now = new Date();
      const nowIso = now.toISOString();
      const tokenExpiresAt = new Date(now.getTime() + TOKEN_EXPIRY_MS).toISOString();

      db.prepare(
        `INSERT INTO jobs (
          id, student_name, register_no, student_email, file_name, file_path, file_size_bytes, total_pages,
          paper_size, print_mode, sides, copies, binding, page_range_type, page_range, pages_to_print,
          per_page_rate, binding_fee, total_amount, screenshot_path, upi_reference_id, payment_submitted_at,
          status, approval_token, approval_token_used, approval_token_expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?, 0, ?, ?, ?)`
      ).run(
        jobId,
        studentName,
        registerNo,
        studentEmail,
        fileName,
        relDocPath,
        Number(fileSizeBytes),
        totalPagesNum,
        paperSize,
        printMode,
        sides,
        Number(copies),
        binding,
        pageRangeType,
        pageRangeType === 'custom' ? pageRange : null,
        resolved.pagesToPrint,
        perPageRate,
        bindingFee,
        totalAmount,
        relShotPath,
        upiReferenceId,
        nowIso,
        approvalToken,
        tokenExpiresAt,
        nowIso,
        nowIso
      );

      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
      const baseUrl = getBaseUrl(req);

      try {
        await sendAdminNotification({ job, baseUrl });
      } catch (emailErr) {
        console.error('[studentRoutes] Failed to send admin notification email:', emailErr.message);
      }

      res.json({ jobId, status: job.status, totalAmount: job.total_amount });
    } catch (e) {
      fs.unlink(screenshotTmpPath, () => {});
      res.status(e.status || 500).json({ error: e.message });
    }
  });
});

// --- Step 4 / status lookups --------------------------------------------------
router.get('/jobs/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

router.get('/jobs', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'email query param is required' });
  const jobs = db.prepare('SELECT * FROM jobs WHERE student_email = ? ORDER BY created_at DESC').all(email);
  res.json(jobs);
});

module.exports = router;
