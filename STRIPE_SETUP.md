# Stripe Integration Setup Guide

This game uses Stripe for premium subscriptions. Follow these steps to set up real payments.

## 1. Create a Stripe Account

- Go to [stripe.com](https://stripe.com)
- Sign up and verify your account
- Get your **Publishable Key** and **Secret Key** from the Dashboard

## 2. Update Frontend Keys

In `index.html`, find the Stripe.js initialization line and replace:

```javascript
const stripe = Stripe("pk_live_YOUR_PUBLISHABLE_KEY");
```

With your actual publishable key:

```javascript
const stripe = Stripe("pk_live_1234567890abcdef");
```

## 3. Create a Product & Price in Stripe

1. Go to **Products** in your Stripe Dashboard
2. Create a new product: **"Orbitron Premium Monthly"**
3. Add a recurring price:
   - Amount: **$7.99**
   - Billing Interval: **Monthly**
   - Copy the **Price ID** (starts with `price_`)

## 4. Set Up Backend (Node.js Example)

Create an endpoint `/api/create-checkout-session` on your backend:

```javascript
// backend.js (Node.js + Express example)
const express = require("express");
const stripe = require("stripe")("sk_live_YOUR_SECRET_KEY");

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: "price_YOUR_PRICE_ID", // From step 3
          quantity: 1,
        },
      ],
      success_url:
        "https://yoursite.com/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://yoursite.com/",
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

## 5. Handle Success Redirect

When the user completes payment, Stripe redirects to your success URL with `session_id`. Process this:

```javascript
// Verify session in your backend, then:
saveData.premium = true;
saveData.premiumExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
// ... unlock benefits
```

## 6. Test Mode

- Use Stripe Test Keys instead of Live Keys
- Test card: **4242 4242 4242 4242** (any future expiry, any CVC)
- Test subscriptions won't charge real money

## 7. Auto-Renewal & Webhook Management

For production, set up Stripe Webhooks to handle:

- `customer.subscription.updated`
- `customer.subscription.deleted`
- Use webhooks to extend `premiumExpiry` when subscription renews

## 8. Demo Mode

While setting up, use the **"TRY DEMO"** button to test the 30-day trial without Stripe integration.

---

**Next Steps:**

1. Test with Stripe test keys
2. Switch to live keys when ready
3. Set up webhook handlers for auto-renewal
4. Add customer portal for managing subscriptions

For questions, check [Stripe Docs](https://stripe.com/docs/payments/checkout)
