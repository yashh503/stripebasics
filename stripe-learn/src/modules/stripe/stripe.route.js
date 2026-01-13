import express from "express";
import * as stripeController from "./stripe.controller.js";
import { authenticate } from "../auth/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/config", stripeController.getPublishableKey);
router.get("/plans", stripeController.getAllPlans);

// Webhook (RAW BODY REQUIRED - no auth)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeController.stripeWebhook
);

// Protected routes (require authentication)
router.use(authenticate);

// Customer
router.post("/customer", stripeController.createOrGetCustomer);

// Subscriptions
router.post(
  "/create-checkout-session",
  stripeController.createCheckoutSession
);
router.get("/checkout-session", stripeController.getCheckoutSession);
router.get("/subscription", stripeController.getCurrentSubscription);
router.post("/subscription/cancel", stripeController.cancelSubscription);
router.post("/subscription/resume", stripeController.resumeSubscription);

// Payment
router.post("/setup-intent", stripeController.createSetupIntent);
router.post("/payment-method", stripeController.updatePaymentMethod);

// Billing
router.get("/billing-history", stripeController.getBillingHistory);

// Promo codes
router.post("/validate-promo", stripeController.validatePromoCode);

export default router;
