import React, { useState, useEffect } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import { toast } from "react-toastify";

export default function HealthHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    type: "",
    provider: "",
    date: "",
    note: "",
    icon: "clinical_notes"
  });

  const fetchRecords = async () => {
    try {
      const res = await api.get("/patient/health-history");
      setRecords(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch health history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleAddRecord = async (e) => {
    e.preventDefault();
    try {
      await api.post("/patient/health-history", newRecord);
      toast.success("Health record added successfully!");
      setShowAddModal(false);
      setNewRecord({ type: "", provider: "", date: "", note: "", icon: "clinical_notes" });
      fetchRecords();
    } catch (err) {
      toast.error("Failed to add health record");
    }
  };

  const formatDateBadge = (dateStr) => {
    if (!dateStr) return { year: "", day: "Recent" };
    if (dateStr.includes(",")) {
      const parts = dateStr.split(",");
      return { year: parts[1]?.trim() || "", day: parts[0]?.trim() || dateStr };
    }
    if (dateStr.includes("-")) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return {
          year: String(d.getFullYear()),
          day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        };
      }
    }
    return { year: "", day: dateStr };
  };

  const handleDownload = (record) => {
    if (record.resultUrl && record.resultUrl !== "#") {
      window.open(record.resultUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const fileContent = `CUREVIRTUAL MEDICAL RECORD
==========================
Date: ${record.date}
Category: ${record.type}
Provider: ${record.provider}
Status: Verified Record (HIPAA Secure)

Clinical Summary:
-----------------
"${record.note}"

==========================
CureVirtual - Your Health, Our Priority
`;
    const element = document.createElement("a");
    const file = new Blob([fileContent], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${record.type.replace(/\s+/g, "_")}_Record.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <DashboardLayout role="PATIENT">
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-12">
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Health History</h1>
            <p className="text-on-surface-variant font-medium opacity-80 text-lg">A visual narrative of your medical journey.</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-premium bg-primary text-white px-6 py-3 rounded-2xl font-bold tracking-wide flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
            Add Record
          </button>
        </section>
 
        {/* Timeline Visualization */}
        <div className="relative pl-12 space-y-12 ml-6">
          {/* Vertical Trace Line */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-secondary to-tertiary rounded-full opacity-20"></div>
 
          {loading ? (
            <div className="text-center py-12 text-on-surface-variant font-bold">Loading medical records...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant font-bold">No health history records found. Click 'Add Record' to add your past medical history.</div>
          ) : (
            records.map((record) => {
              const badgeDate = formatDateBadge(record.date);
              return (
                <div key={record.id} className="relative group">
                  {/* Timeline Horizontal Connector */}
                  <div className="absolute -left-12 top-8 w-12 h-0.5 bg-outline-variant/30"></div>
                  
                  {/* Timeline Badge */}
                  <div className="absolute -left-[60px] top-4 w-10 h-10 rounded-2xl bg-white shadow-xl border border-outline-variant/30 flex items-center justify-center z-10 transition-transform group-hover:scale-110">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{record.icon || "clinical_notes"}</span>
                  </div>
     
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Date Sidecar */}
                    <div className="md:w-32 flex-shrink-0 pt-6">
                       {badgeDate.year && (
                         <p className="text-[10px] font-black text-outline uppercase tracking-widest">{badgeDate.year}</p>
                       )}
                       <p className="text-lg font-extrabold text-on-surface leading-none">{badgeDate.day}</p>
                    </div>
 
                {/* Content Card */}
                <div className="flex-1 card-premium !p-8 border border-transparent hover:border-primary/10 transition-all hover:bg-surface-container-low">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-headline text-2xl font-bold text-on-surface">{record.type}</h3>
                        <p className="text-primary font-bold text-sm flex items-center gap-1.5 mt-1">
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                          {record.provider}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleDownload(record)}
                        className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary/10 transition-all group"
                      >
                        <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">download</span>
                      </button>
                   </div>
                   <p className="text-on-surface-variant font-medium text-sm leading-relaxed max-w-[600px] italic">
                     "{record.note}"
                   </p>
                   
                   <div className="mt-8 pt-8 border-t border-outline-variant/30 flex gap-4">
                      <div className="px-4 py-2 bg-surface-container-high rounded-xl text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Verified Record</div>
                      <div className="px-4 py-2 bg-secondary-container/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-secondary">HIPAA Secure</div>
                   </div>
                </div>
              </div>
            </div>
          );
        })
      )}
        </div>
      </div>

      {/* Add Health Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container transition-all"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h2 className="text-2xl font-black text-on-surface mb-2">New Health Record</h2>
            <p className="text-sm font-medium text-on-surface-variant mb-6">Add a past consultation, lab result, or medical note.</p>
            
            <form onSubmit={handleAddRecord} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Record Type / Specialty</label>
                <input 
                  type="text" 
                  required
                  value={newRecord.type}
                  onChange={(e) => setNewRecord({...newRecord, type: e.target.value})}
                  className="w-full bg-surface-container mt-1 p-4 rounded-xl text-on-surface font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all" 
                  placeholder="e.g. Cardiology, Hematology, General Visit"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Provider / Clinic Name</label>
                <input 
                  type="text" 
                  required
                  value={newRecord.provider}
                  onChange={(e) => setNewRecord({...newRecord, provider: e.target.value})}
                  className="w-full bg-surface-container mt-1 p-4 rounded-xl text-on-surface font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all" 
                  placeholder="e.g. Dr. Sarah Jenkins"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Date</label>
                <input 
                  type="date" 
                  required
                  value={newRecord.date}
                  onChange={(e) => setNewRecord({...newRecord, date: e.target.value})}
                  className="w-full bg-surface-container mt-1 p-4 rounded-xl text-on-surface font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all" 
                />
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Clinical Note / Summary</label>
                <textarea 
                  required
                  rows={3}
                  value={newRecord.note}
                  onChange={(e) => setNewRecord({...newRecord, note: e.target.value})}
                  className="w-full bg-surface-container mt-1 p-4 rounded-xl text-on-surface font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all" 
                  placeholder="Summary of visit or test result..."
                />
              </div>

              <button type="submit" className="w-full mt-4 py-4 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                Save Health Record
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
