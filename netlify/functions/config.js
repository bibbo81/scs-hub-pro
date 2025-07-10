// netlify/functions/config.js - Public Supabase configuration endpoint
// This endpoint provides public Supabase configuration without authentication
// Only exposes SUPABASE_URL and SUPABASE_ANON_KEY (which are public by design)

exports.handler = async (event, context) => {
    // Set CORS headers to allow client-side access
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Check if required environment variables are available
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Server configuration error' })
        };
    }

    // Return public Supabase configuration
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseAnonKey: process.env.SUPABASE_ANON_KEY
        })
    };
};