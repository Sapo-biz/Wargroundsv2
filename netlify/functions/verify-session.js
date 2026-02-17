const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { sessionId } = JSON.parse(event.body);

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        isPaid: session.payment_status === 'paid',
        customerEmail: session.customer_email,
      }),
    };
  } catch (error) {
    console.error('Verify session error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
