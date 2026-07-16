const express = require('express');
const router = express.Router();
const paController = require('../controllers/pa.controller');

// Optional auth middleware
// const { protect } = require('../middleware/auth');

const { enforcePAAccess } = require('../middleware/paAccess');
const { verifyToken } = require('../middleware/rbac');

// Apply auth to all routes in this file
router.use(verifyToken);

router.get('/my-consultations', paController.getMyConsultations);
router.get('/my-doctors', paController.getMyDoctors);
router.get('/doctor-consultations', paController.getDoctorConsultations);

// Excluded from enforcePAAccess so dashboard can load state
router.get('/profile', paController.getProfile);
router.put('/profile', enforcePAAccess, paController.updateProfile);

router.post('/doctors/:doctorId/assign-pa', enforcePAAccess, paController.assignPA);
router.post('/route', enforcePAAccess, paController.routeConsultation);
router.post('/submit', enforcePAAccess, paController.submitConsultation); 
router.post('/doctors/consultations/:consultationId/approve', enforcePAAccess, paController.approveConsultation);
router.post('/escalate', enforcePAAccess, paController.escalateConsultation); 
router.post('/triage', enforcePAAccess, paController.aiTriageAndRoute);

router.get('/audit-logs', paController.getAuditLogs);
router.get('/workload', paController.getPAWorkload);

module.exports = router;
