import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { stripeApi } from "../api/stripeApi";
import type { Subscription } from "../types";

export default function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const sub = await stripeApi.getCurrentSubscription();
        setSubscription(sub);
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription?")) return;

    try {
      await stripeApi.cancelSubscription();
      const sub = await stripeApi.getCurrentSubscription();
      setSubscription(sub);
      refreshUser();
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      await stripeApi.resumeSubscription();
      const sub = await stripeApi.getCurrentSubscription();
      setSubscription(sub);
      refreshUser();
    } catch (error) {
      console.error("Failed to resume subscription:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-400 border-green-500";
      case "trialing":
        return "bg-blue-500/10 text-blue-400 border-blue-500";
      case "past_due":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500";
      case "canceled":
      case "unpaid":
        return "bg-red-500/10 text-red-400 border-red-500";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Subscription Status Card */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Subscription Status
              </h2>

              {subscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Plan</span>
                    <span className="text-white font-medium">
                      {subscription.plan.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Status</span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                        subscription.status
                      )}`}
                    >
                      {subscription.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Price</span>
                    <span className="text-white">
                      {formatAmount(
                        subscription.plan.amount,
                        subscription.plan.currency
                      )}
                      /{subscription.plan.interval}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">
                      {subscription.cancelAtPeriodEnd
                        ? "Cancels on"
                        : "Renews on"}
                    </span>
                    <span className="text-white">
                      {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  </div>

                  {subscription.paymentMethod && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Payment Method</span>
                      <span className="text-white capitalize">
                        {subscription.paymentMethod.brand} ****
                        {subscription.paymentMethod.last4}
                      </span>
                    </div>
                  )}

                  {subscription.cancelAtPeriodEnd && (
                    <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-400 px-4 py-3 rounded-lg text-sm">
                      Your subscription will be cancelled on{" "}
                      {formatDate(subscription.currentPeriodEnd)}
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-800 flex gap-3">
                    {subscription.cancelAtPeriodEnd ? (
                      <button
                        onClick={handleResumeSubscription}
                        className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                      >
                        Resume Subscription
                      </button>
                    ) : (
                      <button
                        onClick={handleCancelSubscription}
                        className="flex-1 py-2 px-4 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600 rounded-lg transition-colors"
                      >
                        Cancel Subscription
                      </button>
                    )}
                    <Link
                      to="/billing"
                      className="flex-1 py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-center"
                    >
                      Manage Billing
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No active subscription</p>
                  <Link
                    to="/pricing"
                    className="inline-block py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    View Plans
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Actions Card */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Quick Actions
              </h2>

              <div className="space-y-3">
                <Link
                  to="/pricing"
                  className="block w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  View Pricing Plans
                </Link>
                <Link
                  to="/billing"
                  className="block w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Billing History
                </Link>
                <Link
                  to="/billing"
                  className="block w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Update Payment Method
                </Link>
              </div>
            </div>

            {/* Account Info Card */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 md:col-span-2">
              <h2 className="text-lg font-semibold text-white mb-4">
                Account Information
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="text-gray-400 text-sm">Email</span>
                  <p className="text-white">{user?.email}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Member since</span>
                  <p className="text-white">
                    {user?.createdAt
                      ? formatDate(user.createdAt)
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
