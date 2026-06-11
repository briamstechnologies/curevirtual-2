import { useState, useEffect } from "react";
import { FiCheckCircle } from "react-icons/fi";

export default function LaboratorySubscription() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Example API call to fetch subscription plans
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/subscription-plans');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        setPlans(data);
      } catch (err) {
        console.error('Failed to load subscription plans:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  if (loading) {
    return <div className="p-10 text-center">Loading plans...</div>;
  }

  return (
    <div className="p-6 md:p-10 min-h-screen bg-[var(--bg-main)]">
      <h1 className="text-2xl font-black uppercase mb-8 text-[var(--text-main)]">
        Laboratory Subscription
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan, i) => (
          <div key={i} className="glass-panel p-6 hover:-translate-y-1 transition">
            <h2 className="text-lg font-black">{plan.name}</h2>
            <p className="text-[var(--brand-purple)] font-bold mb-4">{plan.price}</p>

            <div className="space-y-2 mb-6">
              {plan.features.map((f, j) => (
                <p key={j} className="text-sm flex items-center gap-2">
                  <FiCheckCircle className="text-green-500" /> {f}
                </p>
              ))}
            </div>

            <button className="w-full bg-[var(--brand-purple)] text-white py-2 rounded-xl font-bold">
              Subscribe
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
