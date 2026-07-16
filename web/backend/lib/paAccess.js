/**
 * Calculates the active permissions for a Physician Assistant based on the supervising doctor's online status.
 * @param {Object} doctor - The DoctorProfile object containing isOnline status.
 * @param {Object} paPermissions - The PhysicianAssistantProfile object containing permission flags.
 * @returns {Object} An object containing the calculated boolean access flags and isDoctorOnline status.
 */
function calculatePAAccess(doctor, paPermissions) {
    if (!doctor) {
        return {
            canAccessAppointments: false,
            canAccessMySchedule: false,
            canAccessLabReports: false,
            canAccessTelehealthBridge: false,
            canAccessSecureInbox: false,
            isDoctorOnline: false
        };
    }

    if (!doctor.isOnline) {
        // When doctor is OFFLINE, PA gets full access regardless of manual permissions
        return {
            canAccessAppointments: true,
            canAccessMySchedule: true,
            canAccessLabReports: true,
            canAccessTelehealthBridge: true,
            canAccessSecureInbox: true,
            isDoctorOnline: false
        };
    } else {
        // When doctor is ONLINE, PA gets ONLY explicitly granted permissions
        return {
            canAccessAppointments: !!paPermissions?.canAccessAppointments,
            canAccessMySchedule: !!paPermissions?.canAccessMySchedule,
            canAccessLabReports: !!paPermissions?.canAccessLabReports,
            canAccessTelehealthBridge: !!paPermissions?.canAccessTelehealthBridge,
            canAccessSecureInbox: !!paPermissions?.canAccessSecureInbox,
            isDoctorOnline: true
        };
    }
}

module.exports = { calculatePAAccess };
