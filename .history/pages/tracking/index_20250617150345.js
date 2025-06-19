// ===== TRACKING INDEX - VERSIONE FINALE PERFETTA CON SOLARIUM DESIGN =====
// File: pages/tracking/index.js
// Compatible with Solarium Design System - 100% COMPLETE
// 🔧 FIX DEFINITIVO FORMATTER SHIPSGO INTEGRATO

import TableManager from '../../core/table-manager.js';
const modalSystem = window.ModalSystem;
import notificationSystem from '../../core/notification-system.js';
import trackingService from '/core/services/tracking-service.js';

console.log('🚀 [Tracking] Inizializzazione Sistema Finale Perfetto con Fix ShipsGo...');

// Tracking patterns
const TRACKING_PATTERNS = {
    container: /^[A-Z]{4}\d{7}$/,
    bl: /^[A-Z]{4}\d{8,12}$/,
    awb: /^\d{3}-\d{8}$/,
    parcel: /^[A-Z0-9]{10,30}$/
};

// Status mapping consolidato - PERFETTO PER IMPORT SHIPSGO
const STATUS_MAPPING = {
    // In Transit
    'Sailing': 'in_transit',
    'In Transit': 'in_transit',
    'In transito': 'in_transit',
    'At local FedEx facility': 'in_transit',
    'Departed FedEx hub': 'in_transit',
    'On the way': 'in_transit',
    'Arrived at FedEx hub': 'in_transit',
    'At destination sort facility': 'in_transit',
    'Left FedEx origin facility': 'in_transit',
    'Picked up': 'in_transit',
    'Arrivata nella Sede GLS locale.': 'in_transit',
    'In transito.': 'in_transit',
    'Partita dalla sede mittente. In transito.': 'in_transit',
    'La spedizione è in transito': 'in_transit',
    
    // Arrived/Discharged
    'Arrived': 'arrived',
    'Arrivata': 'arrived',
    'Discharged': 'arrived',
    'Scaricato': 'arrived',
    
    // Out for Delivery
    'On FedEx vehicle for delivery': 'out_for_delivery',
    'Consegna prevista nel corso della giornata odierna.': 'out_for_delivery',
    'La spedizione è in consegna': 'out_for_delivery',
    'In consegna': 'out_for_delivery',
    
    // Delivered
    'Delivered': 'delivered',
    'Consegnato': 'delivered',
    'LA spedizione è stata consegnata': 'delivered',
    'Consegnata.': 'delivered',
    'La spedizione è stata consegnata': 'delivered',
    'Empty': 'delivered',
    'Empty Returned': 'delivered',
    'POD': 'delivered',
    
    // Customs
    'International shipment release - Import': 'customs_cleared',
    'Sdoganata': 'customs_cleared',
    
    // Registered
    'Shipment information sent to FedEx': 'registered',
    'Spedizione creata': 'registered',
    'La spedizione e\' stata creata dal mittente, attendiamo che ci venga affidata per l\'invio a destinazione.': 'registered',
    'Registered': 'registered',
    'Pending': 'registered',
    'Booked': 'registered',
    'Booking Confirmed': 'registered'
};

// Global state
let trackingTable = null;
let trackings = [];
let statsCards = [];

// ===== CONFIGURAZIONE COLONNE SOLARIUM DESIGN SYSTEM =====
let currentColumns = [
    'select',
    'tracking_number',
    'tracking_type', 
    'carrier_code',
    'status',
    'origin_port',
    'destination_port',
    'eta',
    'created_at',
    'actions'
];

// Column definitions - COMPLETA E PERFETTA
const availableColumns = [
    // Colonna Select (checkbox)
    { 
        key: 'select', 
        label: '', 
        visible: true, 
        order: 0, 
        required: false, 
        isCheckbox: true,
        width: '40px'
    },
    
    // Colonne Base
    { key: 'tracking_number', label: 'Numero Tracking', visible: true, order: 1, required: true },
    { key: 'tracking_type', label: 'Tipo', visible: true, order: 2 },
    { key: 'carrier_code', label: 'Vettore', visible: true, order: 3 },
    { key: 'status', label: 'Stato', visible: true, order: 4 },
    { key: 'origin_port', label: 'Origine', visible: true, order: 5 },
    { key: 'destination_port', label: 'Destinazione', visible: true, order: 6 },
    { key: 'reference_number', label: 'Riferimento', visible: true, order: 7 },
    
    // Colonne ShipsGo Mare
    { key: 'booking', label: 'Booking', visible: false, order: 8 },
    { key: 'container_count', label: 'Container Count', visible: false, order: 9 },
    { key: 'port_of_loading', label: 'Port Of Loading', visible: false, order: 10 },
    { key: 'date_of_loading', label: 'Date Of Loading', visible: false, order: 11 },
    { key: 'pol_country', label: 'POL Country', visible: false, order: 12 },
    { key: 'pol_country_code', label: 'POL Country Code', visible: false, order: 13 },
    { key: 'port_of_discharge', label: 'Port Of Discharge', visible: false, order: 14 },
    { key: 'date_of_discharge', label: 'Date Of Discharge', visible: false, order: 15 },
    { key: 'pod_country', label: 'POD Country', visible: false, order: 16 },
    { key: 'pod_country_code', label: 'POD Country Code', visible: false, order: 17 },
    { key: 'co2_emission', label: 'CO₂ Emission (Tons)', visible: false, order: 18 },
    { key: 'tags', label: 'Tags', visible: false, order: 19 },
    { key: 'created_at_shipsgo', label: 'Created At', visible: false, order: 20 },
    
    // Colonne ShipsGo Air  
    { key: 'awb_number', label: 'AWB Number', visible: false, order: 21 },
    { key: 'airline', label: 'Airline', visible: false, order: 22 },
    { key: 'origin', label: 'Origin', visible: false, order: 23 },
    { key: 'origin_name', label: 'Origin Name', visible: false, order: 24 },
    { key: 'date_of_departure', label: 'Date Of Departure', visible: false, order: 25 },
    { key: 'origin_country', label: 'Origin Country', visible: false, order: 26 },
    { key: 'origin_country_code', label: 'Origin Country Code', visible: false, order: 27 },
    { key: 'destination', label: 'Destination', visible: false, order: 28 },
    { key: 'destination_name', label: 'Destination Name', visible: false, order: 29 },
    { key: 'date_of_arrival', label: 'Date Of Arrival', visible: false, order: 30 },
    { key: 'destination_country', label: 'Destination Country', visible: false, order: 31 },
    { key: 'destination_country_code', label: 'Destination Country Code', visible: false, order: 32 },
    { key: 'transit_time', label: 'Transit Time', visible: false, order: 33 },
    { key: 't5_count', label: 'T5 Count', visible: false, order: 34 },
    
    // Colonne Sistema
    { key: 'last_event_location', label: 'Ultima Posizione', visible: true, order: 35 },
    { key: 'eta', label: 'ETA', visible: true, order: 36 },
    { key: 'created_at', label: 'Data Inserimento', visible: true, order: 37 },
    
    // Actions column
    { key: 'actions', label: 'Azioni', visible: true, order: 38, required: true, isAction: true }
];

