// shipments-unified-mapping.js - Mapping for shipments import/export
window.ShipmentUnifiedMapping = {
    COLUMN_MAPPING: {
        // Identifiers
        'Shipment Number': 'shipment_number',
        'ShipmentNumber': 'shipment_number',
        'Numero Spedizione': 'shipment_number',
        'Type': 'type',
        'Shipment Type': 'type',
        'Tipo': 'type',

        // Status
        'Status': 'status',
        'Stato': 'status',
        'Current Status': 'status',
        'CurrentStatus': 'status',

        // Carrier
        'Carrier Code': 'carrier_code',
        'carrierCode': 'carrier_code',
        'Codice Vettore': 'carrier_code',
        'Carrier Name': 'carrier_name',
        'carrierName': 'carrier_name',
        'CarrierName': 'carrier_name',
        'Nome Vettore': 'carrier_name',
        'Carrier': 'carrier_name',
        'ShippingLine': 'carrier_code',
        'Shipping Line': 'carrier_code',
        'Airline': 'carrier_code',
        'AirlineName': 'carrier_name',
        'Airline Name': 'carrier_name',
        'Service': 'service',
        'Servizio': 'service',

        // Ports and locations
        'Origin Port': 'origin_port',
        'Porto Origine': 'origin_port',
        'Port Of Loading': 'origin_port',
        'PortOfLoading': 'origin_port',
        'Pol': 'origin_port',
        'POL': 'origin_port',
        'Origin Name': 'origin_name',
        'Nome Origine': 'origin_name',
        'Origin': 'origin_name',
        'Destination Port': 'destination_port',
        'Porto Destinazione': 'destination_port',
        'Port Of Discharge': 'destination_port',
        'PortOfDischarge': 'destination_port',
        'Pod': 'destination_port',
        'POD': 'destination_port',
        'Destination Name': 'destination_name',
        'Nome Destinazione': 'destination_name',
        'Destination': 'destination_name',
        'OriginAirport': 'origin_port',
        'DestinationAirport': 'destination_port',
        'Via': 'via',
        'Scali': 'via',

        // Dates and transit
        'Transit Days': 'transit_days',
        'Giorni Transito': 'transit_days',
        'ETD': 'etd',
        'Date Of Departure': 'etd',
        'DepartureDate': 'etd',
        'Date Of Loading': 'etd',
        'LoadingDate': 'etd',
        'Partenza Stimata': 'etd',
        'ETA': 'eta',
        'Date Of Arrival': 'eta',
        'ArrivalDate': 'eta',
        'Date Of Discharge': 'eta',
        'DischargeDate': 'eta',
        'FirstETA': 'eta',
        'ATA': 'eta',
        'ActualArrival': 'eta',
        'Arrivo Stimato': 'eta',

        // Costs
        'Ocean Freight': 'ocean_freight',
        'Nolo Marittimo': 'ocean_freight',
        'BAF': 'bunker_surcharge',
        'Bunker': 'bunker_surcharge',
        'Port Charges': 'port_charges',
        'Spese Portuali': 'port_charges',
        'Customs': 'customs',
        'Dogana': 'customs',
        'Insurance': 'insurance',
        'Assicurazione': 'insurance',
        'Total Cost': 'total_cost',
        'Costo Totale': 'total_cost',
        'Currency': 'currency',
        'Valuta': 'currency',

        // Products
        'Product SKU': 'product_sku',
        'SKU': 'product_sku',
        'Product Name': 'product_name',
        'Description': 'description',
        'Quantity': 'quantity',
        'Qty': 'quantity',
        'Weight': 'weight',
        'Volume': 'volume'
    },

    STATUS_MAPPING: {
        'Planned': 'planned',
        'Departed': 'departed',
        'In Transit': 'in_transit',
        'Arrived': 'arrived',
        'Delivered': 'delivered',
        'Cancelled': 'cancelled',
        'Canceled': 'cancelled',
        'Delayed': 'delayed',
        'Exception': 'exception',
        'Pianificata': 'planned',
        'Partita': 'departed',
        'In transito': 'in_transit',
        'Arrivata': 'arrived',
        'Consegnata': 'delivered',
        'Annullato': 'cancelled',
        'Sailing': 'in_transit',
        'Loaded': 'in_transit',
        'Loading': 'in_transit',
        'Gate In': 'in_transit',
        'Transhipment': 'in_transit',
        'Discharged': 'arrived',
        'Discharging': 'arrived',
        'Gate Out': 'out_for_delivery',
        'Empty': 'delivered',
        'Empty Returned': 'delivered',
        'POD': 'delivered',
        'Registered': 'registered',
        'Pending': 'registered',
        'Booked': 'registered',
        'Booking Confirmed': 'registered',
        'Navigando': 'in_transit',
        'Caricato': 'in_transit',
        'In caricamento': 'in_transit',
        'Arrivato': 'arrived',
        'Scaricato': 'arrived',
        'In scarico': 'arrived',
        'In consegna': 'out_for_delivery',
        'Consegnato': 'delivered',
        'Vuoto': 'delivered',
        'Registrato': 'registered',
        'In attesa': 'registered',
        'Prenotato': 'registered',
        'La spedizione è stata consegnata': 'delivered',
        'Consegnata.': 'delivered',
        'Consegna prevista nel corso della giornata odierna.': 'out_for_delivery',
        'La spedizione è in consegna': 'out_for_delivery',
        'La spedizione è in transito': 'in_transit',
        'Arrivata nella sede GLS locale.': 'in_transit',
        'In transito.': 'in_transit',
        "Partita dalla sede mittente. In transito.": 'in_transit',
        "La spedizione e' stata creata dal mittente": 'registered',
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
        'Customs Cleared': 'customs_cleared',
        'Sdoganato': 'customs_cleared',
        'Sdoganata': 'customs_cleared',
        'In dogana': 'customs_hold',
        'Customs Hold': 'customs_hold',
        'In ritardo': 'delayed',
        'Ritardo': 'delayed',
        'Eccezione': 'exception'
    },

    mapColumn(sourceColumn) {
        if (this.COLUMN_MAPPING[sourceColumn]) {
            return this.COLUMN_MAPPING[sourceColumn];
        }
        const upper = sourceColumn.toUpperCase();
        for (const [key, value] of Object.entries(this.COLUMN_MAPPING)) {
            if (key.toUpperCase() === upper) {
                return value;
            }
        }
        return sourceColumn.toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');
    },

    mapStatus(sourceStatus) {
        if (!sourceStatus) return 'planned';
        if (this.STATUS_MAPPING[sourceStatus]) {
            return this.STATUS_MAPPING[sourceStatus];
        }
        const lower = sourceStatus.toLowerCase();
        for (const [key, value] of Object.entries(this.STATUS_MAPPING)) {
            if (key.toLowerCase() === lower) {
                return value;
            }
        }
        return 'planned';
    },

    getReverseColumnMapping() {
        const reverse = {};
        for (const [src, tgt] of Object.entries(this.COLUMN_MAPPING)) {
            if (!reverse[tgt]) {
                reverse[tgt] = src;
            }
        }
        return reverse;
    }
};

// Expose globally
window.UnifiedMapping = window.ShipmentUnifiedMapping;