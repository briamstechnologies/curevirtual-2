import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import api from "../../Lib/api";
import { FaArrowLeft } from "react-icons/fa";

export default function AppointmentPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await api.get(`/patient/doctors/${doctorId}`);
        setDoctor(res.data);
      } catch (err) {
        console.error("Failed to fetch doctor", err);
        setError("Unable to load doctor details.");
      } finally {
        setLoading(false);
      }
    };
    fetchDoctor();
  }, [doctorId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading doctor information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen p-6 ${theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
    >
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-[var(--brand-blue)] hover:underline"
      >
        <FaArrowLeft /> Back
      </button>
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">
          Dr. {doctor.user?.firstName} {doctor.user?.lastName}
        </h1>
        <p className="mb-2">
          <strong>Specialization:</strong> {doctor.specialization}
        </p>
        <p className="mb-4">
          <strong>Experience:</strong> {doctor.experience || "N/A"} years
        </p>
        <button
          onClick={() => navigate(`/patient/book-appointment?doctorId=${doctorId}`)}
          className="px-4 py-2 bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-green)] text-white rounded-lg hover:opacity-90 transition"
        >
          Book Appointment
        </button>
      </div>
    </div>
  );
}
