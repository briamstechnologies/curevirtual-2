// FILE: backend/lib/provisionProfile.js
const prisma = require('../prisma/prismaClient');

/**
 * Ensure a profile exists for the user; create a sensible default if missing.
 * Supports PATIENT and DOCTOR roles.
 */
async function ensureDefaultProfile(user, specialization) {
  if (!user) return null;

  if (user.role === 'PATIENT') {
    const existing = await prisma.patientProfile.findUnique({
      where: { userId: user.id },
    });
    if (existing) return existing;

    return prisma.patientProfile.create({
      data: {
        userId: user.id,
        // dateOfBirth & gender moved to User model
        bloodGroup: 'UNKNOWN',
        height: null,
        weight: null,
        allergies: '',
        medications: '',
        medicalHistory: '',
        address: '',
        emergencyContact: '',
        medicalRecordNumber: null,
        insuranceProvider: '',
        insuranceMemberId: '',
        timezone: 'UTC',
      },
    });
  }

  if (user.role === 'DOCTOR' || user.role === 'PHYSICIAN_ASSISTANT') {
    const existing = await prisma.doctorProfile.findUnique({
      where: { userId: user.id },
    });
    if (existing) return existing;

    const licenseNumber = `LIC-${user.id.slice(0, 8).toUpperCase()}`;

    return prisma.doctorProfile.create({
      data: {
        userId: user.id,
        email: user.email,
        specialization: specialization || 'General Medicine',
        qualifications: user.role === 'PHYSICIAN_ASSISTANT' ? 'PA-C' : 'MBBS',
        licenseNumber,
        hospitalAffiliation: '',
        yearsOfExperience: 0,
        consultationFee: 0,
        availability: JSON.stringify({}),
        bio: '',
        languages: JSON.stringify(['English']),
        timezone: 'UTC',
      },
    });
  }

  if (user.role === 'PHARMACY') {
    const existing = await prisma.pharmacyProfile.findUnique({
      where: { userId: user.id },
    });
    if (existing) return existing;

    return prisma.pharmacyProfile.create({
      data: {
        userId: user.id,
        displayName: `${user.firstName} ${user.lastName}`,
        licenseNumber: `PHARM-${user.id.slice(0, 8).toUpperCase()}`,
        phone: '',
        address: '',
        city: '',
        state: '',
        country: '',
        postalCode: '',
        timezone: 'UTC',
      },
    });
  }

  // ─── LABORATORY ✅ NAYA ADD KIYA ──────────────────────────────────────────
  if (user.role === 'LABORATORY') {
    const existing = await prisma.laboratoryProfile.findUnique({
      where: { userId: user.id },
    });
    if (existing) return existing;

    return prisma.laboratoryProfile.create({
      data: {
        userId: user.id,
        displayName: `${user.firstName} ${user.lastName}`,
        licenseNumber: `LAB-${user.id.slice(0, 8).toUpperCase()}`,
        phone: '',
        address: '',
        city: '',
        state: '',
        country: '',
        postalCode: '',
        timezone: 'UTC',
      },
    });
  }


  return null;
}

module.exports = { ensureDefaultProfile };
