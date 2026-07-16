// FILE: backend/utils/auditLogger.js
const prisma = require("../prisma/prismaClient");

/**
 * Log an action to the AuditTrail table.
 * 
 * @param {string} userId - User performing the action
 * @param {string} role - Role of the user performing the action
 * @param {string} action - Action description (e.g. "PA_ASSIGNED", "CONSULTATION_ROUTED")
 * @param {string} entityType - The type of entity being affected (e.g. "ConsultationLog", "PhysicianAssistant")
 * @param {string} entityId - The ID of the entity being affected
 * @param {any} [oldValue=null] - Pre-action value/state
 * @param {any} [newValue=null] - Post-action value/state
 * @param {string} [ipAddress=null] - IP address of the requester
 */
async function logAuditTrail(userId, role, action, entityType, entityId, oldValue = null, newValue = null, ipAddress = null) {
  try {
    const oldStr = oldValue ? (typeof oldValue === "object" ? JSON.stringify(oldValue) : String(oldValue)) : null;
    const newStr = newValue ? (typeof newValue === "object" ? JSON.stringify(newValue) : String(newValue)) : null;

    await prisma.auditTrail.create({
      data: {
        userId,
        role,
        action,
        entityType,
        entityId,
        oldValue: oldStr,
        newValue: newStr,
        ipAddress,
      },
    });
  } catch (err) {
    console.error("❌ Failed to write to AuditTrail:", err.message);
  }
}

module.exports = { logAuditTrail };
