// /core/import-wizard-shipsgo.js - ShipsGo Template Enhancement for Import Wizard
import { importWizard } from '/core/import-wizard.js';
import { notificationSystem } from '/core/notification-system.js';

// ShipsGo Templates Configuration - AGGIORNATO CON I CAMPI CORRETTI
const SHIPSGO_TEMPLATES = {
    sea: {
        name: 'ShipsGo Sea Shipments',
        icon: '🚢',
        description: 'Import container tracking from ShipsGo sea shipments export',
        fileTypes: ['csv', 'xlsx'],
        requiredHeaders: [
            'Container', 'Carrier', 'Status', 'Port Of Loading', 
            'Port Of Discharge', 'Date Of Loading', 'Date Of Discharge'
        ],
        fieldMapping: {
            // Mapping esatto dalle colonne del file Excel mostrato
            'Container': 'tracking_number',
            'Carrier': 'carrier_name',
            'Status': 'status',
            'Port Of Loading': 'origin_port',
            'Date Of Loading': 'loading_date',
            'POL Country': 'origin_country',
            'POL Country Code': 'origin_country_code',
            'Port Of Discharge': 'destination_port',
            'Date Of Discharge': 'discharge_date',
            'POD Country': 'destination_country',
            'POD Country Code': 'destination_country_code',
            'Reference': 'reference_number',
            'Booking': 'booking_number',
            'CO₂ Emission (Tons)': 'co2_emissions',
            'Container Count': 'container_count',
            'Tags': 'tags',
            'Created At': 'created_at'
        },
        defaultValues: {
            tracking_type: 'container'
        },
        eventGenerator: generateSeaEvents,
        statusMapping: {
            'Discharged': 'delivered',
            'Delivered': 'delivered',
            'Empty': 'delivered',
            'In Transit': 'in_transit',
            'Sailing': 'in_transit',
            'Loaded': 'in_transit',
            'Gate In': 'in_transit',
            'Gate Out': 'in_transit',
            'Arrived': 'in_transit',
            'Registered': 'registered',
            'Pending': 'registered'
        }
    },
    
    air: {
        name: 'ShipsGo Air Shipments',
        icon: '✈️',
        description: 'Import AWB tracking from ShipsGo air shipments export',
        fileTypes: ['csv', 'xlsx'],
        requiredHeaders: [
            'AWB Number', 'Airline', 'Status', 'Origin', 
            'Destination', 'Date Of Departure', 'Date Of Arrival'
        ],
        fieldMapping: {
            // Mapping dalle colonne del file Excel Air
            'AWB Number': 'tracking_number',
            'Airline': 'carrier_name',
            'Status': 'status',
            'Origin': 'origin_port',
            'Origin Name': 'origin_name',
            'Date Of Departure': 'departure_date',
            'Origin Country': 'origin_country',
            'Origin Country Code': 'origin_country_code',
            'Destination': 'destination_port',
            'Destination Name': 'destination_name',
            'Date Of Arrival': 'arrival_date',
            'Destination Country': 'destination_country',
            'Destination Country Code': 'destination_country_code',
            'Reference': 'reference_number',
            'Tags': 'tags',
            'Created At': 'created_at',
            'Transit Time': 'transit_time',
            'T5 Count': 't5_count'
        },
        defaultValues: {
            tracking_type: 'awb'
        },
        eventGenerator: generateAirEvents,
        statusMapping: {
            'Departed': 'in_transit',
            'Arrived': 'in_transit',
            'In Transit': 'in_transit',
            'Out for Delivery': 'out_for_delivery',
            'Delivered': 'delivered',
            'RCS': 'registered',
            'MAN': 'in_transit',
            'DEP': 'in_transit',
            'ARR': 'in_transit',
            'RCF': 'in_transit',
            'DLV': 'delivered'
        }
    }
};

// Event type configurations
const SEA_EVENT_TYPES = {
    'REGISTERED': { icon: '📋', color: 'info', label: 'Shipment Registered' },
    'GATE_IN': { icon: '🚪', color: 'info', label: 'Gate In' },
    'LOADED_ON_VESSEL': { icon: '🏗️', color: 'primary', label: 'Loaded on Vessel' },
    'VESSEL_DEPARTED': { icon: '🚢', color: 'primary', label: 'Vessel Departed' },
    'TRANSHIPMENT': { icon: '🔄', color: 'warning', label: 'Transhipment' },
    'VESSEL_ARRIVED': { icon: '⚓', color: 'info', label: 'Vessel Arrived' },
    'DISCHARGED_FROM_VESSEL': { icon: '📦', color: 'success', label: 'Discharged' },
    'GATE_OUT': { icon: '🚪', color: 'success', label: 'Gate Out' },
    'DELIVERED': { icon: '✅', color: 'success', label: 'Delivered' }
};

