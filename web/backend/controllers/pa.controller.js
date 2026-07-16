const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const geminiService = require('../services/gemini.service');

// GET /api/consultations/pa/my-consultations
exports.getMyConsultations = async (req, res) => {
  try {
    const userId = req.user?.id; // PA's User ID
    
    // For demo purposes if no auth middleware is perfectly attached
    // find PA by userId or just fetch all if no auth (not recommended but a fallback)
    
    let logs = [];
    if (userId) {
      const pa = await prisma.physicianAssistantProfile.findUnique({ where: { userId } });
      if (pa) {
        logs = await prisma.consultationLog.findMany({
          where: { paId: pa.id },
          include: {
            patient: { include: { user: true } },
            doctor: { include: { user: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
      }
    } else {
      // Fallback for development if no req.user is set
      logs = await prisma.consultationLog.findMany({
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching PA consultations:', error);
    res.status(500).json({ error: 'Server error fetching consultations' });
  }
};

// GET /api/consultations/pa/my-doctors
exports.getMyDoctors = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const pa = await prisma.physicianAssistantProfile.findUnique({
      where: { userId },
      include: {
        assignments: {
          where: { assignmentStatus: "ACTIVE" },
          include: {
            doctor: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, email: true }
                }
              }
            }
          }
        }
      }
    });

    if (!pa) {
      return res.status(404).json({ error: "PA profile not found" });
    }

    const doctors = pa.assignments.map(a => ({
      id: a.doctor.id,
      name: `Dr. ${a.doctor.user.firstName} ${a.doctor.user.lastName}`,
      email: a.doctor.user.email
    }));

    res.status(200).json(doctors);
  } catch (error) {
    console.error('Error fetching PA doctors:', error);
    res.status(500).json({ error: 'Server error fetching doctors' });
  }
};

// GET /api/consultations/pa/doctor-consultations
exports.getDoctorConsultations = async (req, res) => {
  try {
    const userId = req.user?.id;
    let logs = [];
    
    if (userId) {
      const doctor = await prisma.doctorProfile.findUnique({ where: { userId } });
      if (doctor) {
        logs = await prisma.consultationLog.findMany({
          where: { doctorId: doctor.id },
          include: {
            patient: { include: { user: true } },
            pa: { include: { user: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
      }
    } else {
      logs = await prisma.consultationLog.findMany({
        include: {
          patient: { include: { user: true } },
          pa: { include: { user: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching Doctor consultations:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/consultations/pa/doctors/{doctorId}/assign-pa
exports.assignPA = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { paId } = req.body;

    if (!paId) {
      return res.status(400).json({ success: false, message: 'PA ID is required.' });
    }

    const pa = await prisma.physicianAssistantProfile.findUnique({ where: { id: paId } });
    if (!pa) return res.status(404).json({ success: false, message: 'PA not found.' });

    const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });

    const assignment = await prisma.doctorPAAssignment.create({
      data: {
        doctorId,
        paId,
        createdBy: req.user?.id || 'system'
      }
    });

    await prisma.auditTrail.create({
      data: {
        userId: req.user?.id || 'system',
        role: req.user?.role || 'SYSTEM',
        action: 'ASSIGN_PA',
        entityType: 'DoctorPAAssignment',
        entityId: assignment.id,
        newValue: JSON.stringify(assignment),
        ipAddress: req.ip
      }
    });

    res.status(201).json({ success: true, assignment });
  } catch (error) {
    console.error('Error assigning PA:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/consultations/pa/route
exports.routeConsultation = async (req, res) => {
  try {
    const { patientId, doctorId, consultationType, severityLevel } = req.body;

    if (!patientId || !severityLevel) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    let assignedPaId = null;
    let requiresDoctorApproval = false;
    let initialStatus = 'Pending Doctor Action';

    if (severityLevel === 'Routine' || severityLevel === 'Follow-up') {
      if (doctorId) {
        const assignment = await prisma.doctorPAAssignment.findFirst({
          where: { doctorId, assignmentStatus: 'ACTIVE' }
        });
        if (assignment) {
          assignedPaId = assignment.paId;
          requiresDoctorApproval = true;
          initialStatus = 'Pending PA Action';
        }
      }
    }

    const consultation = await prisma.consultationLog.create({
      data: {
        patientId,
        doctorId,
        paId: assignedPaId,
        consultationType,
        severityLevel,
        requiresDoctorApproval,
        status: initialStatus
      }
    });

    res.status(201).json({ success: true, consultation });
  } catch (error) {
    console.error('Error routing consultation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/consultations/pa/submit
exports.submitConsultation = async (req, res) => {
  try {
    const { consultationId, consultationNotes } = req.body; // Changed from notes to consultationNotes to match PADashboard.jsx
    
    if (!consultationId || !consultationNotes) {
      return res.status(400).json({ success: false, error: 'Consultation ID and notes are required.' });
    }

    const consultation = await prisma.consultationLog.findUnique({ where: { id: consultationId } });
    if (!consultation) {
      return res.status(404).json({ success: false, error: 'Consultation not found.' });
    }

    const updatedConsultation = await prisma.consultationLog.update({
      where: { id: consultationId },
      data: {
        consultationNotes,
        status: 'Pending Doctor Review'
      }
    });

    await prisma.auditTrail.create({
      data: {
        userId: req.user?.id || 'system',
        role: req.user?.role || 'PHYSICIAN_ASSISTANT',
        action: 'SUBMIT_CONSULTATION_NOTES',
        entityType: 'ConsultationLog',
        entityId: consultation.id,
        newValue: JSON.stringify(updatedConsultation),
        ipAddress: req.ip
      }
    });

    res.status(200).json({ success: true, consultation: updatedConsultation });
  } catch (error) {
    console.error('Error submitting consultation:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// POST /api/consultations/pa/doctors/consultations/{consultationId}/approve
exports.approveConsultation = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { action, feedback } = req.body; 

    const consultation = await prisma.consultationLog.findUnique({ where: { id: consultationId } });
    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found.' });
    }

    let status = 'Approved by Doctor';
    let approvedByDoctor = true;

    if (action === 'reject') {
      status = 'Returned for Correction';
      approvedByDoctor = false;
    }

    const updatedConsultation = await prisma.consultationLog.update({
      where: { id: consultationId },
      data: {
        status,
        approvedByDoctor,
        approvedAt: approvedByDoctor ? new Date() : null,
        consultationNotes: feedback ? consultation.consultationNotes + '\nDoctor Feedback: ' + feedback : consultation.consultationNotes
      }
    });

    await prisma.auditTrail.create({
      data: {
        userId: req.user?.id || 'system',
        role: req.user?.role || 'DOCTOR',
        action: action === 'reject' ? 'REJECT_CONSULTATION' : 'APPROVE_CONSULTATION',
        entityType: 'ConsultationLog',
        entityId: consultation.id,
        newValue: JSON.stringify(updatedConsultation),
        ipAddress: req.ip
      }
    });

    res.status(200).json({ success: true, consultation: updatedConsultation });
  } catch (error) {
    console.error('Error approving consultation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/consultations/pa/escalate
exports.escalateConsultation = async (req, res) => {
  try {
    // Escalate might be in req.body.consultationId based on PADashboard.jsx
    const { consultationId, escalationReason } = req.body; 

    if (!consultationId || !escalationReason) {
      return res.status(400).json({ success: false, error: 'Consultation ID and Escalation reason are required.' });
    }

    const consultation = await prisma.consultationLog.findUnique({ where: { id: consultationId } });
    if (!consultation) {
      return res.status(404).json({ success: false, error: 'Consultation not found.' });
    }

    const updatedConsultation = await prisma.consultationLog.update({
      where: { id: consultationId },
      data: {
        escalated: true,
        escalationReason,
        status: 'ESCALATED',
        requiresDoctorApproval: true
      }
    });

    await prisma.auditTrail.create({
      data: {
        userId: req.user?.id || 'system',
        role: req.user?.role || 'PHYSICIAN_ASSISTANT',
        action: 'ESCALATE_CONSULTATION',
        entityType: 'ConsultationLog',
        entityId: consultation.id,
        newValue: JSON.stringify(updatedConsultation),
        ipAddress: req.ip
      }
    });

    res.status(200).json({ success: true, consultation: updatedConsultation });
  } catch (error) {
    console.error('Error escalating consultation:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// POST /api/consultations/pa/triage
exports.aiTriageAndRoute = async (req, res) => {
  try {
    const { patientId, doctorId, symptoms } = req.body;

    if (!patientId || !symptoms) {
      return res.status(400).json({ success: false, message: 'Patient ID and symptoms are required.' });
    }

    // 1. Ask Gemini to evaluate symptoms
    const triageResult = await geminiService.triageSymptoms(symptoms);
    
    // 2. Decide routing based on AI result
    let assignedPaId = null;
    let requiresDoctorApproval = false;
    let initialStatus = 'Pending Doctor Action';

    // Route to PA if it is Routine/Follow-up AND NOT a Prescription
    if ((triageResult.severityLevel === 'Routine' || triageResult.severityLevel === 'Follow-up') && triageResult.consultationType !== 'Prescription') {
      if (doctorId) {
        const assignment = await prisma.doctorPAAssignment.findFirst({
          where: { doctorId, assignmentStatus: 'ACTIVE' }
        });
        if (assignment) {
          assignedPaId = assignment.paId;
          requiresDoctorApproval = true;
          initialStatus = 'Pending PA Action';
        }
      }
    }

    // 3. Create the Consultation
    const notesStr = `AI Triage Report:\nSeverity: ${triageResult.severityLevel}\nConsultation Type: ${triageResult.consultationType}\nRisks: ${triageResult.riskFlags.join(', ') || 'None'}\nSuggested Follow-up: ${triageResult.suggestedFollowUp || 'None'}\nRecommendation: ${triageResult.recommendation}\n\nPatient Symptoms:\n${symptoms}`;

    const consultation = await prisma.consultationLog.create({
      data: {
        patientId,
        doctorId,
        paId: assignedPaId,
        consultationType: triageResult.consultationType,
        severityLevel: triageResult.severityLevel,
        requiresDoctorApproval,
        status: initialStatus,
        consultationNotes: notesStr
      }
    });

    res.status(201).json({ 
      success: true, 
      consultation,
      triage: triageResult
    });
  } catch (error) {
    console.error('Error in AI triage and route:', error);
    res.status(500).json({ success: false, message: 'Server error during AI triage' });
  }
};

// GET /api/consultations/pa/audit-logs
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditTrail.findMany({
      where: { 
        entityType: {
          in: ['ConsultationLog', 'DoctorPAAssignment']
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100 // Limit to recent logs
    });
    res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// GET /api/consultations/pa/workload
exports.getPAWorkload = async (req, res) => {
  try {
    const doctorId = req.user?.id; // Assuming the requester is a Doctor
    let whereClause = { status: { not: 'Closed' } };

    // Group by PA to see workload
    const workload = await prisma.consultationLog.groupBy({
      by: ['paId'],
      where: whereClause,
      _count: {
        id: true
      }
    });

    res.status(200).json({ success: true, workload });
  } catch (error) {
    console.error('Error fetching PA workload:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// GET /api/consultations/pa/profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, firstName: true, lastName: true, email: true, phone: true }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const { ensureDefaultProfile } = require("../lib/provisionProfile");
    await ensureDefaultProfile(user, undefined, undefined, undefined);

    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "PhysicianAssistantProfile" WHERE "userId" = $1 LIMIT 1`,
      userId
    );
    const rawPA = rows && rows.length > 0 ? rows[0] : null;

    if (!rawPA) return res.status(404).json({ error: "Profile not found" });

    let doctorIsOnline = false;
    if (rawPA.supervisingDoctorId) {
      const rawDocs = await prisma.$queryRawUnsafe(
        `SELECT "isOnline" FROM "DoctorProfile" WHERE "referenceId" = $1 LIMIT 1`,
        rawPA.supervisingDoctorId
      );
      if (rawDocs && rawDocs.length > 0) {
        doctorIsOnline = rawDocs[0].isOnline;
      }
    }

    const responseData = {
      ...rawPA,
      referenceId: rawPA.referenceId || "CV-PA-GH-2026-0001",
      supervisingDoctorId: rawPA.supervisingDoctorId || "CV-DR-GH-2024-0035",
      licenseNumber: rawPA.licenseNumber || `PA-LIC-${userId.slice(0, 8).toUpperCase()}`,
      verificationStatus: rawPA.verificationStatus || "PENDING",
      registrationDate: rawPA.createdAt || new Date(),
      isAllowedByDoctor: rawPA.isAllowedByDoctor || false,
      doctorIsOnline,
      user
    };

    return res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('Error fetching PA profile:', error);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
};

// PUT /api/consultations/pa/profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { firstName, lastName, phone, specialty, licenseNumber } = req.body;

    const userUpdateData = {};
    if (firstName) userUpdateData.firstName = firstName;
    if (lastName) userUpdateData.lastName = lastName;
    if (phone) userUpdateData.phone = phone;

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData
      });
    }

    const paUpdateData = {};
    if (specialty !== undefined) paUpdateData.specialty = specialty;
    if (licenseNumber !== undefined) paUpdateData.licenseNumber = licenseNumber;

    if (Object.keys(paUpdateData).length > 0) {
      await prisma.physicianAssistantProfile.update({
        where: { userId },
        data: paUpdateData
      });
    }

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error('Error updating PA profile:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
};
