// LISTA COMPLETA DEI VALORI HARDCODED DA RIMUOVERE:

// ❌ HARDCODED DA RIMUOVERE:
airline: formData.carrier || formData._raw_api_response?.airline?.iata || 'CA',  // ❌ 'CA' è hardcoded!
carrier: formData.carrier || formData._raw_api_response?.airline?.iata || 'CA',  // ❌ 'CA' è hardcoded!
carrier_code: formData.carrier || formData._raw_api_response?.airline?.iata || 'CA',  // ❌ 'CA' è hardcoded!

// ✅ VERSIONE CORRETTA SENZA HARDCODED:
airline: formData.carrier || formData._raw_api_response?.airline?.iata || '-',
carrier: formData.carrier || formData._raw_api_response?.airline?.iata || '-', 
carrier_code: formData.carrier || formData._raw_api_response?.airline?.iata || '-',

// INOLTRE, CONTROLLA ANCHE QUESTI:
// Se hai ancora questi valori hardcoded, cambiali:

// ❌ SE HAI:
origin_country: formData._raw_api_response?.route?.origin?.location?.country?.name?.toUpperCase() || 'CHINA',
destination_country: country ? country.toUpperCase() : 'ITALY',
container_count: String(formData._raw_api_response?.cargo?.pieces || 43),

// ✅ DEVONO ESSERE:
origin_country: formData._raw_api_response?.route?.origin?.location?.country?.name?.toUpperCase() || '-',
destination_country: country ? country.toUpperCase() : '-',
container_count: String(formData._raw_api_response?.cargo?.pieces || 1),  // 1 è ok come default numerico

// BLOCCO AWB COMPLETO PULITO:
...(formData.trackingType === 'awb' ? {
    // Campi base
    tracking_number: formData.trackingNumber,
    trackingNumber: formData.trackingNumber,
    tracking_type: 'awb',
    trackingType: 'awb',
    useApi: formData.useApi,
    apiOperation: formData.apiOperation,
    reference: formData.reference || '-',
    
    // Airline/Carrier - SENZA HARDCODED
    airline: formData.carrier || formData._raw_api_response?.airline?.iata || '-',
    awb_number: formData.trackingNumber,
    carrier: formData.carrier || formData._raw_api_response?.airline?.iata || '-',
    carrier_code: formData.carrier || formData._raw_api_response?.airline?.iata || '-',
    
    // Raw API data
    _raw_api_response: formData._raw_api_response || {},
    
    // Dates
    date_of_arrival: formatDateDDMMYYYY(
        formData._raw_api_response?.route?.destination?.date_of_rcf ||
        formData._raw_api_response?.route?.destination?.eta ||
        '-'
    ),
    
    // Transit time in giorni
    transit_time: (() => {
        const hoursTransit = formData._raw_api_response?.route?.transit_time;
        if (hoursTransit && typeof hoursTransit === 'number') {
            return Math.ceil(hoursTransit / 24);
        }
        return 0;
    })(),
    
    // Locations - SENZA HARDCODED
    origin: formData._raw_api_response?.route?.origin?.location?.iata || formData.origin || '-',
    origin_port: formData._raw_api_response?.route?.origin?.location?.iata || formData.origin || '-',
    destination: formData._raw_api_response?.route?.destination?.location?.iata || formData.destination || '-',
    destination_port: formData._raw_api_response?.route?.destination?.location?.iata || formData.destination || '-',
    
    // Countries - SENZA HARDCODED
    origin_country: formData._raw_api_response?.route?.origin?.location?.country?.name?.toUpperCase() || '-',
    destination_country: (() => {
        const country = formData._raw_api_response?.route?.destination?.location?.country?.name;
        return country ? country.toUpperCase() : '-';
    })(),
    origin_country_code: formData._raw_api_response?.route?.origin?.location?.country?.code || '-',
    destination_country_code: formData._raw_api_response?.route?.destination?.location?.country?.code || '-',
    
    // Departure date
    date_of_departure: (() => {
        const movements = formData._raw_api_response?.movements || [];
        const depMovement = movements.find(m => m.event === 'DEP');
        if (depMovement && depMovement.timestamp) {
            return formatDateDDMMYYYY(depMovement.timestamp);
        }
        const depDate = formData._raw_api_response?.route?.origin?.date_of_dep;
        if (depDate) {
            return formatDateDDMMYYYY(depDate);
        }
        return '-';
    })(),
    
    // Container count
    container_count: String(formData._raw_api_response?.cargo?.pieces || 1),
    
    // Altri campi
    tags: '-',
    ts_count: String(formData._raw_api_response?.route?.ts_count || 0),
    co2_emission: '-',
    booking: '-',
    
    // Created at ShipsGo
    created_at_shipsgo: (() => {
        const createdAt = formData._raw_api_response?.created_at;
        if (createdAt) {
            return createdAt.split(' ')[0].split('-').reverse().join('/');
        }
        return formatDateDDMMYYYY(new Date().toISOString());
    })(),
    
    // Departure (copia per la tabella)
    departure: (() => {
        const movements = formData._raw_api_response?.movements || [];
        const depMovement = movements.find(m => m.event === 'DEP');
        if (depMovement && depMovement.timestamp) {
            return formatDateDDMMYYYY(depMovement.timestamp);
        }
        const depDate = formData._raw_api_response?.route?.origin?.date_of_dep;
        if (depDate) {
            return formatDateDDMMYYYY(depDate);
        }
        return '-';
    })(),
    
    // Ultima posizione
    ultima_posizione: (() => {
        const movements = formData._raw_api_response?.movements || [];
        if (movements.length > 0) {
            const lastMovement = movements[movements.length - 1];
            return lastMovement.location?.name || '-';
        }
        return '-';
    })(),
    
    // Metadata
    metadata: {
        ...formData.metadata,
        shipsgo_id: window.detectedAwbId || formData._raw_api_response?.id || null,
        shipsgo_id_auto_detected: !!window.detectedAwbId,
        raw: formData._raw_api_response || {},
        api_response: apiResponse || {}
    },
    
    // Altri campi necessari
    status: formData.status || 'registered',
    lastUpdate: formData.lastUpdate || new Date().toISOString(),
    events: formData.events || [],
    vessel: formData.vessel || null,
    route: formData.route || null
} : {}),