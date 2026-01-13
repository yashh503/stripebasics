import Stripe from "stripe";
import config from "../../config/env.js";
import asyncHandler from "../../utils/asyncHandler.js";
import User from "../auth/user.model.js";
import ApiError from "../../utils/ApiError.js";

const stripe = new Stripe(config.stripe.secretKey);

/**
 * Get Stripe publishable key for frontend
 */
export const getPublishableKey = asyncHandler(async (req, res) => {
  res.json({
    publishableKey: config.stripe.publishableKey,
  });
});

/**
 * Get all active recurring plans (prices)
 */
export const getAllPlans = asyncHandler(async (req, res) => {
  const prices = await stripe.prices.list({
    active: true,
    expand: ["data.product"],
    type: "recurring",
  });

  // Filter and format plans
  const plans = prices.data
    .filter((price) => price.product && !price.product.deleted)
    .map((price) => ({
      id: price.id,
      productId: price.product.id,
      name: price.product.name,
      description: price.product.description,
      amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval,
      intervalCount: price.recurring?.interval_count,
      features: price.product.metadata?.features
        ? JSON.parse(price.product.metadata.features)
        : [],
    }));

  res.json({
    message: "Plans fetched successfully",
    plans,
  });
});

/**
 * Create or get Stripe customer for authenticated user
 */
export const createOrGetCustomer = asyncHandler(async (req, res) => {
  const user = req.user;

  // If user already has a Stripe customer ID, return it
  if (user.stripeCustomerId) {
    const customer = await stripe.customers.retrieve(user.stripeCustomerId);
    return res.json({
      message: "Customer retrieved",
      customerId: customer.id,
    });
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: {
      userId: user._id.toString(),
    },
  });

  // Save Stripe customer ID to user
  user.stripeCustomerId = customer.id;
  await user.save();

  res.json({
    message: "Customer created",
    customerId: customer.id,
  });
});

/**
 * Create a Stripe Checkout session for a subscription.
 */
