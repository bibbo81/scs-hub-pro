// performance-optimizations.js - Ottimizzazioni per Supply Chain Hub

// 1. DEBOUNCE UTILITY
window.debounce = function(func, wait, immediate) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

// 2. CACHE MANAGER
window.CacheManager = {
    // Durata cache in ms
    TTL: {
        airlines: 24 * 60 * 60 * 1000,      // 24 ore
        carriers: 24 * 60 * 60 * 1000,      // 24 ore
        shipsgoIds: 1 * 60 * 60 * 1000,     // 1 ora
        trackingData: 5 * 60 * 1000         // 5 minuti
    },
    
    // Controlla se la cache è valida
    isValid(key, ttl) {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return false;
            
            const data = JSON.parse(cached);
            return data.timestamp && (Date.now() - data.timestamp) < ttl;
        } catch {
            return false;
        }
    },
    
    // Ottieni dalla cache
    get(key) {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;
            
            const data = JSON.parse(cached);
            return data.data;
        } catch {
            return null;
        }
    },
    
    // Salva in cache
    set(key, data, ttl) {
        try {
            localStorage.setItem(key, JSON.stringify({
                data: data,
                timestamp: Date.now(),
                ttl: ttl
            }));
            return true;
        } catch (e) {
            console.error('Cache storage error:', e);
            // Se localStorage è pieno, pulisci le cache vecchie
            this.cleanup();
            return false;
        }
    },
    
    // Pulisci cache scadute
    cleanup() {
        const now = Date.now();
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes('Cache')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.timestamp && data.ttl) {
                        if (now - data.timestamp > data.ttl) {
                            keysToRemove.push(key);
                        }
                    }
                } catch {
                    keysToRemove.push(key);
                }
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`✅ Cleaned ${keysToRemove.length} expired cache entries`);
    }
};

// 3. REQUEST QUEUE per gestire rate limiting
window.RequestQueue = {
    queue: [],
    processing: false,
    rateLimit: {
        maxRequests: 10,      // Max richieste per finestra
        windowMs: 60 * 1000   // Finestra di 1 minuto
    },
    requestCounts: [],
    
    // Aggiungi richiesta alla coda
    add(request) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                request,
                resolve,
                reject,
                timestamp: Date.now()
            });
            
            this.process();
        });
    },
    
    // Processa la coda
    async process() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        
        while (this.queue.length > 0) {
            // Controlla rate limit
            if (!this.canMakeRequest()) {
                console.log('⏱️ Rate limit reached, waiting...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            
            const item = this.queue.shift();
            
            try {
                // Registra la richiesta
                this.requestCounts.push(Date.now());
                
                // Esegui la richiesta
                const result = await item.request();
                item.resolve(result);
            } catch (error) {
                item.reject(error);
            }
            
            // Piccolo delay tra richieste
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.processing = false;
    },
    
    // Controlla se possiamo fare una richiesta
    canMakeRequest() {
        const now = Date.now();
        const windowStart = now - this.rateLimit.windowMs;
        
        // Rimuovi richieste vecchie
        this.requestCounts = this.requestCounts.filter(time => time > windowStart);
        
        // Controlla limite
        return this.requestCounts.length < this.rateLimit.maxRequests;
    },
    
    // Ottieni stato coda
    getStatus() {
        const now = Date.now();
        const windowStart = now - this.rateLimit.windowMs;
        const recentRequests = this.requestCounts.filter(time => time > windowStart).length;
        
        return {
            queueLength: this.queue.length,
            processing: this.processing,
            recentRequests: recentRequests,
            maxRequests: this.rateLimit.maxRequests,
            canRequest: recentRequests < this.rateLimit.maxRequests
        };
    }
};

// 4. LAZY LOADING per componenti pesanti
window.LazyLoader = {
    loaded: new Set(),
    
    async load(moduleName) {
        if (this.loaded.has(moduleName)) {
            return true;
        }
        
        try {
            switch (moduleName) {
                case 'excel':
                    if (!window.XLSX) {
                        await this.loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
                    }
                    break;
                    
                case 'pdf':
                    if (!window.jspdf) {
                        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
                    }
                    break;
                    
                case 'papaparse':
                    if (!window.Papa) {
                        await this.loadScript('https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js');
                    }
                    break;
            }
            
            this.loaded.add(moduleName);
            return true;
        } catch (error) {
            console.error(`Failed to load ${moduleName}:`, error);
            return false;
        }
    },
    
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
};

// 5. PERFORMANCE MONITOR
window.PerformanceMonitor = {
    marks: {},
    
    start(label) {
        this.marks[label] = performance.now();
    },
    
    end(label) {
        if (!this.marks[label]) return;
        
        const duration = performance.now() - this.marks[label];
        console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
        
        // Log se troppo lento
        if (duration > 1000) {
            console.warn(`⚠️ Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
        }
        
        delete this.marks[label];
        return duration;
    },
    
    // Monitora memoria
    checkMemory() {
        if (performance.memory) {
            const used = performance.memory.usedJSHeapSize / 1048576;
            const total = performance.memory.totalJSHeapSize / 1048576;
            const limit = performance.memory.jsHeapSizeLimit / 1048576;
            
            console.log(`💾 Memory: ${used.toFixed(2)}MB / ${total.toFixed(2)}MB (limit: ${limit.toFixed(2)}MB)`);
            
            // Warning se usiamo troppa memoria
            if (used / limit > 0.8) {
                console.warn('⚠️ High memory usage detected!');
            }
        }
    }
};

// 6. OTTIMIZZAZIONI AUTOMATICHE AL CARICAMENTO
document.addEventListener('DOMContentLoaded', () => {
    // Pulisci cache vecchie all'avvio
    window.CacheManager.cleanup();
    
    // Pre-carica moduli comuni in background
    setTimeout(() => {
        window.LazyLoader.load('papaparse');
    }, 2000);
    
    // Monitora performance ogni 30 secondi
    setInterval(() => {
        window.PerformanceMonitor.checkMemory();
    }, 30000);
    
    // Ottimizza input di ricerca con debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const originalHandler = searchInput.oninput;
        searchInput.oninput = window.debounce(function(e) {
            if (originalHandler) originalHandler.call(this, e);
        }, 300);
    }
});

// 7. ESEMPIO DI UTILIZZO NEL TRACKING SERVICE
window.optimizedTrackingService = {
    async track(trackingNumber, type, options = {}) {
        const cacheKey = `tracking_${trackingNumber}_${type}`;
        
        // Controlla cache
        if (!options.forceRefresh && window.CacheManager.isValid(cacheKey, window.CacheManager.TTL.trackingData)) {
            console.log('📦 Using cached tracking data');
            return window.CacheManager.get(cacheKey);
        }
        
        // Usa request queue per evitare rate limiting
        return window.RequestQueue.add(async () => {
            window.PerformanceMonitor.start('tracking_api_call');
            
            try {
                const result = await window.trackingService.track(trackingNumber, type, options);
                
                // Salva in cache se successo
                if (result && result.success) {
                    window.CacheManager.set(cacheKey, result, window.CacheManager.TTL.trackingData);
                }
                
                return result;
            } finally {
                window.PerformanceMonitor.end('tracking_api_call');
            }
        });
    }
};

console.log('✅ Performance optimizations loaded');