// Default columns
const DEFAULT_COLUMNS = ['select', 'tracking_number', 'tracking_type', 'carrier_code', 'status', 'origin_port', 'destination_port', 'eta', 'created_at', 'actions'];

// ===== 🔧 FORMATTER FIX DEFINITIVO - GESTIONE SHIPSGO COMPLETA =====
function getColumnFormatters() {
    return {
        // ===== FUNZIONE HELPER PER TROVARE VALORI - INTELLIGENTE =====
        getValue: function(row, possibleKeys) {
            // Prova tutte le possibili chiavi in ordine di priorità
            for (const key of possibleKeys) {
                // Controllo diretto nel row
                if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                    return row[key];
                }
                
                // Controllo in metadata
                if (row.metadata && row.metadata[key] !== undefined && row.metadata[key] !== null && row.metadata[key] !== '') {
                    return row.metadata[key];
                }
            }
            return null;
        },

        // ===== TRACKING NUMBER =====
        tracking_number: function(value, row) {
            const helpers = this;
            const number = helpers.getValue(row, [
                'tracking_number',
                'NUMERO TRACKING', 
                'Numero Tracking',
                'AWB NUMBER',
                'AWB Number',
                'Awb Number',
                'Reference',
                'REFERENCE',
                'Riferimento'
            ]) || '-';
            
            // Determina il tipo automaticamente se non specificato
            let type = helpers.getValue(row, ['tracking_type', 'TIPO', 'Type', 'tipo']);
            if (!type) {
                if (number.includes('-') || helpers.getValue(row, ['AIRLINE', 'Airline', 'airline'])) {
                    type = 'awb';
                } else if (helpers.getValue(row, ['CONTAINER COUNT', 'Container Count', 'PORT OF LOADING', 'Port Of Loading'])) {
                    type = 'container';
                } else {
                    type = 'container'; // default
                }
            }
            
            const typeIcon = type === 'awb' ? '✈️' : (type === 'container' ? '📦' : '🚛');
            return `<span class="tracking-number">${typeIcon} ${number}</span>`;
        },

        // ===== TRACKING TYPE =====
        tracking_type: function(value, row) {
            const helpers = this;
            let type = helpers.getValue(row, ['tracking_type', 'TIPO', 'Type', 'tipo']);
            
            // Auto-detection basata sui dati presenti
            if (!type) {
                if (helpers.getValue(row, ['AWB NUMBER', 'AWB Number', 'Awb Number', 'AIRLINE', 'Airline', 'airline'])) {
                    type = 'awb';
                } else if (helpers.getValue(row, ['CONTAINER COUNT', 'Container Count', 'PORT OF LOADING', 'Port Of Loading', 'port_of_loading'])) {
                    type = 'container';
                } else {
                    type = 'container'; // default
                }
            }
            
            const typeMap = {
                'awb': 'AEREO',
                'air': 'AEREO',
                'container': 'MARE', 
                'sea': 'MARE',
                'bl': 'MARE',
                'parcel': 'CORRIERE',
                'shipsgo_air': 'AEREO',
                'shipsgo_sea': 'MARE'
            };
            
            const label = typeMap[type] || type.toUpperCase();
            const badgeClass = (type === 'awb' || type === 'air' || type === 'shipsgo_air') ? 'badge-warning' : 'badge-info';
            
            return `<span class="sol-badge ${badgeClass}" style="display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase;">${label}</span>`;
        },

        // ===== CARRIER CODE =====
        carrier_code: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'carrier_code',
                'VETTORE',
                'Vettore',
                'AIRLINE',
                'Airline',
                'airline',
                'Carrier',
                'CARRIER',
                'carrier'
            ]) || '-';
        },

        // ===== STATUS =====
        status: function(value, row) {
            const helpers = this;
            const originalStatus = helpers.getValue(row, [
                'status',
                'STATO', 
                'Stato',
                'Status',
                'STATUS'
            ]) || 'registered';
            
            // ===== STATUS MAPPING COMPLETO SHIPSGO + GENERALE =====
            const statusMapping = {
                // Maritime/Container
                'Sailing': 'In transito',
                'Arrived': 'Arrivata',
                'ARRIVATA': 'Arrivata',
                'arrived': 'Arrivata',
                'Delivered': 'Consegnato',
                'delivered': 'Consegnato',
                'Discharged': 'Scaricato',
                'discharged': 'Scaricato',
                
                // Air specific
                'RCS': 'Ricevuto',
                'MAN': 'Manifested', 
                'DEP': 'Partito',
                'RCF': 'Arrivato',
                'DLV': 'Consegnato',
                
                // FedEx/Express
                'LA spedizione è stata consegnata': 'Consegnato',
                'On FedEx vehicle for delivery': 'In consegna',
                'At local FedEx facility': 'In transito',
                'Departed FedEx hub': 'In transito',
                'On the way': 'In transito',
                'Arrived at FedEx hub': 'In transito',
                'International shipment release - Import': 'Sdoganata',
                'At destination sort facility': 'In transito',
                'Left FedEx origin facility': 'In transito',
                'Picked up': 'In transito',
                'Shipment information sent to FedEx': 'Spedizione creata',
                
                // GLS
                'Consegnata.': 'Consegnato',
                'Consegna prevista nel corso della giornata odierna.': 'In consegna',
                'Arrivata nella Sede GLS locale.': 'In transito',
                'In transito.': 'In transito',
                'Partita dalla sede mittente. In transito.': 'In transito',
                'La spedizione e\' stata creata dal mittente, attendiamo che ci venga affidata per l\'invio a destinazione.': 'Spedizione creata',
                'La spedizione è stata consegnata': 'Consegnato',
                'La spedizione è in consegna': 'In consegna',
                'La spedizione è in transito': 'In transito',
                
                // Status interni (già tradotti)
                'registered': 'Spedizione creata',
                'in_transit': 'In transito',
                'customs_cleared': 'Sdoganata',
                'out_for_delivery': 'In consegna',
                'delayed': 'In ritardo',
                'exception': 'Eccezione'
            };
            
            const mappedStatus = statusMapping[originalStatus] || originalStatus;
            
            // Determina classe CSS basata sul testo mappato
            let badgeClass = 'badge-secondary';
            const statusLower = mappedStatus.toLowerCase();
            
            if (statusLower.includes('consegnato')) badgeClass = 'badge-success';
            else if (statusLower.includes('transito') || statusLower.includes('arrivata') || statusLower.includes('partito')) badgeClass = 'badge-info';
            else if (statusLower.includes('consegna') || statusLower.includes('sdoganata') || statusLower.includes('manifested')) badgeClass = 'badge-warning';
            else if (statusLower.includes('ritardo') || statusLower.includes('eccezione')) badgeClass = 'badge-danger';
            else if (statusLower.includes('creata') || statusLower.includes('ricevuto')) badgeClass = 'badge-secondary';
            
            return `<span class="sol-badge ${badgeClass}" style="display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">${mappedStatus}</span>`;
        },

        // ===== ORIGIN/DESTINATION =====
        origin_port: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'origin_port',
                'ORIGINE',
                'Origine',
                'Origin',
                'ORIGIN',
                'PORT OF LOADING',
                'Port Of Loading',
                'Port of Loading',
                'POL'
            ]) || '-';
        },

        destination_port: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'destination_port',
                'DESTINAZIONE',
                'Destinazione',
                'Destination',
                'DESTINATION',
                'PORT OF DISCHARGE',
                'Port Of Discharge',
                'Port of Discharge',
                'POD'
            ]) || '-';
        },

        // ===== SHIPSGO SEA SPECIFIC =====
        container_count: function(value, row) {
            const helpers = this;
            const count = helpers.getValue(row, [
                'container_count',
                'CONTAINER COUNT',
                'Container Count',
                'Container count'
            ]);
            
            if (!count) return '-';
            
            // Estrai solo il numero se c'è del testo
            if (typeof count === 'string') {
                const match = count.match(/(\d+)/);
                return match ? match[1] : count;
            }
            return count;
        },

        booking: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'booking',
                'BOOKING',
                'Booking',
                'Booking Number'
            ]) || '-';
        },

        port_of_loading: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'port_of_loading',
                'PORT OF LOADING',
                'Port Of Loading',
                'Port of Loading',
                'POL'
            ]) || '-';
        },

        date_of_loading: function(value, row) {
            const helpers = this;
            const date = helpers.getValue(row, [
                'date_of_loading',
                'DATE OF LOADING',
                'Date Of Loading',
                'Date of Loading'
            ]);
            return date ? formatDate(date) : '-';
        },

        port_of_discharge: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'port_of_discharge',
                'PORT OF DISCHARGE',
                'Port Of Discharge',
                'Port of Discharge',
                'POD'
            ]) || '-';
        },

        date_of_discharge: function(value, row) {
            const helpers = this;
            const date = helpers.getValue(row, [
                'date_of_discharge',
                'DATE OF DISCHARGE',
                'Date Of Discharge',
                'Date of Discharge'
            ]);
            return date ? formatDate(date) : '-';
        },

        pol_country: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'pol_country',
                'POL COUNTRY',
                'POL Country',
                'Origin Country',
                'ORIGIN COUNTRY'
            ]) || '-';
        },

        pol_country_code: function(value, row) {
            const helpers = this;
            const code = helpers.getValue(row, [
                'pol_country_code',
                'POL COUNTRY CODE',
                'POL Country Code',
                'Origin Country Code',
                'ORIGIN COUNTRY CODE'
            ]);
            return code ? `<span class="country-code" style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${code}</span>` : '-';
        },

        pod_country: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'pod_country',
                'POD COUNTRY',
                'POD Country',
                'Destination Country',
                'DESTINATION COUNTRY'
            ]) || '-';
        },

        pod_country_code: function(value, row) {
            const helpers = this;
            const code = helpers.getValue(row, [
                'pod_country_code',
                'POD COUNTRY CODE',
                'POD Country Code',
                'Destination Country Code',
                'DESTINATION COUNTRY CODE'
            ]);
            return code ? `<span class="country-code" style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${code}</span>` : '-';
        },

        co2_emission: function(value, row) {
            const helpers = this;
            const emission = helpers.getValue(row, [
                'co2_emission',
                'CO₂ EMISSION (TONS)',
                'CO2 Emission (Tons)',
                'CO₂ Emission (tons)',
                'CO2 EMISSION'
            ]);
            return emission ? `${emission}` : '-';
        },

        // ===== SHIPSGO AIR SPECIFIC =====
        awb_number: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'awb_number',
                'AWB NUMBER',
                'AWB Number',
                'Awb Number',
                'tracking_number'
            ]) || '-';
        },

        airline: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'airline',
                'AIRLINE',
                'Airline',
                'carrier_code'
            ]) || '-';
        },

        origin: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'origin',
                'ORIGIN',
                'Origin',
                'Origin Code'
            ]) || '-';
        },

        origin_name: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'origin_name',
                'ORIGIN NAME',
                'Origin Name'
            ]) || '-';
        },

        destination: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'destination',
                'DESTINATION',
                'Destination',
                'Destination Code'
            ]) || '-';
        },

        destination_name: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'destination_name',
                'DESTINATION NAME',
                'Destination Name'
            ]) || '-';
        },

        date_of_departure: function(value, row) {
            const helpers = this;
            const date = helpers.getValue(row, [
                'date_of_departure',
                'DATE OF DEPARTURE',
                'Date Of Departure',
                'Date of Departure'
            ]);
            return date ? formatDate(date) : '-';
        },

        date_of_arrival: function(value, row) {
            const helpers = this;
            const date = helpers.getValue(row, [
                'date_of_arrival',
                'DATE OF ARRIVAL',
                'Date Of Arrival',
                'Date of Arrival'
            ]);
            return date ? formatDate(date) : '-';
        },

        origin_country: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'origin_country',
                'ORIGIN COUNTRY',
                'Origin Country'
            ]) || '-';
        },

        origin_country_code: function(value, row) {
            const helpers = this;
            const code = helpers.getValue(row, [
                'origin_country_code',
                'ORIGIN COUNTRY CODE',
                'Origin Country Code'
            ]);
            return code ? `<span class="country-code" style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${code}</span>` : '-';
        },

        destination_country: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'destination_country',
                'DESTINATION COUNTRY',
                'Destination Country'
            ]) || '-';
        },

        destination_country_code: function(value, row) {
            const helpers = this;
            const code = helpers.getValue(row, [
                'destination_country_code',
                'DESTINATION COUNTRY CODE',
                'Destination Country Code'
            ]);
            return code ? `<span class="country-code" style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${code}</span>` : '-';
        },

        transit_time: function(value, row) {
            const helpers = this;
            let time = helpers.getValue(row, [
                'transit_time',
                'TRANSIT TIME',
                'Transit Time'
            ]);
            
            // Calcola se non c'è ma abbiamo le date
            if (!time) {
                const depDate = helpers.getValue(row, ['DATE OF DEPARTURE', 'Date Of Departure']);
                const arrDate = helpers.getValue(row, ['DATE OF ARRIVAL', 'Date Of Arrival']);
                
                if (depDate && arrDate) {
                    try {
                        const departure = new Date(depDate);
                        const arrival = new Date(arrDate);
                        const diffTime = Math.abs(arrival - departure);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        time = `${diffDays} giorni`;
                    } catch (e) {
                        console.warn('Error calculating transit time:', e);
                    }
                }
            }
            
            // Pulisci il formato se necessario
            if (typeof time === 'string' && time.includes('giorni')) {
                return time;
            } else if (time && !isNaN(time)) {
                return `${time} giorni`;
            }
            
            return time || '-';
        },

        t5_count: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                't5_count',
                'T5 COUNT',
                'T5 Count',
                'T5Count'
            ]) || '-';
        },

        // ===== COMMON FIELDS =====
        reference_number: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'reference_number',
                'RIFERIMENTO',
                'Riferimento',
                'Reference',
                'REFERENCE',
                'Ref'
            ]) || '-';
        },

        eta: function(value, row) {
            const helpers = this;
            const eta = helpers.getValue(row, [
                'eta',
                'ETA',
                'Date Of Arrival',
                'DATE OF ARRIVAL',
                'Date Of Discharge',
                'DATE OF DISCHARGE'
            ]);
            return eta ? formatDate(eta) : '-';
        },

        last_event_location: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'last_event_location',
                'ULTIMA POSIZIONE',
                'Last Location',
                'Current Location',
                'destination_port',
                'DESTINATION'
            ]) || '-';
        },

        created_at: function(value, row) {
            const helpers = this;
            const date = helpers.getValue(row, [
                'created_at',
                'DATA INSERIMENTO',
                'Created At',
                'CREATED AT'
            ]);
            return date ? formatDate(date) : '-';
        },

        updated_at: function(value, row) {
            const helpers = this;
            const date = helpers.getValue(row, [
                'updated_at',
                'Updated At'
            ]);
            return date ? formatDate(date) : '-';
        },

        tags: function(value, row) {
            const helpers = this;
            const tags = helpers.getValue(row, [
                'tags',
                'TAGS',
                'Tags'
            ]);
            
            if (tags && typeof tags === 'string' && tags !== '-') {
                return tags.split(',').map(tag => 
                    `<span class="sol-badge badge-light" style="margin: 2px; padding: 2px 6px; background: #e9ecef; border-radius: 8px; font-size: 10px;">${tag.trim()}</span>`
                ).join(' ');
            }
            return tags || '-';
        }
    };
}

