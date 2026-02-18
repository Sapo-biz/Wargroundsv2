const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return res.status(200).json({
      isPaid: session.payment_status === 'paid',
      customerEmail: session.customer_email,
    });
  } catch (error) {
    console.error('Verify session error:', error);
    return res.status(500).json({ error: error.message });
  }
};