export const createCheckoutSession = asyncHandler(async (req, res) => {
  const { priceId, promoCode } = req.body;
  const user = req.user;

  if (!priceId) {
    throw new ApiError(400, "Price ID is required");
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: user._id.toString(),
      },
    });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save();
  }

  const checkoutOptions = {
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${config.cors.allowedOrigins[0]}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.cors.allowedOrigins[0]}/pricing`,
    metadata: {
      userId: user._id.toString(),
      priceId: priceId,
    },
  };

  if (promoCode) {
    const promoCodes = await stripe.promotionCodes.list({
      code: promoCode,
      active: true,
      limit: 1,
    });
    if (promoCodes.data.length > 0) {
      checkoutOptions.discounts = [{ promotion_code: promoCodes.data[0].id }];
    }
  }

  const session = await stripe.checkout.sessions.create(checkoutOptions);

  res.json({
    message: "Checkout session created",
    url: session.url,
  });
});

/**
 * Get details of a checkout session
 */
export const getCheckoutSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId) {
    throw new ApiError(400, "Session ID is required");
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price.product", "customer"],
  });

  res.json({
    message: "Checkout session fetched",
    session,
  });
});

/**
 * Create Setup Intent for saving payment method
 */
export const createSetupIntent = asyncHandler(async (req, res) => {
  const user = req.user;

  // Ensure user has a Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: user._id.toString(),
      },
    });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save();
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
  });

  res.json({
    clientSecret: setupIntent.client_secret,
  });
});

/**
 * Get user's current subscription
 */
export const getCurrentSubscription = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.stripeCustomerId) {
    return res.json({
      message: "No subscription found",
      subscription: null,
    });
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "all",
    expand: ["data.default_payment_method"],
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    return res.json({
      message: "No subscription found",
      subscription: null,
    });
  }

  const subscription = subscriptions.data[0];
  const updateUser = await User.findByIdAndUpdate(
    user._id,
    { subscription: subscription },
    { new: true, runValidators: true }
  );
  res.json({
    message: "Subscription fetched",
    subscription: {
      id: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      plan: {
        id: subscription.items.data[0].price.id,
        name: subscription.items.data[0].price.product.name,
        amount: subscription.items.data[0].price.unit_amount,
        currency: subscription.items.data[0].price.currency,
        interval: subscription.items.data[0].price.recurring.interval,
      },
      paymentMethod: subscription.default_payment_method
        ? {
            brand: subscription.default_payment_method.card?.brand,
            last4: subscription.default_payment_method.card?.last4,
          }
        : null,
    },
    updateUser,
  });
});

/**
 * Cancel subscription
 */
export const cancelSubscription = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.subscription?.id) {
    throw ApiError.badRequest("No active subscription to cancel");
  }

  const subscription = await stripe.subscriptions.update(user.subscription.id, {
    cancel_at_period_end: true,
  });

  // Update user's subscription status
  user.subscription.cancelAtPeriodEnd = true;
  await user.save();

  res.json({
    message: "Subscription will cancel at period end",
    cancelAt: new Date(subscription.current_period_end * 1000),
  });
});

/**
 * Resume cancelled subscription
 */
export const resumeSubscription = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.subscription?.id) {
    throw ApiError.badRequest("No subscription to resume");
  }

  const subscription = await stripe.subscriptions.update(user.subscription.id, {
    cancel_at_period_end: false,
  });

  user.subscription.cancelAtPeriodEnd = false;
  await user.save();

  res.json({
    message: "Subscription resumed",
    subscription: {
      id: subscription.id,
      status: subscription.status,
    },
  });
});

/**
 * Get billing history (invoices)
 */
export const getBillingHistory = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.stripeCustomerId) {
    return res.json({
      message: "No billing history",
      invoices: [],
    });
  }

  const invoices = await stripe.invoices.list({
    customer: user.stripeCustomerId,
    limit: 10,
  });

  const formattedInvoices = invoices.data.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    amount: invoice.total,
    currency: invoice.currency,
    status: invoice.status,
    created: new Date(invoice.created * 1000),
    pdfUrl: invoice.invoice_pdf,
    hostedUrl: invoice.hosted_invoice_url,
  }));

  res.json({
    message: "Billing history fetched",
    invoices: formattedInvoices,
  });
});

/**
 * Update payment method
 */
export const updatePaymentMethod = asyncHandler(async (req, res) => {
  const { paymentMethodId } = req.body;
  const user = req.user;

  if (!user.stripeCustomerId) {
    throw ApiError.badRequest("No customer found");
  }

  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: user.stripeCustomerId,
  });

  // Set as default payment method
  await stripe.customers.update(user.stripeCustomerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  // Update subscription default payment method if exists
  if (user.subscription?.id) {
    await stripe.subscriptions.update(user.subscription.id, {
      default_payment_method: paymentMethodId,
    });
  }

  res.json({
    message: "Payment method updated",
  });
});

/**
 * Validate promo code
 */
export const validatePromoCode = asyncHandler(async (req, res) => {
  const { code, priceId } = req.body;

  if (!code) {
    throw ApiError.badRequest("Promo code is required");
  }

  const promoCodes = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
  });

  if (!promoCodes.data.length) {
    throw ApiError.badRequest("Invalid or expired promo code");
  }

  const promoCode = promoCodes.data[0];
  const coupon = promoCode.promotion.coupon;

  const couponData = await stripe.coupons.retrieve(coupon);
  console.log(couponData, "couponData");
  // Calculate discount
  let discountAmount = 0;
  let discountText = "";

  if (couponData.percent_off) {
    discountText = `${couponData.percent_off}% off`;
    if (priceId) {
      const price = await stripe.prices.retrieve(priceId);
      discountAmount = Math.round(
        (price.unit_amount * couponData.percent_off) / 100
      );
    }
  } else if (couponData.amount_off) {
    discountAmount = couponData.amount_off;
    discountText = `${(couponData.amount_off / 100).toFixed(
      2
    )} ${couponData.currency.toUpperCase()} off`;
  }

  res.json({
    message: "Promo code valid",
    promoCode: {
      id: promoCode.id,
      code: promoCode.code,
      discountAmount,
      discountText,
      duration: couponData.duration,
      durationInMonths: couponData.duration_in_months,
    },
  });
});

/**
 * Stripe webhook handler
 */
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.stripe.webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    res.status(500).json({ error: "Webhook handler failed" });
  }
};

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdate(subscription) {
  const customerId = subscription.customer;

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) {
    console.log("User not found for customer:", customerId);
    return;
  }

  user.subscription = {
    id: subscription.id,
    status: subscription.status,
    priceId: subscription.items.data[0]?.price.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  await user.save();
  console.log(`Subscription updated for user: ${user.email}`);
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) {
    console.log("User not found for customer:", customerId);
    return;
  }

  user.subscription = {
    id: null,
    status: null,
    priceId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  };

  await user.save();
  console.log(`Subscription deleted for user: ${user.email}`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) return;

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) {
    console.log("User not found for customer:", customerId);
    return;
  }

  // If this is a subscription invoice, ensure subscription is active
  if (user.subscription?.id === subscriptionId) {
    user.subscription.status = "active";
    await user.save();
  }

  console.log(`Payment succeeded for user: ${user.email}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) {
    console.log("User not found for customer:", customerId);
    return;
  }

  // Update subscription status
  if (user.subscription?.id) {
    user.subscription.status = "past_due";
    await user.save();
  }

  console.log(`Payment failed for user: ${user.email}`);
}
