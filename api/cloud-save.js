// In-memory storage (note: resets on cold start, same as Netlify)
// For persistent storage, use a database like Vercel KV or Supabase
let cloudSaves = {};

module.exports = (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, data } = req.body;

    if (!userId || !data) {
      return res.status(400).json({ error: 'userId and data required' });
    }

    cloudSaves[userId] = {
      data,
      updatedAt: new Date().toISOString(),
    };

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Cloud save error:', error);
    return res.status(500).json({ error: error.message });
  }
};
