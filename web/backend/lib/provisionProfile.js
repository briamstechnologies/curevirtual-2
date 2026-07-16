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
 * Helper to generate unique Reference ID (e.g., CV-PT-GH-2026-0001 or CV-PH-GH-2026-0001)
 */
async function generateReferenceId(prismaModel, rolePrefix, countryCode) {
  const year = new Date().getFullYear();
  const safeCountryCode = countryCode || 'GH';
  const prefix = `CV-${rolePrefix}-${safeCountryCode}-${year}-`;

  let lastRecord = null;
  const tableName =
    rolePrefix === 'DR'
      ? 'DoctorProfile'
      : rolePrefix === 'PA'
      ? 'PhysicianAssistantProfile'
      : rolePrefix === 'PT'
      ? 'PatientProfile'
      : rolePrefix === 'LB'
      ? 'LaboratoryProfile'
      : 'PharmacyProfile';

  if (rolePrefix === 'DR' || rolePrefix === 'PA' || rolePrefix === 'LB') {
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT "referenceId" FROM "${tableName}" WHERE "referenceId" LIKE $1 ORDER BY "referenceId" DESC LIMIT 1`,
        `${prefix}%`
      );
      if (rows && rows.length > 0) {
        lastRecord = rows[0];
      }
    } catch (err) {
      console.error('SQL query for referenceId failed:', err);
    }
  } else {
    try {
      lastRecord = await prismaModel.findFirst({
        where: { referenceId: { startsWith: prefix } },
        orderBy: { referenceId: 'desc' },
      });
    } catch (err) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT "referenceId" FROM "${tableName}" WHERE "referenceId" LIKE $1 ORDER BY "referenceId" DESC LIMIT 1`,
        `${prefix}%`
      );
      if (rows && rows.length > 0) {
        lastRecord = rows[0];
      }
    }
  }

  let sequenceNumber = 1;
  if (lastRecord && lastRecord.referenceId) {
    const lastSequenceStr = lastRecord.referenceId.split('-').pop();
    const lastSequence = parseInt(lastSequenceStr, 10);
    if (!isNaN(lastSequence)) {
      sequenceNumber = lastSequence + 1;
    }
  }

  return `${prefix}${String(sequenceNumber).padStart(4, '0')}`;
}

/**
 * Ensure a profile exists for the user; create a sensible default if missing.
 * Supports PATIENT, DOCTOR, PHARMACY, LABORATORY roles.
 */
