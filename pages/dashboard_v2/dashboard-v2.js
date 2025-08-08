/**
 * 🚀 DASHBOARD COSTI TRASPORTI V2
 * Focus completo sui costi, non fatturato
 * Analisi dettagliata per corrieri, rotte, tempi
 */

class TransportCostsDashboard {
    constructor() {
        this.supabase = null;
        this.data = {
            shipments: [],
            trackings: [],
            carriers: [],
            filteredData: []
        };
        this.filters = {
            period: 30,
            carrier: '',
            route: '',
            costRange: '',
            startDate: null,
            endDate: null
        };
        this.charts = {};
        
        console.log('🎯 TransportCostsDashboard initialized');
    }

    // ✅ INIZIALIZZAZIONE PRINCIPALE
    async init() {
        try {
            console.log('🚀 Initializing Transport Costs Dashboard...');
            
            // 1. Attendi servizi
            await this.waitForServices();
            
            // 2. Setup event listeners
            this.setupEventListeners();
            
            // 3. Carica dati iniziali
            await this.loadData();
            
            // 4. Renderizza dashboard
            await this.renderDashboard();
            
            console.log('✅ Transport Costs Dashboard initialized successfully');
            
        } catch (error) {
            console.error('❌ Dashboard initialization error:', error);
            this.showError('Errore durante l\'inizializzazione del dashboard');
        }
    }

