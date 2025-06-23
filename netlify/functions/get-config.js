// netlify/functions/get-config.js
exports.handler = async (event, context) => {
  // Verifica autenticazione prima di esporre le config
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    })
  };
};