const AIR_EVENT_TYPES = {
    'RCS': { icon: '📦', color: 'info', label: 'Received from Shipper' },
    'MAN': { icon: '📋', color: 'info', label: 'Manifested' },
    'DEP': { icon: '✈️', color: 'primary', label: 'Departed' },
    'ARR': { icon: '🛬', color: 'info', label: 'Arrived' },
    'RCF': { icon: '📥', color: 'warning', label: 'Received from Flight' },
    'DLV': { icon: '✅', color: 'success', label: 'Delivered' }
};

// Initialize ShipsGo templates
export function initShipsGoTemplates() {
    // Register templates with import wizard
    if (window.importWizard) {
        Object.entries(SHIPSGO_TEMPLATES).forEach(([key, template]) => {
            window.importWizard.registerTemplate(key, template);
        });
    }
}

// Generate sea shipment events from data
function generateSeaEvents(rowData, mappedData) {
    const events = [];
    const now = new Date();
    
    // Parse dates - AGGIORNATO per formato MM/DD/YYYY
    const loadingDate = parseShipsGoDate(rowData['Date Of Loading']);
    const dischargeDate = parseShipsGoDate(rowData['Date Of Discharge']);
    const createdDate = parseShipsGoDate(rowData['Created At']);
    const status = rowData['Status'];
    
    // Registration event (always first)
    if (createdDate) {
        events.push({
            event_type: 'REGISTERED',
            event_date: createdDate,
            location: rowData['Port Of Loading'],
            description: 'Shipment registered in system',
            icon: SEA_EVENT_TYPES.REGISTERED.icon,
            color: SEA_EVENT_TYPES.REGISTERED.color
        });
    }
    
    // Loading events
    if (loadingDate && new Date(loadingDate) <= now) {
        // Gate in (1 day before loading)
        const gateInDate = new Date(loadingDate);
        gateInDate.setDate(gateInDate.getDate() - 1);
        events.push({
            event_type: 'GATE_IN',
            event_date: gateInDate.toISOString(),
            location: rowData['Port Of Loading'],
            description: 'Container entered terminal',
            icon: SEA_EVENT_TYPES.GATE_IN.icon,
            color: SEA_EVENT_TYPES.GATE_IN.color
        });
        
        // Loaded on vessel
        events.push({
            event_type: 'LOADED_ON_VESSEL',
            event_date: loadingDate,
            location: rowData['Port Of Loading'],
            description: `Loaded on vessel at ${rowData['Port Of Loading']}`,
            icon: SEA_EVENT_TYPES.LOADED_ON_VESSEL.icon,
            color: SEA_EVENT_TYPES.LOADED_ON_VESSEL.color,
            details: `Carrier: ${rowData['Carrier']}`
        });
        
        // Vessel departed (few hours after loading)
        const departDate = new Date(loadingDate);
        departDate.setHours(departDate.getHours() + 6);
        events.push({
            event_type: 'VESSEL_DEPARTED',
            event_date: departDate.toISOString(),
            location: rowData['Port Of Loading'],
            description: 'Vessel departed from port',
            icon: SEA_EVENT_TYPES.VESSEL_DEPARTED.icon,
            color: SEA_EVENT_TYPES.VESSEL_DEPARTED.color
        });
    }
    
    // In transit events based on status
    if (status === 'Transhipment' || status === 'In Transshipment') {
        const transhipDate = new Date((new Date(loadingDate).getTime() + new Date(dischargeDate).getTime()) / 2);
        events.push({
            event_type: 'TRANSHIPMENT',
            event_date: transhipDate.toISOString(),
            location: 'Transhipment Port',
            description: 'Container in transhipment',
            icon: SEA_EVENT_TYPES.TRANSHIPMENT.icon,
            color: SEA_EVENT_TYPES.TRANSHIPMENT.color
        });
    }
    
    // Discharge events
    if (dischargeDate && new Date(dischargeDate) <= now) {
        // Vessel arrived (few hours before discharge)
        const arriveDate = new Date(dischargeDate);
        arriveDate.setHours(arriveDate.getHours() - 6);
        events.push({
            event_type: 'VESSEL_ARRIVED',
            event_date: arriveDate.toISOString(),
            location: rowData['Port Of Discharge'],
            description: 'Vessel arrived at port',
            icon: SEA_EVENT_TYPES.VESSEL_ARRIVED.icon,
            color: SEA_EVENT_TYPES.VESSEL_ARRIVED.color
        });
        
        // Discharged
        events.push({
            event_type: 'DISCHARGED_FROM_VESSEL',
            event_date: dischargeDate,
            location: rowData['Port Of Discharge'],
            description: `Discharged at ${rowData['Port Of Discharge']}`,
            icon: SEA_EVENT_TYPES.DISCHARGED_FROM_VESSEL.icon,
            color: SEA_EVENT_TYPES.DISCHARGED_FROM_VESSEL.color
        });
        
        // Gate out (1 day after discharge if delivered)
        if (status === 'Discharged' || status === 'Delivered' || status === 'Empty') {
            const gateOutDate = new Date(dischargeDate);
            gateOutDate.setDate(gateOutDate.getDate() + 1);
            if (gateOutDate <= now) {
                events.push({
                    event_type: 'GATE_OUT',
                    event_date: gateOutDate.toISOString(),
                    location: rowData['Port Of Discharge'],
                    description: 'Container left terminal',
                    icon: SEA_EVENT_TYPES.GATE_OUT.icon,
                    color: SEA_EVENT_TYPES.GATE_OUT.color
                });
            }
        }
    }
    
    // Delivered event
    if (status === 'Delivered' || status === 'Empty' || status === 'Empty Returned') {
        const deliveryDate = new Date(dischargeDate || now);
        deliveryDate.setDate(deliveryDate.getDate() + 3);
        if (deliveryDate <= now) {
            events.push({
                event_type: 'DELIVERED',
                event_date: deliveryDate.toISOString(),
                location: rowData['Port Of Discharge'],
                description: 'Container delivered to consignee',
                icon: SEA_EVENT_TYPES.DELIVERED.icon,
                color: SEA_EVENT_TYPES.DELIVERED.color
            });
        }
    }
    
    // Sort events by date
    events.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    
    return events;
}

