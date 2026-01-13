import axiosInstance from "./apiConfig";
import type { Plan, Subscription, Invoice } from "../types";

export const stripeApi = {
  getConfig: async (): Promise<{ publishableKey: string }> => {
    const response = await axiosInstance.get("/stripe/config");
    return response.data;
  },

  getPlans: async (): Promise<Plan[]> => {
    const response = await axiosInstance.get<{ plans: Plan[] }>("/stripe/plans");
    return response.data.plans;
  },

  createOrGetCustomer: async (): Promise<{ customerId: string }> => {
    const response = await axiosInstance.post("/stripe/customer");
    return response.data;
  },

  createCheckoutSession: async (
    priceId: string,
    promoCode?: string
  ): Promise<{ url: string }> => {
    const response = await axiosInstance.post(
      "/stripe/create-checkout-session",
      {
        priceId,
        promoCode,
      }
    );
    return response.data;
  },

  getCheckoutSession: async (
    sessionId: string
  ): Promise<{ session: any }> => {
    const response = await axiosInstance.get("/stripe/checkout-session", {
      params: { sessionId },
    });
    return response.data;
  },

  getCurrentSubscription: async (): Promise<Subscription | null> => {
    const response = await axiosInstance.get<{
      subscription: Subscription | null;
    }>("/stripe/subscription");
    return response.data.subscription;
  },

  cancelSubscription: async (): Promise<{ cancelAt: string }> => {
    const response = await axiosInstance.post("/stripe/subscription/cancel");
    return response.data;
  },

  resumeSubscription: async (): Promise<void> => {
    await axiosInstance.post("/stripe/subscription/resume");
  },

  createSetupIntent: async (): Promise<{ clientSecret: string }> => {
    const response = await axiosInstance.post("/stripe/setup-intent");
    return response.data;
  },

  updatePaymentMethod: async (paymentMethodId: string): Promise<void> => {
    await axiosInstance.post("/stripe/payment-method", { paymentMethodId });
  },

  getBillingHistory: async (): Promise<Invoice[]> => {
    const response = await axiosInstance.get<{ invoices: Invoice[] }>(
      "/stripe/billing-history"
    );
    return response.data.invoices;
  },

  validatePromoCode: async (
    code: string,
    priceId?: string
  ): Promise<{
    id: string;
    code: string;
    discountAmount: number;
    discountText: string;
  }> => {
    const response = await axiosInstance.post("/stripe/validate-promo", {
      code,
      priceId,
    });
    return response.data.promoCode;
  },
};
