import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { stripeApi } from "../api/stripeApi";
import type { Plan } from "../types";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const priceId = searchParams.get("priceId");

  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<{
    code: string;
    discountText: string;
  } | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  useEffect(() => {
    if (!priceId) {
      navigate("/pricing");
      return;
    }

    const fetchPlan = async () => {
      try {
        const plans = await stripeApi.getPlans();
        const selectedPlan = plans.find((p) => p.id === priceId);

        if (!selectedPlan) {
          setError("Plan not found");
        } else {
          setPlan(selectedPlan);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch plan details"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlan();
  }, [priceId, navigate]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim() || !priceId) return;

    setIsValidatingPromo(true);
    try {
      const result = await stripeApi.validatePromoCode(promoCode, priceId);
      setPromoApplied({
        code: result.code,
        discountText: result.discountText,
      });
    } catch {
      setPromoApplied(null);
      alert("Invalid or expired promo code");
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!priceId) return;

    setIsRedirecting(true);
    setError("");

    try {
      const { url } = await stripeApi.createCheckoutSession(
        priceId,
        promoApplied?.code
      );
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create checkout session"
      );
      setIsRedirecting(false);
    }
  };
  
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Something went wrong"}</p>
          <Link
            to="/pricing"
            className="text-indigo-400 hover:text-indigo-300"
          >
            Back to Pricing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <Link
            to="/pricing"
            className="text-gray-400 hover:text-white inline-flex items-center"
          >
            <svg
              className="w-4 h-4 mr-2"
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
            Back to Pricing
          </Link>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h1 className="text-2xl font-bold text-white mb-6">
            Complete Your Subscription
          </h1>

          {/* Promo Code */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">
              Promo Code (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter promo code"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleApplyPromo}
                disabled={isValidatingPromo || !promoCode.trim()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isValidatingPromo ? "..." : "Apply"}
              </button>
            </div>
            {promoApplied && (
              <p className="text-green-400 text-sm mt-2">
                {promoApplied.discountText} applied!
              </p>
            )}
          </div>
          
          {/* Order Summary */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="text-white font-medium mb-2">Order Summary</h3>
        <div className="flex justify-between text-gray-300">
          <span>{plan.name}</span>
          <span>
            {formatAmount(plan.amount, plan.currency)}/{plan.interval}
          </span>
        </div>
      </div>


          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg my-4">
              {error}
            </div>
          )}

          <button
            onClick={handleProceedToPayment}
            disabled={isRedirecting || isLoading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRedirecting ? "Redirecting..." : "Proceed to Payment"}
          </button>

          <p className="text-gray-400 text-sm text-center mt-6">
            You will be redirected to Stripe to complete your payment securely.
          </p>
        </div>
      </div>
    </div>
  );
}