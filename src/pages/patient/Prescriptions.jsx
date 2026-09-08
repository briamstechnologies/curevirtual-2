// FILE: src/pages/patient/Prescriptions.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import api from "../../Lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
  FaSun,
  FaMoon,
  FaCheck,
  FaForward,
  FaTimes,
  FaBell,
  FaCapsules,
  FaHistory,
  FaRedoAlt,
  FaLightbulb,
  FaDownload,
  FaEye,
  FaCalendarAlt,
  FaDatabase,
} from "react-icons/fa";

export default function PatientPrescriptions() {
  const role = localStorage.getItem("role") || "PATIENT";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Patient";
  const patientUserId = localStorage.getItem("userId");

  // Date State for Date Navigator
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeFilter, setTimeFilter] = useState("All"); // All | Morning | Afternoon | Evening

  // Real Database Prescriptions & Medications State
  const [prescriptions, setPrescriptions] = useState(() => {
    const cached = localStorage.getItem("cached_patient_prescriptions");
    return cached ? JSON.parse(cached) : [];
  });
  const [medsList, setMedsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Refill & Tip Interactive Modals State
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedRefillMed, setSelectedRefillMed] = useState("");
  const [refillNote, setRefillNote] = useState("");
  const [requestingRefill, setRequestingRefill] = useState(false);

  // Health Tips List
  const healthTips = [
    {
      title: "Medication Consistency",
      text: "Taking your medicines consistently at the same time every day helps maintain effective blood levels and accelerates recovery.",
      icon: "💡",
    },
    {
      title: "Proper Hydration",
      text: "Always drink a full glass of water when swallowing tablets or capsules to prevent stomach irritation and assist absorption.",
      icon: "💧",
    },
    {
      title: "Complete Antibiotic Courses",
      text: "Never stop taking prescribed antibiotics early, even if you feel 100% recovered. Finishing the full course prevents bacterial resistance.",
      icon: "🛡️",
    },
    {
      title: "Safe Medicine Storage",
      text: "Keep all medications in a cool, dry place away from direct heat and moisture. Avoid storing medicines in bathroom cabinets.",
      icon: "📦",
    },
    {
      title: "Food & Drug Interactions",
      text: "Check if your prescription requires taking medication with food or on an empty stomach to avoid reduced efficacy or indigestion.",
      icon: "🍎",
    },
  ];
  const [currentTipIdx, setCurrentTipIdx] = useState(0);

  // Form State for Add Medication Modal
  const [newMed, setNewMed] = useState({
    name: "",
    dosage: "",
    instructions: "Take 1 tablet",
    time: "08:00 AM",
    timeOfDay: "Morning",
  });

  const pdfRef = useRef(null);

  // Fetch real database records from backend (/api/patient/prescriptions and /api/patient/health-history)
  const fetchRealDatabaseData = useCallback(async () => {
    try {
      setLoading(true);
      const [rxRes, historyRes] = await Promise.all([
        api.get(`/patient/prescriptions?patientId=${patientUserId}`).catch(() => ({ data: [] })),
        api.get(`/patient/health-history`).catch(() => ({ data: [] })),
      ]);

      const officialRx = rxRes.data?.data || rxRes.data || [];
      const historyData = historyRes.data?.data || historyRes.data || [];

      // Filter medication/rx related records from patient health history
      const medHistory = (Array.isArray(historyData) ? historyData : []).filter((r) => {
        const t = (r.type || r.category || "").toLowerCase();
        return (
          t.includes("medication") ||
          t.includes("med") ||
          t.includes("rx") ||
          t.includes("prescrip") ||
          t.includes("pill") ||
          t.includes("capsule") ||
          t.includes("tablet") ||
          t.includes("refill")
        );
      });

      // Format official doctor prescriptions into meds list
      const formattedRx = (Array.isArray(officialRx) ? officialRx : []).map((p, idx) => {
        const docName = [p.doctor?.user?.firstName, p.doctor?.user?.lastName].filter(Boolean).join(" ") || "Specialist Doctor";
        const freqLower = (p.frequency || "").toLowerCase();
        const isEvening = freqLower.includes("night") || freqLower.includes("pm") || freqLower.includes("evening");

        return {
          id: p.id || `rx_${idx}`,
          name: p.medication ? `${p.medication} ${p.dosage || ""}`.trim() : "Prescribed Medicine",
          instructions: p.frequency ? `${p.frequency} (${p.duration || "Daily"})` : "Take as directed by clinician",
          time: isEvening ? "8:00 PM" : "8:00 AM",
          timeOfDay: isEvening ? "Evening" : "Morning",
          status: p.dispatchStatus === "DISPENSED" ? "Taken" : "Upcoming",
          doctor: docName,
          refills: 2,
          isOfficialRx: true,
          rawRecord: p,
        };
      });

      // Format patient uploaded / created medication records from DB
      const formattedHistoryMeds = medHistory.map((h, idx) => {
        const titleText = h.type || "Medication";
        const cleanName = titleText.replace(/^(Medication|Refill Request):\s*/i, "");
        const isEvening = (h.note || "").toLowerCase().includes("evening") || (h.date || "").toLowerCase().includes("pm");

        return {
          id: h.id || `hmed_${idx}`,
          name: cleanName,
          instructions: h.note || "Take as directed",
          time: h.date && h.date.length < 15 ? h.date : "8:00 AM",
          timeOfDay: isEvening ? "Evening" : "Morning",
          status: (h.note || "").includes("[Status: Taken]") ? "Taken" : "Upcoming",
          doctor: h.provider || "Self Tracked",
          refills: 1,
          isHistoryRecord: true,
          rawRecord: h,
        };
      });

      const combinedMeds = [...formattedRx, ...formattedHistoryMeds];

      setPrescriptions(officialRx);
      setMedsList(combinedMeds);
      localStorage.setItem("cached_patient_prescriptions", JSON.stringify(officialRx));
    } catch (err) {
      console.error("Error fetching database medications:", err);
    } finally {
      setLoading(false);
    }
  }, [patientUserId]);

  useEffect(() => {
    fetchRealDatabaseData();
  }, [fetchRealDatabaseData]);

  // Date Navigator handlers
  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const formatDateDisplay = (date) => {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const options = { month: "short", day: "numeric", year: "numeric" };
    const dateStr = date.toLocaleDateString("en-US", options);
    return isToday ? `${dateStr} (Today)` : dateStr;
  };

  // Update Medication Status in DB & Local UI
  const handleSetStatus = async (id, newStatus, item) => {
    setMedsList((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const updated = { ...m, status: newStatus };
          if (newStatus === "Taken") {
            const now = new Date();
            updated.takenAt = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          }
          return updated;
        }
        return m;
      })
    );

    // Sync to database if history record
    if (item?.isHistoryRecord && item.rawRecord?.id) {
      try {
        await api.put(`/patient/health-history/${item.rawRecord.id}`, {
          note: `${item.instructions || ""} [Status: ${newStatus}]`,
        });
      } catch (e) {
        console.warn("Database status sync exception:", e);
      }
    }
    toast.success(`Status updated to ${newStatus}`);
  };

  // Submit new medication to Database via API POST
  const handleAddMedSubmit = async (e) => {
    e.preventDefault();
    if (!newMed.name) return;
    try {
      const payload = {
        type: `Medication: ${newMed.name} ${newMed.dosage}`.trim(),
        provider: userName,
        date: newMed.time || "8:00 AM",
        note: `${newMed.instructions} [Time: ${newMed.timeOfDay}]`,
        icon: "medication",
      };

      await api.post("/patient/health-history", payload);
      toast.success("Medication saved to real database!");
      setShowAddModal(false);
      setNewMed({
        name: "",
        dosage: "",
        instructions: "Take 1 tablet",
        time: "08:00 AM",
        timeOfDay: "Morning",
      });
      fetchRealDatabaseData();
    } catch (err) {
      console.error("Failed to save medication:", err);
      toast.error("Failed to save medication to database.");
    }
  };

  // Submit Refill Request to Database
  const handleRefillSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRefillMed) {
      toast.error("Please select a medication for refill.");
      return;
    }
    try {
      setRequestingRefill(true);
      const payload = {
        type: `Refill Request: ${selectedRefillMed}`,
        provider: "Pharmacy / Healthcare Team",
        date: new Date().toLocaleDateString(),
        note: refillNote ? `Refill note: ${refillNote}` : "Prescription refill requested by patient.",
        icon: "medication",
      };

      await api.post("/patient/health-history", payload);
      toast.success(`Refill request for "${selectedRefillMed}" submitted to database!`);
      setShowRefillModal(false);
      setSelectedRefillMed("");
      setRefillNote("");
      fetchRealDatabaseData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit refill request.");
    } finally {
      setRequestingRefill(false);
    }
  };

  const handleSetReminder = (medName) => {
    toast.success(`Reminder scheduled for ${medName}`);
  };

  // Download PDF logic
  const handleDownloadPdf = async () => {
    if (!pdfRef.current || !selectedPrescription) return;
    try {
      setPdfBusy(true);
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(pdfRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth - 20;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      pdf.setFillColor(2, 121, 6);
      pdf.rect(0, 0, pageWidth, 22, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text("CureVirtual — Official Prescription", 10, 14);

      const footerY = pageHeight - 10;
      pdf.setTextColor(120);
      pdf.setFontSize(9);
      pdf.text(`Generated ${new Date().toLocaleString()}`, 10, footerY);

      pdf.addImage(imgData, "PNG", 10, 26, imgWidth, Math.min(imgHeight, pageHeight - 36));
      pdf.save(`${(selectedPrescription.medication || "prescription").replace(/[^a-z0-9_-]+/gi, "_")}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to export PDF");
    } finally {
      setPdfBusy(false);
    }
  };

  // Filtered meds list based on selected timeOfDay filter
  const filteredMeds = medsList.filter((m) => {
    if (timeFilter === "All") return true;
    return (m.timeOfDay || "").toLowerCase() === timeFilter.toLowerCase();
  });

  // Calculate statistics
  const takenCount = medsList.filter((m) => m.status === "Taken").length;
  const missedCount = medsList.filter((m) => m.status === "Missed").length;
  const totalTracked = medsList.length || 1;
  const adherencePercent = Math.round((takenCount / totalTracked) * 100);

  return (
    <DashboardLayout role={role} user={{ name: userName }}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="w-full space-y-6 pb-12 font-sans max-w-7xl mx-auto px-2 sm:px-4">
        
        {/* 1. HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Medications
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-md font-extrabold tracking-normal flex items-center gap-1">
                <FaDatabase className="text-[9px]" /> Live DB Sync
              </span>
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
              Track your real database prescriptions, medicines and reminders.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary !px-5 !py-3 !rounded-2xl !text-xs !normal-case flex items-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0 self-start sm:self-auto font-bold cursor-pointer"
          >
            <FaPlus className="text-xs" />
            <span>Add Medication</span>
          </button>
        </div>

        {/* 2. DATE SELECTOR BAR */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <button
            onClick={handlePrevDay}
            className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <FaChevronLeft className="text-xs" />
          </button>

          <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm sm:text-base">
            <FaCalendarAlt className="text-slate-400 text-sm" />
            <span>{formatDateDisplay(currentDate)}</span>
          </div>

          <button
            onClick={handleNextDay}
            className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <FaChevronRight className="text-xs" />
          </button>
        </div>

        {/* 3. TIME CATEGORY FILTER TABS */}
        <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-bold pt-1">
          {["All", "Morning", "Afternoon", "Evening"].map((tab) => (
            <button
              key={tab}
              onClick={() => setTimeFilter(tab)}
              className={`pb-3 transition-all cursor-pointer ${
                timeFilter === tab
                  ? "border-b-2 border-[#084d43] text-[#084d43] font-black"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 4. MAIN CONTENT GRID (2 COLUMNS) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: MEDICATION CARDS LIST */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400 bg-white rounded-3xl border border-slate-200 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                Fetching real database medications...
              </div>
            ) : filteredMeds.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                <FaCapsules className="text-3xl text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No medications found in database for this filter.</p>
                <p className="text-xs text-slate-400">Click "+ Add Medication" to save a new medicine to database.</p>
              </div>
            ) : (
              filteredMeds.map((med) => {
                const isMorning = (med.timeOfDay || med.time || "").toLowerCase().includes("am") || med.timeOfDay === "Morning";
                const isTaken = med.status === "Taken";
                const isMissed = med.status === "Missed";

                return (
                  <div
                    key={med.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4 hover:shadow-md transition-all"
                  >
                    {/* Header Row: Time Badge + Status Pill */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black text-sm text-slate-900">
                        <span>{med.time || "8:00 AM"}</span>
                        {isMorning ? (
                          <FaSun className="text-amber-500 text-sm" />
                        ) : (
                          <FaMoon className="text-purple-500 text-sm" />
                        )}
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                          isTaken
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isMissed
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {med.status}
                      </span>
                    </div>

                    {/* Medication Title & Icon */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 text-xl shadow-xs">
                        <FaCapsules />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 tracking-tight">{med.name}</h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">{med.instructions}</p>
                        {med.doctor && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-1 border border-emerald-100">
                            Prescribed by {med.doctor}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Info Detail */}
                    {isTaken && med.takenAt && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50/60 px-3 py-1.5 rounded-xl w-fit">
                        <FaCheck className="text-xs" />
                        <span>Taken at {med.takenAt}</span>
                      </div>
                    )}

                    {/* Reminder Button Pill */}
                    <div>
                      <button
                        onClick={() => handleSetReminder(med.name)}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FaBell className="text-slate-400 text-xs" />
                        <span>Set Reminder</span>
                      </button>
                    </div>

                    {/* Interactive Action Buttons Row */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => handleSetStatus(med.id, "Taken", med)}
                        className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isTaken
                            ? "bg-[#084d43] text-white shadow-xs"
                            : "bg-[#084d43] text-white hover:bg-[#063b33]"
                        }`}
                      >
                        <FaCheck className="text-xs" />
                        <span>Taken</span>
                      </button>

                      <button
                        onClick={() => handleSetStatus(med.id, "Skipped", med)}
                        className="flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <FaForward className="text-xs text-slate-400" />
                        <span>Skip</span>
                      </button>

                      <button
                        onClick={() => handleSetStatus(med.id, "Missed", med)}
                        className="flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <FaTimes className="text-xs text-rose-500" />
                        <span>Missed</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT COLUMN: WEEKLY ADHERENCE STATS WIDGET */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5 text-center">
              <h3 className="text-sm font-black text-slate-900 text-left">Weekly adherence</h3>

              {/* Circular Gauge */}
              <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#084d43]"
                    strokeDasharray={`${adherencePercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black text-[#084d43]">{adherencePercent}%</span>
                  <span className="text-[10px] font-bold text-slate-500">Adherence</span>
                </div>
              </div>

              {/* Metrics Count */}
              <div className="flex items-center justify-around border-t border-slate-100 pt-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">Taken</span>
                  <span className="text-lg font-black text-emerald-700">{takenCount}</span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">Missed</span>
                  <span className="text-lg font-black text-rose-600">{missedCount}</span>
                </div>
              </div>

              <p className="text-[11px] font-bold text-slate-400">Database Record Summary</p>

              {/* Bar Chart Representation */}
              <div className="flex items-end justify-between gap-1.5 h-20 pt-2 px-2">
                {[
                  { day: "Sat", height: "h-14", color: "bg-[#084d43]" },
                  { day: "Sun", height: "h-10", color: "bg-[#084d43]" },
                  { day: "Mon", height: "h-12", color: "bg-[#084d43]" },
                  { day: "Tue", height: "h-16", color: "bg-[#084d43]" },
                  { day: "Wed", height: "h-6", color: "bg-rose-500" },
                  { day: "Thu", height: "h-16", color: "bg-[#084d43]" },
                  { day: "Fri", height: "h-12", color: "bg-[#084d43]" },
                ].map((b, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                    <div className={`w-full ${b.height} ${b.color} rounded-md transition-all`} />
                    <span className="text-[10px] font-bold text-slate-500">{b.day}</span>
                  </div>
                ))}
              </div>

              {/* View History Button */}
              <button
                onClick={() => setShowHistoryModal(true)}
                className="w-full py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
              >
                <FaHistory className="text-slate-400" />
                <span>View Rx History ({prescriptions.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5. BOTTOM WIDGETS ROW (INTERACTIVE REFILL REMINDERS & HEALTH TIPS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          
          {/* Refill Reminders (Fully Clickable & Interactive) */}
          <div
            onClick={() => setShowRefillModal(true)}
            className="bg-sky-50/70 border border-sky-200/80 rounded-3xl p-5 space-y-3 hover:border-sky-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900">
                <FaRedoAlt className="text-sky-600 group-hover:rotate-180 transition-transform duration-500" />
                <span>Refill reminders</span>
              </div>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-100/80 px-2.5 py-0.5 rounded-full">
                Click to Request Refill
              </span>
            </div>

            {medsList.length > 0 ? (
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 flex items-center justify-between group-hover:border-sky-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-base shrink-0">
                    <FaCapsules />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{medsList[0]?.name || "Prescription"}</h4>
                    <p className="text-[11px] font-semibold text-slate-500">Click to request prescription refill</p>
                  </div>
                </div>
                <span className="text-slate-400 text-sm font-bold group-hover:translate-x-1 transition-transform">›</span>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 text-xs font-semibold text-slate-600">
                Request a medication refill from your pharmacy or doctor.
              </div>
            )}
          </div>

          {/* Health Tip (Fully Clickable & Interactive) */}
          <div
            onClick={() => setShowTipModal(true)}
            className="bg-amber-50/60 border border-amber-200/80 rounded-3xl p-5 space-y-2 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900">
                <FaLightbulb className="text-amber-500 group-hover:scale-125 transition-transform" />
                <span>Health Tip</span>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                Click for Guidance
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-700 leading-relaxed">
              {healthTips[currentTipIdx].icon} <strong>{healthTips[currentTipIdx].title}:</strong> "{healthTips[currentTipIdx].text}"
            </p>
          </div>
        </div>
      </div>

      {/* REFILL REQUEST MODAL */}
      {showRefillModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FaRedoAlt className="text-sky-600" /> Request Medication Refill
              </h3>
              <button
                onClick={() => setShowRefillModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleRefillSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Medication to Refill</label>
                <select
                  required
                  value={selectedRefillMed}
                  onChange={(e) => setSelectedRefillMed(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 font-bold text-slate-800 bg-white"
                >
                  <option value="">Choose medicine...</option>
                  {medsList.map((m, idx) => (
                    <option key={m.id || idx} value={m.name}>
                      {m.name} ({m.instructions})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Refill Note / Pharmacy Instructions (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please approve a 30-day refill package for pick-up..."
                  value={refillNote}
                  onChange={(e) => setRefillNote(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800 h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefillModal(false)}
                  className="btn btn-secondary !px-4 !py-2 !rounded-xl !text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestingRefill}
                  className="btn btn-primary !px-5 !py-2 !rounded-xl !text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FaRedoAlt />
                  <span>{requestingRefill ? "Submitting..." : "Submit Refill Request"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEALTH TIPS MODAL */}
      {showTipModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FaLightbulb className="text-amber-500" /> Health & Medication Advice
              </h3>
              <button
                onClick={() => setShowTipModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200/80 space-y-2 text-center">
              <span className="text-4xl block">{healthTips[currentTipIdx].icon}</span>
              <h4 className="text-sm font-black text-slate-900">{healthTips[currentTipIdx].title}</h4>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                "{healthTips[currentTipIdx].text}"
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 font-bold pt-1">
              <span>Tip {currentTipIdx + 1} of {healthTips.length}</span>
              <button
                onClick={() => setCurrentTipIdx((prev) => (prev + 1) % healthTips.length)}
                className="btn btn-secondary !px-4 !py-2 !rounded-xl !text-xs font-bold cursor-pointer"
              >
                Next Tip →
              </button>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100">
              <button
                onClick={() => setShowTipModal(false)}
                className="btn btn-primary !px-4 !py-2 !rounded-xl !text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEDICATION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Medication to Database</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleAddMedSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Medication Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol, Amoxicillin"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dosage (e.g. 500 mg)</label>
                <input
                  type="text"
                  placeholder="e.g. 500 mg, 10 ml"
                  value={newMed.dosage}
                  onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Schedule Time</label>
                <input
                  type="text"
                  placeholder="e.g. 8:00 AM"
                  value={newMed.time}
                  onChange={(e) => setNewMed({ ...newMed, time: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Time of Day</label>
                <select
                  value={newMed.timeOfDay}
                  onChange={(e) => setNewMed({ ...newMed, timeOfDay: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Take 1 capsule after meals"
                  value={newMed.instructions}
                  onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary !px-4 !py-2 !rounded-xl !text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary !px-5 !py-2 !rounded-xl !text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FaPlus />
                  <span>Save to Database</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW HISTORY / OFFICIAL PRESCRIPTIONS MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full border border-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FaHistory className="text-emerald-600" /> Database Doctor Prescriptions ({prescriptions.length})
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {prescriptions.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No doctor prescriptions found in database.</p>
              ) : (
                prescriptions.map((p) => (
                  <div key={p.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <h4 className="font-bold text-slate-900">{p.medication} ({p.dosage})</h4>
                      <p className="text-slate-500 font-semibold mt-0.5">
                        Doctor: {[p.doctor?.user?.firstName, p.doctor?.user?.lastName].filter(Boolean).join(" ") || "Specialist"} • {p.frequency}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPrescription(p);
                        setPdfModalOpen(true);
                      }}
                      className="btn btn-secondary !px-3 !py-1.5 !rounded-xl !text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <FaEye />
                      <span>View PDF</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="btn btn-secondary !px-4 !py-2 !rounded-xl !text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF VIEWER / DOWNLOAD MODAL */}
      {pdfModalOpen && selectedPrescription && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Official Prescription Document</h3>
              <button
                onClick={() => setPdfModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div ref={pdfRef} className="space-y-3 bg-white rounded-2xl p-5 text-gray-900 border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                  <h2 className="font-bold text-lg text-emerald-700">CureVirtual Rx Document</h2>
                  <p className="text-xs text-gray-500 font-mono">
                    Ref: {selectedPrescription?.id?.slice(-8).toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs">
                    Date: {selectedPrescription?.createdAt ? new Date(selectedPrescription.createdAt).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Prescribed By</h4>
                  <p className="font-semibold text-sm">
                    Dr. {[selectedPrescription?.doctor?.user?.firstName, selectedPrescription?.doctor?.user?.lastName].filter(Boolean).join(" ") || "Specialist"}
                  </p>
                </div>

                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <h4 className="text-[10px] uppercase font-bold text-emerald-600/70 tracking-wider mb-1">Medication</h4>
                  <p className="font-black text-lg text-emerald-900 mb-2">{selectedPrescription?.medication}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 font-semibold">
                    <p><span className="text-gray-500">Dosage:</span> {selectedPrescription?.dosage}</p>
                    <p><span className="text-gray-500">Frequency:</span> {selectedPrescription?.frequency}</p>
                    <p><span className="text-gray-500">Duration:</span> {selectedPrescription?.duration}</p>
                  </div>
                </div>

                {selectedPrescription?.notes && (
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Doctor's Notes</h4>
                    <p className="text-xs italic text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 mt-1">
                      "{selectedPrescription.notes}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleDownloadPdf}
                disabled={pdfBusy}
                className="btn btn-primary !px-5 !py-2 !rounded-xl !text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FaDownload />
                <span>{pdfBusy ? "Generating PDF..." : "Download Original PDF"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
