const prisma = require("../prisma/prismaClient");

async function checkPatientBenefits(userId, email) {
  // 1. Check active user subscription first
  const activeSub = await prisma.userSubscription.findFirst({
    where: {
      userId,
      status: "active",
      expiresAt: { gt: new Date() }
    },
    include: { plan: true }
  });

  if (activeSub) {
    return {
      isSubscribed: true,
      source: "subscription",
      perks: activeSub.plan?.perks || {}
    };
  }

  // 2. Check active corporate seat
  const corporateSeat = await prisma.corporateSeat.findFirst({
    where: {
      OR: [
        { employeeUserId: userId },
        { employeeEmail: email?.toLowerCase() }
      ],
      status: "active",
      corporateAccount: { isActive: true }
    },
    include: { corporateAccount: true }
  });

  if (corporateSeat) {
    // Retroactive Auto-link: if seat was assigned before registration, link user.id now
    if (!corporateSeat.employeeUserId && userId) {
      await prisma.corporateSeat.update({
        where: { id: corporateSeat.id },
        data: { employeeUserId: userId }
      }).catch((err) => console.error("Failed to retro-link corporate seat:", err));
    }

    return {
      isSubscribed: true,
      source: "corporate",
      corporateAccountId: corporateSeat.corporateAccountId,
      companyName: corporateSeat.corporateAccount.companyName,
      perks: {
        consultationDiscountPct: 20,
        maxFamilyMembers: 4,
        prioritySupport: true
      }
    };
  }

  return {
    isSubscribed: false,
    source: null,
    perks: {}
  };
}

module.exports = { checkPatientBenefits };
