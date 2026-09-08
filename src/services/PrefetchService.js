import api from "../Lib/api";

class PrefetchService {
  /**
   * Main entry point to prefetch data immediately after login.
   * Call this before redirecting to the dashboard.
   */
  static async prefetchAll(role, userId) {
    if (!role || !userId) return;

    try {
      console.log(`🚀 Starting background prefetch for role: ${role}`);

      if (role === "DOCTOR") {
        await this.prefetchDoctorData(userId);
      } else if (role === "PATIENT") {
        await this.prefetchPatientData(userId);
      } else if (role === "PHARMACY") {
        await this.prefetchPharmacyData(userId);
      } else if (role === "LABORATORY") {
        await this.prefetchLaboratoryData(userId);
      }

      console.log("✅ Background prefetch initiated successfully.");
    } catch (error) {
      console.error("❌ Error during prefetch orchestration:", error);
    }
  }

  /**
   * Fire all Doctor API requests in parallel.
   */
  static async prefetchDoctorData(userId) {
    const requests = [
      this.fetchAndCache("/doctor/stats", "cached_doctor_stats", {}),
      this.fetchAndCache("/doctor/waiting-patients", "cached_doctor_waiting", {}),
      this.fetchAndCache("/doctor/appointments", "cached_doctor_appointments", { page: 1, limit: 10 }),
      this.fetchAndCache("/doctor/patients", "cached_doctor_patients", { page: 1, limit: 10 }),
      this.fetchAndCache("/schedule", "cached_doctor_schedules", { doctorId: userId }, true),
      this.fetchAndCache("/doctor/profile", "cached_doctor_profile", { userId }, true),
      this.fetchAndCache("/consultations/pa/doctor-consultations", "cached_doctor_pa_logs", {}),
      this.fetchAndCache("/doctor/lab-reports", "cached_doctor_lab_reports", {}, true),
      this.fetchAndCache("/doctor/prescriptions", "cached_doctor_prescriptions", { doctorId: userId }),
      this.fetchAndCache("/videocall/list", "cached_doctor_video_consultations", { userId, role: "DOCTOR" }, true),
      this.fetchAndCache("/messages/inbox", "cached_inbox_messages", { userId }, true)
    ];

    await Promise.allSettled(requests);
  }

  /**
   * Fire all Patient API requests in parallel.
   */
  static async prefetchPatientData(userId) {
    const requests = [
      this.fetchAndCache("/patient/stats", "cached_patient_stats", { patientId: userId }, true),
      this.fetchAndCache("/patient/appointments", "cached_patient_appointments", { patientId: userId }, true),
      this.fetchAndCache("/patient/prescriptions", "cached_patient_prescriptions", { patientId: userId }, true),
      this.fetchAndCache("/patient/medications/today", "cached_patient_medications_today", {}, true),
      this.fetchAndCache("/patient/health-history", "cached_patient_health_history", {}, true),
      this.fetchAndCache("/patient/doctors", "cached_patient_doctors", { patientUserId: userId }, true),
      this.fetchAndCache("/videocall/list", "cached_patient_video_consultations", { userId, role: "PATIENT" }, true),
      this.fetchAndCache("/patient/profile", "cached_patient_profile", { userId }, true),
      this.fetchAndCache("/pharmacy/list", "cached_pharmacy_list", {}, true),
      this.fetchAndCache("/laboratory/list", "cached_laboratory_list", {}, true),
      this.fetchAndCache("/messages/inbox", "cached_inbox_messages", { userId }, true)
    ];

    await Promise.allSettled(requests);
  }

  /**
   * Fire all Pharmacy API requests in parallel.
   */
  static async prefetchPharmacyData(userId) {
    const requests = [
      this.fetchAndCache("/pharmacy/stats", "cached_pharmacy_stats", { userId }, true),
      this.fetchAndCache("/pharmacy/prescriptions", "cached_pharmacy_prescriptions", { userId }),
      this.fetchAndCache("/pharmacy/profile", "cached_pharmacy_profile", { userId }, true),
      this.fetchAndCache("/subscriptions/me", "cached_user_subscriptions", {})
    ];

    await Promise.allSettled(requests);
  }

  /**
   * Fire all Laboratory API requests in parallel.
   */
  static async prefetchLaboratoryData(userId) {
    const requests = [
      this.fetchAndCache("/laboratory/stats", "cached_laboratory_stats", { userId }, true),
      this.fetchAndCache("/laboratory/profile", "cached_laboratory_profile", { userId }, true),
      this.fetchAndCache("/subscriptions/me", "cached_user_subscriptions", {})
    ];

    await Promise.allSettled(requests);
  }

  /**
   * Helper function to fetch from API and cache in localStorage
   */
  static async fetchAndCache(endpoint, cacheKey, params = {}, nestedData = false) {
    try {
      const res = await api.get(endpoint, { params });
      
      let payload = nestedData ? (res.data?.data ?? res.data ?? []) : (res.data ?? []);
      
      if (!Array.isArray(payload) && typeof payload === "object" && payload !== null) {
        if (Array.isArray(payload.data)) {
          payload = payload.data;
        } else if (Array.isArray(payload.plans)) {
          payload = payload.plans;
        } else if (Array.isArray(payload.subscriptions)) {
          payload = payload.subscriptions;
        }
      }

      localStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch (err) {
      console.error(`⚠️ Prefetch failed for ${endpoint}:`, err.message);
    }
  }
}

export default PrefetchService;
