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

        // Carrier
        'Carrier Code': 'carrier_code',
        'carrierCode': 'carrier_code',
        'Codice Vettore': 'carrier_code',
        'Carrier Name': 'carrier_name',
        'carrierName': 'carrier_name',
        'Nome Vettore': 'carrier_name',
        'Carrier': 'carrier_name',
        'Service': 'service',
        'Servizio': 'service',

        // Ports and locations
        'Origin Port': 'origin_port',
        'Porto Origine': 'origin_port',
        'Origin Name': 'origin_name',
        'Nome Origine': 'origin_name',
        'Origin': 'origin_name',
        'Destination Port': 'destination_port',
        'Porto Destinazione': 'destination_port',
        'Destination Name': 'destination_name',
        'Nome Destinazione': 'destination_name',
        'Destination': 'destination_name',
        'Via': 'via',
        'Scali': 'via',

        // Dates and transit
        'Transit Days': 'transit_days',
        'Giorni Transito': 'transit_days',
        'ETD': 'etd',
        'Partenza Stimata': 'etd',
        'ETA': 'eta',
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
        'Valuta': 'currency'
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
        'Annullato': 'cancelled'
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