// ===== HELPER FUNCTION PER DATE FORMATTING - MIGLIORATA =====
function formatDate(dateString) {
    if (!dateString || dateString === '-') return '-';
    
    try {
        // Se è già in formato DD/MM/YYYY, restituiscilo così
        if (typeof dateString === 'string' && dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return dateString;
        }
        
        // Se è in formato DD/MM/YY, convertilo a DD/MM/YYYY
        if (typeof dateString === 'string' && dateString.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
            const parts = dateString.split('/');
            const year = parseInt(parts[2]);
            const fullYear = year < 50 ? 2000 + year : 1900 + year; // Assume 00-49 = 2000-2049, 50-99 = 1950-1999
            return `${parts[0]}/${parts[1]}/${fullYear}`;
        }
        
        // Se è un timestamp ISO o altro formato, convertilo
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Se non è una data valida, restituisci il valore originale
        
        // Converti in DD/MM/YYYY
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.warn('Error formatting date:', dateString, error);
        return dateString || '-';
    }
}

// ===== DEBUG FUNCTION MIGLIORATA =====
function debugRowData() {
    const row = window.currentTrackings?.[0];
    if (row) {
        console.log('🔍 DEBUG ROW DATA:');
        console.log('Full row:', row);
        console.log('Row keys:', Object.keys(row));
        console.log('Has metadata:', !!row.metadata);
        if (row.metadata) {
            console.log('Metadata keys:', Object.keys(row.metadata));
            console.log('Metadata sample:', row.metadata);
        }
        
        // Test formatters con doppio controllo
        const formatters = getColumnFormatters();
        console.log('\n🧪 FORMATTER TESTS:');
        console.log('- container_count:', formatters.container_count(null, row));
        console.log('- transit_time:', formatters.transit_time(null, row));
        console.log('- status:', formatters.status(null, row));
        console.log('- awb_number:', formatters.awb_number(null, row));
        console.log('- tracking_number:', formatters.tracking_number(null, row));
        console.log('- tracking_type:', formatters.tracking_type(null, row));
    } else {
        console.log('❌ No tracking data found in window.currentTrackings');
        
        // Prova a controllare localStorage
        try {
            const stored = localStorage.getItem('trackings');
            if (stored) {
                const trackings = JSON.parse(stored);
                console.log('📦 Found in localStorage:', trackings.length, 'trackings');
                if (trackings.length > 0) {
                    console.log('First localStorage tracking:', trackings[0]);
                }
            }
        } catch (e) {
            console.log('❌ No localStorage access or empty');
        }
    }
}

