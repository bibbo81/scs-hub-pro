// /pages/tracking/tracking-api-extensions.js
// Estensioni API per TrackingService - GET/POST/LIST distinction
// NON modifica il TrackingService esistente, aggiunge solo metodi

(function() {
    'use strict';
    
    // Attendi che TrackingService sia disponibile
    const checkInterval = setInterval(() => {
        if (window.trackingService) {
            clearInterval(checkInterval);
            extendTrackingService();
        }
    }, 100);
    
    function extendTrackingService() {
        console.log('[API Extensions] Extending TrackingService...');
        
        // ========================================
        // GET METHODS - Recupero dati singoli
        // ========================================
        
        // GET lista shipping lines
        window.trackingService.getShippingLines = async function() {
            console.log('[API] GET shipping lines');
            
            // Se non abbiamo API keys, ritorna dati fallback
            if (!this.hasApiKeys()) {
                return getFallbackShippingLines();
            }
            
            try {
                const response = await this.callApi('v1.2', '/ContainerService/GetShippingLineList', 'GET');
                
                if (response.success && response.data?.data) {
                    return response.data.data.map(line => ({
                        code: line.shippingLineCode,
                        name: line.shippingLineName,
                        scac: line.scac,
                        active: line.isActive !== false
                    }));
                }
            } catch (error) {
                console.error('[API] Error getting shipping lines:', error);
            }
            
            return getFallbackShippingLines();
        };
        
        // GET lista airlines
        window.trackingService.getAirlines = async function() {
            console.log('[API] GET airlines');
            
            if (!this.hasApiKeys()) {
                return getFallbackAirlines();
            }
            
            try {
                const response = await this.callApi('v2', '/air/airlines', 'GET');
                
                if (response.success && response.data?.airlines) {
                    return response.data.airlines.map(airline => ({
                        code: airline.airlineCode,
                        name: airline.airlineName,
                        prefix: airline.airlinePrefix,
                        active: airline.isActive !== false
                    }));
                }
            } catch (error) {
                console.error('[API] Error getting airlines:', error);
            }
            
            return getFallbackAirlines();
        };
        
        // ========================================
        // POST METHODS - Creazione/Aggiornamento
        // ========================================
        
        // POST crea container tracking
        window.trackingService.createContainer = async function(containerData) {
            console.log('[API] POST create container:', containerData.containerNumber);
            
            if (!this.hasApiKeys()) {
                return { success: false, error: 'API keys not configured' };
            }
            
            const payload = {
                containerNumber: containerData.containerNumber || containerData.tracking_number,
                shippingLine: containerData.shippingLine || containerData.carrier_code || '',
                emails: containerData.emails || [],
                referenceNo: containerData.reference || '',
                webhookUrl: containerData.webhookUrl
            };
            
            try {
                const response = await this.callApi('v1.2', '/ContainerService/AddContainer', 'POST', payload);
                
                if (response.success) {
                    return {
                        success: true,
                        message: response.data?.message || 'Container added',
                        data: response.data
                    };
                }
                
                throw new Error(response.error || 'Failed to add container');
            } catch (error) {
                console.error('[API] Error creating container:', error);
                return { success: false, error: error.message };
            }
        };
        
        // POST crea air shipment
        window.trackingService.createAirShipment = async function(shipmentData) {
            console.log('[API] POST create air shipment:', shipmentData.awbNumber);
            
            if (!this.hasApiKeys()) {
                return { success: false, error: 'API keys not configured' };
            }
            
            const payload = {
                awbNumber: shipmentData.awbNumber || shipmentData.tracking_number,
                airlineCode: shipmentData.airlineCode || detectAirlineFromAWB(shipmentData.awbNumber),
                emails: shipmentData.emails || [],
                reference: shipmentData.reference || ''
            };
            
            try {
                const response = await this.callApi('v2', '/air/shipments', 'POST', payload);
                
                if (response.success && response.data) {
                    return {
                        success: true,
                        shipmentId: response.data.id,
                        message: 'Shipment created',
                        data: response.data
                    };
                }
                
                throw new Error(response.error || 'Failed to create shipment');
            } catch (error) {
                console.error('[API] Error creating shipment:', error);
                return { success: false, error: error.message };
            }
        };
        
        // ========================================
        // BULK OPERATIONS
        // ========================================
        
        // Bulk track migliorato con progress
        const originalBulkTrack = window.trackingService.bulkTrack;
        window.trackingService.bulkTrack = async function(trackingRequests, onProgress) {
            console.log(`[API] BULK track ${trackingRequests.length} items`);
            
            // Se esiste già bulkTrack, usalo
            if (originalBulkTrack) {
                return originalBulkTrack.call(this, trackingRequests, onProgress);
            }
            
            // Altrimenti implementazione custom
            const results = [];
            const chunkSize = 5;
            
            for (let i = 0; i < trackingRequests.length; i += chunkSize) {
                const chunk = trackingRequests.slice(i, i + chunkSize);
                
                const chunkPromises = chunk.map(async (request) => {
                    try {
                        const result = await this.track(
                            request.tracking_number || request.trackingNumber,
                            request.type || request.tracking_type || 'auto',
                            { forceRefresh: true }
                        );
                        
                        return {
                            ...request,
                            success: result.success,
                            data: result
                        };
                    } catch (error) {
                        return {
                            ...request,
                            success: false,
                            error: error.message
                        };
                    }
                });
                
                const chunkResults = await Promise.all(chunkPromises);
                results.push(...chunkResults);
                
                if (onProgress) {
                    onProgress({
                        completed: Math.min(i + chunkSize, trackingRequests.length),
                        total: trackingRequests.length,
                        percentage: Math.round((Math.min(i + chunkSize, trackingRequests.length) / trackingRequests.length) * 100)
                    });
                }
                
                // Rate limiting
                if (i + chunkSize < trackingRequests.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            return results;
        };
        
        // ========================================
        // UTILITY METHODS
        // ========================================
        
        // Detect airline from AWB
        function detectAirlineFromAWB(awbNumber) {
            const prefix = awbNumber.toString().split('-')[0];
            
            const airlinePrefixes = {
                '001': 'AA', '006': 'DL', '014': 'AC',
                '020': 'LH', '057': 'AF', '074': 'KL',
                '125': 'BA', '157': 'QR', '172': 'CV',
                '176': 'EK', '180': 'KE', '235': 'TK',
                '618': 'SQ', '988': 'CZ'
            };
            
            return airlinePrefixes[prefix] || '';
        }
        
        // ========================================
        // FALLBACK DATA
        // ========================================
        
        function getFallbackShippingLines() {
            return [
                { code: 'MSC', name: 'MSC', active: true },
                { code: 'MAERSK', name: 'Maersk', active: true },
                { code: 'CMA-CGM', name: 'CMA CGM', active: true },
                { code: 'COSCO', name: 'COSCO', active: true },
                { code: 'HAPAG', name: 'Hapag-Lloyd', active: true },
                { code: 'ONE', name: 'ONE', active: true },
                { code: 'EVERGREEN', name: 'Evergreen', active: true },
                { code: 'YML', name: 'Yang Ming', active: true },
                { code: 'HMM', name: 'HMM', active: true },
                { code: 'ZIM', name: 'ZIM', active: true }
            ];
        }
        
        function getFallbackAirlines() {
            return [
                { code: 'CV', name: 'Cargolux', prefix: '172', active: true },
                { code: 'EK', name: 'Emirates', prefix: '176', active: true },
                { code: 'LH', name: 'Lufthansa Cargo', prefix: '020', active: true },
                { code: 'QR', name: 'Qatar Airways', prefix: '157', active: true },
                { code: 'SQ', name: 'Singapore Airlines', prefix: '618', active: true },
                { code: 'CX', name: 'Cathay Pacific', prefix: '160', active: true },
                { code: 'AA', name: 'American Airlines', prefix: '001', active: true },
                { code: 'BA', name: 'British Airways', prefix: '125', active: true },
                { code: 'AF', name: 'Air France', prefix: '057', active: true },
                { code: 'TK', name: 'Turkish Airlines', prefix: '235', active: true }
            ];
        }
        
        console.log('✅ [API Extensions] TrackingService extended successfully');
        console.log('   New methods available:');
        console.log('   - getShippingLines()');
        console.log('   - getAirlines()');
        console.log('   - createContainer()');
        console.log('   - createAirShipment()');
        console.log('   - bulkTrack() [enhanced]');
    }
    
})();