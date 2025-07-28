const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Mapping degli stati per coerenza con il frontend
const STATUS_MAPPING = {
    'SAILING': 'in_transit',
    'IN TRANSIT': 'in_transit',
    'ARRIVED': 'arrived',
    'DELIVERED': 'delivered',
    'DISCHARGED': 'arrived',
    'REGISTERED': 'registered',
    'PENDING': 'registered',
    'LOADED': 'in_transit',
    'DEPARTED': 'in_transit',
    'GATE IN': 'in_transit',
    'GATE OUT': 'delivered'
};

function mapStatus(rawStatus) {
    if (!rawStatus) return 'registered';
    const upperStatus = rawStatus.toUpperCase();
    return STATUS_MAPPING[upperStatus] || 'registered';
}

exports.handler = async function(event, context) {
    console.log('🚀 Starting scheduled tracking update...');

    const supabaseUrl = process.env.SUPABASE_URL;
    // USA LA SERVICE ROLE KEY per avere accesso completo in scrittura
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase URL or Service Role Key not set in environment variables.');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error.' }),
        };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Recupera tutti i tracking attivi (non consegnati o cancellati)
    const { data: trackings, error: trackingsError } = await supabase
        .from('trackings')
        .select('id, tracking_number, status, organization_id')
        .in('tracking_type', ['container', 'bl'])
        .not('status', 'in', ['delivered', 'cancelled']);

    if (trackingsError) {
        console.error('❌ Error fetching trackings:', trackingsError);
        return { statusCode: 500, body: JSON.stringify({ error: trackingsError.message }) };
    }

    if (!trackings || trackings.length === 0) {
        console.log('✅ No active trackings to update.');
        return { statusCode: 200, body: JSON.stringify({ message: 'No active trackings to update.' }) };
    }

    console.log(`🔍 Found ${trackings.length} active trackings to check.`);

    let updatedCount = 0;
    let errorCount = 0;

    // 2. Itera su ogni tracking e aggiorna lo stato
    for (const tracking of trackings) {
        try {
            // Recupera la API key per l'organizzazione del tracking
            const { data: apiKeyData, error: apiKeyError } = await supabase
                .from('organization_api_keys')
                .select('api_key')
                .eq('organization_id', tracking.organization_id)
                .eq('provider', 'shipsgo_v1')
                .single();

            if (apiKeyError || !apiKeyData?.api_key) {
                console.warn(`⚠️ No ShipsGo v1 API key for organization ${tracking.organization_id}. Skipping tracking ${tracking.tracking_number}.`);
                continue;
            }

            const authCode = apiKeyData.api_key;

            // 3. Chiama l'API di ShipsGo
            const shipsgoUrl = `https://shipsgo.com/api/v1.2/ContainerService/GetContainerInfo?authCode=${authCode}&requestId=${tracking.tracking_number}`;
            const response = await fetch(shipsgoUrl);
            const shipsgoData = await response.json();

            if (!response.ok || !shipsgoData.success || !shipsgoData.data || shipsgoData.data.length === 0) {
                throw new Error(shipsgoData.message || 'Failed to fetch data from ShipsGo');
            }

            const containerInfo = shipsgoData.data[0];
            const newRawStatus = containerInfo.Status;
            const newStatus = mapStatus(newRawStatus);

            // 4. Confronta e aggiorna se lo stato è cambiato
            if (newStatus !== tracking.status) {
                console.log(`🔄 Updating ${tracking.tracking_number}: ${tracking.status} -> ${newStatus}`);

                const { error: updateError } = await supabase
                    .from('trackings')
                    .update({
                        status: newStatus,
                        updated_at: new Date().toISOString(),
                        // Potremmo aggiornare anche altri campi qui, come l'ETA
                        eta: containerInfo.ETA || tracking.eta
                    })
                    .eq('id', tracking.id);

                if (updateError) {
                    throw updateError;
                }
                updatedCount++;
            }

        } catch (err) {
            errorCount++;
            console.error(`❌ Error updating tracking ${tracking.tracking_number}:`, err.message);
        }
    }

    const summary = `✅ Update complete. Processed: ${trackings.length}, Updated: ${updatedCount}, Errors: ${errorCount}.`;
    console.log(summary);

    return {
        statusCode: 200,
        body: JSON.stringify({ message: summary }),
    };
};