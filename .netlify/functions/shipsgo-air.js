// .netlify/functions/shipsgo-air.js
exports.handler = async (event, context) => {
  
  // Chiamata all'API v2.0 di ShipsGo
  const response = await fetch('https://api.shipsgo.com/api/v2/airtracking/shipments', {
    method: 'GET',
    headers: {
      'X-Shipsgo-User-Token': process.env.SHIPSGO_USER_TOKEN, // ← Usa l'env var come header
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
};