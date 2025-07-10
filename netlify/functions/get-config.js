// netlify/functions/get-config.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // Verifica autenticazione prima di esporre le config
    const authHeader = event.headers.authorization;
    if (!authHeader) {
        return { statusCode: 401, body: 'Unauthorized' };
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return { statusCode: 401, body: 'Unauthorized' };
    }

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseAnonKey: process.env.SUPABASE_ANON_KEY
        })
    };
};
