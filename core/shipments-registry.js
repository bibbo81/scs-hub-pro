import { formatDate, formatCurrency, getShipmentStatusClass } from './table-config.js';
console.log('[ShipmentsRegistry] Loading...');

const ShipmentsRegistry = {
    initialized: false,
    shipments: [],
    
    async init() {
        if (this.initialized) return;
        
        console.log('[ShipmentsRegistry] Initializing...');
        
        // Attendi che dataManager sia disponibile
        let retries = 0;
        while (!window.dataManager?.initialized && retries < 20) {
            await new Promise(resolve => setTimeout(resolve, 500));
            retries++;
        }
        
        if (window.dataManager?.initialized) {
            this.initialized = true;
            console.log('[ShipmentsRegistry] ✅ Ready to load real data');
        } else {
            console.error('[ShipmentsRegistry] ❌ DataManager not available');
        }
    },
    
    async loadShipments() {
        if (!window.dataManager?.initialized) {
            console.error('[ShipmentsRegistry] DataManager not initialized');
            return [];
        }
        
        try {
            console.log('[ShipmentsRegistry] Loading real shipments...');
            const shipments = await window.dataManager.getShipments();
            console.log(`[ShipmentsRegistry] ✅ Loaded ${shipments.length} shipments`);
            this.shipments = shipments;
            this.updateStats(shipments);
            return shipments;
        } catch (error) {
            console.error('[ShipmentsRegistry] Error loading shipments:', error);
            return [];
        }
    },
    
    async renderShipmentsTable() {
        const tbody = document.getElementById('shipmentsTableBody');
        if (!tbody) return;
        
        // Show loading state
        tbody.innerHTML = '<tr><td colspan="14" class="text-center">Caricamento...</td></tr>';
        
        // Load real data
        const shipments = await this.loadShipments();
        
        if (shipments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="14" class="text-center">Nessuna spedizione trovata</td></tr>';
            return;
        }
        
        // Clear and populate with real data
        tbody.innerHTML = '';
        
        shipments.forEach(shipment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" value="${shipment.id}"></td>
                <td class="font-mono">
                    ${shipment.tracking_number}
                    ${shipment.auto_created ? '<span class="badge badge-info ml-1">Auto</span>' : ''}
                </td>
                <td>${shipment.tracking_type || 'N/A'}</td>
                <td>
                    <span class="sol-badge sol-badge-${getShipmentStatusClass(shipment.status)}">
                        ${shipment.status}
                    </span>
                </td>
                <td>${shipment.carrier_name || 'N/A'}</td>
                <td>${shipment.origin_country || shipment.origin || 'N/A'}</td>
                <td>${shipment.customer_country || shipment.destination || 'N/A'}</td>
                <td>${formatDate(shipment.date_of_departure)}</td>
                <td>${formatDate(shipment.eta)}</td>
                <td>${shipment.products?.length || 0}</td>
                <td class="documents-cell">
                    <button class="sol-btn sol-btn-sm sol-btn-glass documents-btn">
                        <i class="fas fa-folder"></i>
                        <span class="doc-count">0</span>
                    </button>
                </td>
                <td class="commercial-cell">
                    <span class="commercial-status missing">Missing</span>
                </td>
                <td>${formatCurrency(shipment.total_value)}</td>
                <td>
                    <div class="btn-group">
                        <button class="sol-btn sol-btn-sm sol-btn-primary" onclick="viewShipment('${shipment.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="editShipment('${shipment.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Update stats
        this.updateStats(shipments);
    },
    
    updateStats(shipments) {
        // Total shipments
        const totalEl = document.getElementById('totalShipments');
        if (totalEl) totalEl.textContent = shipments.length;
        
        // Active shipments
        const activeEl = document.getElementById('activeShipments');
        if (activeEl) {
            const active = shipments.filter(s => s.status === 'in_transit').length;
            activeEl.textContent = active;
        }
        
        // Total costs
        const costsEl = document.getElementById('totalCosts');
        if (costsEl) {
            const total = shipments.reduce((sum, s) => sum + (parseFloat(s.total_value) || 0), 0);
            costsEl.textContent = formatCurrency(total);
        }
        
        // Update count in header
        const countEl = document.getElementById('registryCount');
        if (countEl) countEl.textContent = shipments.length;
    },

    getStatistics() {
        const shipments = this.shipments || [];
        const total = shipments.length;
        const byStatus = {};
        let totalCost = 0;
        let totalTransit = 0;
        let transitCount = 0;

        shipments.forEach(s => {
            byStatus[s.status] = (byStatus[s.status] || 0) + 1;
            totalCost += (s.costs?.total ?? parseFloat(s.total_value)) || 0;
            if (s.route?.estimatedTransit) {
                totalTransit += s.route.estimatedTransit;
                transitCount++;
            }
        });

        return {
            total,
            byStatus,
            totalCost,
            avgTransitTime: transitCount > 0 ? Math.round(totalTransit / transitCount) : 0
        };
    }

    // formatting helpers provided by table-config.js
};

// Auto-init quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ShipmentsRegistry.init());
} else {
    ShipmentsRegistry.init();
}

// Esporta per uso globale
window.ShipmentsRegistry = ShipmentsRegistry;

// Setup refresh button
document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refreshDataBtn');
    if (refreshBtn) {
        refreshBtn.onclick = () => ShipmentsRegistry.renderShipmentsTable();
    }
    
    // Auto-load data dopo init
    setTimeout(() => {
        if (ShipmentsRegistry.initialized) {
            ShipmentsRegistry.renderShipmentsTable();
        }
    }, 1000);
});

console.log('[ShipmentsRegistry] ✅ Module loaded');