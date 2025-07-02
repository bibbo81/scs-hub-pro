// public/core/data-service.js
import { apiClient } from '/core/api-client.js';

/**
 * Data Service - Servizio centralizzato per gestione dati
 * Cache intelligente, sincronizzazione real-time, offline support
 */
class DataService {
    constructor() {
        this.cache = new Map();
        this.subscriptions = new Map();
        this.pendingSync = [];
        this.isOnline = navigator.onLine;
        
        // Setup offline detection
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Polling per aggiornamenti (ogni 30 secondi)
        this.startPolling();
    }

    /**
     * Definizione entità e loro configurazioni
     */
    entities = {
        shipments: {
            endpoint: '/shipments',
            key: 'id',
            cacheDuration: 5 * 60 * 1000, // 5 minuti
            searchable: ['rif_spedizione', 'fornitore', 'cod_art', 'descrizione'],
            sortable: ['created_at', 'data_partenza', 'data_arrivo_effettiva', 'costo_trasporto'],
            defaultSort: { field: 'created_at', order: 'desc' }
        },
        products: {
            endpoint: '/products', 
            key: 'cod_art',
            cacheDuration: 30 * 60 * 1000, // 30 minuti
            searchable: ['cod_art', 'descrizione', 'categoria'],
            sortable: ['cod_art', 'descrizione', 'created_at'],
            defaultSort: { field: 'cod_art', order: 'asc' }
        },
        trackings: {
            endpoint: '/trackings',
            key: 'id',
            cacheDuration: 2 * 60 * 1000, // 2 minuti
            searchable: ['tracking_number', 'carrier_name', 'reference_number'],
            sortable: ['created_at', 'eta', 'status'],
            defaultSort: { field: 'created_at', order: 'desc' }
        },
        dashboard: {
            endpoint: '/dashboard-stats',
            key: 'single', // Dato singolo, non lista
            cacheDuration: 5 * 60 * 1000
        }
    };

    /**
     * Ottieni dati con cache intelligente
     */
    async get(entity, options = {}) {
        const config = this.entities[entity];
        if (!config) throw new Error(`Unknown entity: ${entity}`);

        const cacheKey = this.getCacheKey(entity, options);
        const cached = this.getFromCache(cacheKey, config.cacheDuration);
        
        if (cached && !options.forceRefresh) {
            return cached;
        }

        try {
            // Costruisci query params
            const params = this.buildQueryParams(options);
            
            // Chiama API
            const response = await apiClient.get(config.endpoint, { params });
            
            // Salva in cache
            this.setCache(cacheKey, response);
            
            // Notifica subscribers
            this.notifySubscribers(entity, response);
            
            return response;
            
        } catch (error) {
            // Se offline, ritorna cache anche se scaduta
            if (!this.isOnline && cached) {
                console.warn('Offline: returning stale cache');
                return cached;
            }
            throw error;
        }
    }

