// core/services/tracking-service.js
// FIXED VERSION with correct parameters for ShipsGo API v1.2

import { ApiClient } from '../api-client.js';
import { StorageService } from './storage-service.js';
import { AppConfig } from '../config.js';

export class TrackingService {
    constructor() {
        this.apiClient = new ApiClient();
        this.storageService = new StorageService();
        this.apiConfig = AppConfig.api.shipsgo;
    }

    /**
     * Get container information from ShipsGo API
     * FIXED: Using requestId instead of containerNumber for v1.2 API
     * @param {string} containerNumber - The container number (will be used as requestId)
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Container tracking information
     */
    async getContainerInfo(containerNumber, options = {}) {
        console.log('[TrackingService] 📦 Getting container info:', containerNumber, options);
        
        const proxyUrl = '/netlify/functions/shipsgo-proxy';
        
        // ✅ FIXED: Using requestId instead of containerNumber
        const params = {
            requestId: containerNumber.toUpperCase()
        };
        
        // ✅ FIXED: Using lowercase 'mappoint' as per API spec
        params.mappoint = options.mapPoint !== undefined ? options.mapPoint : 'true';
        
        const url = new URL(proxyUrl, window.location.origin);
        url.searchParams.set('version', 'v1.2');
        url.searchParams.set('endpoint', '/ContainerService/GetContainerInfo');
        url.searchParams.set('method', 'GET');
        
        // Add all params
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(`params[${key}]`, value);
        });
        
        console.log('[TrackingService] 🔗 Request URL:', url.toString());
        
        try {
            const response = await fetch(url.toString());
            const proxyResponse = await response.json();
            
            console.log('[TrackingService] 📥 Proxy response:', proxyResponse);
            
            if (!proxyResponse.success) {
                throw new Error(proxyResponse.error || 'Failed to get container info');
            }
            
            return proxyResponse.data;
        } catch (error) {
            console.error('[TrackingService] ❌ Error getting container info:', error);
            throw error;
        }
    }

    /**
     * Add container to ShipsGo tracking system
     * PREPARED FOR: URL-encoded POST implementation
     * @param {string} containerNumber - The container number to add
     * @param {Object} options - Additional options (shippingLine, etc.)
     * @returns {Promise<Object>} Add container response with requestId
     */
    async addContainerToShipsGo(containerNumber, options = {}) {
        console.log('[TrackingService] ➕ Adding container to ShipsGo:', containerNumber, options);
        
        const proxyUrl = '/netlify/functions/shipsgo-proxy';
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: 'v1.2',
                endpoint: '/ContainerService/AddContainer',
                method: 'POST',
                contentType: 'application/x-www-form-urlencoded', // ✅ ADDED for URL-encoded
                data: {
                    authCode: this.apiConfig.v1.authCode || '2dc0c6d92ccb59e7d903825c4ebeb521',
                    containerNumber: containerNumber.toUpperCase(),
                    shippingLine: options.shippingLine || 'OTHERS'
                }
            })
        });

        const proxyResponse = await response.json();
        
        console.log('[TrackingService] 📥 Add container response:', proxyResponse);
        
        if (!proxyResponse.success) {
            const data = proxyResponse.data;
            // Handle "already exists" case
            if (data?.message?.includes('already exists')) {
                console.log('[TrackingService] 📦 Container already exists in ShipsGo');
                // Try to extract requestId from error message
                const requestIdMatch = data.message.match(/requestId[:\s]+(\w+)/i);
                if (requestIdMatch) {
                    return { 
                        success: true, 
                        exists: true, 
                        requestId: requestIdMatch[1] 
                    };
                }
                return { success: true, exists: true };
            }
            throw new Error(data?.message || proxyResponse.error || 'Failed to add container to ShipsGo');
        }

        // Extract requestId from successful response
        console.log('[TrackingService] ✅ Container added to ShipsGo:', proxyResponse.data);
        return {
            success: true,
            requestId: proxyResponse.data.requestId || proxyResponse.data.RequestId,
            ...proxyResponse.data
        };
    }

    /**
     * Complete tracking workflow: Add if needed, then get info
     * @param {string} trackingNumber - The container number to track
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Normalized tracking data
     */
    async trackContainer(trackingNumber, options = {}) {
        console.log('[TrackingService] 🚀 Starting tracking workflow for:', trackingNumber);
        
        try {
            let requestId = trackingNumber;
            
            // Step 1: Add container if needed (unless we already have requestId or skipAdd is true)
            if (!options.skipAdd && !options.requestId) {
                try {
                    const addResult = await this.addContainerToShipsGo(trackingNumber, options);
                    if (addResult.requestId) {
                        requestId = addResult.requestId;
                        console.log('[TrackingService] 🎯 Got requestId:', requestId);
                    }
                } catch (error) {
                    console.warn('[TrackingService] ⚠️ Add container failed, trying to get info anyway:', error.message);
                    // Continue with original tracking number as requestId
                }
            } else if (options.requestId) {
                requestId = options.requestId;
                console.log('[TrackingService] 📌 Using provided requestId:', requestId);
            }
            
            // Step 2: Get container info with requestId
            console.log('[TrackingService] 📊 Getting container info with requestId:', requestId);
            const containerInfo = await this.getContainerInfo(requestId, options);
            
            // Step 3: Normalize response
            const normalized = this.normalizeContainerResponse(containerInfo, trackingNumber);
            
            // Step 4: Save to storage
            await this.saveTrackingData(normalized);
            
            return normalized;
            
        } catch (error) {
            console.error('[TrackingService] ❌ Container tracking error:', error);
            throw error;
        }
    }

    /**
     * Normalize container response to standard format
     */
    normalizeContainerResponse(data, originalTrackingNumber) {
        console.log('[TrackingService] 🔄 Normalizing response:', data);
        
        // Handle both v1.2 and v2.0 response formats
        const normalized = {
            trackingNumber: data.ContainerNumber || data.containerNumber || originalTrackingNumber,
            requestId: data.RequestId || data.requestId,
            vesselName: data.VesselName || data.vesselName || 'N/A',
            voyage: data.Voyage || data.voyage || 'N/A',
            shippingLine: data.ShippingLine || data.shippingLine || 'N/A',
            status: data.Status || data.status || 'Unknown',
            location: data.Location || data.location || 'N/A',
            eta: data.ETA || data.eta || null,
            lastUpdate: data.LastUpdate || data.lastUpdate || new Date().toISOString(),
            movements: [],
            raw: data
        };

        // Process movements if available
        if (data.Movements || data.movements) {
            const movements = data.Movements || data.movements;
            normalized.movements = Array.isArray(movements) ? movements : [];
        }

        // Process voyage data if available
        if (data.VoyageData || data.voyageData) {
            normalized.voyageData = data.VoyageData || data.voyageData;
        }

        return normalized;
    }

    /**
     * Save tracking data to local storage
     */
    async saveTrackingData(trackingData) {
        const existingData = await this.storageService.get('trackingHistory') || [];
        
        // Update or add the tracking data
        const index = existingData.findIndex(item => 
            item.trackingNumber === trackingData.trackingNumber
        );
        
        if (index >= 0) {
            existingData[index] = {
                ...existingData[index],
                ...trackingData,
                updatedAt: new Date().toISOString()
            };
        } else {
            existingData.push({
                ...trackingData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        await this.storageService.set('trackingHistory', existingData);
        return trackingData;
    }

    /**
     * Get tracking history from storage
     */
    async getTrackingHistory() {
        return await this.storageService.get('trackingHistory') || [];
    }

    /**
     * Delete tracking record
     */
    async deleteTracking(trackingNumber) {
        const history = await this.getTrackingHistory();
        const filtered = history.filter(item => item.trackingNumber !== trackingNumber);
        await this.storageService.set('trackingHistory', filtered);
    }

    /**
     * Clear all tracking history
     */
    async clearHistory() {
        await this.storageService.remove('trackingHistory');
    }
}