// Esponi la funzione di debug
window.debugRowData = debugRowData;

// ===== FORMATTER DELLE COLONNE - VERSIONE SEMPLIFICATA =====
function getColumnFormatter(key) {
    const formatters = getColumnFormatters();
    
    // Se esiste un formatter specifico, usalo
    if (formatters[key]) {
        return formatters[key];
    }
    
    // Formatter universale per campi non specificati
    return (value, row) => {
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
        
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return row[key];
        }
        
        if (row.metadata && row.metadata[key]) {
            return row.metadata[key];
        }
        
        const capitalKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
        if (row.metadata && row.metadata[capitalKey]) {
            return row.metadata[capitalKey];
        }
        
        return '-';
    };
}

// ===== FUNZIONI GLOBALI ESPOSTE =====
window.refreshTracking = (id) => handleRefreshTracking(id);
window.viewTimeline = (id) => handleViewTimeline(id);
window.deleteTracking = (id) => handleDeleteTracking(id);
window.showColumnManager = showColumnManager;
window.toggleAllColumns = toggleAllColumns;
window.applyColumnChanges = applyColumnChanges;
window.resetDefaultColumns = resetDefaultColumns;
window.updateSelectedCount = updateSelectedCount;
window.toggleSelectAll = toggleSelectAll;
window.getSelectedRows = getSelectedRows;
window.clearSelection = clearSelection;
window.bulkRefreshTrackings = bulkRefreshTrackings;
window.bulkDeleteTrackings = bulkDeleteTrackings;
window.exportSelectedTrackings = exportSelectedTrackings;

