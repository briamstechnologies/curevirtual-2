// FILE: src/pages/patient/MyAppointments.jsx
import { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import {
  FaPlusCircle,
  FaTrash,
  FaVideo,
  FaCalendarAlt,
  FaClock,
  FaEllipsisH,
  FaCheckCircle,
  FaPhoneAlt,
  FaSpinner,
  FaInfoCircle,
  FaTimes,
  FaSync,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { formatLiteralDateTime } from "../../Lib/timeUtils";
import BookingSlots from "../../components/BookingSlots";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "../../components/CheckoutForm";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

function getInitials(name) {
  if (!name) return "DR";
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts[1]?.[0] || "";
  return (first + last).toUpperCase() || "DR";
}

function formatDateFormatted(dateStr) {
  if (!dateStr) return "Scheduled";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow =
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear();

    const monthDay = d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

    if (isToday) return `Today, ${monthDay}`;
    if (isTomorrow) return `Tomorrow, ${monthDay}`;
    return monthDay;
  } catch {
    return dateStr;
  }
}

function formatTimeFormatted(dateStr) {
  if (!dateStr) return "TBD";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return dateStr;
  }
}

export default function MyAppointments() {
  const role = "PATIENT";
  const patientUserId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Patient";
  const navigate = useNavigate();
  const location = useLocation();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [bookOpen, setBookOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toCancelId, setToCancelId] = useState(null);
  const [rescheduleId, setRescheduleId] = useState(null);
  const [joiningCallId, setJoiningCallId] = useState(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState(null);
  const [activeTab, setActiveTab] = useState("UPCOMING"); // UPCOMING | PAST | CANCELLED
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [selectedApptDetail, setSelectedApptDetail] = useState(null);

  const prevCallStatuses = useRef({});
  const todayStr = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    doctorId: "",
    appointmentDate: todayStr,
    selectedSlotId: "",
    reason: "",
  });

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/patient/appointments", {
        params: { patientId: patientUserId },
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAppointments(data);
    } catch (err) {
      console.error("Error loading appointments:", err);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [patientUserId]);

  const loadDoctors = useCallback(async () => {
    try {
      const res = await api.get("/patient/doctors", { params: { patientUserId } });
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      if (list.length > 0) {
        setDoctors(
          list.map((d) => ({
            id: d.id,
            name: d.user
              ? `Dr. ${d.user.firstName} ${d.user.lastName}`.trim()
              : "Doctor",
            specialization: d.specialization || "General Physician",
          }))
        );
      } else {
        const allRes = await api.get("/patient/doctors/all");
        const allList = Array.isArray(allRes.data) ? allRes.data : allRes.data?.data || [];
        setDoctors(
          allList.map((d) => ({
            id: d.id,
            name: d.user
              ? `Dr. ${d.user.firstName} ${d.user.lastName}`.trim()
              : "Doctor",
            specialization: d.specialization || "General Physician",
          }))
        );
      }
    } catch (err) {
      console.error("Error loading doctors:", err);
    }
  }, [patientUserId]);

  useEffect(() => {
    if (patientUserId && !location.state?.prefillDoctorId) {
      fetchAppointments();
      loadDoctors();
    } else if (patientUserId) {
      fetchAppointments();
    }
  }, [fetchAppointments, loadDoctors, location.state, patientUserId]);

  useEffect(() => {
    if (location.state?.prefillDoctorId) {
      const prefillId = location.state.prefillDoctorId;
      const prefillName = location.state.prefillDoctorName || "Doctor";
      const prefillSpec = location.state.prefillDoctorSpec || "General Physician";

      // Set ONLY the selected doctor so NO OTHER doctor appears in the dropdown!
      setDoctors([{ id: prefillId, name: prefillName, specialization: prefillSpec }]);
      setForm((prev) => ({
        ...prev,
        doctorId: prefillId,
        appointmentDate: todayStr,
        selectedSlotId: "",
      }));
      setBookOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, todayStr]);

  // Polling: Check callStatus every 5 seconds
  useEffect(() => {
    const approvedIds = appointments
      .filter((a) => a.status === "APPROVED" && (a.callStatus || "idle") !== "ended")
      .map((a) => a.id);

    if (approvedIds.length === 0) return;

    const pollStatuses = async () => {
      try {
        const updates = await Promise.allSettled(
          approvedIds.map((id) => api.get(`/appointments/${id}/status`))
        );

        setAppointments((prev) =>
          prev.map((a) => {
            const match = updates.find(
              (u) => u.status === "fulfilled" && u.value.data.appointmentId === a.id
            );
            if (match) {
              const newStatus = match.value.data.callStatus;
              const oldStatus = prevCallStatuses.current[a.id] || a.callStatus || "idle";

              if (oldStatus !== "requested" && newStatus === "requested") {
                toast.info("📞 Doctor is calling you! Click Join to connect.", {
                  autoClose: false,
                  toastId: `call-${a.id}`,
                });
              }

              prevCallStatuses.current[a.id] = newStatus;
              return { ...a, callStatus: newStatus };
            }
            return a;
          })
        );
      } catch {
        // Silent polling failure
      }
    };

    pollStatuses();
    const interval = setInterval(pollStatuses, 5000);
    return () => clearInterval(interval);
  }, [appointments.length]);

  const handleSlotSelect = (slot) => {
    const slotId = slot?.id || slot?.startTime || slot;
    setForm((prev) => ({ ...prev, selectedSlotId: slotId }));
  };

  const handleUpdate = (appt) => {
    const docObj = appt.doctor;
    const docName = docObj?.user
      ? `Dr. ${docObj.user.firstName} ${docObj.user.lastName}`.trim()
      : appt.doctorName || "Doctor";
    const docSpec = docObj?.specialization || "General Physician";

    setRescheduleId(appt.id);
    setDoctors([{ id: appt.doctorId, name: docName, specialization: docSpec }]);
    setForm({
      doctorId: appt.doctorId,
      appointmentDate: todayStr,
      selectedSlotId: "",
      reason: appt.reason || "",
    });
    setBookOpen(true);
  };

  const handleInitializeBooking = async (e) => {
    e.preventDefault();
    if (!form.selectedSlotId) {
      toast.error("Please select an available time slot");
      return;
    }

    try {
      await api.post("/schedule/book", {
        startTime: form.selectedSlotId,
        doctorId: form.doctorId,
        patientId: patientUserId,
        reason: form.reason || "Patient Booking",
      });

      if (rescheduleId) {
        await api.patch(`/patient/appointments/${rescheduleId}/cancel`);
        toast.success("Appointment rescheduled successfully!");
      } else {
        toast.success("Appointment booked successfully!");
      }

      setBookOpen(false);
      setRescheduleId(null);
      setForm({ doctorId: "", appointmentDate: todayStr, selectedSlotId: "", reason: "" });
      await fetchAppointments();
    } catch (err) {
      console.error("Booking error:", err);
      toast.error(err?.response?.data?.error || "Failed to book appointment");
    }
  };

  const askCancel = (id) => {
    setToCancelId(id);
    setConfirmOpen(true);
    setOpenDropdownId(null);
  };

  const confirmCancel = async () => {
    if (!toCancelId) return;
    try {
      await api.patch(`/patient/appointments/${toCancelId}/cancel`);
      toast.success("Appointment cancelled");
      setConfirmOpen(false);
      setToCancelId(null);
      await fetchAppointments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to cancel appointment");
    }
  };

  // Filter appointments by active tab
  const filteredAppointments = appointments.filter((a) => {
    if (activeTab === "UPCOMING") {
      return a.status !== "CANCELLED" && a.status !== "COMPLETED";
    }
    if (activeTab === "PAST") {
      return a.status === "COMPLETED";
    }
    if (activeTab === "CANCELLED") {
      return a.status === "CANCELLED";
    }
    return true;
  });

  return (
    <DashboardLayout role={role} user={{ name: userName }}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="w-full space-y-6 pb-12 font-body px-1 sm:px-2 md:px-4">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight"
              style={{ background: "none", WebkitTextFillColor: "#0f172a", textTransform: "none" }}
            >
              My Appointments
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-[var(--text-soft)] mt-1">
              View and manage your upcoming and past consultations.
            </p>
          </div>
          <button
            onClick={async () => {
              await loadDoctors();
              setForm((prev) => ({ ...prev, appointmentDate: todayStr }));
              setBookOpen(true);
            }}
            className="btn btn-primary !px-5 !py-3 !rounded-2xl !text-xs !normal-case flex items-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-base">calendar_month</span>
            <span>Book Appointment</span>
          </button>
        </div>

        {/* TAB FILTERS */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1">
          {[
            { id: "UPCOMING", label: "Upcoming" },
            { id: "PAST", label: "Past" },
            { id: "CANCELLED", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 font-bold text-xs sm:text-sm transition-all relative ${
                activeTab === tab.id
                  ? "text-[var(--brand-green)] border-b-2 border-[var(--brand-green)]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* INFO BANNER */}
        <div className="bg-sky-50/80 border border-sky-200/70 rounded-2xl p-4 flex items-center gap-3 text-sky-900 text-xs sm:text-sm font-semibold shadow-xs">
          <FaInfoCircle className="text-sky-600 text-lg shrink-0" />
          <span>Join becomes available 15 minutes before your visit.</span>
        </div>

        {/* INCOMING CALL BANNER */}
        {appointments.some((a) => a.status === "APPROVED" && a.callStatus === "requested") && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl animate-pulse flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <FaPhoneAlt className="text-emerald-600 animate-bounce" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black text-emerald-800 uppercase tracking-wider">
                  Incoming Doctor Call
                </p>
                <p className="text-xs font-medium text-emerald-700">
                  Your doctor is waiting on video. Click Join to connect now!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* APPOINTMENT CARDS LIST */}
        <div className="space-y-4">
          {loading ? (
            <div className="card !p-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="h-8 w-8 border-4 border-[var(--brand-green)]/20 border-t-[var(--brand-green)] rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-500">Loading appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="card !p-12 flex flex-col items-center justify-center gap-3 text-center bg-white rounded-3xl border border-slate-200/80">
              <span className="material-symbols-outlined text-4xl text-slate-400">event_busy</span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">No {activeTab.toLowerCase()} appointments</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  You don't have any appointments in this category right now.
                </p>
              </div>
              <button
                onClick={async () => {
                  await loadDoctors();
                  setBookOpen(true);
                }}
                className="btn btn-primary !px-4 !py-2 !rounded-xl !text-xs !normal-case mt-2"
              >
                <span>Book an Appointment</span>
              </button>
            </div>
          ) : (
            filteredAppointments.map((appt) => {
              const doc = appt.doctor;
              const docUser = doc?.user;
              const docName = docUser
                ? `Dr. ${docUser.firstName} ${docUser.lastName}`
                : appt.doctorName || "Dr. Medical Specialist";
              const specialty = doc?.specialization || "General Physician";
              const avatar = doc?.avatarUrl || docUser?.avatarUrl || null;
              const isCalling = appt.callStatus === "requested";

              return (
                <div
                  key={appt.id}
                  className={`bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] relative transition-all ${
                    isCalling ? "ring-2 ring-emerald-500 bg-emerald-50/20" : ""
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                    {/* Doctor Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center shadow-xs">
                        {avatar ? (
                          <img src={avatar} alt={docName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-[var(--brand-green)] to-[var(--brand-blue)] text-white font-black text-xl flex items-center justify-center">
                            {getInitials(docName)}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                            {docName}
                          </h2>
                          <span
                            className="material-symbols-outlined text-[var(--brand-green)] text-base"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                            title="Verified Doctor"
                          >
                            verified
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500">{specialty}</p>

                        <div className="pt-1 space-y-1">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <span className="material-symbols-outlined text-sm text-slate-400">calendar_today</span>
                            <span>{formatDateFormatted(appt.appointmentDate)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                            <span>{formatTimeFormatted(appt.appointmentDate)} (GMT)</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <span className="material-symbols-outlined text-sm text-slate-400">videocam</span>
                            <span>Video Consultation</span>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="pt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#e6f4ea] text-[#137333] border border-emerald-200/60">
                            {appt.status === "PENDING"
                              ? "Pending Approval"
                              : appt.status === "APPROVED" || appt.status === "CONFIRMED"
                              ? "Confirmed"
                              : appt.status}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#e6f4ea] text-[#137333] border border-emerald-200/60">
                            Payment Paid
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Top Right Options Menu (...) */}
                    <div className="absolute top-5 right-5">
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === appt.id ? null : appt.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <FaEllipsisH className="text-base" />
                        </button>

                        {openDropdownId === appt.id && (
                          <div className="absolute right-0 mt-1 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-20 animate-in fade-in duration-200">
                            {appt.status !== "CANCELLED" && appt.status !== "COMPLETED" && (
                              <>
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    handleUpdate(appt);
                                  }}
                                  className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <FaCalendarAlt className="text-slate-400" />
                                  <span>Reschedule</span>
                                </button>
                                <button
                                  onClick={() => askCancel(appt.id)}
                                  className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <FaTrash className="text-red-400" />
                                  <span>Cancel</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={() =>
                        navigate(
                          `/patient/video-consultation?room=${appt.roomName || appt.id}`
                        )
                      }
                      className="w-full sm:w-auto flex-1 btn btn-primary !px-5 !py-2.5 !rounded-xl !text-xs !normal-case flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
                    >
                      <span className="material-symbols-outlined text-base">videocam</span>
                      <span>Join Video Visit</span>
                    </button>
                    <button
                      onClick={() => setSelectedApptDetail(appt)}
                      className="w-full sm:w-auto flex-1 btn btn-secondary !px-5 !py-2.5 !rounded-xl !text-xs !normal-case flex items-center justify-center font-bold"
                    >
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedApptDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Appointment Details</h3>
              <button
                onClick={() => setSelectedApptDetail(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-500 block">Doctor:</span>
                <span className="font-bold text-sm text-slate-900">
                  {selectedApptDetail.doctor?.user
                    ? `Dr. ${selectedApptDetail.doctor.user.firstName} ${selectedApptDetail.doctor.user.lastName}`
                    : selectedApptDetail.doctorName || "Doctor"}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">Specialization:</span>
                <span>{selectedApptDetail.doctor?.specialization || "General Physician"}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">Date & Time:</span>
                <span>
                  {formatDateFormatted(selectedApptDetail.appointmentDate)} at{" "}
                  {formatTimeFormatted(selectedApptDetail.appointmentDate)}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">Reason for Visit:</span>
                <span>{selectedApptDetail.reason || "General Consultation"}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">Status:</span>
                <span className="font-bold text-emerald-700">{selectedApptDetail.status}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedApptDetail(null)}
                className="btn btn-secondary !px-4 !py-2 !rounded-xl !text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOOK / RESCHEDULE MODAL */}
      {bookOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {rescheduleId ? "Reschedule Appointment" : "Book New Appointment"}
              </h3>
              <button
                onClick={() => {
                  setBookOpen(false);
                  setRescheduleId(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleInitializeBooking} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Doctor</label>
                <select
                  value={form.doctorId}
                  onChange={(e) => setForm({ ...form, doctorId: e.target.value, selectedSlotId: "" })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800"
                  required
                >
                  {doctors.length > 1 && <option value="">Choose a doctor...</option>}
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Date</label>
                <input
                  type="date"
                  value={form.appointmentDate}
                  min={todayStr}
                  onChange={(e) =>
                    setForm({ ...form, appointmentDate: e.target.value, selectedSlotId: "" })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800"
                  required
                />
              </div>

              {form.doctorId && form.appointmentDate && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Available Time Slots</label>
                  <BookingSlots
                    doctorId={form.doctorId}
                    date={form.appointmentDate}
                    onSlotSelect={handleSlotSelect}
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Visit</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Describe your symptoms or reason for visit..."
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800 h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setBookOpen(false);
                    setRescheduleId(null);
                  }}
                  className="btn btn-secondary !px-4 !py-2 !rounded-xl !text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary !px-5 !py-2 !rounded-xl !text-xs"
                >
                  {rescheduleId ? "Confirm Reschedule" : "Book Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto text-xl">
              <FaTrash />
            </div>
            <h3 className="text-base font-bold text-slate-900">Cancel Appointment?</h3>
            <p className="text-xs text-slate-500 font-medium">
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="btn btn-secondary !px-4 !py-2 !rounded-xl !text-xs flex-1"
              >
                No, Keep
              </button>
              <button
                onClick={confirmCancel}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex-1 transition-colors"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
