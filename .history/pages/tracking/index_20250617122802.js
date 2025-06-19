// ===== FORMATTERS COMPLETI - FIX METADATA E STILI =====
// Sostituisci COMPLETAMENTE la funzione getColumnFormatters nel file /pages/tracking/index.js

function getColumnFormatters() {
    return {
        // ===== BASIC FIELDS =====
        tracking_number: (value, row) => {
            const number = value || row.tracking_number || row['AWB Number'] || row['Reference'] || '-';
            const type = row.tracking_type || row['tracking_type'] || 
                        (row['AWB Number'] ? 'awb' : 'container');
            const typeIcon = type === 'awb' ? '✈️' : (type === 'container' ? '📦' : '🚛');
            return `<span class="tracking-number">${typeIcon} ${number}</span>`;
        },

        tracking_type: (value, row) => {
            // Rileva il tipo dai dati
            let type = value || row.tracking_type || row['tracking_type'];
            
            // Auto-detection se non specificato
            if (!type) {
                if (row['AWB Number'] || row['Airline']) {
                    type = 'awb';
                } else if (row['Container Count'] || row['Port Of Loading']) {
                    type = 'container';
                } else {
                    type = 'container'; // default
                }
            }
            
            const typeMap = {
                'awb': 'AEREO',
                'container': 'MARE', 
                'bl': 'MARE',
                'parcel': 'CORRIERE',
                'shipsgo_air': 'AEREO',
                'shipsgo_sea': 'MARE'
            };
            
            const label = typeMap[type] || type.toUpperCase();
            const badgeClass = (type === 'awb' || type === 'shipsgo_air') ? 'badge-warning' : 'badge-info';
            
            return `<span class="sol-badge ${badgeClass}" style="display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase;">${label}</span>`;
        },

        carrier_code: (value, row) => {
            return value || row.carrier_code || row['Carrier'] || row['Airline'] || '-';
        },

        status: (value, row) => {
            const originalStatus = value || row.status || row['Status'] || 'registered';
            
            // ===== STATUS MAPPING COMPLETO DA GOOGLE SHEETS =====
            const statusMapping = {
                // Maritime
                'Sailing': 'In transito',
                'Arrived': 'Arrivata',
                'Delivered': 'Consegnato',
                'Discharged': 'Scaricato',
                
                // FedEx
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
                'arrived': 'Arrivata',
                'customs_cleared': 'Sdoganata',
                'out_for_delivery': 'In consegna',
                'delivered': 'Consegnato',
                'delayed': 'In ritardo',
                'exception': 'Eccezione'
            };
            
            const mappedStatus = statusMapping[originalStatus] || originalStatus;
            
            // Determina classe CSS basata sul testo mappato
            let badgeClass = 'badge-secondary';
            if (mappedStatus.includes('Consegnato')) badgeClass = 'badge-success';
            else if (mappedStatus.includes('In transito') || mappedStatus.includes('Arrivata')) badgeClass = 'badge-info';
            else if (mappedStatus.includes('In consegna') || mappedStatus.includes('Sdoganata')) badgeClass = 'badge-warning';
            else if (mappedStatus.includes('ritardo') || mappedStatus.includes('Eccezione')) badgeClass = 'badge-danger';
            else if (mappedStatus.includes('creata')) badgeClass = 'badge-secondary';
            
            return `<span class="sol-badge ${badgeClass}" style="display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">${mappedStatus}</span>`;
        },

        // ===== ORIGIN/DESTINATION =====
        origin_port: (value, row) => {
            return value || row.origin_port || row['Origin'] || row['Port Of Loading'] || '-';
        },

        destination_port: (value, row) => {
            return value || row.destination_port || row['Destination'] || row['Port Of Discharge'] || '-';
        },

        // ===== AIR SPECIFIC FORMATTERS =====
        awb_number: (value, row) => {
            return value || row['AWB Number'] || row.tracking_number || '-';
        },

        airline: (value, row) => {
            return value || row['Airline'] || row.carrier_code || '-';
        },

        origin_country: (value, row) => {
            return value || row['Origin Country'] || row['POL Country'] || '-';
        },

        origin_country_code: (value, row) => {
            const code = value || row['Origin Country Code'] || row['POL Country Code'] || '';
            return code ? `<span class="country-code" style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${code}</span>` : '-';
        },

        destination_country: (value, row) => {
            return value || row['Destination Country'] || row['POD Country'] || '-';
        },

        destination_country_code: (value, row) => {
            const code = value || row['Destination Country Code'] || row['POD Country Code'] || '';
            return code ? `<span class="country-code" style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${code}</span>` : '-';
        },

        date_of_departure: (value, row) => {
            const date = value || row['Date Of Departure'] || row.departure_date || '';
            return date ? formatDate(date) : '-';
        },

        date_of_arrival: (value, row) => {
            const date = value || row['Date Of Arrival'] || row.eta || '';
            return date ? formatDate(date) : '-';
        },

        transit_time: (value, row) => {
            // Calcola transit time se abbiamo le date
            let time = value || row['Transit Time'] || row.transit_time || '';
            
            if (!time && row['Date Of Departure'] && row['Date Of Arrival']) {
                try {
                    const departure = new Date(row['Date Of Departure']);
                    const arrival = new Date(row['Date Of Arrival']);
                    const diffTime = Math.abs(arrival - departure);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    time = diffDays;
                } catch (e) {
                    console.warn('Error calculating transit time:', e);
                }
            }
            
            // Se time è "16 giorni", estrai solo il numero
            if (typeof time === 'string' && time.includes('giorni')) {
                time = time.replace(/[^0-9]/g, '');
            }
            
            return time || '-';
        },

        t5_count: (value, row) => {
            return value || row['T5 Count'] || '-';
        },

        // ===== SEA SPECIFIC FORMATTERS =====
        reference: (value, row) => {
            return value || row['Reference'] || row.tracking_number || '-';
        },

        booking: (value, row) => {
            return value || row['Booking'] || '-';
        },

        container_count: (value, row) => {
            const count = value || row['Container Count'] || '';
            // Estrai solo il numero se c'è del testo
            if (typeof count === 'string' && count.includes('container')) {
                return count.replace(/[^0-9]/g, '') || '-';
            }
            return count || '-';
        },

        port_of_loading: (value, row) => {
            return value || row['Port Of Loading'] || row.origin_port || '-';
        },

        date_of_loading: (value, row) => {
            const date = value || row['Date Of Loading'] || row.departure_date || '';
            return date ? formatDate(date) : '-';
        },

        port_of_discharge: (value, row) => {
            return value || row['Port Of Discharge'] || row.destination_port || '-';
        },

        date_of_discharge: (value, row) => {
            const date = value || row['Date Of Discharge'] || row.eta || '';
            return date ? formatDate(date) : '-';
        },

        pol_country: (value, row) => {
            return value || row['POL Country'] || row['Origin Country'] || '-';
        },

        pol_country_code: (value, row) => {
            const code = value || row['POL Country Code'] || row['Origin Country Code'] || '';
            return code ? `<span class="country-code" style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${code}</span>` : '-';
        },

        pod_country: (value, row) => {
            return value || row['POD Country'] || row['Destination Country'] || '-';
        },

        pod_country_code: (value, row) => {
            const code = value || row['POD Country Code'] || row['Destination Country Code'] || '';
            return code ? `<span class="country-code" style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${code}</span>` : '-';
        },

        co2_emission: (value, row) => {
            const emission = value || row['CO₂ Emission (Tons)'] || '';
            return emission ? `${emission} ton CO₂` : '-';
        },

        tags: (value, row) => {
            const tags = value || row['Tags'] || '';
            if (tags && typeof tags === 'string') {
                return tags.split(',').map(tag => 
                    `<span class="sol-badge badge-light" style="margin: 2px; padding: 2px 6px; background: #e9ecef; border-radius: 8px; font-size: 10px;">${tag.trim()}</span>`
                ).join(' ');
            }
            return tags || '-';
        },

        // ===== COMMON FIELDS =====
        eta: (value, row) => {
            const eta = value || row.eta || row['Date Of Arrival'] || row['Date Of Discharge'] || '';
            return eta ? formatDate(eta) : '-';
        },

        ultima_posizione: (value, row) => {
            return value || row.ultima_posizione || row.last_known_location || 
                   row.destination_port || row['Port Of Discharge'] || 
                   row['Destination'] || '-';
        },

        created_at: (value, row) => {
            const date = value || row.created_at || '';
            return date ? formatDate(date) : '-';
        },

        updated_at: (value, row) => {
            const date = value || row.updated_at || '';
            return date ? formatDate(date) : '-';
        }
    };
}

