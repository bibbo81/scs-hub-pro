// SHIPSGO STANDARD FORMAT DETECTOR E MAPPER
// Questo codice riconosce ESATTAMENTE i formati di export standard di ShipsGo

class ShipsGoStandardDetector {
    // Headers ESATTI di ShipsGo Air Export
    static SHIPSGO_AIR_HEADERS = [
        'AWB Number',
        'Origin', 
        'Origin Name',
        'Date Of Departure',
        'Origin Country',
        'Origin Country Code',
        'Destination',
        'Destination Name', 
        'Date Of Arrival',
        'Destination Country',
        'Destination Country Code',
        'T5 Count',
        'Transit Time',
        'Tags',
        'Created At'
    ];

    // Headers ESATTI di ShipsGo Sea Export
    static SHIPSGO_SEA_HEADERS = [
        'Status',
        'Carrier',
        'CO₂ Emission (Tons)',
        'Reference',
        'Booking',
        'Container',
        'Container Count',
        'Port Of Loading',
        'Date Of Loading',
        'POL Country',
        'POL Country Code',
        'Port Of Discharge',
        'Date Of Discharge',
        'POD Country',
        'POD Country Code',
        'Tags',
        'Created At'
    ];

    // Airline prefixes mapping (AWB prefix to airline)
    static AWB_PREFIX_TO_AIRLINE = {
        '999': { code: 'CA', name: 'Air China' },
        '297': { code: 'CI', name: 'China Airlines' },
        '112': { code: 'CZ', name: 'China Southern' },
        '784': { code: 'CK', name: 'China Cargo Airlines' },
        '176': { code: 'EK', name: 'Emirates' },
        '157': { code: 'QR', name: 'Qatar Airways' },
        '235': { code: 'TK', name: 'Turkish Airlines' },
        '172': { code: 'CV', name: 'Cargolux' },
        '020': { code: 'LH', name: 'Lufthansa Cargo' },
        '160': { code: 'AF', name: 'Air France' },
        '057': { code: 'AF', name: 'Air France Cargo' },
        '125': { code: 'BA', name: 'British Airways' },
        '139': { code: 'CX', name: 'Cathay Pacific' },
        '001': { code: 'AA', name: 'American Airlines' },
        '006': { code: 'DL', name: 'Delta Air Lines' },
        '016': { code: 'UA', name: 'United Airlines' },
        '014': { code: 'AC', name: 'Air Canada' },
        '988': { code: 'OZ', name: 'Asiana Airlines' },
        '180': { code: 'KE', name: 'Korean Air' },
        '618': { code: 'SQ', name: 'Singapore Airlines' },
        '217': { code: 'FX', name: 'FedEx' },
        '406': { code: '5X', name: 'UPS Airlines' },
        '423': { code: 'F5', name: 'DHL Aviation' }
    };

    // Rileva il tipo di file ShipsGo
    static detectShipsGoType(headers) {
        const headerStr = headers.join('|').toLowerCase();
        
        // Check esatto per Air
        const hasAllAirHeaders = this.SHIPSGO_AIR_HEADERS.every(h => 
            headers.some(header => header.trim() === h)
        );
        
        // Check esatto per Sea
        const hasAllSeaHeaders = this.SHIPSGO_SEA_HEADERS.every(h => 
            headers.some(header => header.trim() === h)
        );
        
        if (hasAllAirHeaders || headers.includes('AWB Number')) {
            console.log('✈️ Detected ShipsGo AIR export format');
            return 'shipsgo_air';
        }
        
        if (hasAllSeaHeaders || (headers.includes('Container') && headers.includes('Port Of Loading'))) {
            console.log('🚢 Detected ShipsGo SEA export format');
            return 'shipsgo_sea';
        }
        
        console.log('❓ Unknown format, headers:', headers);
        return 'unknown';
    }

    // Estrai airline info dal AWB number
    static extractAirlineFromAWB(awbNumber) {
        if (!awbNumber) return { code: 'UNKNOWN', name: 'Unknown Airline' };
        
        const prefix = awbNumber.split('-')[0];
        const airlineInfo = this.AWB_PREFIX_TO_AIRLINE[prefix];
        
        if (airlineInfo) {
            return airlineInfo;
        }
        
        // Se non trovato, usa il prefisso come codice
        return { 
            code: `AWB${prefix}`, 
            name: `Airline ${prefix}` 
        };
    }