// ===== INIZIALIZZAZIONE PRINCIPALE =====
window.trackingInit = async function() {
    console.log('🚀 [Tracking] Initializing FINAL PERFECT system with ShipsGo Fix...');
    
    try {
        // Inizializza servizi
        await trackingService.initialize();
        console.log('✅ [Tracking] Service initialized');
        
        // Esponi funzioni
        window.showAddTrackingForm = showAddTrackingForm;
        window.refreshAllTrackings = refreshAllTrackings;
        window.exportToPDF = exportToPDF;
        window.exportToExcel = exportToExcel;
        window.showColumnManager = showColumnManager;
        
        // Load saved columns
        loadSavedColumns();
        
        // ===== ESPONI FORMATTER FUNCTIONS PRIMA della tabella =====
        window.getColumnFormatter = getColumnFormatter;
        window.getColumnFormatters = getColumnFormatters;
        window.formatDate = formatDate;
        console.log('[Tracking] ✅ Column formatters exposed globally with ShipsGo Fix');
        
        // Setup componenti - ORDINE IMPORTANTE
        setupStatsCards();
        setupBulkActions();
        setupCheckboxListeners();
        setupTrackingTable();      // Ora userà il formatter esposto
        setupEventListeners();
        
        // Carica dati iniziali
        await loadTrackings();
        console.log('✅ [Tracking] Initial data loaded');
        
        // Auto-refresh
        startAutoRefresh();
        console.log('✅ [Tracking] Auto-refresh started');
        
        // Listen for tracking updates from import
        window.addEventListener('trackingsUpdated', async (event) => {
            console.log('[Tracking] Trackings updated from import');
            await loadTrackings();
        });
        
        console.log('✅ [Tracking] FINAL PERFECT system with ShipsGo Fix initialized successfully');
        
    } catch (error) {
        console.error('❌ [Tracking] Initialization failed:', error);
        if (window.NotificationSystem) {
            window.NotificationSystem.error('Errore inizializzazione pagina tracking');
        }
    }
};

// ===== LOAD SAVED COLUMNS =====
function loadSavedColumns() {
    const saved = localStorage.getItem('trackingColumns');
    if (saved) {
        try {
            currentColumns = JSON.parse(saved);
            if (!currentColumns.includes('select')) {
                currentColumns.unshift('select');
            }
        } catch (e) {
            currentColumns = [...DEFAULT_COLUMNS];
        }
    } else {
        currentColumns = [...DEFAULT_COLUMNS];
    }
}

// ===== SETUP STATS CARDS =====
function setupStatsCards() {
    const statsGrid = document.getElementById('statsGrid');
    
    statsCards = [
        { id: 'activeTrackings', icon: 'fa-box', label: 'Tracking Attivi', value: 0 },
        { id: 'inTransit', icon: 'fa-ship', label: 'In Transito', value: 0 },
        { id: 'arrived', icon: 'fa-anchor', label: 'Arrivati', value: 0 },
        { id: 'delivered', icon: 'fa-check-circle', label: 'Consegnati', value: 0 },
        { id: 'delayed', icon: 'fa-exclamation-triangle', label: 'In Ritardo', value: 0 }
    ];
    
    if (statsGrid) {
        statsGrid.innerHTML = statsCards.map(card => `
            <div class="sol-stat-card" data-id="${card.id}">
                <i class="fas fa-grip-vertical card-drag-handle"></i>
                <i class="fas ${card.icon} sol-stat-icon"></i>
                <div class="sol-stat-value" id="${card.id}">0</div>
                <div class="sol-stat-label">${card.label}</div>
            </div>
        `).join('');
        
        // Setup Sortable
        if (window.Sortable) {
            new Sortable(statsGrid, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                handle: '.card-drag-handle',
                onEnd: () => saveStatsOrder()
            });
        }
        
        restoreStatsOrder();
    }
}

// ===== SETUP TRACKING TABLE - SOLARIUM DESIGN COMPLIANT =====
function setupTrackingTable() {
    const columns = currentColumns.map(colKey => {
        const colDef = availableColumns.find(c => c.key === colKey);
        if (!colDef) return null;
        
        // Gestione colonna checkbox
        if (colDef.isCheckbox) {
            return {
                key: 'select',
                label: `<input type="checkbox" class="select-all sol-form-control" onchange="toggleSelectAll(this)">`,
                sortable: false,
                width: colDef.width,
                formatter: (value, row) => `
                    <input type="checkbox" 
                           class="row-select sol-form-control" 
                           data-row-id="${row.id}"
                           onchange="updateSelectedCount()">
                `
            };
        }
        
        // Gestione colonna azioni
        if (colDef.isAction) {
            return {
                key: 'actions',
                label: 'Azioni',
                sortable: false,
                formatter: (value, row) => `
                    <div class="action-buttons">
                        <button class="sol-btn-icon" onclick="refreshTracking('${row.id}')" title="Aggiorna">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="sol-btn-icon" onclick="viewTimeline('${row.id}')" title="Timeline">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="sol-btn-icon sol-text-danger" onclick="deleteTracking('${row.id}')" title="Elimina">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `
            };
        }
        
        const formatter = getColumnFormatter(colKey);
        return {
            key: colKey,
            label: colDef.label,
            sortable: !colDef.isAction && !colDef.isCheckbox,
            formatter: formatter
        };
    }).filter(Boolean);
    
    trackingTable = new TableManager('trackingTableContainer', {
        columns: columns,
        emptyMessage: 'Nessun tracking attivo. Aggiungi il tuo primo tracking per iniziare.',
        pageSize: 20,
        className: 'data-table sol-table' // ===== SOLARIUM DESIGN SYSTEM CLASS =====
    });
}

