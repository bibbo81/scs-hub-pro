// cost-allocation.js - Cost Allocation UI for Shipments - FIXED
// Path: /pages/shipments/cost-allocation.js

// Protection Against Script Duplication
if (window.CostAllocationUI) {
    console.log('⚠️ CostAllocationUI already loaded, skipping...');
} else {

class CostAllocationUI {
    constructor() {
        this.registry = null;
        this.currentShipment = null;
        this.allocationMethod = 'hybrid';
        this.chartInstance = null;
        
        this.init();
    }
    
    async init() {
        console.log('💰 Initializing Cost Allocation UI...');
        
        // Wait for registry
        if (window.shipmentsRegistry) {
            this.registry = window.shipmentsRegistry;
        }
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Allocation method change
        const allocationMethod = document.getElementById('allocationMethod');
        if (allocationMethod) {
            allocationMethod.addEventListener('change', (e) => {
                this.allocationMethod = e.target.value;
                this.renderPreview();
            });
        }
        
        // Recalculate button
        const recalculateBtn = document.getElementById('recalculateCostsBtn');
        if (recalculateBtn) {
            recalculateBtn.addEventListener('click', () => {
                this.recalculateAllCosts();
            });
        }
        
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-section="cost-analysis"]')) {
                setTimeout(() => this.loadCostAnalysisData(), 100);
            }
        });
    }
    
    async loadCostAnalysisData() {
        console.log('📊 Loading cost analysis data...');
        
        if (!this.registry) {
            console.error('Registry not available');
            return;
        }
        
        // Get shipments with products
        const shipmentsWithProducts = this.registry.shipments.filter(s => 
            s.products && s.products.length > 0
        );
        
        if (shipmentsWithProducts.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Render cost breakdown chart
        this.renderCostBreakdownChart(shipmentsWithProducts);
        
        // Render cost details table
        this.renderCostDetailsTable(shipmentsWithProducts[0]); // Show first shipment
        
        // Setup shipment selector
        this.setupShipmentSelector(shipmentsWithProducts);
    }
    
    showEmptyState() {
        const container = document.getElementById('cost-analysis');
        if (!container) return;
        
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 5rem;">
                <i class="fas fa-calculator" style="font-size: 4rem; color: var(--sol-gray-400); margin-bottom: 1rem; display: block;"></i>
                <h3>Nessuna Allocazione Costi Disponibile</h3>
                <p style="color: var(--sol-gray-600); margin-bottom: 2rem;">
                    Collega prima i prodotti alle spedizioni per abilitare l'allocazione costi
                </p>
                <button class="sol-btn sol-btn-primary" onclick="document.querySelector('[data-section=\"registry\"]')?.click()">
                    <i class="fas fa-arrow-left"></i> Vai al Registro
                </button>
            </div>
        `;
    }
    
    renderCostBreakdownChart(shipments) {
        // Destroy existing chart if present
        const canvas = document.getElementById('costBreakdownChart');
        if (!canvas) return;
        
        if (canvas && this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        
        // Calculate total costs by category
        const costCategories = {
            'Ocean Freight': 0,
            'Bunker Surcharge': 0,
            'Port Charges': 0,
            'Customs': 0,
            'Insurance': 0,
            'Documentation': 0,
            'Handling': 0,
            'Trucking': 0
        };
        
        shipments.forEach(shipment => {
            if (shipment.costs) {
                costCategories['Ocean Freight'] += shipment.costs.oceanFreight || 0;
                costCategories['Bunker Surcharge'] += shipment.costs.bunkerSurcharge || 0;
                costCategories['Port Charges'] += shipment.costs.portCharges || 0;
                costCategories['Customs'] += shipment.costs.customs || 0;
                costCategories['Insurance'] += shipment.costs.insurance || 0;
                costCategories['Documentation'] += shipment.costs.documentation || 0;
                costCategories['Handling'] += shipment.costs.handling || 0;
                costCategories['Trucking'] += shipment.costs.trucking || 0;
            }
        });
        
        // Create chart
        this.chartInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(costCategories),
                datasets: [{
                    data: Object.values(costCategories),
                    backgroundColor: [
                        '#3b82f6', // Blue
                        '#10b981', // Green
                        '#f59e0b', // Amber
                        '#ef4444', // Red
                        '#8b5cf6', // Purple
                        '#ec4899', // Pink
                        '#14b8a6', // Teal
                        '#6366f1'  // Indigo
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: €${value.toLocaleString('it-IT')} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    setupShipmentSelector(shipments) {
        const selectorHtml = `
            <div class="shipment-selector" style="margin-bottom: 1rem;">
                <label class="sol-form-label">Seleziona Spedizione:</label>
                <select class="sol-form-select" id="costShipmentSelect" style="max-width: 400px;">
                    ${shipments.map(s => `
                        <option value="${s.id}">
                            ${s.shipmentNumber} - ${s.route?.origin?.name} → ${s.route?.destination?.name}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
        
        const tableCard = document.querySelector('#cost-analysis .sol-card:last-child .sol-card-header');
        if (tableCard) {
            const selectorDiv = document.createElement('div');
            selectorDiv.innerHTML = selectorHtml;
            tableCard.appendChild(selectorDiv);
            
            // Add change listener
            const selectElement = document.getElementById('costShipmentSelect');
            if (selectElement) {
                selectElement.addEventListener('change', (e) => {
                    const shipment = this.registry.shipments.find(s => s.id === e.target.value);
                    if (shipment) {
                        this.renderCostDetailsTable(shipment);
                    }
                });
            }
        }
    }
    
    renderCostDetailsTable(shipment) {
        const tbody = document.getElementById('costDetailsTableBody');
        if (!tbody || !shipment || !shipment.products) return;
        
        this.currentShipment = shipment;
        
        // Calculate allocations
        const allocations = this.calculateAllocations(shipment);
        
        tbody.innerHTML = allocations.map(allocation => `
            <tr>
                <td class="font-mono">${allocation.sku}</td>
                <td>${allocation.productName}</td>
                <td style="text-align: center;">${allocation.quantity}</td>
                <td style="text-align: right;">${allocation.totalWeight.toFixed(2)}</td>
                <td style="text-align: right;">${allocation.totalVolume.toFixed(3)}</td>
                <td style="text-align: right;">€${allocation.totalValue.toLocaleString('it-IT')}</td>
                <td style="text-align: right;">
                    <strong>€${allocation.allocatedCost.toFixed(2)}</strong>
                    <br>
                    <small class="text-muted">${(allocation.allocationRatio * 100).toFixed(1)}%</small>
                </td>
                <td style="text-align: right;">
                    <strong>€${allocation.unitCost.toFixed(2)}</strong>
                </td>
            </tr>
        `).join('');
        
        // Add summary row
        const totalCost = allocations.reduce((sum, a) => sum + a.allocatedCost, 0);
        tbody.innerHTML += `
            <tr class="summary-row" style="font-weight: bold; background: var(--sol-gray-50);">
                <td colspan="6">Totale</td>
                <td style="text-align: right;">€${totalCost.toFixed(2)}</td>
                <td></td>
            </tr>
        `;
    }
    
    calculateAllocations(shipment) {
        if (!shipment.products || shipment.products.length === 0) return [];
        
        const totalCost = shipment.costs?.total || 0;
        const allocations = [];
        
        // Calculate totals for allocation
        const totals = {
            weight: 0,
            volume: 0,
            value: 0,
            quantity: 0
        };
        
        shipment.products.forEach(product => {
            totals.weight += (product.weight || 0) * (product.quantity || 0);
            totals.volume += (product.volume || 0) * (product.quantity || 0);
            totals.value += (product.value || 0) * (product.quantity || 0);
            totals.quantity += product.quantity || 0;
        });
        
        // Allocate costs to each product
        shipment.products.forEach(product => {
            let allocationRatio = 0;
            
            const productWeight = (product.weight || 0) * (product.quantity || 0);
            const productVolume = (product.volume || 0) * (product.quantity || 0);
            const productValue = (product.value || 0) * (product.quantity || 0);
            
            switch (this.allocationMethod) {
                case 'weight':
                    allocationRatio = totals.weight > 0 ? productWeight / totals.weight : 0;
                    break;
                case 'volume':
                    allocationRatio = totals.volume > 0 ? productVolume / totals.volume : 0;
                    break;
                case 'value':
                    allocationRatio = totals.value > 0 ? productValue / totals.value : 0;
                    break;
                case 'quantity':
                    allocationRatio = totals.quantity > 0 ? product.quantity / totals.quantity : 0;
                    break;
                case 'hybrid':
                default:
                    // 40% value, 30% weight, 30% volume
                    const valueRatio = totals.value > 0 ? productValue / totals.value : 0;
                    const weightRatio = totals.weight > 0 ? productWeight / totals.weight : 0;
                    const volumeRatio = totals.volume > 0 ? productVolume / totals.volume : 0;
                    allocationRatio = (valueRatio * 0.4) + (weightRatio * 0.3) + (volumeRatio * 0.3);
                    break;
            }
            
            const allocatedCost = totalCost * allocationRatio;
            const unitCost = product.quantity > 0 ? allocatedCost / product.quantity : 0;
            
            allocations.push({
                sku: product.sku,
                productName: product.productName,
                quantity: product.quantity,
                totalWeight: productWeight,
                totalVolume: productVolume,
                totalValue: productValue,
                allocationRatio,
                allocatedCost,
                unitCost
            });
        });
        
        return allocations;
    }
    
    async recalculateAllCosts() {
        if (!this.registry) {
            window.NotificationSystem?.show('Errore', 'Registry non disponibile', 'error');
            return;
        }
        
        const shipmentsWithProducts = this.registry.shipments.filter(s => 
            s.products && s.products.length > 0
        );
        
        if (shipmentsWithProducts.length === 0) {
            window.NotificationSystem?.show('Attenzione', 'Nessuna spedizione con prodotti', 'warning');
            return;
        }
        
        if (window.ModalSystem?.confirm) {
            const confirmed = await window.ModalSystem.confirm({
                title: 'Conferma Ricalcolo',
                message: `Vuoi ricalcolare i costi per ${shipmentsWithProducts.length} spedizioni usando il metodo "${this.allocationMethod}"?`,
                confirmText: 'Ricalcola',
                confirmClass: 'sol-btn-primary'
            });
            
            if (!confirmed) return;
        }
        
        try {
            // Show progress
            const progressModal = window.ModalSystem?.progress?.({
                title: 'Ricalcolo Costi',
                message: 'Elaborazione in corso...',
                showPercentage: true
            });
            
            for (let i = 0; i < shipmentsWithProducts.length; i++) {
                const shipment = shipmentsWithProducts[i];
                
                await this.registry.allocateCosts(shipment.id, this.allocationMethod);
                
                if (progressModal) {
                    const progress = ((i + 1) / shipmentsWithProducts.length) * 100;
                    progressModal.update(progress, `Elaborazione ${i + 1}/${shipmentsWithProducts.length}...`);
                }
            }
            
            if (progressModal) progressModal.close();
            
            window.NotificationSystem?.show(
                'Successo', 
                `Costi ricalcolati per ${shipmentsWithProducts.length} spedizioni`, 
                'success'
            );
            
            // Refresh current view
            if (this.currentShipment) {
                this.renderCostDetailsTable(this.currentShipment);
            }
            
        } catch (error) {
            console.error('Error recalculating costs:', error);
            window.NotificationSystem?.show('Errore', error.message, 'error');
        }
    }
    
    renderPreview() {
        if (this.currentShipment) {
            this.renderCostDetailsTable(this.currentShipment);
        }
    }
    
    async openModal() {
        if (!window.ModalSystem) {
            console.error('Modal System not available');
            return;
        }
        
        window.ModalSystem.show({
            title: 'Allocazione Costi Avanzata',
            content: this.renderModalContent(),
            size: 'xl',
            buttons: [
                {
                    text: 'Chiudi',
                    class: 'sol-btn-glass',
                    onclick: () => window.ModalSystem.close()
                },
                {
                    text: 'Applica a Tutte',
                    class: 'sol-btn-primary',
                    onclick: () => this.applyToAll()
                }
            ]
        });
    }
    
    renderModalContent() {
        return `
            <div class="cost-allocation-modal">
                <div class="allocation-settings">
                    <h4>Configurazione Allocazione</h4>
                    <div class="sol-form">
                        <div class="sol-form-group">
                            <label class="sol-form-label">Metodo di Allocazione</label>
                            <select class="sol-form-select" id="modalAllocationMethod">
                                <option value="weight">Per Peso</option>
                                <option value="volume">Per Volume</option>
                                <option value="value">Per Valore</option>
                                <option value="quantity">Per Quantità</option>
                                <option value="hybrid" selected>Ibrido (40% valore, 30% peso, 30% volume)</option>
                                <option value="custom">Personalizzato</option>
                            </select>
                        </div>
                        
                        <div id="customWeights" style="display: none;">
                            <h5>Pesi Personalizzati</h5>
                            <div class="sol-form-grid">
                                <div class="sol-form-group">
                                    <label>Peso (%)</label>
                                    <input type="number" class="sol-form-input" id="weightPercent" 
                                           value="30" min="0" max="100">
                                </div>
                                <div class="sol-form-group">
                                    <label>Volume (%)</label>
                                    <input type="number" class="sol-form-input" id="volumePercent" 
                                           value="30" min="0" max="100">
                                </div>
                                <div class="sol-form-group">
                                    <label>Valore (%)</label>
                                    <input type="number" class="sol-form-input" id="valuePercent" 
                                           value="40" min="0" max="100">
                                </div>
                            </div>
                            <p class="text-muted">Totale: <span id="totalPercent">100</span>%</p>
                        </div>
                    </div>
                </div>
                
                <div class="allocation-preview">
                    <h4>Anteprima Allocazione</h4>
                    <div id="allocationPreview">
                        <!-- Preview will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }
    
    async applyToAll() {
        // Implementation for applying allocation method to all shipments
        console.log('Applying to all shipments...');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.costAllocation = new CostAllocationUI();
});

// Add styles
const costAllocationStyles = document.createElement('style');
costAllocationStyles.textContent = `
    .cost-allocation-modal {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 2rem;
        min-height: 500px;
    }
    
    .allocation-settings {
        background: var(--sol-gray-50);
        border-radius: var(--sol-radius-lg);
        padding: 1.5rem;
    }
    
    .allocation-preview {
        background: white;
        border: 1px solid var(--sol-gray-200);
        border-radius: var(--sol-radius-lg);
        padding: 1.5rem;
        overflow-y: auto;
        max-height: 500px;
    }
    
    .summary-row td {
        padding-top: 1rem !important;
        border-top: 2px solid var(--sol-gray-300);
    }
    
    .shipment-selector {
        margin-left: auto;
    }
    
    @media (max-width: 768px) {
        .cost-allocation-modal {
            grid-template-columns: 1fr;
        }
    }
`;
document.head.appendChild(costAllocationStyles);

console.log('[CostAllocation] UI module loaded');

// Set global reference
window.CostAllocationUI = CostAllocationUI;

}