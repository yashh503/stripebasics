export interface User {
  _id: string;
  email: string;
  name?: string;
  stripeCustomerId?: string;
  subscription?: {
    id: string | null;
    status: SubscriptionStatus | null;
    priceId: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "trialing"
  | "unpaid";

export interface Plan {
  id: string;
  productId: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: "month" | "year" | "week" | "day";
  intervalCount: number;
  features: string[];
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
  plan: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    interval: string;
  };
  paymentMethod?: {
    brand: string;
    last4: string;
  };
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  pdfUrl?: string;
  hostedUrl?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
}
