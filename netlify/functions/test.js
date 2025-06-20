// netlify/functions/test.js
// Minimal test function per verificare deployment

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Netlify Functions are working!',
      timestamp: new Date().toISOString(),
      path: event.path,
      queryStringParameters: event.queryStringParameters
    })
  };
};