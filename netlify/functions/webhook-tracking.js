// FILE: netlify/functions/webhook-tracking.js
// Webhook endpoint per ricevere aggiornamenti da ShipsGo
/// <reference path="../../core/typedefs.d.ts" />

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only accept POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse webhook payload
        const payload = JSON.parse(event.body);
        console.log('[Webhook] Received ShipsGo update:', payload);

        // Validate webhook data
        if (!payload.ContainerNumber && !payload.AwbNumber) {
            throw new Error('Missing tracking number');
        }

        // Process webhook based on type
        const trackingData = processShipsGoWebhook(payload);

        // TODO: In produzione, salvare in database
        // Per ora, loggiamo solo i dati
        console.log('[Webhook] Processed data:', trackingData);

        // Risposta successo a ShipsGo
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Webhook received',
                tracking_number: trackingData.tracking_number
            })
        };

    } catch (error) {
        console.error('[Webhook] Error:', error);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

// Processa webhook ShipsGo e normalizza i dati
/**
 * Normalize a ShipsGo payload to a TrackingLike object.
 * @param {Object} payload
 * @returns {TrackingLike}
 */
function processShipsGoWebhook(payload) {
    // Determina se è container o AWB
    const isContainer = !!payload.ContainerNumber;
    const isAwb = !!payload.AwbNumber;

    /** @type {TrackingLike} */
    let trackingData = {
        tracking_number: payload.ContainerNumber || payload.AwbNumber,
        tracking_type: isContainer ? 'container' : 'awb',
        webhook_received_at: new Date().toISOString(),
        raw_payload: payload
    };

    // Container webhook (v1.2)
    if (isContainer) {
        trackingData = {
            ...trackingData,
            status: mapContainerStatus(payload.Status),
            carrier_code: payload.ShippingLine,
            reference_number: payload.ReferenceNo,
            
            // Route info
            origin_port: payload.LoadPort,
            destination_port: payload.DischargePort,
            eta: payload.EstimatedTimeOfArrival,
            
            // Vessel info
            vessel_name: payload.VesselName,
            vessel_voyage: payload.VoyageNumber,
            vessel_imo: payload.VesselIMO,
            
            // Dates
            date_of_departure: payload.DepartureDate,
            eta: payload.ArrivalDate,
            
            // Location
            last_event_location: payload.CurrentLocation,
            last_event_date: payload.LastUpdate,
            
            // Additional data
            metadata: {
                container_size: payload.ContainerSize,
                container_type: payload.ContainerType,
                booking_number: payload.BookingNumber,
                bl_number: payload.BillOfLading,
                co2_emission: payload.CO2Emission,
                transit_time: payload.TransitTime
            }
        };
    }

    // AWB webhook (v2.0)
    else if (isAwb) {
        trackingData = {
            ...trackingData,
            status: mapAwbStatus(payload.Status),
            carrier_code: payload.Airline,
            
            // Route info
            origin_port: payload.Origin,
            origin_name: payload.OriginName,
            destination_port: payload.Destination,
            destination_name: payload.DestinationName,
            eta: payload.EstimatedTimeOfArrival,
            
            // Flight info
            flight_number: payload.FlightNumber,
            flight_date: payload.FlightDate,
            
            // Package info
            pieces: payload.Pieces,
            weight: payload.Weight,
            weight_unit: payload.WeightUnit,
            
            // Location
            last_event_location: payload.CurrentLocation,
            last_event_date: payload.LastUpdate,
            last_event_code: payload.LastEventCode,
            
            // Additional data
            metadata: {
                ts_count: payload.TsCount,
                transit_time: payload.TransitTime,
                service_type: payload.ServiceType,
                commodity: payload.Commodity
            }
        };
    }

    // Eventi se presenti
    if (payload.Events && Array.isArray(payload.Events)) {
        trackingData.events = payload.Events.map(event => ({
            date: event.Date || event.EventDate,
            location: event.Location,
            status: event.Status || event.EventCode,
            description: event.Description || event.EventDescription,
            vessel: event.VesselName,
            voyage: event.VoyageNumber,
            flight: event.FlightNumber
        }));
    }

    return trackingData;
}

// Mappa status container ShipsGo → sistema
function mapContainerStatus(shipsgoStatus) {
    const statusMap = {
        'Sailing': 'in_transit',
        'Departed': 'in_transit',
        'In Transit': 'in_transit',
        'Arrived': 'arrived',
        'Discharged': 'arrived',
        'Gate Out': 'delivered',
        'Empty': 'delivered',
        'Delivered': 'delivered',
        'Booked': 'registered',
        'Gate In': 'registered',
        'Loaded': 'in_transit'
    };
    
    return statusMap[shipsgoStatus] || 'in_transit';
}

// Mappa status AWB ShipsGo → sistema
function mapAwbStatus(shipsgoStatus) {
    const statusMap = {
        'RCS': 'registered',
        'MAN': 'in_transit',
        'DEP': 'in_transit',
        'ARR': 'arrived',
        'RCF': 'arrived',
        'DLV': 'delivered',
        'NFD': 'out_for_delivery'
    };
    
    return statusMap[shipsgoStatus] || 'in_transit';
}