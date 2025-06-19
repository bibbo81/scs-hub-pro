// netlify/functions/notifications.js
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    try {
        // Get auth token
        const token = event.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }
        
        // Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Invalid token' })
            };
        }
        
        // For now, return mock notifications
        // In production, you'd query from a notifications table
        const notifications = [
            {
                id: 1,
                type: 'shipment',
                title: 'Spedizione in arrivo',
                message: 'Container MSKU1234567 arriverà domani',
                read: false,
                created_at: new Date().toISOString()
            },
            {
                id: 2,
                type: 'warning',
                title: 'Ritardo spedizione',
                message: 'BL MSCU7654321 è in ritardo di 2 giorni',
                read: false,
                created_at: new Date(Date.now() - 86400000).toISOString()
            }
        ];
        
        const unread_count = notifications.filter(n => !n.read).length;
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                notifications,
                unread_count,
                total: notifications.length
            })
        };
        
    } catch (error) {
        console.error('Notifications error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};