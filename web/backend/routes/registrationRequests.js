// FILE: routes/registrationRequests.js
// Doctor & Pharmacy registration approval workflow API
// Routes mounted at: /api/registration-requests

const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { verifyToken, requireRole } = require('../middleware/rbac');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const prisma = require('../prisma/prismaClient');
const { sendApprovalEmail, sendRejectionEmail } = require('../services/approvalEmailService');

const router = express.Router();

// ─── Shared Socket.io instance (injected in server.js) ───────────────────────
let _io = null;
router.setIo = (io) => { _io = io; };

// ─── Multer: in-memory storage (we stream to Supabase) ───────────────────────
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WEBP, PDF`));
    }
  },
});

// ─── Rate limit: max 3 submission attempts per user per 24h ──────────────────
const submitRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  // Key by authenticated userId so limits are per-user, not per-IP
  keyGenerator: (req) => req.user?.id ?? 'anonymous',
  message: { error: 'Too many submission attempts. Try again after 24 hours.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.user, // Skip unauthenticated requests (handled by verifyToken first)
});

// ─── Admin-only guard ─────────────────────────────────────────────────────────
const requireAdmin = requireRole(['ADMIN', 'SUPERADMIN']);

// ─── Helper: build stable storage path ───────────────────────────────────────
function buildStoragePath(userId, role, originalName) {
  const ext = originalName.split('.').pop().toLowerCase();
  return `${role.toLowerCase()}/${userId}/license.${ext}`;
}

// ─── Helper: refresh a signed URL from a stable path ─────────────────────────
async function refreshSignedUrl(filePath, expiresInSeconds = 3600) {
  if (!supabaseAdmin || !filePath) return null;
  try {
    const { data } = await supabaseAdmin.storage
      .from('license-documents')
      .createSignedUrl(filePath, expiresInSeconds);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

// ─── Helper: enrich a request record with a fresh signed URL ─────────────────
async function enrichWithFreshUrl(record) {
  const freshUrl = await refreshSignedUrl(record.licenseFilePath);
  return { ...record, licenseImageUrl: freshUrl ?? record.licenseImageUrl };
}

/* ============================================================
   POST /api/registration-requests/submit
   Triggered after OTP verification for DOCTOR/PHARMACY users.
   Auth: JWT required (the newly verified user)
   Body: multipart/form-data { licenseFile, role, submittedData }
   ============================================================ */
router.post(
  '/submit',
  verifyToken,
  submitRateLimit,
  upload.single('licenseFile'),
  async (req, res) => {
    try {
      const { role, submittedData } = req.body;
      const licenseFile = req.file;
      const userId = req.user.id;

      // ── 1. Validate inputs ──────────────────────────────────────────────────
      if (!licenseFile) {
        return res.status(400).json({ error: 'License document file is required.' });
      }
      if (!['DOCTOR', 'PHARMACY'].includes(role)) {
        return res.status(400).json({ error: 'role must be DOCTOR or PHARMACY.' });
      }

      let parsedFormData;
      try {
        parsedFormData = typeof submittedData === 'string'
          ? JSON.parse(submittedData)
          : submittedData;
      } catch {
        return res.status(400).json({ error: 'submittedData must be valid JSON.' });
      }

      // ── 2. Check for duplicate submission ─────────────────────────────────
      const existing = await prisma.registrationRequest.findUnique({
        where: { userId },
      });
      if (existing) {
        return res.status(409).json({
          error: 'A registration request already exists for this account.',
          status: existing.status,
        });
      }

      // ── 3. Verify Supabase email is confirmed ─────────────────────────────
      if (supabaseAdmin) {
        const { data: { user: sbUser }, error: sbErr } =
          await supabaseAdmin.auth.admin.getUserById(userId);
        if (sbErr || !sbUser) {
          return res.status(401).json({ error: 'Supabase user not found.' });
        }
        if (!sbUser.email_confirmed_at) {
          return res.status(403).json({ error: 'Email not verified yet.' });
        }
      }

      // ── 4. Upload license document to Supabase Storage ────────────────────
      if (!supabaseAdmin) {
        return res.status(503).json({ error: 'Storage service unavailable.' });
      }

      const storagePath = buildStoragePath(userId, role, licenseFile.originalname);

      const { error: uploadError } = await supabaseAdmin.storage
        .from('license-documents')
        .upload(storagePath, licenseFile.buffer, {
          contentType: licenseFile.mimetype,
          upsert: true,
        });

      if (uploadError) {
        console.error('❌ Supabase Storage upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload license document.' });
      }

      // ── 5. Generate 24h signed URL for admin preview ──────────────────────
      const { data: signedUrlData } = await supabaseAdmin.storage
        .from('license-documents')
        .createSignedUrl(storagePath, 86400); // 24 hours

      const signedUrl = signedUrlData?.signedUrl ?? '';

      // ── 6. Create RegistrationRequest in DB ───────────────────────────────
      const registrationRequest = await prisma.registrationRequest.create({
        data: {
          userId,
          role,
          status: 'PENDING',
          licenseImageUrl: signedUrl,
          licenseFilePath: storagePath,
          submittedData: parsedFormData,
        },
      });

      // ── 7. Update user's approvalStatus ───────────────────────────────────
      await prisma.user.update({
        where: { id: userId },
        data: { approvalStatus: 'PENDING' },
      });

      // ── 8. Notify admins via Socket.io ────────────────────────────────────
      const userName = `${parsedFormData.firstName || ''} ${parsedFormData.lastName || ''}`.trim();
      if (_io) {
        _io.to('admin-room').emit('new_registration_request', {
          requestId: registrationRequest.id,
          role,
          name: userName,
          createdAt: registrationRequest.createdAt,
        });
      }

      // TODO: Integrate ClamAV virus scan for license document uploads

      return res.status(201).json({
        message: 'Registration request submitted successfully. Your account is under review.',
        requestId: registrationRequest.id,
      });
    } catch (err) {
      console.error('❌ submit registration request error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

/* ============================================================
   GET /api/registration-requests/stats
   Admin only. Quick stats counts.
   ⚠️  MUST be defined before GET /:id and before GET / to ensure
       Express does not treat "stats" as a dynamic :id segment.
   ============================================================ */
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, approvedToday, totalRejected, totalDoctors, totalPharmacies] =
      await Promise.all([
        prisma.registrationRequest.count({ where: { status: 'PENDING' } }),
        prisma.registrationRequest.count({
          where: { status: 'APPROVED', reviewedAt: { gte: today } },
        }),
        prisma.registrationRequest.count({ where: { status: 'REJECTED' } }),
        prisma.registrationRequest.count({ where: { role: 'DOCTOR' } }),
        prisma.registrationRequest.count({ where: { role: 'PHARMACY' } }),
      ]);

    return res.json({ pending, approvedToday, totalRejected, totalDoctors, totalPharmacies });
  } catch (err) {
    console.error('❌ GET /api/registration-requests/stats error:', {
      message: err.message,
      stack: err.stack,
      prismaError: err.code
    });
    return res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

/* ============================================================
   GET /api/registration-requests
   Admin only. Paginated list of all requests.
   Query: ?status=PENDING|APPROVED|REJECTED&role=DOCTOR|PHARMACY&page=1&limit=10
   ============================================================ */
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, role, page = '1', limit = '10' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }
    if (role && ['DOCTOR', 'PHARMACY'].includes(role)) {
      where.role = role;
    }

    const [requests, total] = await Promise.all([
      prisma.registrationRequest.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.registrationRequest.count({ where }),
    ]);

    // Refresh signed URLs (1h expiry) before serving to admin
    const enriched = await Promise.all(requests.map(enrichWithFreshUrl));

    return res.json({
      data: enriched,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('❌ GET /api/registration-requests error:', {
      message: err.message,
      stack: err.stack,
      query: req.query
    });
    return res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

/* ============================================================
   GET /api/registration-requests/:id
   Admin only. Single request with full submittedData.
   ============================================================ */
router.get('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const request = await prisma.registrationRequest.findUnique({
      where: { id: req.params.id },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            phone: true,
            createdAt: true,
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Registration request not found.' });
    }

    const enriched = await enrichWithFreshUrl(request);
    return res.json(enriched);
  } catch (err) {
    console.error('❌ GET single registration request error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/* ============================================================
   PATCH /api/registration-requests/:id/review
   Admin only. Approve or reject a request.
   Body: { action: 'APPROVED'|'REJECTED', rejectionReason?: string }
   ============================================================ */
router.patch('/:id/review', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { action, rejectionReason } = req.body;
    const adminId = req.user.id;

    // ── Validate action ───────────────────────────────────────────────────────
    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ error: 'action must be APPROVED or REJECTED.' });
    }
    if (action === 'REJECTED' && !rejectionReason?.trim()) {
      return res.status(400).json({ error: 'rejectionReason is required when rejecting.' });
    }

    // ── Find the request ──────────────────────────────────────────────────────
    const request = await prisma.registrationRequest.findUnique({
      where: { id: req.params.id },
      include: {
        User: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Registration request not found.' });
    }
    if (request.status !== 'PENDING') {
      return res.status(409).json({
        error: `Request has already been ${request.status.toLowerCase()}.`,
      });
    }

    const now = new Date();

    // ── Update RegistrationRequest ────────────────────────────────────────────
    await prisma.registrationRequest.update({
      where: { id: req.params.id },
      data: {
        status: action,
        rejectionReason: action === 'REJECTED' ? rejectionReason.trim() : null,
        reviewedBy: adminId,
        reviewedAt: now,
      },
    });

    // ── Update User.approvalStatus ────────────────────────────────────────────
    await prisma.user.update({
      where: { id: request.userId },
      data: { approvalStatus: action },
    });

    // ── Send email notification (non-blocking) ────────────────────────────────
    const userName = `${request.User.firstName} ${request.User.lastName}`.trim();
    const emailParams = {
      email: request.User.email,
      name: userName,
      role: request.role,
    };

    if (action === 'APPROVED') {
      sendApprovalEmail(emailParams).catch((e) =>
        console.error('❌ Approval email send failed:', e.message)
      );
    } else {
      sendRejectionEmail({ ...emailParams, rejectionReason }).catch((e) =>
        console.error('❌ Rejection email send failed:', e.message)
      );
    }

    // ── Notify user via Socket.io ─────────────────────────────────────────────
    if (_io) {
      _io.to(request.userId).emit('approval_status_changed', {
        status: action,
        rejectionReason: action === 'REJECTED' ? rejectionReason : null,
      });
    }

    return res.json({
      message: `Registration request ${action.toLowerCase()} successfully.`,
    });
  } catch (err) {
    console.error('❌ PATCH review error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