// ===== BULK ACTIONS SETUP =====
function setupBulkActions() {
    const tableContainer = document.querySelector('.sol-card-header');
    if (tableContainer && !document.getElementById('bulkActionsContainer')) {
        const bulkActions = document.createElement('div');
        bulkActions.id = 'bulkActionsContainer';
        bulkActions.style.display = 'none';
        bulkActions.innerHTML = `
            <div class="bulk-actions-bar">
                <span class="selected-count">
                    <i class="fas fa-check-square"></i>
                    <span id="selectedCount">0</span> selezionati
                </span>
                <div class="bulk-actions">
                    <button class="sol-btn sol-btn-sm sol-btn-primary" onclick="bulkRefreshTrackings()">
                        <i class="fas fa-sync-alt"></i> Aggiorna Selezionati
                    </button>
                    <button class="sol-btn sol-btn-sm sol-btn-danger" onclick="bulkDeleteTrackings()">
                        <i class="fas fa-trash"></i> Elimina Selezionati
                    </button>
                    <button class="sol-btn sol-btn-sm sol-btn-secondary" onclick="exportSelectedTrackings()">
                        <i class="fas fa-file-export"></i> Esporta Selezionati
                    </button>
                    <button class="sol-btn sol-btn-sm sol-btn-outline" onclick="clearSelection()">
                        <i class="fas fa-times"></i> Deseleziona
                    </button>
                </div>
            </div>
        `;
        tableContainer.appendChild(bulkActions);
    }
}

function setupCheckboxListeners() {
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-select')) {
            updateSelectedCount();
        }
    });
}

function updateSelectedCount() {
    const selected = getSelectedRows();
    const count = selected.length;
    const container = document.getElementById('bulkActionsContainer');
    const countEl = document.getElementById('selectedCount');
    
    if (container) {
        container.style.display = count > 0 ? 'block' : 'none';
        if (countEl) countEl.textContent = count;
    }
}

function toggleSelectAll(checkbox) {
    const checkboxes = document.querySelectorAll('.row-select');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
        cb.dispatchEvent(new Event('change'));
    });
    updateSelectedCount();
}

function getSelectedRows() {
    const selected = [];
    document.querySelectorAll('.row-select:checked').forEach(checkbox => {
        const rowId = checkbox.dataset.rowId;
        const tracking = trackings.find(t => t.id == rowId);
        if (tracking) selected.push(tracking);
    });
    return selected;
}

function clearSelection() {
    document.querySelectorAll('.row-select').forEach(cb => cb.checked = false);
    const selectAll = document.querySelector('.select-all');
    if (selectAll) selectAll.checked = false;
    updateSelectedCount();
}

