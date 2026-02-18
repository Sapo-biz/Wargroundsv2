const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Vercel needs raw body for webhook signature verification
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['stripe-signature'];

  try {
    const stripeEvent = stripe.webhooks.constructEvent(
      req.body,
      signature,
      endpointSecret
    );

    switch (stripeEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        console.log('Subscription created/updated:', stripeEvent.data.object.id);
        break;
      case 'customer.subscription.deleted':
        console.log('Subscription deleted:', stripeEvent.data.object.id);
        break;
      case 'invoice.payment_succeeded':
        console.log('Payment succeeded:', stripeEvent.data.object.id);
        break;
      case 'invoice.payment_failed':
        console.log('Payment failed:', stripeEvent.data.object.id);
        break;
      default:
        console.log('Unhandled event type:', stripeEvent.type);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }
};

// Disable body parsing so Stripe can verify the raw signature
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
