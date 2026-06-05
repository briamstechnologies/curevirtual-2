import { FiCheckCircle } from "react-icons/fi";

export default function LaboratorySubscription() {
  const plans = [
    {
      name: "Basic",
      price: "$19/month",
      features: ["50 Tests/month", "Basic Reports", "Email Support"]
    },
    {
      name: "Pro",
      price: "$49/month",
      features: ["Unlimited Tests", "Priority Reports", "24/7 Support"]
    },
    {
      name: "Enterprise",
      price: "$99/month",
      features: ["All Features", "API Access", "Dedicated Manager"]
    }
  ];

  return (
    <div className="p-6 md:p-10 min-h-screen bg-[var(--bg-main)]">
      
      <h1 className="text-2xl font-black uppercase mb-8 text-[var(--text-main)]">
        Laboratory Subscription
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan, i) => (
          <div key={i} className="glass-panel p-6 hover:-translate-y-1 transition">
            <h2 className="text-lg font-black">{plan.name}</h2>
            <p className="text-[var(--brand-purple)] font-bold mb-4">
              {plan.price}
            </p>

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