export type BillingInterval = "monthly" | "quarterly";

type StripePrice = {
  id: string;
  product: any;
  unit_amount: number;
  recurring?: {
    interval: string;
    interval_count: number;
  };
};

type Plan = {
  id: string;
  name: string;
  description: string;
  prices: {
    monthly?: {
      priceId: string;
      amount: number;
    };
    quarterly?: {
      priceId: string;
      amount: number;
    };
  };
};

export function mapStripePricesToPlans(prices: StripePrice[]): Plan[] {
  const productMap: Record<string, Plan> = {};
  prices.forEach((price) => {
    const product = price.product
    const productId = product.id;
    const intervalCount = price.recurring?.interval_count;

    if (!productMap[productId]) {
      productMap[productId] = {
        id: productId,
        name: product.name,
        description:
          productId === "prod_Tl8in0lPklIl4L"
            ? "For people just dipping toes before cannonballing."
            : "For people who think sleep is optional.",
        prices: {},
      };
    }

    if (intervalCount === 1) {
      productMap[productId].prices.monthly = {
        priceId: price.id,
        amount: price.unit_amount,
      };
    }

    if (intervalCount === 3) {
      productMap[productId].prices.quarterly = {
        priceId: price.id,
        amount: price.unit_amount,
      };
    }
  });

  return Object.values(productMap);
}

import { useEffect, useState } from "react";
import { getPlans } from "../api/stripeApi";

export default function PlanSelector() {
  const [billing, setBilling] = useState<BillingInterval>("monthly");
  const [plans, setPlans] = useState<Plan[]>();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const GetPlans = async () => {
    const plans = await getPlans();
    const formatedPlans = mapStripePricesToPlans(plans);
    setPlans(formatedPlans);
  };
  useEffect(() => {
    GetPlans();
  }, []);
  if (!plans || plans.length === 0) {
    return <p>Loading</p>;
  }
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <h1 className="text-4xl font-bold text-center mb-4">
          Choose Your Plan 💸
        </h1>
        <p className="text-center text-gray-400 mb-10">
          Pick wisely. Therapy is more expensive.
        </p>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-800 rounded-full p-1 flex">
            {(["monthly", "quarterly"] as BillingInterval[]).map((type) => (
              <button
                key={type}
                onClick={() => setBilling(type)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition
                  ${
                    billing === type
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
              >
                {type === "monthly" ? "Monthly" : "3 Months (Save 💀)"}
              </button>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans?.map((plan: any) => {
            const price = plan?.prices[billing];

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-8 transition hover:scale-[1.02]
                  ${
                    selectedPlan === plan.id
                      ? "border-indigo-500 bg-gray-900"
                      : "border-gray-800 bg-gray-900/50"
                  }`}
              >
                <h2 className="text-2xl font-semibold mb-2">{plan.name}</h2>
                <p className="text-gray-400 mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    ${(price.amount / 100).toFixed(2)}
                  </span>
                  <span className="text-gray-400 ml-2">
                    / {billing === "monthly" ? "month" : "3 months"}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full py-3 rounded-xl font-medium transition
                    ${
                      selectedPlan === plan.id
                        ? "bg-indigo-600 hover:bg-indigo-700"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                >
                  {selectedPlan === plan.id ? "Selected ✅" : "Choose Plan"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
