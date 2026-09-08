import React, { useState, useEffect } from "react";
import api from "../../Lib/api";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import BookingSlots from "../../components/BookingSlots";
import CheckoutForm from "../../components/payments/CheckoutForm";

const BookAppointment = () => {
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [formData, setFormData] = useState({
    doctorId: "",
    appointmentDate: "",
    selectedSlotId: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  // Payment workflow states
  const [bookingStep, setBookingStep] = useState("select"); // 'select', 'payment', 'success'
  const [checkoutData, setCheckoutData] = useState(null);
  const [isPaConsult, setIsPaConsult] = useState(false);

  const patientId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName");

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true);
        const res = await api.get("/patient/doctors/all");
        const data = Array.isArray(res.data) ? res.data : res.data.data || [];
        setDoctors(data);
        const paramId = searchParams.get("doctorId");
        if (paramId) {
          const doc = data.find((d) => d.id === paramId);
          if (doc) {
            setSelectedDoctor(doc);
            setFormData((prev) => ({ ...prev, doctorId: doc.id }));
          }
        }
      } catch (err) {
        console.error(
          "[BookAppointment] Failed to load doctors:",
          err.response?.data || err.message
        );
        toast.error("Failed to load doctors");
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, [searchParams]);

  // Handle doctor selection and PA fallback check
  const handleDoctorChange = (doctorId) => {
    const doctor = doctors.find((d) => d.id === doctorId);
    setSelectedDoctor(doctor);
    // Reset PA consult selection by default
    setIsPaConsult(false);
    setFormData({
      ...formData,
      doctorId,
      appointmentDate: "",
      selectedSlotId: "",
    });
  };

  const handleSlotSelect = (slot) => {
    setFormData((prev) => ({ ...prev, selectedSlotId: slot.id }));
  };

  const handleInitializeBooking = async (e) => {
    e.preventDefault();

    if (!formData.selectedSlotId) {
      toast.error("Please select an available time slot");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/schedule/book", {
        startTime: formData.selectedSlotId, // The ID is now the ISO startTime
        doctorId: formData.doctorId,
        patientId,
        reason: formData.reason,
      });

      const appointmentId = res.data?.appointment?.id;
      const fee = selectedDoctor?.consultationFee || 150; // Dynamic consultation fee with 150 GHS fallback

      if (!appointmentId) {
        throw new Error("Invalid booking response from server");
      }

      // Step 2: Spawn Transaction & PA Commission Tracking Record
      let transactionId = null;
      try {
        const activePa = selectedDoctor?.paAssignments?.[0];
        const paProfileId = (isPaConsult && activePa) ? activePa.paId : null;

        const txRes = await api.post("/transactions/consult", {
          appointmentId,
          amountGHS: fee,
          isPaConsult: isPaConsult && !!activePa,
          doctorProfileId: selectedDoctor?.id,
          paProfileId
        });
        transactionId = txRes.data?.transaction?.id;
      } catch (txErr) {
        console.error("Transaction creation failed:", txErr);
        toast.warn("Appointment reserved! Payment setup encountered an issue. Please complete payment from 'My Appointments'.");
        setLoading(false);
        navigate("/patient/appointments");
        return;
      }

      // Step 3: Initiate Paystack Payment Gateway
      try {
        const initRes = await api.post("/payments/v2/initiate", { transactionId });
        if (initRes.data?.authorization_url) {
          toast.info("Redirecting to Paystack Payment Gateway...");
          window.location.href = initRes.data.authorization_url;
          return;
        } else {
          throw new Error("Payment gateway URL not received");
        }
      } catch (payErr) {
        console.error("Paystack initiation failed:", payErr);
        toast.warn("Appointment reserved! Payment initiation failed. Please click 'Pay Now' in 'My Appointments'.");
        setLoading(false);
        navigate("/patient/appointments");
        return;
      }
    } catch (err) {
      console.error("Booking error:", err);
      toast.error(err.response?.data?.error || "Failed to book appointment");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setBookingStep("success");
    setFormData({ doctorId: "", appointmentDate: "", selectedSlotId: "", reason: "" });
    setSelectedDoctor(null);
    setCheckoutData(null);
  };

  const handlePaymentCancel = () => {
    // In a real system, you might want an endpoint to free the slot if canceled,
    // or just let it expire via a background cron job identifying pending payments.
    setBookingStep("select");
    setCheckoutData(null);
    toast.warning("Payment cancelled. The reserved slot will expire.");
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)] text-[var(--text-main)]">
      <Sidebar role="PATIENT" />
      <div className="flex-1 flex flex-col">
        <Topbar userName={userName} />

        <div className="flex-1 p-6">
          <h1 className="text-3xl font-bold text-[var(--text-main)] mb-6 tracking-wide">
            Book Appointment
          </h1>

          <div className="max-w-2xl mx-auto bg-[var(--bg-glass)] p-8 rounded-xl shadow-lg border border-[var(--border)]">
            {bookingStep === "select" && (
              <form onSubmit={handleInitializeBooking} className="space-y-5">
                {/* Doctor Selection */}
                <div>
                  <label className="block font-medium mb-2 text-[var(--text-main)]">
                    Select Doctor
                  </label>
                  <select
                    value={formData.doctorId}
                    onChange={(e) => handleDoctorChange(e.target.value)}
                    className="w-full bg-transparent border border-[var(--border)] rounded-lg p-3 focus:ring-2 focus:ring-blue-500 text-[var(--text-main)]"
                    required
                    disabled={loadingDoctors}
                  >
                    <option value="">
                      {loadingDoctors ? "Loading doctors..." : "Select a doctor"}
                    </option>
                    {doctors.length > 0
                      ? doctors.map((doc) => (
                          <option
                            key={doc.id}
                            value={doc.id}
                            className="bg-[var(--bg-card)] text-[var(--text-main)]"
                          >
                            {doc.user?.firstName} {doc.user?.lastName} —{" "}
                            {doc.specialization || "General Medicine"}
                          </option>
                        ))
                      : !loadingDoctors && <option disabled>No doctors available</option>}
                  </select>
                </div>

                {/* PA Fallback / Co-Sign Option Card (Spec Section 7) */}
                {selectedDoctor && (
                  <div className="bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-transparent border border-amber-500/30 p-5 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg">
                          Physician Assistant Option
                        </span>
                        <span className="text-[11px] text-[var(--text-soft)] font-medium">
                          Faster Availability
                        </span>
                      </div>
                      <input 
                        type="checkbox"
                        id="paToggle"
                        checked={isPaConsult}
                        onChange={(e) => setIsPaConsult(e.target.checked)}
                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>

                    <label htmlFor="paToggle" className="block cursor-pointer space-y-1">
                      <div className="text-sm font-black text-[var(--text-main)]">
                        Physician Assistant — supervised by Dr. {selectedDoctor.user?.firstName} {selectedDoctor.user?.lastName}
                      </div>
                      <p className="text-xs text-[var(--text-soft)] leading-relaxed">
                        Book your consult with a licensed Physician Assistant (PA). Every PA consultation clinical note is thoroughly reviewed and co-signed by Dr. {selectedDoctor.user?.firstName} {selectedDoctor.user?.lastName}.
                      </p>
                    </label>

                    {isPaConsult && (
                      <div className="mt-2 bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <span>🛡️</span>
                        <span>Selected: Physician Assistant — supervised by Dr. {selectedDoctor.user?.firstName} {selectedDoctor.user?.lastName}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Reason */}
                {formData.doctorId && (
                  <div>
                    <label className="block font-medium mb-2 text-[var(--text-main)]">
                      Reason for Visit
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows="3"
                      placeholder="Briefly describe your reason..."
                      className="w-full bg-transparent border border-[var(--border)] rounded-lg p-3 text-[var(--text-main)] focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Date Selection */}
                {formData.doctorId && (
                  <div>
                    <label className="block font-medium mb-2 text-[var(--text-main)]">
                      Select Date
                    </label>
                    <input
                      type="date"
                      value={formData.appointmentDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          appointmentDate: e.target.value,
                          selectedSlotId: "",
                        })
                      }
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full bg-transparent border border-[var(--border)] rounded-lg p-3 text-[var(--text-main)] focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}

                {/* Available Time Slots via Component */}
                {formData.appointmentDate && (
                  <div>
                    <label className="block font-medium mb-2 text-[var(--text-main)]">
                      Select Time Slot
                    </label>
                    <BookingSlots
                      doctorId={formData.doctorId}
                      date={formData.appointmentDate}
                      onSlotSelect={handleSlotSelect}
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !formData.selectedSlotId}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    loading || !formData.selectedSlotId
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-blue-700 hover:bg-blue-800"
                  } text-white`}
                >
                  {loading ? "Preparing..." : "Confirm Booking"}
                </button>
              </form>
            )}

            {bookingStep === "payment" && checkoutData && (
              <CheckoutForm
                appointmentId={checkoutData.appointmentId}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            )}

            {bookingStep === "success" && (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 text-white mb-6">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">
                  Booking Confirmed!
                </h2>
                <p className="text-[var(--text-soft)] mb-6">
                  Your appointment is scheduled. Check your dashboard for details.
                </p>
                <button
                  onClick={() => setBookingStep("select")}
                  className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
                >
                  Book Another Appointment
                </button>
              </div>
            )}

            {/* Selected Doctor Info (Only show while selecting) */}
            {selectedDoctor && bookingStep === "select" && (
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h3 className="font-semibold text-blue-400 mb-2">Selected Doctor</h3>
                <p className="text-[var(--text-soft)]">
                  <strong>Name:</strong> {selectedDoctor.user?.firstName}{" "}
                  {selectedDoctor.user?.lastName}
                </p>
                <p className="text-[var(--text-soft)]">
                  <strong>Specialization:</strong> {selectedDoctor.specialization}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