// ===== HELPER FUNCTION FOR DATE FORMATTING =====
function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        // Se è già in formato DD/MM/YYYY, restituiscilo così
        if (typeof dateString === 'string' && dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return dateString;
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

// ===== DEBUG FUNCTION =====
function debugRowData() {
    const row = window.currentTrackings?.[0];
    if (row) {
        console.log('🔍 DEBUG ROW DATA:');
        console.log('Full row:', row);
        console.log('Row keys:', Object.keys(row));
        console.log('Sample values:');
        console.log('- AWB Number:', row['AWB Number']);
        console.log('- Origin Country:', row['Origin Country']);
        console.log('- Transit Time:', row['Transit Time']);
        console.log('- Container Count:', row['Container Count']);
        console.log('- Status:', row['Status']);
        
        // Test formatters
        const formatters = getColumnFormatters();
        console.log('\n🧪 FORMATTER TESTS:');
        console.log('- tracking_type:', formatters.tracking_type(null, row));
        console.log('- status:', formatters.status(null, row));
        console.log('- container_count:', formatters.container_count(null, row));
        console.log('- transit_time:', formatters.transit_time(null, row));
    } else {
        console.log('❌ No tracking data found');
    }
}

// ===== EXPORT FOR GLOBAL USE =====
window.getColumnFormatters = getColumnFormatters;
window.formatDate = formatDate;
window.debugRowData = debugRowData;

console.log('✅ Column formatters COMPLETE with style fixes and Google Sheets status mapping');