    /**
     * Ottieni singolo record
     */
    async getById(entity, id) {
        const config = this.entities[entity];
        if (!config) throw new Error(`Unknown entity: ${entity}`);

        const cacheKey = `${entity}:${id}`;
        const cached = this.getFromCache(cacheKey, config.cacheDuration);
        
        if (cached) return cached;

        try {
            const response = await apiClient.get(`${config.endpoint}/${id}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            if (!this.isOnline && cached) return cached;
            throw error;
        }
    }

    /**
     * Crea nuovo record
     */
    async create(entity, data) {
        const config = this.entities[entity];
        if (!config) throw new Error(`Unknown entity: ${entity}`);

        try {
            const response = await apiClient.post(config.endpoint, data);
            
            // Invalida cache lista
            this.invalidateCache(entity);
            
            // Notifica subscribers
            this.notifySubscribers(entity, { action: 'create', data: response });
            
            return response;
        } catch (error) {
            if (!this.isOnline) {
                // Salva per sync offline
                this.addToPendingSync({
                    entity,
                    action: 'create',
                    data,
                    timestamp: new Date().toISOString()
                });
                
                // Ritorna dati con ID temporaneo
                return {
                    ...data,
                    [config.key]: `temp_${Date.now()}`,
                    _pending: true
                };
            }
            throw error;
        }
    }

    /**
     * Aggiorna record esistente
     */
    async update(entity, id, data) {
        const config = this.entities[entity];
        if (!config) throw new Error(`Unknown entity: ${entity}`);

        try {
            const response = await apiClient.put(`${config.endpoint}/${id}`, data);
            
            // Aggiorna cache specifico
            this.setCache(`${entity}:${id}`, response);
            
            // Invalida cache lista
            this.invalidateCache(entity);
            
            // Notifica subscribers
            this.notifySubscribers(entity, { action: 'update', data: response });
            
            return response;
        } catch (error) {
            if (!this.isOnline) {
                this.addToPendingSync({
                    entity,
                    action: 'update',
                    id,
                    data,
                    timestamp: new Date().toISOString()
                });
                
                return { ...data, _pending: true };
            }
            throw error;
        }
    }

    /**
     * Elimina record
     */
    async delete(entity, id) {
        const config = this.entities[entity];
        if (!config) throw new Error(`Unknown entity: ${entity}`);

        try {
            await apiClient.delete(`${config.endpoint}/${id}`);
            
            // Rimuovi da cache
            this.cache.delete(`${entity}:${id}`);
            
            // Invalida cache lista
            this.invalidateCache(entity);
            
            // Notifica subscribers
            this.notifySubscribers(entity, { action: 'delete', id });
            
            return true;
        } catch (error) {
            if (!this.isOnline) {
                this.addToPendingSync({
                    entity,
                    action: 'delete',
                    id,
                    timestamp: new Date().toISOString()
                });
                
                return true;
            }
            throw error;
        }
    }

    /**
     * Batch operations
     */
    async batch(entity, operations) {
        const config = this.entities[entity];
        if (!config) throw new Error(`Unknown entity: ${entity}`);

        const results = {
            success: [],
            errors: []
        };

        for (const op of operations) {
            try {
                let result;
                switch (op.action) {
                    case 'create':
                        result = await this.create(entity, op.data);
                        break;
                    case 'update':
                        result = await this.update(entity, op.id, op.data);
                        break;
                    case 'delete':
                        result = await this.delete(entity, op.id);
                        break;
                    default:
                        throw new Error(`Unknown action: ${op.action}`);
                }
                results.success.push({ ...op, result });
            } catch (error) {
                results.errors.push({ ...op, error: error.message });
            }
        }

        return results;
    }

    /**
     * Ricerca avanzata
     */
    async search(entity, query, options = {}) {
        const config = this.entities[entity];
        if (!config) throw new Error(`Unknown entity: ${entity}`);

        // Costruisci parametri ricerca
        const searchParams = {
            q: query,
            fields: options.fields || config.searchable,
            limit: options.limit || 50,
            offset: options.offset || 0,
            ...options.filters
        };

        return this.get(entity, searchParams);
    }

    /**
     * Aggregazioni e statistiche
     */
    async getStats(entity, options = {}) {
        const config = this.entities[entity];
        if (!config) throw new Error(`Unknown entity: ${entity}`);

        const endpoint = `${config.endpoint}/stats`;
        const cacheKey = `${entity}:stats:${JSON.stringify(options)}`;
        
        const cached = this.getFromCache(cacheKey, config.cacheDuration);
        if (cached && !options.forceRefresh) return cached;

        try {
            const response = await apiClient.get(endpoint, { params: options });
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            if (!this.isOnline && cached) return cached;
            throw error;
        }
    }

    /**
     * Sottoscrivi a cambiamenti
     */
    subscribe(entity, callback) {
        if (!this.subscriptions.has(entity)) {
            this.subscriptions.set(entity, new Set());
        }
        
        this.subscriptions.get(entity).add(callback);
        
        // Ritorna funzione per unsubscribe
        return () => {
            const subs = this.subscriptions.get(entity);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) {
                    this.subscriptions.delete(entity);
                }
            }
        };
    }

    /**
     * Cache helpers
     */
    getCacheKey(entity, options) {
        return `${entity}:${JSON.stringify(options)}`;
    }

    getFromCache(key, maxAge) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > maxAge) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    invalidateCache(entity) {
        // Rimuovi tutte le entries che iniziano con entity:
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${entity}:`)) {
                this.cache.delete(key);
            }
        }
    }

    clearCache() {
        this.cache.clear();
    }

    /**
     * Query params builder
     */
    buildQueryParams(options) {
        const params = {};
        
        // Paginazione
        if (options.page) params.page = options.page;
        if (options.limit) params.limit = options.limit;
        if (options.offset) params.offset = options.offset;
        
        // Ordinamento
        if (options.sort) {
            params.sort = options.sort.field;
            params.order = options.sort.order || 'asc';
        }
        
        // Filtri
        if (options.filters) {
            Object.entries(options.filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    params[`filter[${key}]`] = value;
                }
            });
        }
        
        // Ricerca
        if (options.search) params.q = options.search;
        
        // Campi da includere
        if (options.include) params.include = options.include.join(',');
        
        // Date range
        if (options.dateFrom) params.date_from = options.dateFrom;
        if (options.dateTo) params.date_to = options.dateTo;
        
        return params;
    }

    /**
     * Notifica subscribers
     */
    notifySubscribers(entity, data) {
        const subs = this.subscriptions.get(entity);
        if (subs) {
            subs.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Subscriber error:', error);
                }
            });
        }
    }

    /**
     * Offline sync
     */
    addToPendingSync(operation) {
        this.pendingSync.push(operation);
        
        // Salva in localStorage per persistenza
        try {
            localStorage.setItem('pendingSync', JSON.stringify(this.pendingSync));
        } catch (e) {
            console.warn('Cannot save to localStorage:', e);
        }
    }

    async syncPending() {
        if (this.pendingSync.length === 0) return;
        
        console.log(`Syncing ${this.pendingSync.length} pending operations...`);
        
        const toSync = [...this.pendingSync];
        this.pendingSync = [];
        
        for (const op of toSync) {
            try {
                switch (op.action) {
                    case 'create':
                        await this.create(op.entity, op.data);
                        break;
                    case 'update':
                        await this.update(op.entity, op.id, op.data);
                        break;
                    case 'delete':
                        await this.delete(op.entity, op.id);
                        break;
                }
            } catch (error) {
                console.error('Sync error:', error);
                // Rimetti in coda per retry
                this.pendingSync.push(op);
            }
        }
        
        // Salva stato aggiornato
        try {
            if (this.pendingSync.length === 0) {
                localStorage.removeItem('pendingSync');
            } else {
                localStorage.setItem('pendingSync', JSON.stringify(this.pendingSync));
            }
        } catch (e) {
            console.warn('Cannot update localStorage:', e);
        }
    }

    /**
     * Online/Offline handlers
     */
    handleOnline() {
        this.isOnline = true;
        console.log('Back online! Syncing pending changes...');
        this.syncPending();
    }

    handleOffline() {
        this.isOnline = false;
        console.log('Gone offline. Changes will be synced when connection returns.');
    }

    /**
     * Polling per aggiornamenti real-time
     */
    startPolling() {
        // Poll solo per entità con subscribers attivi
        setInterval(() => {
            if (!this.isOnline) return;
            
            this.subscriptions.forEach((subs, entity) => {
                if (subs.size > 0) {
                    this.get(entity, { forceRefresh: true }).catch(err => {
                        console.error(`Polling error for ${entity}:`, err);
                    });
                }
            });
        }, 30000); // 30 secondi
    }

    /**
     * Export data
     */
    async export(entity, format = 'json', options = {}) {
        const data = await this.get(entity, { ...options, limit: 10000 });
        
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
                
            case 'csv':
                return this.convertToCSV(data);
                
            case 'excel':
                // Richiedi al backend di generare Excel
                const response = await apiClient.post(`${this.entities[entity].endpoint}/export`, {
                    format: 'excel',
                    data: data
                });
                return response.file; // Base64
                
            default:
                throw new Error(`Unknown export format: ${format}`);
        }
    }

    /**
     * Convert data to CSV
     */
    convertToCSV(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return '';
        }

        // Headers
        const headers = Object.keys(data[0]);
        const csv = [headers.join(',')];

        // Rows
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                // Escape special characters
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value ?? '';
            });
            csv.push(values.join(','));
        });

        return csv.join('\n');
    }

    /**
     * Carica pending sync da localStorage
     */
    loadPendingSync() {
        try {
            const saved = localStorage.getItem('pendingSync');
            if (saved) {
                this.pendingSync = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Cannot load pending sync:', e);
        }
    }
}

// Inizializza e esporta singleton
const dataService = new DataService();
dataService.loadPendingSync();

export { dataService };
            