import { useState, useRef } from "react";
import { FiUploadCloud, FiFileText, FiUser, FiCheckCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../Lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function UploadReport() {
  const [formData, setFormData] = useState({
    patientName: "",
    testName: "",
    remarks: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append("patientName", formData.patientName);
      data.append("testName", formData.testName);
      data.append("remarks", formData.remarks);
      data.append("report", selectedFile);

      const token = localStorage.getItem("token");

      await api.post("/laboratory/upload-report", data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Report uploaded successfully!");
      setFormData({ patientName: "", testName: "", remarks: "" });
      setSelectedFile(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="LABORATORY">
      <div className="animate-in fade-in duration-700">
        <div className="mb-10">
          <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--text-main)]">
            Upload Report
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mt-2">
            Upload Laboratory Test Reports
          </p>
        </div>

        <div className="glass-panel p-8 max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* PATIENT NAME */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-2 block">
                Patient Name
              </label>
              <div className="relative">
                <FiUser className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] py-4 pl-14 pr-5 outline-none"
                  placeholder="Enter patient name"
                />
              </div>
            </div>

            {/* TEST NAME */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-2 block">
                Test Name
              </label>
              <div className="relative">
                <FiFileText className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  name="testName"
                  value={formData.testName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] py-4 pl-14 pr-5 outline-none"
                  placeholder="Enter test name"
                />
              </div>
            </div>

            {/* FILE UPLOAD */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-2 block">
                Upload Report File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="w-full border-2 border-dashed border-[var(--border)] rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[var(--brand-purple)] transition-all bg-[var(--bg-card)]"
              >
                <FiUploadCloud className="text-5xl text-[var(--brand-purple)] mb-4" />
                <p className="font-bold text-sm text-[var(--text-main)]">Click to upload report</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">PDF only</p>
                {selectedFile && (
                  <div className="mt-4 bg-green-500/10 text-green-500 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold">
                    <FiCheckCircle /> {selectedFile.name}
                  </div>
                )}
              </button>
            </div>

            {/* REMARKS */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-2 block">
                Remarks
              </label>
              <textarea
                rows="5"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 outline-none resize-none"
                placeholder="Write additional remarks..."
              />
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary rounded-2xl px-8 py-4 flex items-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                "Uploading..."
              ) : (
                <>
                  <FiUploadCloud /> Upload Report
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
