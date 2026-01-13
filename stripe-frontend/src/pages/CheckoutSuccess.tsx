import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { stripeApi } from "../api/stripeApi";
import { useAuth } from "../context/AuthContext";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      setError("No session ID found.");
      return;
    }

    const verifySession = async () => {
      try {
        const { session: fetchedSession } = await stripeApi.getCheckoutSession(
          sessionId
        );
        setSession(fetchedSession);

        if (fetchedSession.payment_status === "paid") {
          // Refresh user data to get updated subscription status
          await refreshUser();
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to verify session."
        );
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [sessionId, refreshUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <p className="text-white ml-4">Verifying your payment...</p>
      </div>
    );
  }

  const isSuccess = session && session.payment_status === "paid";
  const customerEmail = session?.customer?.email;
  const planName = session?.line_items?.data[0]?.price?.product?.name;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {error ? (
          <>
            <h1 className="text-3xl font-bold text-white mb-4">Error</h1>
            <p className="text-red-400 mb-8">{error}</p>
            <Link
              to="/pricing"
              className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Back to Pricing
            </Link>
          </>
        ) : isSuccess ? (
          <>
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">
              Payment Successful!
            </h1>

            <p className="text-gray-400 mb-8">
              Thank you for subscribing to the{" "}
              <span className="font-bold text-white">{planName}</span> plan.
              Your subscription is now active.
            </p>

            {customerEmail && (
              <p className="text-gray-500 text-sm mb-6">
                A confirmation has been sent to {customerEmail}.
              </p>
            )}

            <div className="space-y-3">
              <Link
                to="/dashboard"
                className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Go to Dashboard
              </Link>
              <Link
                to="/billing"
                className="block w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                View Billing Details
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">
              Payment Incomplete
            </h1>

            <p className="text-gray-400 mb-8">
              Your payment was not completed. Please try again or contact
              support if the issue persists.
            </p>

            <div className="space-y-3">
              <Link
                to="/pricing"
                className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Try Again
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}