async function ensureDefaultProfile(user, specialization, country, supervisingDoctorId) {
  if (!user) return null;

  // ─── PATIENT ─────────────────────────────────────────────────────────────
  if (user.role === 'PATIENT') {
    let existing = await prisma.patientProfile.findUnique({
      where: { userId: user.id },
    });
    
    if (existing && existing.referenceId) return existing;

    // Generate Reference ID (for both new and retroactively for old profiles)
    const countryCode = existing?.country || country || 'GH';
    const referenceId = await generateReferenceId(prisma.patientProfile, "PT", countryCode);

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
  if (user.role === 'DOCTOR') {
    let existing = await prisma.doctorProfile.findUnique({
      where: { userId: user.id },
    });
    if (existing && existing.referenceId) return existing;

    const countryCode = existing?.country || country || 'GH';
    const referenceId =
      existing?.referenceId ||
      (await generateReferenceId(prisma.doctorProfile, 'DR', countryCode));

    const licenseNumber = existing?.licenseNumber || `LIC-${user.id.slice(-8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    console.log(`[PROVISION] Doctor Profile - User: ${user.id}, RefID: ${referenceId}, Country: ${countryCode}`);

    if (existing) {
      await prisma.$executeRawUnsafe(
        `UPDATE "DoctorProfile" SET "referenceId" = $1, "country" = $2 WHERE "id" = $3`,
        referenceId,
        countryCode,
        existing.id
      );
      return {
        ...existing,
        referenceId,
        verificationStatus: existing.verificationStatus || 'PENDING',
        country: countryCode,
      };
    }

    const created = await prisma.doctorProfile.create({
      data: {
        userId: user.id,
        specialization: specialization || 'General Medicine',
        qualifications: 'MBBS',
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
    await prisma.$executeRawUnsafe(
      `UPDATE "DoctorProfile" SET "referenceId" = $1, "verificationStatus" = 'PENDING', "country" = $2 WHERE "id" = $3`,
      referenceId,
      countryCode,
      created.id
    );
    return {
      ...created,
      referenceId,
      verificationStatus: 'PENDING',
      country: countryCode,
    };
  }

  // ─── PHYSICIAN ASSISTANT ────────────────────────────────────────────────
  if (user.role === 'PHYSICIAN_ASSISTANT') {
    let existing = await prisma.physicianAssistantProfile.findUnique({
      where: { userId: user.id },
    });
    if (existing && existing.referenceId) return existing;

    const countryCode = existing?.country || country || 'GH';
    const referenceId =
      existing?.referenceId ||
      (await generateReferenceId(prisma.physicianAssistantProfile, 'PA', countryCode));

    const licenseNumber = existing?.licenseNumber || `PA-LIC-${user.id.slice(-8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const supDocId = supervisingDoctorId || existing?.supervisingDoctorId || null;

    console.log(`[PROVISION] PhysicianAssistant Profile - User: ${user.id}, RefID: ${referenceId}, Country: ${countryCode}, SupDoctorId: ${supDocId}`);

    if (existing) {
      await prisma.$executeRawUnsafe(
        `UPDATE "PhysicianAssistantProfile" SET "referenceId" = $1, "country" = $2, "supervisingDoctorId" = COALESCE($3, "supervisingDoctorId") WHERE "id" = $4`,
        referenceId,
        countryCode,
        supDocId,
        existing.id
      );
      return {
        ...existing,
        referenceId,
        verificationStatus: existing.verificationStatus || 'PENDING',
        country: countryCode,
        supervisingDoctorId: supDocId || existing.supervisingDoctorId,
      };
    }

    const created = await prisma.physicianAssistantProfile.create({
      data: {
        userId: user.id,
        licenseNumber,
        specialty: specialization || 'General PA',
        status: 'ACTIVE',
      },
    });

    await prisma.$executeRawUnsafe(
      `UPDATE "PhysicianAssistantProfile" SET "referenceId" = $1, "verificationStatus" = 'PENDING', "country" = $2, "supervisingDoctorId" = $3 WHERE "id" = $4`,
      referenceId,
      countryCode,
      supDocId,
      created.id
    );

    return {
      ...created,
      referenceId,
      verificationStatus: 'PENDING',
      country: countryCode,
      supervisingDoctorId: supDocId,
    };
  }

  // ─── PHARMACY ─────────────────────────────────────────────────────────────
  if (user.role === 'PHARMACY') {
    let existing = await prisma.pharmacyProfile.findUnique({
      where: { userId: user.id },
    });
    
    if (existing && existing.referenceId) return existing;

    const countryCode = existing?.country || country || 'GH';
    const referenceId = await generateReferenceId(prisma.pharmacyProfile, "PH", countryCode);

    if (existing) {
      return prisma.pharmacyProfile.update({
        where: { id: existing.id },
        data: { referenceId, country: countryCode }
      });
    }

    return prisma.pharmacyProfile.create({
      data: {
        userId: user.id,
        referenceId: referenceId,
        verificationStatus: 'PENDING',
        displayName: `${user.firstName} ${user.lastName}`,
        licenseNumber: `PHARM-${user.id.slice(0, 8).toUpperCase()}`,
        phone: '',
        address: '',
        city: '',
        state: '',
        country: countryCode,
        postalCode: '',
        timezone: 'UTC',
      },
    });
  }

  // ─── LABORATORY ✅ NAYA ADD KIYA ──────────────────────────────────────────
  if (user.role === 'LABORATORY') {
    let existing = await prisma.laboratoryProfile.findUnique({
      where: { userId: user.id },
    });

    const countryCode = existing?.country || country || 'GH';
    const referenceId =
      existing?.referenceId ||
      (await generateReferenceId(prisma.laboratoryProfile, "LB", countryCode));

    const laboratoryName =
      existing?.laboratoryName ||
      existing?.displayName ||
      `${user.firstName} ${user.lastName}`;

    console.log(`[PROVISION] Laboratory Profile - User: ${user.id}, RefID: ${referenceId}, Country: ${countryCode}`);

    if (existing) {
      await prisma.$executeRawUnsafe(
        `UPDATE "LaboratoryProfile" SET "referenceId" = $1, "verificationStatus" = COALESCE("verificationStatus", 'PENDING'), "country" = $2, "laboratoryName" = $3 WHERE "id" = $4`,
        referenceId,
        countryCode,
        laboratoryName,
        existing.id
      );
      return {
        ...existing,
        referenceId,
        verificationStatus: existing.verificationStatus || 'PENDING',
        country: countryCode,
        laboratoryName,
      };
    }

    const created = await prisma.laboratoryProfile.create({
      data: {
        userId: user.id,
        displayName: laboratoryName,
        licenseNumber: `LAB-${user.id.slice(0, 8).toUpperCase()}`,
        phone: '',
        address: '',
        city: '',
        state: '',
        country: countryCode,
        postalCode: '',
        timezone: 'UTC',
      },
    });

    await prisma.$executeRawUnsafe(
      `UPDATE "LaboratoryProfile" SET "referenceId" = $1, "verificationStatus" = 'PENDING', "country" = $2, "laboratoryName" = $3 WHERE "id" = $4`,
      referenceId,
      countryCode,
      laboratoryName,
      created.id
    );

    return {
      ...created,
      referenceId,
      verificationStatus: 'PENDING',
      country: countryCode,
      laboratoryName,
    };
  }

  return null;
}

module.exports = { ensureDefaultProfile };