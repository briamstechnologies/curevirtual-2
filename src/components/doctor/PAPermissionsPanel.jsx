import React, { useState, useEffect } from "react";
import api from "../../Lib/api";
import { toast } from "react-toastify";
import { FiCheck, FiX, FiToggleLeft, FiToggleRight } from "react-icons/fi";

export default function PAPermissionsPanel() {
  const [pas, setPas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPAs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/doctor/my-pas");
      if (res.data) {
        setPas(res.data);
      }
    } catch (err) {
      console.error("Error fetching PAs:", err);
      toast.error("Failed to load Physician Assistants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPAs();
  }, []);

  const handleToggle = async (paId, feature, currentValue) => {
    try {
      // Find the PA in state to get all current permissions
      const pa = pas.find(p => p.id === paId);
      if (!pa) return;
      
      const currentPermissions = {
        canAccessAppointments: pa.canAccessAppointments || false,
        canAccessMySchedule: pa.canAccessMySchedule || false,
        canAccessLabReports: pa.canAccessLabReports || false,
        canAccessTelehealthBridge: pa.canAccessTelehealthBridge || false,
        canAccessSecureInbox: pa.canAccessSecureInbox || false,
      };

      const newPermissions = {
        ...currentPermissions,
        [feature]: !currentValue,
      };

      // Optimistic update
      setPas(pas.map(p => {
        if (p.id === paId) {
          return {
            ...p,
            ...newPermissions
          };
        }
        return p;
      }));

      await api.patch(`/doctor/pa/${paId}/permissions`, {
        permissions: newPermissions
      });
      
      toast.success("Permissions updated");
    } catch (err) {
      console.error("Failed to update permission:", err);
      toast.error("Failed to update permission");
      fetchPAs(); // Revert on failure
    }
  };

  const renderToggle = (pa, label, feature) => {
    const isEnabled = pa[feature] || false;
    return (
      <div className="flex items-center justify-between py-3 border-b border-outline/5 last:border-0">
        <div>
          <h4 className="text-sm font-bold">{label}</h4>
          <p className="text-xs text-on-surface-variant opacity-70">
            Allow access when you are ONLINE.
          </p>
        </div>
        <button
          onClick={() => handleToggle(pa.id, feature, isEnabled)}
          className={`text-3xl transition-colors ${
            isEnabled ? "text-primary" : "text-on-surface-variant opacity-30"
          }`}
        >
          {isEnabled ? <FiToggleRight /> : <FiToggleLeft />}
        </button>
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center animate-pulse">Loading Assistants...</div>;
  }

  if (pas.length === 0) {
    return (
      <div className="card-premium p-8 text-center opacity-70">
        <p>You have no active Physician Assistants assigned.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl mb-6">
        <h3 className="font-bold text-primary flex items-center gap-2">
          <FiCheck className="text-lg" /> How Permissions Work
        </h3>
        <p className="text-xs mt-1 text-on-surface-variant">
          When you are <strong>OFFLINE</strong>, your PAs have full access to all features automatically to manage your practice.
          When you are <strong>ONLINE</strong>, they only have access to the specific features you enable below.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {pas.map((pa) => (
          <div key={pa.id} className="card-premium bg-surface-container-low p-6 border border-outline/10 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4 border-b border-outline/10 pb-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                {pa.firstName?.[0]}
              </div>
              <div>
                <h3 className="font-extrabold text-lg">
                  {pa.firstName} {pa.lastName}
                </h3>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">
                  {pa.specialty || "Physician Assistant"}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              {renderToggle(pa, "Appointments", "canAccessAppointments")}
              {renderToggle(pa, "My Schedule", "canAccessMySchedule")}
              {renderToggle(pa, "Lab Reports", "canAccessLabReports")}
              {renderToggle(pa, "Telehealth Bridge", "canAccessTelehealthBridge")}
              {renderToggle(pa, "Secure Inbox", "canAccessSecureInbox")}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
