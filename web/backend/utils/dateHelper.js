/**
 * Calculates exact calendar expiration date and time for a subscription.
 * - StartedAt: exact date & time when payment was successful / subscription activated.
 * - Monthly: exact +1 calendar month at the exact same time of day.
 * - Annual/Yearly: exact +1 calendar year at the exact same time of day.
 * 
 * Handles month-end overflow edge cases (e.g. Jan 31 + 1 month -> Feb 28/29).
 */
function calculateSubscriptionExpiry(startedAt = new Date(), billingCycle = "monthly") {
  const startDate = startedAt instanceof Date ? new Date(startedAt.getTime()) : new Date(startedAt);
  const expiry = new Date(startDate.getTime());
  const normalizedCycle = String(billingCycle || "monthly").toLowerCase();

  if (normalizedCycle === "annual" || normalizedCycle === "yearly") {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else {
    // Monthly (default)
    const currentMonth = expiry.getMonth();
    expiry.setMonth(currentMonth + 1);
    
    // Handle month-end rollover edge cases (e.g., Jan 31 -> Feb 28/29)
    if (expiry.getMonth() !== (currentMonth + 1) % 12) {
      expiry.setDate(0); // Set to last day of target month
    }
  }

  return expiry;
}

module.exports = {
  calculateSubscriptionExpiry
};
