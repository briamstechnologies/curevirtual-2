// // FILE: backend/lib/provisionProfile.js
// const prisma = require('../prisma/prismaClient');

// /**
//  * Ensure a profile exists for the user; create a sensible default if missing.
//  * Supports PATIENT and DOCTOR roles.
//  */
// async function ensureDefaultProfile(user, specialization) {
//   if (!user) return null;

//   if (user.role === 'PATIENT') {
//     const existing = await prisma.patientProfile.findUnique({
//       where: { userId: user.id },
//     });
//     if (existing) return existing;

//     return prisma.patientProfile.create({
//       data: {
//         userId: user.id,
//         // dateOfBirth & gender moved to User model
//         bloodGroup: 'UNKNOWN',
//         height: null,
//         weight: null,
//         allergies: '',
//         medications: '',
//         medicalHistory: '',
//         address: '',
//         emergencyContact: '',
//         medicalRecordNumber: null,
//         insuranceProvider: '',
//         insuranceMemberId: '',
//       },
//     });
//   }

//   if (user.role === 'DOCTOR') {
//     const existing = await prisma.doctorProfile.findUnique({
//       where: { userId: user.id },
//     });
//     if (existing) return existing;

//     const licenseNumber = `LIC-${user.id.slice(0, 8).toUpperCase()}`;

//     return prisma.doctorProfile.create({
//       data: {
//         userId: user.id,
//         specialization: specialization || 'General Medicine',
//         qualifications: 'MBBS',
//         licenseNumber,
//         hospitalAffiliation: '',
//         yearsOfExperience: 0,
//         consultationFee: 0,
//         availability: JSON.stringify({}),
//         bio: '',
//         languages: JSON.stringify(['English']),
//       },
//     });
//   }

//   if (user.role === 'PHARMACY') {
//     const existing = await prisma.pharmacyProfile.findUnique({
//       where: { userId: user.id },
//     });
//     if (existing) return existing;

//     return prisma.pharmacyProfile.create({
//       data: {
//         userId: user.id,
//         displayName: `${user.firstName} ${user.lastName}`,
//         licenseNumber: `PHARM-${user.id.slice(0, 8).toUpperCase()}`,
//         phone: '',
//         address: '',
//         city: '',
//         state: '',
//         country: '',
//         postalCode: '',
//       },
//     });
//   }

//   return null;
// }

// module.exports = { ensureDefaultProfile };


// FILE: backend/lib/provisionProfile.js
const prisma = require('../prisma/prismaClient');

/**
 * Ensure a profile exists for the user; create a sensible default if missing.
 * Supports PATIENT, DOCTOR, PHARMACY, LABORATORY roles.
 */
async function ensureDefaultProfile(user, specialization, country) {
  if (!user) return null;

  // ─── PATIENT ─────────────────────────────────────────────────────────────
  if (user.role === 'PATIENT') {
    let existing = await prisma.patientProfile.findUnique({
      where: { userId: user.id },
    });
    
    if (existing && existing.referenceId) return existing;

    // Generate Reference ID (for both new and retroactively for old profiles)
    const year = new Date().getFullYear();
    const countryCode = existing?.country || country || 'GH';
    const prefix = `CV-PT-${countryCode}-${year}-`;
    
    const lastPatient = await prisma.patientProfile.findFirst({
      where: { referenceId: { startsWith: prefix } },
      orderBy: { referenceId: 'desc' },
    });
    
    let sequenceNumber = 1;
    if (lastPatient && lastPatient.referenceId) {
      const lastSequenceStr = lastPatient.referenceId.split('-').pop();
      const lastSequence = parseInt(lastSequenceStr, 10);
      if (!isNaN(lastSequence)) {
        sequenceNumber = lastSequence + 1;
      }
    }
    
    const referenceId = `${prefix}${String(sequenceNumber).padStart(4, '0')}`;

    if (existing) {
      return prisma.patientProfile.update({
        where: { id: existing.id },
        data: { referenceId, country: countryCode }
      });
    }

    return prisma.patientProfile.create({
      data: {
        userId: user.id,
        referenceId: referenceId,
        country: countryCode,
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

  // ─── DOCTOR ──────────────────────────────────────────────────────────────
  if (user.role === 'DOCTOR' || user.role === 'PHYSICIAN_ASSISTANT') {
    const existing = await prisma.doctorProfile.findUnique({
      where: { userId: user.id },
    });
    if (existing) return existing;

    const licenseNumber = `LIC-${user.id.slice(0, 8).toUpperCase()}`;

    return prisma.doctorProfile.create({
      data: {
        userId: user.id,
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

  // ─── PHARMACY ─────────────────────────────────────────────────────────────
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