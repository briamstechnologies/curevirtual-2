// FILE: src/pages/patient/PatientPrescriptions.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import api from "../../Lib/api";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import DashboardLayout from "../../layouts/DashboardLayout";
import { FaEye, FaDownload } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const role = localStorage.getItem("role");
  const userName = localStorage.getItem("userName");
  const patientUserId = localStorage.getItem("userId"); // ✅ This is User.id

  // For PDF capture
  const pdfRef = useRef(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Simple inline placeholder logo (SVG → data URI)
  const PLACEHOLDER_LOGO =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='50'>
        <rect width='200' height='50' fill='#027906'/>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
              font-size='16' font-family='Arial, Helvetica, sans-serif'
              fill='white'>CureVirtual</text>
      </svg>`
    );

  // --------------------------------------------------------
  // Fetch prescriptions for the logged-in patient
  // --------------------------------------------------------
  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/patient/prescriptions?patientId=${patientUserId}`);
      setPrescriptions(res.data || []);
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
      setError("Failed to fetch prescriptions");
    } finally {
      setLoading(false);
    }
  }, [patientUserId]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const handleView = (prescription) => {
    setSelectedPrescription(prescription);
    setModalOpen(true);
  };

  // --------------------------------------------------------
  // Download PDF (html2canvas + jsPDF)
  // --------------------------------------------------------
  const handleDownloadPdf = async () => {
    if (!pdfRef.current || !selectedPrescription) return;
    try {
      setPdfBusy(true);

      // Lazy-load to keep main bundle smaller
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      // Capture the node
      const canvas = await html2canvas(pdfRef.current, {
        backgroundColor: "#ffffff",
        scale: 2, // sharper
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Fit image to width, maintain aspect
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth - 20; // 10mm margins
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      // Header
      pdf.setFillColor(2, 121, 6); // #027906
      pdf.rect(0, 0, pageWidth, 22, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text("CureVirtual — Prescription", 10, 14);

      // Footer
      const footerY = pageHeight - 10;
      pdf.setTextColor(120);
      pdf.setFontSize(9);
      pdf.text(`Generated ${new Date().toLocaleString()}`, 10, footerY);

      // Body image
      pdf.addImage(imgData, "PNG", 10, 26, imgWidth, Math.min(imgHeight, pageHeight - 36));

      const filenameSafeMed = (selectedPrescription.medication || "prescription")
        .toString()
        .replace(/[^a-z0-9_-]+/gi, "_");
      pdf.save(`${filenameSafeMed}.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
      toast.error("Failed to export PDF");
    } finally {
      setPdfBusy(false);
    }
  };

  // --------------------------------------------------------
  // UI Rendering
  // --------------------------------------------------------
  return (
    <DashboardLayout role={role || "PATIENT"}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <img
            src="/images/logo/Asset3.png"
            alt="CureVirtual"
            style={{ width: 120, height: "auto" }}
            onError={(e) => {
              e.currentTarget.src = PLACEHOLDER_LOGO;
            }} // fallback if missing
          />
          <h1 className="text-3xl font-bold text-on-surface">My Prescriptions</h1>
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {loading ? (
          <p>Loading prescriptions...</p>
        ) : (
          <div className="bg-[var(--bg-glass)] backdrop-blur-md rounded-2xl p-6 shadow-lg overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="p-3">Doctor</th>
                  <th className="p-3">Medication</th>
                  <th className="p-3">Dosage</th>
                  <th className="p-3">Frequency</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.length > 0 ? (
                  prescriptions.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--bg-glass)] transition"
                    >
                      <td className="p-3">
                        {[p.doctor?.user?.firstName, p.doctor?.user?.lastName]
                          .filter(Boolean)
                          .join(" ") || "N/A"}
                      </td>
                      <td className="p-3">{p.medication}</td>
                      <td className="p-3">{p.dosage}</td>
                      <td className="p-3">{p.frequency}</td>
                      <td className="p-3">{p.duration}</td>
                      <td className="p-3">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                          p.dispatchStatus === "DISPENSED" ? "bg-green-500/20 text-green-500" :
                          p.dispatchStatus === "REJECTED" ? "bg-red-500/20 text-red-500" :
                          p.dispatchStatus === "READY" ? "bg-purple-500/20 text-purple-500" :
                          p.dispatchStatus === "ACKNOWLEDGED" ? "bg-blue-500/20 text-blue-500" :
                          "bg-yellow-500/20 text-yellow-500"
                        }`}>
                          {p.dispatchStatus || "PENDING"}
                        </span>
                      </td>
                      <td className="p-3 flex justify-center gap-4">
                        <button
                          onClick={() => handleView(p)}
                          className="p-2 rounded-lg bg-[#dcfce7] hover:scale-110 transition"
                          title="View"
                        >
                          <FaEye className="text-black" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center p-6 text-[var(--text-muted)]">
                      No prescriptions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== MODAL (View + Download) ===== */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-lg relative border border-outline-variant/30">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-outline hover:text-primary transition-colors text-xl p-2 rounded-full hover:bg-surface-container"
            >
              ✖
            </button>
            <div className="mb-4 flex items-center gap-4 border-b border-outline-variant/50 pb-4">
              <img
                src="/images/logo/Asset3.png"
                alt="CureVirtual"
                style={{ width: 100, height: "auto" }}
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER_LOGO;
                }}
              />
              <h2 className="text-xl md:text-2xl font-bold text-on-surface">
                Prescription Details
              </h2>
            </div>

            {/* Export Target */}
            <div ref={pdfRef} className="space-y-3 bg-white rounded-2xl p-5 text-gray-900 shadow-sm border border-gray-100">
              {/* Header in exported area */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/logo/Asset3.png"
                    alt="CureVirtual"
                    style={{ width: 100, height: "auto" }}
                    onError={(e) => {
                      e.currentTarget.src = PLACEHOLDER_LOGO;
                    }}
                  />
                  <div>
                    <h2 className="font-bold text-lg text-green-700">Rx Document</h2>
                    <p className="text-xs text-gray-500 font-mono">
                      Ref: {selectedPrescription?.id?.slice(-8).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">
                    Date:{" "}
                    {selectedPrescription?.createdAt
                      ? new Date(selectedPrescription.createdAt).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    Prescribed By
                  </h4>
                  <p className="font-semibold text-sm">
                    Dr.{" "}
                    {[
                      selectedPrescription?.doctor?.user?.firstName,
                      selectedPrescription?.doctor?.user?.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ") || "Unknown"}
                  </p>
                </div>
                <div className="bg-green-50/50 p-4 rounded-xl border border-green-100/50">
                  <h4 className="text-[10px] uppercase font-bold text-green-600/70 tracking-wider mb-1">
                    Medication
                  </h4>
                  <p className="font-black text-xl text-green-900 mb-2">
                    {selectedPrescription?.medication}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                    <p>
                      <span className="font-semibold">Dosage:</span>{" "}
                      {selectedPrescription?.dosage}
                    </p>
                    <p>
                      <span className="font-semibold">Frequency:</span>{" "}
                      {selectedPrescription?.frequency}
                    </p>
                    <p>
                      <span className="font-semibold">Duration:</span>{" "}
                      {selectedPrescription?.duration}
                    </p>
                  </div>
                </div>
                {selectedPrescription?.notes && (
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      Doctor's Notes
                    </h4>
                    <p className="text-sm italic text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 mt-1">
                      "{selectedPrescription.notes}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleDownloadPdf}
              disabled={pdfBusy}
              className="w-full mt-6 flex justify-center items-center gap-2 px-6 py-4 bg-[#027906] text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:scale-100"
            >
              {pdfBusy ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <FaDownload />
              )}
              {pdfBusy ? "Generating PDF..." : "Download Original PDF"}
            </button>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" theme="dark" />
    </DashboardLayout>
  );
}
