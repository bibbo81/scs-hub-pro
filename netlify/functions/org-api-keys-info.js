const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    }
    if (!process.env.SUPABASE_URL) {
        throw new Error('SUPABASE_URL environment variable not set');
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

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
        const token = event.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Invalid token' })
            };
        }

        const { data: member } = await supabase
            .from('organization_members')
            .select('organization_id, role')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!member) {
            return { statusCode: 200, headers, body: JSON.stringify({ keys: [] }) };
        }

        if (member.role !== 'admin') {
            return { statusCode: 200, headers, body: JSON.stringify({ keys: [] }) };
        }

        const { data: keys } = await supabase
            .from('organization_api_keys')
            .select(`
                provider,
                created_at,
                updated_at,
                created_by,
                auth.users!created_by (
                    email
                )
            `)
            .eq('organization_id', member.organization_id)
            .eq('is_active', true);

        const list = (keys || []).map(k => ({
            provider: k.provider,
            configuredBy: k.users?.email || 'Unknown',
            configuredAt: k.created_at,
            lastUpdated: k.updated_at
        }));

        return { statusCode: 200, headers, body: JSON.stringify({ keys: list }) };
    } catch (error) {
        console.error('org-api-keys-info error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', message: error.message })
        };
    }
};
