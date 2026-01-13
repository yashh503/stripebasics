import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { stripeApi } from "../api/stripeApi";
import type { Plan } from "../types";

export default function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<1 | 3>(1);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const fetchedPlans = await stripeApi.getPlans();
        console.log(fetchedPlans, "fetchedPlansfetchedPlansfetchedPlans");
        setPlans(fetchedPlans);
      } catch (error) {
        console.error("Failed to fetch plans:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const filteredPlans = plans.filter(
    (plan) => plan.intervalCount === billingInterval
  );

  const handleSelectPlan = (priceId: string) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/checkout?priceId=${priceId}` } });
      return;
    }

    navigate(`/checkout?priceId=${priceId}`);
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const hasActiveSubscription = user?.subscription?.status === "active";

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Select the plan that best fits your needs. All plans include a
            14-day free trial.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-900 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setBillingInterval(1)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === 1
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval(3)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === 3
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              3 Monthly
              <span className="ml-1 text-xs text-green-400">Save 20%</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">
              No plans available for this billing interval.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col"
              >
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white">
                    {plan.name}
                  </h3>
                  {plan.description && (
                    <p className="text-gray-400 text-sm mt-1">
                      {plan.description}
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">
                    {formatAmount(plan.amount, plan.currency)}
                  </span>
                  <span className="text-gray-400">/{plan.interval}</span>
                </div>

                {plan.features.length > 0 && (
                  <ul className="space-y-3 mb-6 flex-grow">
                    {plan.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-start text-gray-300"
                      >
                        <svg
                          className="w-5 h-5 text-green-400 mr-2 flex-shrink-0"
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
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={hasActiveSubscription}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    hasActiveSubscription
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {hasActiveSubscription ? "Already Subscribed" : "Get Started"}
                </button>
              </div>
            ))}
          </div>
        )}

        {!isAuthenticated && (
          <p className="text-center text-gray-400 mt-8">
            Already have an account?{" "}
            <a href="/login" className="text-indigo-400 hover:text-indigo-300">
              Sign in
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