    // Mappa row ShipsGo Air con EXACT field matching
    static mapShipsGoAirRow(row) {
        const awbNumber = (row['AWB Number'] || '').trim();
        const airlineInfo = this.extractAirlineFromAWB(awbNumber);
        
        // Calcola status dalle date
        const departureDate = row['Date Of Departure'];
        const arrivalDate = row['Date Of Arrival'];
        const status = this.calculateStatusFromDates(departureDate, arrivalDate);
        
        return {
            // ID univoco
            id: Date.now() + Math.random(),
            
            // Campi principali
            tracking_number: awbNumber,
            tracking_type: 'awb',
            carrier_code: airlineInfo.code,
            carrier_name: airlineInfo.name,
            
            // Status calcolato
            status: status,
            
            // Origin - EXACT field names
            origin_port: (row['Origin'] || '').trim().toUpperCase(),
            origin_name: (row['Origin Name'] || '').trim(),
            origin_country: (row['Origin Country'] || '').trim(),
            origin_country_code: (row['Origin Country Code'] || '').trim(),
            
            // Destination - EXACT field names
            destination_port: (row['Destination'] || '').trim().toUpperCase(),
            destination_name: (row['Destination Name'] || '').trim(),
            destination_country: (row['Destination Country'] || '').trim(),
            destination_country_code: (row['Destination Country Code'] || '').trim(),
            
            // Dates - Parse DD/MM/YYYY format
            date_of_departure: this.parseShipsGoDate(departureDate),
            eta: this.parseShipsGoDate(arrivalDate),
            eta: this.parseShipsGoDate(arrivalDate),
            
            // Additional ShipsGo fields
            transit_time: (row['Transit Time'] || '').toString().trim(),
            t5_count: (row['T5 Count'] || '').toString().trim(),
            tags: (row['Tags'] || '').trim(),
            
            // Duplicated fields for compatibility
            date_of_departure: departureDate, // Keep original format
            date_of_arrival: arrivalDate,     // Keep original format
            awb_number: awbNumber,
            airline: airlineInfo.code,
            origin: (row['Origin'] || '').trim().toUpperCase(),
            destination: (row['Destination'] || '').trim().toUpperCase(),
            
            // Reference from tags if available
            reference_number: row['Tags'] || '',
            
            // System fields
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_update: new Date().toISOString(),
            data_source: 'shipsgo_air_import',
            
            // ShipsGo metadata
            created_at_shipsgo: this.parseShipsGoDate(row['Created At']) || new Date().toISOString(),
            
            // Last event
            last_event_date: this.getLastEventDate(departureDate, arrivalDate, status),
            last_event_location: this.getLastEventLocation(row, status),
            
            // Store original data
            metadata: {
                ...row,
                import_type: 'shipsgo_air',
                import_date: new Date().toISOString(),
                airline_detected: airlineInfo
            }
        };
    }

    // Mappa row ShipsGo Sea con EXACT field matching
    static mapShipsGoSeaRow(row) {
        const containerNumber = (row['Container'] || '').trim();
        const status = row['Status'] ? 
            this.normalizeStatus(row['Status']) : 
            this.calculateStatusFromDates(row['Date Of Loading'], row['Date Of Discharge']);
        
        return {
            // ID univoco
            id: Date.now() + Math.random(),
            
            // Campi principali
            tracking_number: containerNumber,
            tracking_type: 'container',
            carrier_code: this.normalizeCarrier(row['Carrier'] || ''),
            carrier_name: row['Carrier'] || '',
            
            // Status from file or calculated
            status: status,
            
            // Reference and booking
            reference_number: (row['Reference'] || '').trim(),
            booking: (row['Booking'] || '').trim(),
            
            // Container info
            container_count: (row['Container Count'] || '').toString().trim(),
            
            // Loading port
            origin_port: (row['Port Of Loading'] || '').trim().toUpperCase(),
            port_of_loading: (row['Port Of Loading'] || '').trim().toUpperCase(),
            pol_country: (row['POL Country'] || '').trim(),
            pol_country_code: (row['POL Country Code'] || '').trim(),
            
            // Discharge port
            destination_port: (row['Port Of Discharge'] || '').trim().toUpperCase(),
            port_of_discharge: (row['Port Of Discharge'] || '').trim().toUpperCase(),
            pod_country: (row['POD Country'] || '').trim(),
            pod_country_code: (row['POD Country Code'] || '').trim(),
            
            // Dates
            date_of_loading: row['Date Of Loading'],  // Keep original format
            date_of_departure: this.parseShipsGoDate(row['Date Of Loading']),
            
            date_of_discharge: row['Date Of Discharge'],  // Keep original format
            eta: this.parseShipsGoDate(row['Date Of Discharge']),
            eta: this.parseShipsGoDate(row['Date Of Discharge']),
            
            // Environmental
            co2_emission: (row['CO₂ Emission (Tons)'] || row['CO2 Emission (Tons)'] || '').toString().trim(),
            
            // Tags
            tags: (row['Tags'] || '').trim(),
            
            // System fields
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_update: new Date().toISOString(),
            data_source: 'shipsgo_sea_import',
            
            // ShipsGo metadata
            created_at_shipsgo: this.parseShipsGoDate(row['Created At']) || new Date().toISOString(),
            
            // Last event
            last_event_date: this.getLastEventDate(row['Date Of Loading'], row['Date Of Discharge'], status),
            last_event_location: this.getLastEventLocationSea(row, status),
            
            // Store original data
            metadata: {
                ...row,
                import_type: 'shipsgo_sea',
                import_date: new Date().toISOString()
            }
        };
    }

