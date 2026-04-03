import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { FaSpinner } from "react-icons/fa";

export default function CheckoutForm({ onSuccess, onCancel, clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // You can conditionally change the return URL if needed, but 
        // since we are likely handling it within a SPA without full redirect 
        // using redirect: 'if_required' handles it inside the page if possible.
      },
      redirect: "if_required",
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message);
      } else {
        setMessage("An unexpected error occurred.");
      }
    } else {
      setMessage("Payment Successful!");
      if (onSuccess) {
        onSuccess();
      }
    }

    setIsLoading(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-4 w-full">
      <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
      
      {message && <div id="payment-message" className="text-red-500 font-bold text-sm mt-2">{message}</div>}

      <div className="flex gap-4 mt-6">
        <button
          type="button"
          disabled={isLoading || !stripe || !elements}
          onClick={onCancel}
          className="btn flex-1 bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-soft)]"
        >
          Cancel
        </button>
        <button
          disabled={isLoading || !stripe || !elements}
          id="submit"
          className="btn btn-primary flex-1 bg-[var(--brand-blue)] hover:bg-blue-600 px-6 py-2 rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <FaSpinner className="animate-spin" />
          ) : (
            "Pay Now"
          )}
        </button>
      </div>
    </form>
  );
}
