import React, { useState, useEffect } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import { toast } from "react-toastify";

export default function MedicationTracker() {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", dose: "", time: "08:00 AM", days: "Mon, Tue, Wed, Thu, Fri, Sat, Sun" });

  const fetchMeds = async () => {
    try {
      const res = await api.get("/patient/medications/today");
      setMedications(res.data.data || []);
    } catch (e) {
      console.error("Failed to fetch meds", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeds();
  }, []);

  const toggleMed = async (id) => {
    // Optimistic UI update
    setMedications(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
    try {
      await api.post(`/patient/medications/${id}/toggle`);
    } catch (e) {
      console.error("Toggle failed", e);
      toast.error("Failed to update status");
      // Revert on fail
      setMedications(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
    }
  };

  const handleAddMed = async (e) => {
    e.preventDefault();
    try {
      const daysArray = newMed.days.split(',').map(d => d.trim());
      await api.post("/patient/medications", {
        ...newMed,
        days: daysArray
      });
      toast.success("Medication added");
      setShowAddModal(false);
      fetchMeds();
      setNewMed({ name: "", dose: "", time: "08:00 AM", days: "Mon, Tue, Wed, Thu, Fri, Sat, Sun" });
    } catch (e) {
      toast.error("Failed to add medication");
    }
  };


  return (
    <DashboardLayout role="PATIENT">
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Medication Tracker</h1>
            <p className="text-on-surface-variant font-medium opacity-80 text-lg">Stay synchronized with your recovery schedule.</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-premium bg-primary text-white px-6 py-3 rounded-2xl font-bold tracking-wide flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
            Add Medication
          </button>
        </section>

        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            {/* Timeline Header */}
            <div className="flex justify-between items-center">
              <h2 className="font-headline text-2xl font-bold text-on-surface">Today's Schedule</h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold font-headline transition-all hover:bg-surface-container-high active:scale-95">AM</button>
                <button className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold font-headline transition-all shadow-lg shadow-primary/20">All</button>
                <button className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold font-headline transition-all hover:bg-surface-container-high active:scale-95">PM</button>
              </div>
            </div>

            {/* Vertical Timeline */}
            <div className="relative pl-8 space-y-10 border-l-2 border-outline-variant/30 ml-4">
              {loading ? (
                <div className="text-center py-10 opacity-50 font-bold uppercase tracking-widest text-xs">Loading Schedule...</div>
              ) : medications.length === 0 ? (
                <div className="text-center py-10 opacity-50 font-bold uppercase tracking-widest text-xs">No Medications Scheduled</div>
              ) : medications.map((med) => (
                <div key={med.id} className="relative group">
                  {/* Timeline Node */}
                  <div className={`absolute -left-[41px] top-6 w-5 h-5 rounded-full border-4 border-background transition-all duration-500 z-10 ${med.taken ? "bg-primary scale-125" : "bg-outline-variant"}`}></div>
                  
                  {/* Card */}
                  <div className={`card-premium !p-6 flex items-center justify-between transition-all duration-500 border border-transparent hover:border-primary/20 shadow-md ${med.taken ? "bg-primary-container/5 opacity-60" : "bg-surface-container-lowest"}`}>
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xs ${med.taken ? "bg-primary text-white" : "bg-surface-container-high text-outline"}`}>
                        {med.time.split(" ")[0]}
                        <br/>
                        {med.time.split(" ")[1]}
                      </div>
                      <div>
                        <h3 className={`font-headline text-xl font-bold ${med.taken ? "line-through opacity-50" : "text-on-surface"}`}>{med.name}</h3>
                        <p className="text-on-surface-variant text-sm font-medium opacity-70">{med.dose} • {med.days.join(", ")}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => toggleMed(med.id)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${med.taken ? "bg-primary text-white" : "bg-surface-container hover:bg-primary/10 text-primary"}`}
                    >
                      <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: `'FILL' ${med.taken ? 1 : 0}` }}>
                        {med.taken ? "check_circle" : "circle"}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="card-premium h-full bg-surface-container-low border-none flex flex-col justify-between shadow-xl">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-tertiary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-tertiary/20">
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>clinical_notes</span>
                </div>
                <div>
                  <h3 className="font-headline text-2xl font-bold text-on-surface">Adherence Report</h3>
                  <p className="text-on-surface-variant font-medium text-sm leading-relaxed mt-2 italic">
                    "You've maintained a 92% adherence rate this week. Keep it up!"
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-white/50 p-4 rounded-2xl border border-white/20">
                    <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Missed</p>
                    <p className="text-2xl font-black text-error">2</p>
                  </div>
                  <div className="bg-white/50 p-4 rounded-2xl border border-white/20">
                    <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Taken Today</p>
                    <p className="text-2xl font-black text-primary">1/3</p>
                  </div>
                </div>
              </div>
              
              <button className="btn-premium bg-surface-container-highest text-on-surface w-full py-4 rounded-2xl mt-8 font-black uppercase text-xs tracking-widest">
                Export Log
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container transition-all"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h2 className="text-2xl font-black text-on-surface mb-2">New Medication</h2>
            <p className="text-sm font-medium text-on-surface-variant mb-6">Add a medication to your daily tracker.</p>
            
            <form onSubmit={handleAddMed} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Medication Name</label>
                <input 
                  type="text" 
                  required
                  value={newMed.name}
                  onChange={(e) => setNewMed({...newMed, name: e.target.value})}
                  className="w-full bg-surface-container mt-1 p-4 rounded-xl text-on-surface font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all" 
                  placeholder="e.g. Aspirin"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Dosage</label>
                  <input 
                    type="text" 
                    required
                    value={newMed.dose}
                    onChange={(e) => setNewMed({...newMed, dose: e.target.value})}
                    className="w-full bg-surface-container mt-1 p-4 rounded-xl text-on-surface font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all" 
                    placeholder="e.g. 50mg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Time</label>
                  <input 
                    type="text" 
                    required
                    value={newMed.time}
                    onChange={(e) => setNewMed({...newMed, time: e.target.value})}
                    className="w-full bg-surface-container mt-1 p-4 rounded-xl text-on-surface font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all" 
                    placeholder="e.g. 08:00 AM"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Days</label>
                <input 
                  type="text" 
                  required
                  value={newMed.days}
                  onChange={(e) => setNewMed({...newMed, days: e.target.value})}
                  className="w-full bg-surface-container mt-1 p-4 rounded-xl text-on-surface font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all" 
                />
                <p className="text-[10px] opacity-60 mt-1 ml-1">Comma separated (e.g. Mon, Wed, Fri)</p>
              </div>

              <button type="submit" className="w-full mt-4 py-4 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                Save Medication
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
