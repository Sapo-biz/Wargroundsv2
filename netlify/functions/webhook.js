const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const signature = event.headers['stripe-signature'];

  try {
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      endpointSecret
    );

    // Handle subscription events
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

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Webhook signature verification failed' }),
    };
  }
};
