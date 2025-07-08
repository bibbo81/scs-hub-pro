// netlify/functions/get-trackings.js
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
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Get auth token from headers
        const token = event.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Missing authorization token' })
            };
        }

        // Verify user with Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Invalid or expired token' })
            };
        }

        // Get query parameters
        const { 
            status, 
            tracking_type, 
            carrier_code,
            search,
            limit = 50,
            offset = 0,
            sort_by = 'created_at',
            sort_order = 'desc'
        } = event.queryStringParameters || {};

        // Build query
        let query = supabase
            .from('trackings')
            .select(`
                *,
                organizzazioni:organization_id (
                    id,
                    nome
                )
            `)
            .eq('user_id', user.id);

        // Apply filters
        if (status) {
            query = query.eq('status', status);
        }
        
        if (tracking_type) {
            query = query.eq('tracking_type', tracking_type);
        }
        
        if (carrier_code) {
            query = query.eq('carrier_code', carrier_code);
        }
        
        if (search) {
            query = query.or(`tracking_number.ilike.%${search}%,reference_number.ilike.%${search}%`);
        }

        // Apply sorting
        const validSortColumns = ['created_at', 'updated_at', 'eta', 'status', 'tracking_number'];
        const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
        const sortAscending = sort_order === 'asc';
        
        query = query.order(sortColumn, { ascending: sortAscending });

        // Apply pagination
        query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        // Execute query
        const { data: trackings, error: queryError, count } = await query;

        if (queryError) {
            console.error('Database query error:', queryError);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Database query failed' })
            };
        }

        // Get tracking events for each tracking
        if (trackings && trackings.length > 0) {
            const trackingIds = trackings.map(t => t.id);
            
            const { data: events, error: eventsError } = await supabase
                .from('tracking_events')
                .select('*')
                .in('tracking_id', trackingIds)
                .order('event_date', { ascending: false });

            if (!eventsError && events) {
                // Group events by tracking_id
                const eventsByTracking = events.reduce((acc, event) => {
                    if (!acc[event.tracking_id]) {
                        acc[event.tracking_id] = [];
                    }
                    acc[event.tracking_id].push(event);
                    return acc;
                }, {});

                // Add events to trackings
                trackings.forEach(tracking => {
                    tracking.events = eventsByTracking[tracking.id] || [];
                    tracking.last_event = tracking.events[0] || null;
                });
            }
        }

        // Calculate summary stats
        const stats = {
            total: count || trackings.length,
            by_status: {},
            by_type: {},
            by_carrier: {}
        };

        // Get full stats (without pagination)
        const { data: allTrackings } = await supabase
            .from('trackings')
            .select('status, tracking_type, carrier_code')
            .eq('user_id', user.id);

        if (allTrackings) {
            allTrackings.forEach(t => {
                // By status
                stats.by_status[t.status] = (stats.by_status[t.status] || 0) + 1;
                
                // By type
                stats.by_type[t.tracking_type] = (stats.by_type[t.tracking_type] || 0) + 1;
                
                // By carrier
                if (t.carrier_code) {
                    stats.by_carrier[t.carrier_code] = (stats.by_carrier[t.carrier_code] || 0) + 1;
                }
            });
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Authorization, Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: JSON.stringify({
                success: true,
                data: {
                    trackings,
                    pagination: {
                        total: count || trackings.length,
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        has_more: (count || trackings.length) > parseInt(offset) + parseInt(limit)
                    },
                    stats
                }
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message 
            })
        };
    }
};