    // Helper: Parse ShipsGo date format (DD/MM/YYYY)
    static parseShipsGoDate(dateStr) {
        if (!dateStr) return null;
        
        const str = dateStr.toString().trim();
        
        // Handle DD/MM/YYYY format
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
            const [day, month, year] = str.split('/').map(n => parseInt(n));
            const date = new Date(year, month - 1, day);
            
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        }
        
        // Try standard parsing as fallback
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
        
        console.warn('Could not parse date:', dateStr);
        return null;
    }

    // Helper: Calculate status from dates
    static calculateStatusFromDates(departureDate, arrivalDate) {
        const now = new Date();
        
        if (arrivalDate) {
            const arrival = new Date(this.parseShipsGoDate(arrivalDate));
            if (!isNaN(arrival.getTime()) && arrival < now) {
                return 'delivered';
            }
        }
        
        if (departureDate) {
            const departure = new Date(this.parseShipsGoDate(departureDate));
            if (!isNaN(departure.getTime()) && departure < now) {
                return 'in_transit';
            }
        }
        
        return 'registered';
    }

    // Helper: Get last event date
    static getLastEventDate(departureDate, arrivalDate, status) {
        if (status === 'delivered' && arrivalDate) {
            return this.parseShipsGoDate(arrivalDate);
        }
        if (status === 'in_transit' && departureDate) {
            return this.parseShipsGoDate(departureDate);
        }
        return new Date().toISOString();
    }

    // Helper: Get last event location for Air
    static getLastEventLocation(row, status) {
        if (status === 'delivered' || status === 'arrived') {
            return row['Destination Name'] || row['Destination'] || 'Destination';
        }
        if (status === 'in_transit') {
            return 'In Transit';
        }
        return row['Origin Name'] || row['Origin'] || 'Origin';
    }

    // Helper: Get last event location for Sea
    static getLastEventLocationSea(row, status) {
        if (status === 'delivered' || status === 'arrived') {
            return row['Port Of Discharge'] || 'Destination Port';
        }
        if (status === 'in_transit') {
            return 'At Sea';
        }
        return row['Port Of Loading'] || 'Origin Port';
    }

    // Helper: Normalize carrier code
    static normalizeCarrier(carrier) {
        const carrierMap = {
            'MAERSK LINE': 'MAERSK',
            'MSC': 'MSC',
            'CMA CGM': 'CMA-CGM',
            'COSCO': 'COSCO',
            'HAPAG-LLOYD': 'HAPAG-LLOYD',
            'ONE': 'ONE',
            'EVERGREEN': 'EVERGREEN',
            'YANG MING': 'YANG-MING',
            'HMM': 'HMM',
            'ZIM': 'ZIM'
        };
        
        const upper = carrier.toUpperCase().trim();
        return carrierMap[upper] || upper || 'UNKNOWN';
    }

    // Helper: Normalize status
    static normalizeStatus(status) {
        const statusMap = {
            'Discharged': 'arrived',
            'Gate In': 'in_transit',
            'Gate Out': 'delivered',
            'Loaded': 'in_transit',
            'Empty': 'delivered',
            'Sailing': 'in_transit',
            'Arrived': 'arrived',
            'Delivered': 'delivered'
        };
        
        return statusMap[status] || status.toLowerCase().replace(/\s+/g, '_');
    }
}

// Export per test
window.ShipsGoStandardDetector = ShipsGoStandardDetector;