// ===== BULK OPERATIONS =====
async function bulkRefreshTrackings() {
    const selected = getSelectedRows();
    if (selected.length === 0) return;
    
    const progressModal = window.ModalSystem.progress({
        title: 'Aggiornamento Multiplo',
        message: 'Aggiornamento in corso...',
        showPercentage: true
    });
    
    for (let i = 0; i < selected.length; i++) {
        const progress = ((i + 1) / selected.length) * 100;
        progressModal.update(progress, `Aggiornamento ${i + 1} di ${selected.length}...`);
        
        await handleRefreshTracking(selected[i].id);
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    progressModal.close();
    clearSelection();
    notificationSystem.success(`${selected.length} tracking aggiornati`);
}

async function bulkDeleteTrackings() {
    const selected = getSelectedRows();
    if (selected.length === 0) return;
    
    const confirmed = await window.ModalSystem.confirm({
        title: 'Conferma Eliminazione Multipla',
        message: `Sei sicuro di voler eliminare ${selected.length} tracking?`,
        confirmText: 'Elimina Tutti',
        confirmClass: 'sol-btn-danger'
    });
    
    if (!confirmed) return;
    
    const ids = selected.map(t => t.id);
    trackings = trackings.filter(t => !ids.includes(t.id));
    
    localStorage.setItem('trackings', JSON.stringify(trackings));
    await loadTrackings();
    
    clearSelection();
    notificationSystem.success(`${selected.length} tracking eliminati`);
}

async function exportSelectedTrackings() {
    try {
        const selected = getSelectedRows();
        
        if (selected.length === 0) {
            window.NotificationSystem?.warning('Nessun tracking selezionato');
            return;
        }
        
        const format = await window.ModalSystem?.confirm({
            title: 'Formato Export',
            message: 'Seleziona il formato di export:',
            confirmText: 'Excel',
            cancelText: 'PDF',
            type: 'info'
        });
        
        if (window.ExportManager) {
            if (format) {
                await window.ExportManager.exportSelected(selected, 'excel', 'selected-trackings');
            } else if (format === false) {
                await window.ExportManager.exportSelected(selected, 'pdf', 'selected-trackings');
            }
        }
        
        clearSelection();
        
    } catch (error) {
        console.error('[Tracking] Export selected error:', error);
        window.NotificationSystem?.error('Errore export: ' + error.message);
    }
}

// ===== COLUMN MANAGER =====
function showColumnManager() {
    const manageableColumns = availableColumns.filter(col => col.key !== 'select');
    
    const content = `
        <div class="column-manager">
            <div class="column-manager-header">
                <p>Seleziona e riordina le colonne da visualizzare</p>
                <button class="sol-btn sol-btn-sm sol-btn-secondary" onclick="toggleAllColumns()">
                    <i class="icon-check-square"></i> Seleziona/Deseleziona Tutto
                </button>
            </div>
            <div class="column-list" id="columnList">
                ${manageableColumns.map(col => {
                    const isChecked = currentColumns.includes(col.key);
                    const isRequired = col.required;
                    return `
                        <div class="column-item ${isRequired ? 'required' : ''}" data-column="${col.key}">
                            <div class="column-drag-handle" ${isRequired ? 'style="visibility:hidden"' : ''}>
                                <i class="fas fa-grip-vertical"></i>
                            </div>
                            <label class="column-checkbox">
                                <input type="checkbox" 
                                       value="${col.key}" 
                                       ${isChecked ? 'checked' : ''} 
                                       ${isRequired ? 'disabled' : ''}
                                       onchange="updateColumnSelection(this)">
                                <span>${col.label}</span>
                                ${isRequired ? '<small class="text-muted"> (obbligatorio)</small>' : ''}
                            </label>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="column-manager-footer">
                <button class="sol-btn sol-btn-secondary" onclick="resetDefaultColumns()">
                    <i class="icon-refresh"></i> Ripristina Default
                </button>
                <button class="sol-btn sol-btn-primary" onclick="applyColumnChanges()">
                    <i class="icon-check"></i> Applica
                </button>
            </div>
        </div>
    `;
    
    window.ModalSystem.show({
        title: 'Gestione Colonne',
        content: content,
        size: 'medium',
        showFooter: false
    });
    
    setTimeout(() => {
        const columnList = document.getElementById('columnList');
        if (columnList && window.Sortable) {
            new Sortable(columnList, {
                animation: 150,
                handle: '.column-drag-handle',
                ghostClass: 'sortable-ghost',
                onEnd: function(evt) {
                    updateColumnOrder();
                }
            });
        }
    }, 100);
}

function toggleAllColumns() {
    const checkboxes = document.querySelectorAll('#columnList input[type="checkbox"]:not(:disabled)');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        updateColumnSelection(cb);
    });
}

window.updateColumnSelection = function(checkbox) {
    const column = checkbox.value;
    if (checkbox.checked && !currentColumns.includes(column)) {
        currentColumns.push(column);
    } else if (!checkbox.checked && currentColumns.includes(column)) {
        currentColumns = currentColumns.filter(c => c !== column);
    }
};

function updateColumnOrder() {
    const items = document.querySelectorAll('.column-item');
    const newOrder = ['select'];
    
    items.forEach(item => {
        const column = item.dataset.column;
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            newOrder.push(column);
        }
    });
    
    currentColumns = newOrder;
}

function applyColumnChanges() {
    updateColumnOrder();
    localStorage.setItem('trackingColumns', JSON.stringify(currentColumns));
    setupTrackingTable();
    loadTrackings();
    window.ModalSystem.closeAll();
    notificationSystem.success('Colonne aggiornate con successo');
}

function resetDefaultColumns() {
    currentColumns = [...DEFAULT_COLUMNS];
    
    document.querySelectorAll('#columnList input[type="checkbox"]').forEach(cb => {
        cb.checked = DEFAULT_COLUMNS.includes(cb.value);
    });
    
    const columnList = document.getElementById('columnList');
    const items = Array.from(columnList.children);
    
    DEFAULT_COLUMNS.forEach(colKey => {
        const item = items.find(el => el.dataset.column === colKey);
        if (item) {
            columnList.appendChild(item);
        }
    });
    
    items.forEach(item => {
        if (!DEFAULT_COLUMNS.includes(item.dataset.column)) {
            columnList.appendChild(item);
        }
    });
}

// ===== LOAD TRACKINGS =====
async function loadTrackings() {
    console.log('🔄 [Tracking] Loading trackings...');
    
    try {
        if (!trackingTable) {
            console.warn('⚠️ [Tracking] TrackingTable not initialized, calling setupTrackingTable()');
            setupTrackingTable();
        }
        
        trackingTable.loading(true);
        
        const stored = localStorage.getItem('trackings');
        console.log('📦 [Tracking] LocalStorage data:', stored ? 'Found' : 'Empty');
        
        trackings = stored ? JSON.parse(stored) : generateMockTrackings();
        console.log(`📊 [Tracking] Loaded ${trackings.length} trackings`);
        
        // Ensure required fields
        trackings = trackings.map(t => ({
            ...t,
            id: t.id || Date.now() + Math.random(),
            created_at: t.created_at || new Date().toISOString(),
            eta: t.eta || generateETA(t.status)
        }));
        
        localStorage.setItem('trackings', JSON.stringify(trackings));
        
        updateStats();
        trackingTable.setData(trackings);
        console.log('📋 [Tracking] Table data set');
        
        window.currentTrackings = trackings;
        if (window.timelineView && window.timelineView.isActive()) {
            window.timelineView.refresh();
        }
        
        console.log(`✅ [Tracking] Successfully loaded ${trackings.length} trackings`);
        
    } catch (error) {
        console.error('❌ [Tracking] Error loading trackings:', error);
        if (window.NotificationSystem) {
            window.NotificationSystem.error('Errore nel caricamento dei tracking');
        }
        
        trackings = generateMockTrackings();
        updateStats();
        if (trackingTable) {
            trackingTable.setData(trackings);
        }
        
    } finally {
        if (trackingTable) {
            trackingTable.loading(false);
        }
    }
}

// ===== MOCK DATA GENERATION =====
function generateETA(status) {
    const now = new Date();
    const eta = new Date(now);
    
    switch(status) {
        case 'in_transit':
            eta.setDate(eta.getDate() + 7);
            break;
        case 'arrived':
            eta.setDate(eta.getDate() + 2);
            break;
        case 'out_for_delivery':
            eta.setDate(eta.getDate() + 1);
            break;
        case 'delivered':
        case 'customs_cleared':
            return null;
        default:
            eta.setDate(eta.getDate() + 14);
    }
    
    return eta.toISOString();
}

function generateMockTrackings() {
    const now = new Date();
    return [
        {
            id: '1',
            tracking_number: 'MSKU1234567',
            tracking_type: 'container',
            carrier_code: 'MAERSK',
            status: 'in_transit',
            last_event_location: 'Shanghai, China',
            origin_port: 'SHANGHAI',
            destination_port: 'GENOVA',
            reference_number: 'PO-2024-001',
            created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
            eta: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: '2',
            tracking_number: 'MSCU7654321',
            tracking_type: 'container',
            carrier_code: 'MSC',
            status: 'arrived',
            last_event_location: 'Genova, Italy',
            origin_port: 'NINGBO',
            destination_port: 'GENOVA',
            reference_number: 'PO-2024-002',
            created_at: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(),
            eta: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: '3',
            tracking_number: '176-12345678',
            tracking_type: 'awb',
            carrier_code: 'CARGOLUX',
            status: 'in_transit',
            last_event_location: 'Luxembourg Airport',
            origin_port: 'HKG',
            destination_port: 'MXP',
            reference_number: 'AIR-2024-003',
            created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
            eta: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
}

function updateStats() {
    const stats = {
        total: trackings.length,
        in_transit: trackings.filter(t => t.status === 'in_transit').length,
        arrived: trackings.filter(t => t.status === 'arrived').length,
        delivered: trackings.filter(t => t.status === 'delivered').length,
        delayed: trackings.filter(t => t.status === 'delayed').length
    };
    
    const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    
    updateElement('activeTrackings', stats.total);
    updateElement('inTransit', stats.in_transit);
    updateElement('arrived', stats.arrived);
    updateElement('delivered', stats.delivered);
    updateElement('delayed', stats.delayed);
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    console.log('🔗 [Tracking] Setting up event listeners...');
    
    const safeAddListener = (selector, event, handler, description) => {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener(event, handler);
            console.log(`✅ [Tracking] ${description} listener added`);
            return true;
        } else {
            console.warn(`⚠️ [Tracking] ${description} element not found: ${selector}`);
            return false;
        }
    };
    
    safeAddListener('#addTrackingBtn', 'click', showAddTrackingForm, 'Add Tracking');
    safeAddListener('#refreshAllBtn', 'click', refreshAllTrackings, 'Refresh All');
    safeAddListener('#exportPdfBtn', 'click', exportToPDF, 'Export PDF');
    safeAddListener('#exportExcelBtn', 'click', exportToExcel, 'Export Excel');
    safeAddListener('#statusFilter', 'change', applyFilters, 'Status Filter');
    safeAddListener('#typeFilter', 'change', applyFilters, 'Type Filter');
}

// ===== FORM FUNCTIONS =====
function showAddTrackingForm() {
    window.ModalSystem.show({
        title: 'Aggiungi Tracking',
        content: renderTrackingForm(),
        size: 'large',
        showFooter: false
    });
    
    setupFormInteractions();
}

function renderTrackingForm() {
    return `
        <div class="sol-form">
            <div class="sol-tabs">
                <button class="sol-tab active" data-tab="single" onclick="switchTab('single')">
                    <i class="fas fa-plus"></i> Singolo Tracking
                </button>
                <button class="sol-tab" data-tab="import" onclick="switchTab('import')">
                    <i class="fas fa-file-import"></i> Import Multiplo
                </button>
            </div>
            
            <div class="sol-tab-content active" data-content="single">
                <form id="trackingForm" class="tracking-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Numero Tracking *</label>
                            <input type="text" id="trackingNumber" class="sol-form-control" 
                                   placeholder="Es: MSKU1234567" required
                                   oninput="detectTrackingType(this.value)">
                            <span class="form-hint" id="typeHint"></span>
                        </div>
                        
                        <div class="form-group">
                            <label>Tipo Tracking *</label>
                            <select id="trackingType" class="sol-form-control" required>
                                <option value="">Seleziona tipo</option>
                                <option value="container">Container (Mare)</option>
                                <option value="bl">Bill of Lading (B/L)</option>
                                <option value="awb">Air Waybill (Aereo)</option>
                                <option value="parcel">Parcel/Express</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Vettore *</label>
                            <select id="carrierCode" class="sol-form-control" required>
                                <option value="">Seleziona vettore</option>
                                <optgroup label="Mare">
                                    <option value="MSC">MSC</option>
                                    <option value="MAERSK">MAERSK</option>
                                    <option value="CMA-CGM">CMA CGM</option>
                                    <option value="COSCO">COSCO</option>
                                    <option value="HAPAG-LLOYD">Hapag-Lloyd</option>
                                    <option value="ONE">ONE</option>
                                    <option value="EVERGREEN">Evergreen</option>
                                </optgroup>
                                <optgroup label="Aereo">
                                    <option value="CARGOLUX">Cargolux</option>
                                    <option value="LUFTHANSA">Lufthansa Cargo</option>
                                    <option value="EMIRATES">Emirates SkyCargo</option>
                                </optgroup>
                                <optgroup label="Express">
                                    <option value="DHL">DHL</option>
                                    <option value="FEDEX">FedEx</option>
                                    <option value="UPS">UPS</option>
                                    <option value="TNT">TNT</option>
                                    <option value="GLS">GLS</option>
                                </optgroup>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Riferimento</label>
                            <input type="text" id="referenceNumber" class="sol-form-control" 
                                   placeholder="Es: PO123456">
                        </div>
                        
                        <div class="form-group">
                            <label>Porto Origine</label>
                            <input type="text" id="originPort" class="sol-form-control" 
                                   placeholder="Es: SHANGHAI">
                        </div>
                        
                        <div class="form-group">
                            <label>Porto Destinazione</label>
                            <input type="text" id="destinationPort" class="sol-form-control" 
                                   placeholder="Es: GENOVA">
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="sol-btn sol-btn-secondary" onclick="window.ModalSystem.closeAll()">
                            Annulla
                        </button>
                        <button type="submit" class="sol-btn sol-btn-primary">
                            <i class="fas fa-plus"></i> Aggiungi Tracking
                        </button>
                    </div>
                </form>
            </div>
            
            <div class="sol-tab-content" data-content="import">
                <div id="importContainer">
                    <div class="import-container">
                        <div class="import-shipsgo">
                            <i class="fas fa-ship fa-3x"></i>
                            <h4>Import File ShipsGo</h4>
                            <p>Carica i file Excel esportati da ShipsGo (Mare o Aereo)</p>
                            <input type="file" id="shipsgoFile" accept=".csv,.xlsx,.xls" style="display:none" 
                                   onchange="handleFileImport(this.files[0])">
                            <button class="sol-btn sol-btn-primary" onclick="document.getElementById('shipsgoFile').click()">
                                <i class="fas fa-file-excel"></i> Seleziona File ShipsGo
                            </button>
                        </div>
                        
                        <div class="import-divider">
                            <p>Oppure</p>
                        </div>
                        
                        <button class="sol-btn sol-btn-secondary" onclick="downloadTemplate()">
                            <i class="fas fa-download"></i> Scarica Template CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;