// Generate air shipment events from data
function generateAirEvents(rowData, mappedData) {
    const events = [];
    const now = new Date();
    
    // Parse dates - AGGIORNATO per formato MM/DD/YYYY HH:mm:ss
    const departureDate = parseShipsGoDate(rowData['Date Of Departure']);
    const arrivalDate = parseShipsGoDate(rowData['Date Of Arrival']);
    const createdDate = parseShipsGoDate(rowData['Created At']);
    const status = rowData['Status'];
    
    // Registration/Creation event
    if (createdDate) {
        events.push({
            event_type: 'REGISTERED',
            event_date: createdDate,
            location: rowData['Origin Name'] || rowData['Origin'],
            description: 'AWB registered in system',
            icon: '📋',
            color: 'info'
        });
    }
    
    // RCS - Received from shipper (1 day before departure)
    if (departureDate) {
        const rcsDate = new Date(departureDate);
        rcsDate.setDate(rcsDate.getDate() - 1);
        events.push({
            event_type: 'RCS',
            event_date: rcsDate.toISOString(),
            location: rowData['Origin Name'] || rowData['Origin'],
            description: 'Shipment received from shipper',
            icon: AIR_EVENT_TYPES.RCS.icon,
            color: AIR_EVENT_TYPES.RCS.color
        });
        
        // MAN - Manifested (few hours before departure)
        const manDate = new Date(departureDate);
        manDate.setHours(manDate.getHours() - 4);
        events.push({
            event_type: 'MAN',
            event_date: manDate.toISOString(),
            location: rowData['Origin Name'] || rowData['Origin'],
            description: 'Shipment manifested',
            icon: AIR_EVENT_TYPES.MAN.icon,
            color: AIR_EVENT_TYPES.MAN.color
        });
        
        // DEP - Departed
        if (new Date(departureDate) <= now) {
            events.push({
                event_type: 'DEP',
                event_date: departureDate,
                location: rowData['Origin Name'] || rowData['Origin'],
                description: `Flight departed from ${rowData['Origin']}`,
                icon: AIR_EVENT_TYPES.DEP.icon,
                color: AIR_EVENT_TYPES.DEP.color,
                details: `Airline: ${rowData['Airline']}`
            });
        }
    }
    
    // ARR - Arrived
    if (arrivalDate && new Date(arrivalDate) <= now) {
        events.push({
            event_type: 'ARR',
            event_date: arrivalDate,
            location: rowData['Destination Name'] || rowData['Destination'],
            description: `Flight arrived at ${rowData['Destination']}`,
            icon: AIR_EVENT_TYPES.ARR.icon,
            color: AIR_EVENT_TYPES.ARR.color
        });
        
        // RCF - Received from flight (2 hours after arrival)
        const rcfDate = new Date(arrivalDate);
        rcfDate.setHours(rcfDate.getHours() + 2);
        if (rcfDate <= now) {
            events.push({
                event_type: 'RCF',
                event_date: rcfDate.toISOString(),
                location: rowData['Destination Name'] || rowData['Destination'],
                description: 'Shipment received from flight',
                icon: AIR_EVENT_TYPES.RCF.icon,
                color: AIR_EVENT_TYPES.RCF.color
            });
        }
    }
    
    // DLV - Delivered
    if (status === 'DLV' || status === 'Delivered') {
        const deliveryDate = new Date(arrivalDate || now);
        deliveryDate.setDate(deliveryDate.getDate() + 1);
        if (deliveryDate <= now) {
            events.push({
                event_type: 'DLV',
                event_date: deliveryDate.toISOString(),
                location: rowData['Destination Name'] || rowData['Destination'],
                description: 'Shipment delivered to consignee',
                icon: AIR_EVENT_TYPES.DLV.icon,
                color: AIR_EVENT_TYPES.DLV.color
            });
        }
    }
    
    // Sort events by date
    events.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    
    return events;
}

