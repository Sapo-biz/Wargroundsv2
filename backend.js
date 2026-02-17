/**
 * Backend Server for Orbitron Premium Subscription
 * 
 * Install: npm install express stripe cors dotenv
 * Run: node backend.js
 * 
 * Your .env file should contain:
 * STRIPE_SECRET_KEY=sk_live_your_key_here
 * STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
 */

require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server running' });
});

// Create Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;

    // Use default price ID if not provided
    const finalPriceId = priceId || process.env.STRIPE_PRICE_ID || 'price_1234567890abcdef';
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}?premium=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || process.env.FRONTEND_URL || 'http://localhost:3000',
      billing_address_collection: 'auto',
      customer_email: req.body.email || undefined,
    });

    res.json({ 
      success: true,
      url: session.url,
      sessionId: session.id 
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Verify Session
app.post('/api/verify-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      res.json({
        success: true,
        customerId: session.customer,
        subscriptionId: session.subscription,
        status: 'paid'
      });
    } else {
      res.json({
        success: false,
        status: session.payment_status
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Webhook Handler (for auto-renewal)
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle different events
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      console.log('Subscription active:', event.data.object.id);
      // TODO: Update your database with subscription info
      // e.g., associate user with subscription, set expiry, etc.
      break;

    case 'customer.subscription.deleted':
      console.log('Subscription cancelled:', event.data.object.id);
      // TODO: Mark user as non-premium
      break;

    case 'invoice.payment_succeeded':
      console.log('Payment succeeded:', event.data.object.id);
      // TODO: Extend premium expiry by 1 month
      break;

    case 'invoice.payment_failed':
      console.log('Payment failed:', event.data.object.id);
      // TODO: Notify user
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

app.listen(PORT, () => {
  console.log(`\n✓ Orbitron Backend running on port ${PORT}`);
  console.log(`\n Setup instructions:`);
  console.log(`1. Create .env file with STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY`);
  console.log(`2. Get your Price ID from Stripe Dashboard`);
  console.log(`3. Test with Stripe's test card: 4242 4242 4242 4242`);
  console.log(`\n IMPORTANT: In production, must handle webhooks to auto-renew subscriptions`);
});