    // ✅ ATTENDI SERVIZI CORE
    async waitForServices(maxAttempts = 20) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`⏳ Attempt ${attempt}: Checking services...`);
            
            if (window.supabase) {
                this.supabase = window.supabase;
                console.log('✅ Supabase service available');
                return true;
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.warn('⚠️ Supabase not available, using mock data');
        return true;
    }

    // ✅ SETUP EVENT LISTENERS
    setupEventListeners() {
        console.log('🔄 Setting up event listeners...');
        
        // Filtri
        document.getElementById('applyFilters')?.addEventListener('click', () => this.applyFilters());
        document.getElementById('resetFilters')?.addEventListener('click', () => this.resetFilters());
        
        // Periodo personalizzato
        document.getElementById('periodFilter')?.addEventListener('change', (e) => {
            const customRange = document.getElementById('customDateRange');
            if (e.target.value === 'custom') {
                customRange.style.display = 'flex';
            } else {
                customRange.style.display = 'none';
            }
        });
        
        // Chart controls
        document.getElementById('trendPeriod')?.addEventListener('change', () => this.updateTrendChart());
        document.getElementById('carrierMetric')?.addEventListener('change', () => this.updateCarriersChart());
        document.getElementById('routeMetric')?.addEventListener('change', () => this.updateRoutesChart());
        document.getElementById('transitMetric')?.addEventListener('change', () => this.updateTransitChart());
        
        console.log('✅ Event listeners setup complete');
    }

    // ✅ CARICAMENTO DATI
    async loadData() {
        console.log('📊 Loading transport costs data...');
        
        try {
            if (this.supabase) {
                // ✅ CARICA DA SUPABASE
                const [shipmentsResult, trackingsResult, carriersResult] = await Promise.allSettled([
                    this.supabase.from('shipments').select('*').limit(1000),
                    this.supabase.from('trackings').select('*').limit(1000),
                    this.supabase.from('carriers').select('*').limit(100)
                ]);
                
                this.data.shipments = shipmentsResult.status === 'fulfilled' && !shipmentsResult.value.error 
                    ? shipmentsResult.value.data : [];
                this.data.trackings = trackingsResult.status === 'fulfilled' && !trackingsResult.value.error 
                    ? trackingsResult.value.data : [];
                this.data.carriers = carriersResult.status === 'fulfilled' && !carriersResult.value.error 
                    ? carriersResult.value.data : [];
                
                console.log('📊 Data loaded from Supabase:', {
                    shipments: this.data.shipments.length,
                    trackings: this.data.trackings.length,
                    carriers: this.data.carriers.length
                });
                
            } else {
                // ✅ USA DATI MOCK
                this.data = this.getMockData();
                console.log('📊 Using mock data for development');
            }
            
            // ✅ PROCESSA DATI
            this.processData();
            
        } catch (error) {
            console.error('❌ Error loading data:', error);
            this.data = this.getMockData();
            this.processData();
        }
    }

    // ✅ PROCESSA E COMBINA DATI
    processData() {
        console.log('🔄 Processing and combining data...');
        
        // Combina shipments e trackings
        this.data.filteredData = this.data.shipments.map(shipment => {
            const tracking = this.data.trackings.find(t => 
                t.shipment_id === shipment.id || 
                t.tracking_number === shipment.tracking_number
            );
            
            const carrier = this.data.carriers.find(c => 
                c.code === shipment.carrier_code || 
                c.name === shipment.carrier_name
            );
            
            return {
                ...shipment,
                tracking_data: tracking,
                carrier_info: carrier,
                total_cost: (parseFloat(shipment.freight_cost) || 0) + (parseFloat(shipment.other_costs) || 0),
                cost_per_kg: shipment.total_weight_kg > 0 ? 
                    ((parseFloat(shipment.freight_cost) || 0) + (parseFloat(shipment.other_costs) || 0)) / shipment.total_weight_kg : 0,
                route: `${shipment.origin_country || 'N/A'} → ${shipment.destination_country || 'N/A'}`,
                transit_time: this.calculateTransitTime(shipment, tracking)
            };
        });
        
        console.log('✅ Data processed:', this.data.filteredData.length, 'records');
        
        // Popola filtri
        this.populateFilters();
    }

    // ✅ CALCOLA TEMPO DI TRANSITO
    calculateTransitTime(shipment, tracking) {
        if (!shipment.created_at) return null;
        
        const startDate = new Date(shipment.created_at);
        let endDate = null;
        
        if (tracking && tracking.delivered_at) {
            endDate = new Date(tracking.delivered_at);
        } else if (shipment.delivery_date) {
            endDate = new Date(shipment.delivery_date);
        } else if (tracking && tracking.current_status === 'delivered' && tracking.updated_at) {
            endDate = new Date(tracking.updated_at);
        }
        
        if (endDate && endDate > startDate) {
            return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)); // giorni
        }
        
        return null;
    }

    // ✅ POPOLA DROPDOWN FILTRI
    populateFilters() {
        console.log('🔄 Populating filter dropdowns...');
        
        // Corrieri
        const carriers = [...new Set(this.data.filteredData
            .map(item => item.carrier_name)
            .filter(Boolean)
        )].sort();
        
        const carrierSelect = document.getElementById('carrierFilter');
        if (carrierSelect) {
            carrierSelect.innerHTML = '<option value="">Tutti i corrieri</option>';
            carriers.forEach(carrier => {
                carrierSelect.innerHTML += `<option value="${carrier}">${carrier}</option>`;
            });
        }
        
        // Rotte
        const routes = [...new Set(this.data.filteredData
            .map(item => item.route)
            .filter(route => route && !route.includes('N/A'))
        )].sort();
        
        const routeSelect = document.getElementById('routeFilter');
        if (routeSelect) {
            routeSelect.innerHTML = '<option value="">Tutte le rotte</option>';
            routes.forEach(route => {
                routeSelect.innerHTML += `<option value="${route}">${route}</option>`;
            });
        }
        
        console.log('✅ Filters populated:', { carriers: carriers.length, routes: routes.length });
    }

    // ✅ APPLICA FILTRI
    async applyFilters() {
        console.log('🔄 Applying filters...');
        
        // Leggi valori filtri
        this.filters.period = parseInt(document.getElementById('periodFilter')?.value) || 30;
        this.filters.carrier = document.getElementById('carrierFilter')?.value || '';
        this.filters.route = document.getElementById('routeFilter')?.value || '';
        this.filters.costRange = document.getElementById('costRangeFilter')?.value || '';
        
        if (this.filters.period === 'custom') {
            this.filters.startDate = document.getElementById('startDate')?.value;
            this.filters.endDate = document.getElementById('endDate')?.value;
        }
        
        // Applica filtri ai dati
        this.filterData();
        
        // Re-renderizza dashboard
        await this.renderDashboard();
        
        console.log('✅ Filters applied');
    }

    // ✅ FILTRA DATI
    filterData() {
        let filtered = [...this.data.filteredData];
        
        // Filtro periodo
        const now = new Date();
        let startDate;
        
        if (this.filters.period === 'custom' && this.filters.startDate && this.filters.endDate) {
            startDate = new Date(this.filters.startDate);
            const endDate = new Date(this.filters.endDate);
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.created_at);
                return itemDate >= startDate && itemDate <= endDate;
            });
        } else {
            startDate = new Date(now.getTime() - (this.filters.period * 24 * 60 * 60 * 1000));
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.created_at);
                return itemDate >= startDate;
            });
        }
        
        // Filtro corriere
        if (this.filters.carrier) {
            filtered = filtered.filter(item => item.carrier_name === this.filters.carrier);
        }
        
        // Filtro rotta
        if (this.filters.route) {
            filtered = filtered.filter(item => item.route === this.filters.route);
        }
        
        // Filtro range costi
        if (this.filters.costRange) {
            const [min, max] = this.parseCostRange(this.filters.costRange);
            filtered = filtered.filter(item => {
                const cost = item.total_cost;
                return cost >= min && (max === null || cost <= max);
            });
        }
        
        this.data.filteredData = filtered;
        console.log('🔍 Data filtered:', filtered.length, 'records remaining');
    }

    // ✅ PARSA RANGE COSTI
    parseCostRange(range) {
        switch (range) {
            case '0-100': return [0, 100];
            case '100-500': return [100, 500];
            case '500-1000': return [500, 1000];
            case '1000+': return [1000, null];
            default: return [0, null];
        }
    }

    // ✅ RESET FILTRI
    async resetFilters() {
        console.log('🔄 Resetting filters...');
        
        // Reset form
        document.getElementById('periodFilter').value = '30';
        document.getElementById('carrierFilter').value = '';
        document.getElementById('routeFilter').value = '';
        document.getElementById('costRangeFilter').value = '';
        document.getElementById('customDateRange').style.display = 'none';
        
        // Reset filtri interni
        this.filters = {
            period: 30,
            carrier: '',
            route: '',
            costRange: '',
            startDate: null,
            endDate: null
        };
        
        // Ricarica dati originali
        this.data.filteredData = [...this.data.shipments.map(shipment => {
            const tracking = this.data.trackings.find(t => 
                t.shipment_id === shipment.id || 
                t.tracking_number === shipment.tracking_number
            );
            
            const carrier = this.data.carriers.find(c => 
                c.code === shipment.carrier_code || 
                c.name === shipment.carrier_name
            );
            
            return {
                ...shipment,
                tracking_data: tracking,
                carrier_info: carrier,
                total_cost: (parseFloat(shipment.freight_cost) || 0) + (parseFloat(shipment.other_costs) || 0),
                cost_per_kg: shipment.total_weight_kg > 0 ? 
                    ((parseFloat(shipment.freight_cost) || 0) + (parseFloat(shipment.other_costs) || 0)) / shipment.total_weight_kg : 0,
                route: `${shipment.origin_country || 'N/A'} → ${shipment.destination_country || 'N/A'}`,
                transit_time: this.calculateTransitTime(shipment, tracking)
            };
        })];
        
        // Re-renderizza
        await this.renderDashboard();
        
        console.log('✅ Filters reset');
    }

    // ✅ RENDERIZZA DASHBOARD PRINCIPALE
    async renderDashboard() {
        console.log('🎨 Rendering dashboard...');
        
        try {
            // 1. Render KPI Cards
            this.renderKPICards();
            
            // 2. Render Charts
            this.renderCharts();
            
            // 3. Render Analysis
            this.renderAnalysis();
            
            console.log('✅ Dashboard rendered successfully');
            
        } catch (error) {
            console.error('❌ Error rendering dashboard:', error);
        }
    }

    // ✅ CONTINUA NEL PROSSIMO MESSAGGIO...
}

// ✅ INIZIALIZZAZIONE GLOBALE
window.transportDashboard = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Transport Costs Dashboard...');
    
    window.transportDashboard = new TransportCostsDashboard();
    await window.transportDashboard.init();
    
    console.log('✅ Transport Costs Dashboard ready!');
});