// Parse ShipsGo date format (MM/DD/YYYY or MM/DD/YYYY HH:MM:SS)
function parseShipsGoDate(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr === '') return null;
    
    try {
        // Split date and time
        const [datePart, timePart] = dateStr.trim().split(' ');
        
        // Parse MM/DD/YYYY format
        const [month, day, year] = datePart.split('/');
        
        if (!day || !month || !year) return null;
        
        // Create date object - months are 0-indexed in JavaScript
        let date = new Date(
            parseInt(year),
            parseInt(month) - 1,  // Subtract 1 for 0-indexed months
            parseInt(day)
        );
        
        // Add time if present (HH:MM:SS format)
        if (timePart) {
            const [hours, minutes, seconds] = timePart.split(':');
            date.setHours(parseInt(hours) || 0);
            date.setMinutes(parseInt(minutes) || 0);
            date.setSeconds(parseInt(seconds) || 0);
        }
        
        // Validate date
        if (isNaN(date.getTime())) return null;
        
        return date.toISOString();
    } catch (error) {
        console.error('Error parsing ShipsGo date:', dateStr, error);
        return null;
    }
}

// Enhanced import handler for tracking page
export async function handleShipsGoImport(file, template) {
    try {
        // Show import wizard with ShipsGo template
        const wizard = await importWizard.init({
            entity: 'tracking',
            targetFields: [
                { key: 'tracking_number', label: 'Tracking Number', required: true },
                { key: 'tracking_type', label: 'Type', required: true },
                { key: 'carrier_name', label: 'Carrier', required: true },
                { key: 'status', label: 'Status' },
                { key: 'origin_port', label: 'Origin' },
                { key: 'destination_port', label: 'Destination' },
                { key: 'reference_number', label: 'Reference' },
                { key: 'co2_emissions', label: 'CO₂ Emissions' },
                { key: 'tags', label: 'Tags' }
            ],
            templates: SHIPSGO_TEMPLATES,
            defaultTemplate: template,
            validationRules: {
                tracking_number: (value) => {
                    if (!value || value === '-') return 'Tracking number required';
                    return null;
                }
            },
            onImport: async (data, options) => {
                // Process each row
                const processedData = data.map(row => {
                    // Apply status mapping
                    if (row.status && template.statusMapping) {
                        row.status = template.statusMapping[row.status] || row.status;
                    }
                    
                    // Generate timeline events
                    const events = template.eventGenerator ? 
                        template.eventGenerator(row._original || row, row) : [];
                    
                    // Add metadata with timeline events
                    return {
                        ...row,
                        metadata: {
                            source: 'shipsgo_import',
                            import_date: new Date().toISOString(),
                            timeline_events: events,
                            original_data: row._original || row
                        }
                    };
                });
                
                // Call import API
                const result = await window.api.post('import-trackings', {
                    trackings: processedData,
                    options: {
                        ...options,
                        generateEvents: true
                    }
                }, {
                    loading: 'Importing ShipsGo data...'
                });
                
                return result;
            }
        });
        
        wizard.show();
        
    } catch (error) {
        console.error('ShipsGo import error:', error);
        notificationSystem.show('Error during import', 'error');
    }
}

// Auto-detect ShipsGo file format
export function detectShipsGoFormat(headers) {
    const headerStr = headers.join(',').toLowerCase();
    
    if (headerStr.includes('container') && headerStr.includes('port of loading')) {
        return 'sea';
    } else if (headerStr.includes('awb') && headerStr.includes('airline')) {
        return 'air';
    }
    
    return null;
}

// Export for use in tracking page
export const shipsGoImport = {
    templates: SHIPSGO_TEMPLATES,
    init: initShipsGoTemplates,
    handleImport: handleShipsGoImport,
    detectFormat: detectShipsGoFormat,
    parseDate: parseShipsGoDate,
    generateSeaEvents,
    generateAirEvents
};