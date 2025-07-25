// tracking-unified-mapping.js - Mapping unificato per ShipsGo v1.2 e v2.0
window.TrackingUnifiedMapping = {
    // Column mapping completo per import/export
    COLUMN_MAPPING: {
        // === CONTAINER/SEA MAPPING ===
        'Container': 'tracking_number',
        'ContainerNumber': 'tracking_number',
        'Container Number': 'tracking_number',
        'Booking': 'booking',
        'BookingNumber': 'booking',
        'Booking Number': 'booking',
        'BLReferenceNo': 'reference_number',
        'Reference': 'reference_number',
        'ReferenceNo': 'reference_number',
        
        // Carrier
        'Carrier': 'carrier_code',
        'CarrierName': 'carrier_name',
        'ShippingLine': 'carrier_code',
        'Shipping Line': 'carrier_code',
        
        // Status
        'Status': 'current_status',
        'CurrentStatus': 'current_status',
        'Current Status': 'current_status',
        
        // Ports
        'Port Of Loading': 'origin_port',
        'PortOfLoading': 'origin_port',
        'Pol': 'origin_port',
        'POL': 'origin_port',
        'Port Of Discharge': 'destination_port',
        'PortOfDischarge': 'destination_port',
        'Pod': 'destination_port',
        'POD': 'destination_port',
        
        // Countries
        'POL Country': 'origin_country',
        'FromCountry': 'origin_country',
        'POL Country Code': 'origin_country_code',
        'FromCountryCode': 'origin_country_code',
        'POD Country': 'destination_country',
        'ToCountry': 'destination_country',
        'POD Country Code': 'destination_country_code',
        'ToCountryCode': 'destination_country_code',
        
        // Dates
        'Date Of Loading': 'date_of_loading',
        'LoadingDate': 'date_of_loading',
        'Data Carico': 'date_of_loading',
        'Date Of Departure': 'date_of_departure',
        'DepartureDate': 'date_of_departure',
        'Data Partenza': 'date_of_departure',
        'Date Of Arrival': 'date_of_arrival',
        'ArrivalDate': 'date_of_arrival',
        'Data Arrivo': 'date_of_arrival',
        'Date Of Discharge': 'date_of_discharge',
        'DischargeDate': 'date_of_discharge',
        'Data Scarico': 'date_of_discharge',
        'ETA': 'eta',
        'FirstETA': 'eta',
        'ATA': 'ata',
        'ActualArrival': 'ata',
        
        // Vessel
        'Vessel': 'vessel_name',
        'VesselName': 'vessel_name',
        'Nome Nave': 'vessel_name',
        'Voyage': 'voyage_number',
        'VesselVoyage': 'voyage_number',
        'Numero Viaggio': 'voyage_number',
        'VesselIMO': 'vessel_imo',
        'IMO': 'vessel_imo',
        
        // Container details
        'Container Type': 'container_type',
        'ContainerType': 'container_type',
        'Container Types': 'container_type',
        'ContainerTypes': 'container_type',
        'Tipi Container': 'container_type',
        'Tipo Container': 'container_type',
        'Numero Container': 'tracking_number',
        'Container Size': 'container_size',
        'ContainerTEU': 'container_size',
        'Container Count': 'container_count',
        'BLContainerCount': 'container_count',
        
        // === AWB/AIR MAPPING ===
        'AWB Number': 'tracking_number',
        'AWBNumber': 'tracking_number',
        'Airline': 'carrier_code',
        'AirlineName': 'carrier_name',
        'Airline Name': 'carrier_name',
        'Compagnia Aerea': 'carrier_name',
        
        // Airports
        'Origin': 'origin_port',
        'Origin Name': 'origin_name',
        'OriginAirport': 'origin_port',
        'Nome Origine': 'origin_name',
        'Paese Origine': 'origin_country',
        'Code Origine': 'origin_country_code',
        'Destination': 'destination_port',
        'Destination Name': 'destination_name',
        'DestinationAirport': 'destination_port',
        'Nome Destinazione': 'destination_name',
        'Paese Destinazione': 'destination_country',
        'Code Destinazione': 'destination_country_code',
        
        // Flight
        'Flight Number': 'flight_number',
        'FlightNumber': 'flight_number',
        'Flight': 'flight_number',
        'Numero Volo': 'flight_number',
        
        // Cargo
        'Pieces': 'pieces',
        'NumberOfPieces': 'pieces',
        'Colli': 'pieces',
        'Weight': 'weight',
        'GrossWeight': 'weight',
        'Peso': 'weight',
        'Peso Totale': 'total_weight_kg',
        'Peso Totale (kg)': 'total_weight_kg',
        'Volume': 'volume',
        'Volume Totale (cbm)': 'total_volume_cbm',
        'Volume Totale': 'total_volume_cbm',
        'Commodity': 'commodity',
        'Merce': 'commodity',
        'Description': 'cargo_description',
        
        // === COMMON MAPPING ===
        'Tags': 'tags',
        'Created At': 'created_at',
        'CreatedAt': 'created_at',
        'Updated At': 'updated_at',
        'UpdatedAt': 'updated_at',
        'Last Update': 'last_update',
        'LastUpdate': 'last_update',
        'Note': 'notes',

        // Metrics
        'CO₂ Emission (Tons)': 'co2_emission',
        'Co2Emission': 'co2_emission',
        'Transit Time': 'transit_time',
        'FormatedTransitTime': 'transit_time',
        'TransitTime': 'transit_time',
        'TS Count': 'ts_count',
        'TSCount': 'ts_count',
        'T5 Count': 'ts_count',

        // Events
        'Last Event': 'last_event_description',
        'LastEvent': 'last_event_description',
        'Ultimo Evento': 'last_event_description',
        'Last Event Location': 'last_event_location',
        'LastLocation': 'last_event_location',
        'Ultima Posizione': 'last_event_location',
        'Last Event Date': 'last_event_date',
        'LastEventDate': 'last_event_date',
        'Data Ultimo Evento': 'last_event_date'
    },
    
    // Status mapping completo (italiano e inglese)
    STATUS_MAPPING: {
        // === CONTAINER/SEA STATUSES ===
        // English
        'Sailing': 'in_transit',
        'In Transit': 'in_transit',
        'Loaded': 'in_transit',
        'Loading': 'in_transit',
        'Gate In': 'in_transit',
        'Transhipment': 'in_transit',
        'Arrived': 'arrived',
        'Discharged': 'arrived',
        'Discharging': 'arrived',
        'Gate Out': 'out_for_delivery',
        'Delivered': 'delivered',
        'Empty': 'delivered',
        'Empty Returned': 'delivered',
        'POD': 'delivered',
        'Registered': 'registered',
        'Pending': 'registered',
        'Booked': 'registered',
        'Booking Confirmed': 'registered',
        
        // Italian
        'In transito': 'in_transit',
        'In Transito': 'in_transit',
        'Navigando': 'in_transit',
        'Caricato': 'in_transit',
        'In caricamento': 'in_transit',
        'Arrivato': 'arrived',
        'Arrivata': 'arrived',
        'Scaricato': 'arrived',
        'In scarico': 'arrived',
        'In consegna': 'out_for_delivery',
        'Consegnato': 'delivered',
        'Consegnata': 'delivered',
        'Vuoto': 'delivered',
        'Registrato': 'registered',
        'In attesa': 'registered',
        'Prenotato': 'registered',
        
        // === AWB/AIR STATUSES ===
        // English codes
        'RCS': 'registered',
        'MAN': 'in_transit',
        'DEP': 'in_transit',
        'ARR': 'arrived',
        'RCF': 'arrived',
        'NFD': 'out_for_delivery',
        'DLV': 'delivered',
        'DELIVERED': 'delivered',
        'INPROGRESS': 'in_transit',
        'IN PROGRESS': 'in_transit',
        'PENDING': 'registered',
        
        // === COURIER STATUSES (Italian) ===
        'La spedizione è stata consegnata': 'delivered',
        'Consegnata.': 'delivered',
        'Consegna prevista nel corso della giornata odierna.': 'out_for_delivery',
        'La spedizione è in consegna': 'out_for_delivery',
        'La spedizione è in transito': 'in_transit',
        'Arrivata nella sede GLS locale.': 'in_transit',
        'In transito.': 'in_transit',
        'Partita dalla sede mittente. In transito.': 'in_transit',
        'La spedizione e\' stata creata dal mittente': 'registered',
        
        // FedEx
        'On FedEx vehicle for delivery': 'out_for_delivery',
        'At local FedEx facility': 'in_transit',
        'Departed FedEx hub': 'in_transit',
        'On the way': 'in_transit',
        'Arrived at FedEx hub': 'in_transit',
        'At destination sort facility': 'in_transit',
        'Left FedEx origin facility': 'in_transit',
        'Picked up': 'in_transit',
        'Shipment information sent to FedEx': 'registered',
        'International shipment release - Import': 'customs_cleared',
        
        // Customs
        'Customs Cleared': 'customs_cleared',
        'Sdoganato': 'customs_cleared',
        'Sdoganata': 'customs_cleared',
        'In dogana': 'customs_hold',
        'Customs Hold': 'customs_hold',
        
        // Exceptions
        'Delayed': 'delayed',
        'In ritardo': 'delayed',
        'Ritardo': 'delayed',
        'Exception': 'exception',
        'Eccezione': 'exception',
        'Cancelled': 'cancelled',
        'Annullato': 'cancelled'
    },
    
    // Funzione helper per mapping
    mapColumn(sourceColumn) {
        // Prima prova exact match
        if (this.COLUMN_MAPPING[sourceColumn]) {
            return this.COLUMN_MAPPING[sourceColumn];
        }
        
        // Poi prova case-insensitive
        const upperSource = sourceColumn.toUpperCase();
        for (const [key, value] of Object.entries(this.COLUMN_MAPPING)) {
            if (key.toUpperCase() === upperSource) {
                return value;
            }
        }
        
        // Fallback: converti in snake_case
        return sourceColumn.toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');
    },
    
    mapStatus(sourceStatus) {
        if (!sourceStatus) return 'registered';

        const statusStr = sourceStatus.toString().trim();

        // Check if sourceStatus is already a valid normalized status
        // This prevents double-mapping if the status is already e.g. 'in_transit'
        const validNormalizedStatuses = new Set(Object.values(this.STATUS_MAPPING));
        if (validNormalizedStatuses.has(statusStr)) {
            return statusStr;
        }
        
        // Prima prova exact match
        if (this.STATUS_MAPPING[statusStr]) {
            return this.STATUS_MAPPING[statusStr];
        }
        
        // Poi prova lowercase
        const lowerStatus = statusStr.toLowerCase();
        for (const [key, value] of Object.entries(this.STATUS_MAPPING)) {
            if (key.toLowerCase() === lowerStatus) {
                return value;
            }
        }
        // Fallback
        return 'registered';
    },
    
    // Configurazione visualizzazione stati per la tabella
    STATUS_DISPLAY_CONFIG: {
        'in_transit': { label: 'In Transito', class: 'info', icon: 'fa-truck' },
        'delivered': { label: 'Consegnato', class: 'success', icon: 'fa-check-circle' },
        'arrived': { label: 'Arrivato', class: 'primary', icon: 'fa-anchor' },
        'registered': { label: 'Registrato', class: 'secondary', icon: 'fa-clipboard-check' },
        'out_for_delivery': { label: 'In Consegna', class: 'warning', icon: 'fa-shipping-fast' },
        'delayed': { label: 'In Ritardo', class: 'danger', icon: 'fa-exclamation-triangle' },
        'exception': { label: 'Eccezione', class: 'danger', icon: 'fa-exclamation' },
        'pending': { label: 'In attesa', class: 'warning', icon: 'fa-clock' },
        'customs_cleared': { label: 'Sdoganato', class: 'success', icon: 'fa-stamp' },
        'customs_hold': { label: 'In Dogana', class: 'warning', icon: 'fa-gavel' },
        'cancelled': { label: 'Annullato', class: 'secondary', icon: 'fa-times-circle' },
        // Aggiungi un fallback per stati non mappati
        'default': { label: 'Sconosciuto', class: 'secondary', icon: 'fa-question-circle' }
    },

    // Reverse mapping per export
    getReverseColumnMapping() {
        const reverse = {};
        for (const [source, target] of Object.entries(this.COLUMN_MAPPING)) {
            if (!reverse[target]) {
                reverse[target] = source;
            }
        }
        return reverse;
    },
    
    // Detect tracking type
    detectTrackingType(trackingNumber, row = {}) {
        // Check by number format
        if (/^\d{3}-?\d{8}$/.test(trackingNumber)) return 'awb';
        if (/^[A-Z]{4}\d{7}$/.test(trackingNumber)) return 'container';
        
        // Check by row data
        if (row['AWB Number'] || row['Airline']) return 'awb';
        if (row['Container'] || row['Vessel']) return 'container';
        
        return 'container'; // default
    }
};

// Esporta globalmente
window.UnifiedMapping = window.TrackingUnifiedMapping;

// FIX STRUTTURALE: Esponi i mapping principali globalmente e immediatamente.
// Questo risolve una race condition in cui altri script (es. tracking-form-progressive.js)
// tentano di accedere a window.COLUMN_MAPPING prima che il modulo principale (index.js)
// abbia avuto il tempo di inizializzare e popolarlo.
// Rendendo i mapping disponibili subito, si garantisce che qualsiasi script caricato dopo
// questo file possa accedervi senza errori.
window.COLUMN_MAPPING = window.TrackingUnifiedMapping.COLUMN_MAPPING;
window.STATUS_MAPPING = window.TrackingUnifiedMapping.STATUS_MAPPING;