// In-memory storage (shared with cloud-save)
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

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId required' }),
      };
    }

    const save = cloudSaves[userId];

    if (!save) {
      return {
        statusCode: 200,
        body: JSON.stringify({ data: null }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ data: save.data }),
    };
  } catch (error) {
    console.error('Cloud load error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
