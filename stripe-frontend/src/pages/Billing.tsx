import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useAuth } from "../context/AuthContext";
import { stripeApi } from "../api/stripeApi";
import type { Invoice, Subscription } from "../types";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string
);

function UpdatePaymentForm({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError("");

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Failed to update payment method");
      setIsProcessing(false);
      return;
    }

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      clientSecret,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Failed to update payment method");
      setIsProcessing(false);
      return;
    }

    if (setupIntent?.payment_method) {
      try {
        await stripeApi.updatePaymentMethod(
          setupIntent.payment_method as string
        );
        onSuccess();
      } catch {
        setError("Failed to save payment method");
      }
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <PaymentElement options={{ layout: "tabs" }} />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isProcessing ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

export default function Billing() {
  const { user, logout } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdatePayment, setShowUpdatePayment] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(
    null
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sub, inv] = await Promise.all([
          stripeApi.getCurrentSubscription(),
          stripeApi.getBillingHistory(),
        ]);
        setSubscription(sub);
        setInvoices(inv);
      } catch (error) {
        console.error("Failed to fetch billing data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpdatePaymentClick = async () => {
    try {
      const { clientSecret } = await stripeApi.createSetupIntent();
      setSetupClientSecret(clientSecret);
      setShowUpdatePayment(true);
    } catch (error) {
      console.error("Failed to create setup intent:", error);
    }
  };

  const handlePaymentUpdateSuccess = async () => {
    setShowUpdatePayment(false);
    setSetupClientSecret(null);
    const sub = await stripeApi.getCurrentSubscription();
    setSubscription(sub);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      paid: "bg-green-500/10 text-green-400 border-green-500",
      open: "bg-yellow-500/10 text-yellow-400 border-yellow-500",
      draft: "bg-gray-500/10 text-gray-400 border-gray-500",
      uncollectible: "bg-red-500/10 text-red-400 border-red-500",
      void: "bg-gray-500/10 text-gray-400 border-gray-500",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full border ${
          colors[status] || colors.draft
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-white">Billing</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Payment Method */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Payment Method
              </h2>

              {showUpdatePayment && setupClientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: setupClientSecret,
                    appearance: {
                      theme: "night",
                      variables: {
                        colorPrimary: "#6366f1",
                        colorBackground: "#1f2937",
                        colorText: "#ffffff",
                        colorDanger: "#ef4444",
                        fontFamily: "system-ui, sans-serif",
                        borderRadius: "8px",
                      },
                    },
                  }}
                >
                  <UpdatePaymentForm
                    clientSecret={setupClientSecret}
                    onSuccess={handlePaymentUpdateSuccess}
                    onCancel={() => {
                      setShowUpdatePayment(false);
                      setSetupClientSecret(null);
                    }}
                  />
                </Elements>
              ) : (
                <div className="flex items-center justify-between">
                  {subscription?.paymentMethod ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-gray-700 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-300 uppercase">
                          {subscription.paymentMethod.brand}
                        </span>
                      </div>
                      <span className="text-gray-300">
                        **** **** **** {subscription.paymentMethod.last4}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">No payment method</span>
                  )}
                  <button
                    onClick={handleUpdatePaymentClick}
                    className="text-indigo-400 hover:text-indigo-300 text-sm"
                  >
                    {subscription?.paymentMethod ? "Update" : "Add"} payment
                    method
                  </button>
                </div>
              )}
            </div>

            {/* Billing History */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Billing History
              </h2>

              {invoices.length === 0 ? (
                <p className="text-gray-400">No invoices yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
                        <th className="pb-3 font-medium">Invoice</th>
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Amount</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="text-gray-300">
                          <td className="py-4">{invoice.number || "-"}</td>
                          <td className="py-4">{formatDate(invoice.created)}</td>
                          <td className="py-4">
                            {formatAmount(invoice.amount, invoice.currency)}
                          </td>
                          <td className="py-4">
                            {getStatusBadge(invoice.status)}
                          </td>
                          <td className="py-4">
                            {invoice.pdfUrl && (
                              <a
                                href={invoice.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 text-sm"
                              >
                                Download
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
