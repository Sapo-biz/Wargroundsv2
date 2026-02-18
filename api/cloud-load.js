// In-memory storage (note: resets on cold start)
let cloudSaves = {};

module.exports = (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const save = cloudSaves[userId];

    if (!save) {
      return res.status(200).json({ data: null });
    }

    return res.status(200).json({ data: save.data });
  } catch (error) {
    console.error('Cloud load error:', error);
    return res.status(500).json({ error: error.message });
  }
};
