// In-memory storage
let cloudSaves = {};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET',
      },
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { userId, data } = JSON.parse(event.body);

    if (!userId || !data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId and data required' }),
      };
    }

    cloudSaves[userId] = {
      data,
      updatedAt: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Cloud save error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
