// File: /core/product-linking-system.js

// product-linking-system.js - Sistema moderno per collegare prodotti e spedizioni
console.log('🚀 Loading Product Linking System...');

class ProductLinkingSystem {
    constructor() {
        this.version = '2.0';
        this.initialized = false;
        this.dataManager = null;
        this.supabase = null;
        this.organizationId = null;
    }
    
    async init() {
        console.log('🔧 Initializing Product Linking System v2.0...');

        try {
            const depsReady = await this.waitForDependencies(30000);
            if (!depsReady) {
                this.showNotification('error', 'Impossibile avviare il sistema. Riprova manualmente.');
                return false;
            }

            // Salva riferimenti
            this.dataManager = window.dataManager;
            this.supabase = window.supabase;
            this.organizationId = this.dataManager.organizationId;
            
            // Setup gestori eventi
            this.setupEventHandlers();
            
            // Fix bottoni esistenti
            this.fixExistingButtons();
            
            this.initialized = true;
            console.log('✅ Product Linking System v2.0 initialized');
            
            // Test automatico
            this.runSystemTest();
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize Product Linking System:', error);
            throw error;
        }
    }

    async retryInit() {
        if (this.initialized) {
            return true;
        }
        console.log('🔄 Retrying Product Linking System initialization...');
        return this.init();
    }
    
    async waitForDependencies(timeoutMs) {
        console.log('⏳ Waiting for core dependencies...');

        const start = Date.now();
        let attempts = 0;

        while (true) {
            if (window.dataManager?.initialized &&
                window.supabase &&
                typeof window.supabase.from === 'function' &&
                window.ModalSystem) {
                console.log('✅ All dependencies ready');
                return true;
            }

            if (timeoutMs && Date.now() - start >= timeoutMs) {
                console.warn('⏳ Dependencies not ready yet');
                return false;
            }

            await this.delay(1000);
            attempts++;

            if (attempts % 5 === 0) {
                console.log(`⏳ Still waiting... (${attempts})`);
            }
        }
    }
    
    setupEventHandlers() {
        console.log('🎯 Setting up event handlers...');
        
        // Handler globale per intercettare click sui bottoni
        document.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            
            // Verifica se è un bottone di collegamento prodotti
            if (this.isProductButton(button)) {
                e.preventDefault();
                e.stopPropagation();
                
                const shipmentId = this.extractShipmentId(button);
                const action = this.detectButtonAction(button);
                
                if (shipmentId) {
                    console.log(`🎯 Product button clicked: ${action} for shipment ${shipmentId}`);
                    
                    switch (action) {
                        case 'link':
                            await this.showLinkProductsModal(shipmentId);
                            break;
                        case 'manage':
                            await this.showManageProductsModal(shipmentId);
                            break;
                        case 'view':
                            await this.showViewProductsModal(shipmentId);
                            break;
                    }
                }
            }
        }, true);
        
        console.log('✅ Event handlers configured');
    }
    
    isProductButton(button) {
        const text = button.textContent?.toLowerCase() || '';
        const title = button.title?.toLowerCase() || '';
        const onclick = button.getAttribute('onclick') || '';
        const icon = button.querySelector('i')?.className || '';
        
        const productKeywords = [
            'prodott', 'product', 'collega', 'link', 
            'gestisci', 'manage', 'articol'
        ];
        
        const productIcons = [
            'fa-link', 'fa-box', 'fa-cube', 'fa-cogs',
            'fa-plus', 'fa-eye'
        ];
        
        return productKeywords.some(keyword => 
            text.includes(keyword) || 
            title.includes(keyword) || 
            onclick.includes(keyword)
        ) || productIcons.some(iconClass => icon.includes(iconClass));
    }
    
    detectButtonAction(button) {
        const text = button.textContent?.toLowerCase() || '';
        const title = button.title?.toLowerCase() || '';
        const icon = button.querySelector('i')?.className || '';
        
        if (text.includes('gestisci') || title.includes('gestisci') || 
            text.includes('manage') || icon.includes('fa-cogs')) {
            return 'manage';
        }
        
        if (text.includes('visualizza') || title.includes('visualizza') || 
            text.includes('view') || icon.includes('fa-eye')) {
            return 'view';
        }
        
        return 'link'; // Default
    }
    
    extractShipmentId(button) {
        // 1. Data attribute diretto
        if (button.dataset.shipmentId) return button.dataset.shipmentId;
        
        // 2. Dalla riga della tabella
        const row = button.closest('tr');
        if (row) {
            if (row.dataset.shipmentId) return row.dataset.shipmentId;
            if (row.dataset.id) return row.dataset.id;
            
            // 3. Dal checkbox nella riga
            const checkbox = row.querySelector('input[type="checkbox"][value]');
            if (checkbox?.value) return checkbox.value;
        }
        
        // 4. Dal onclick attribute
        const onclick = button.getAttribute('onclick') || '';
        const match = onclick.match(/['"]([a-f0-9-]{36})['"]/);
        if (match) return match[1];
        
        console.warn('⚠️ Could not extract shipment ID from button');
        return null;
    }
    
    fixExistingButtons() {
        console.log('🔧 Fixing existing buttons...');
        
        const buttons = document.querySelectorAll('button');
        let fixed = 0;
        
        buttons.forEach(button => {
            if (this.isProductButton(button)) {
                const shipmentId = this.extractShipmentId(button);
                if (shipmentId) {
                    button.setAttribute('data-shipment-id', shipmentId);
                    button.setAttribute('data-product-button', 'true');
                    fixed++;
                }
            }
        });
        
        console.log(`✅ Fixed ${fixed} product buttons`);
    }
    
    // ===== MODAL: COLLEGA PRODOTTI =====
    
    async showLinkProductsModal(shipmentId) {
        console.log(`🔗 Opening link products modal for shipment: ${shipmentId}`);
        
        try {
            // Carica dati necessari
            const [shipment, products] = await Promise.all([
                this.loadShipment(shipmentId),
                this.loadAvailableProducts()
            ]);
            
            if (!shipment) {
                throw new Error('Spedizione non trovata');
            }
            
            // Filtra prodotti già collegati
            const linkedProductIds = (shipment.products || []).map(p => p.product_id);
            const availableProducts = products.filter(p => !linkedProductIds.includes(p.id));
            
            const modalContent = this.generateLinkModalContent(shipment, availableProducts);
            
            window.ModalSystem.show({
                title: `🔗 Collega Prodotti - ${shipment.tracking_number}`,
                content: modalContent,
                size: 'lg',
                buttons: [
                    {
                        text: 'Annulla',
                        class: 'sol-btn-secondary',
                        onclick: () => true
                    },
                    {
                        text: 'Collega Selezionati',
                        class: 'sol-btn-primary',
                        onclick: async () => {
                            await this.processLinkProducts(shipmentId);
                            return true;
                        }
                    }
                ]
            });
            
            // Setup handlers dopo rendering
            setTimeout(() => this.setupLinkModalHandlers(), 100);
            
        } catch (error) {
            console.error('❌ Error showing link modal:', error);
            this.showNotification('error', 'Errore: ' + error.message);
        }
    }
    
    generateLinkModalContent(shipment, availableProducts) {
        const hasProducts = shipment.products && shipment.products.length > 0;
        
        return `
            <div class="product-link-modal">
                <!-- Shipment Info -->
                <div class="shipment-info-card">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="text-muted small">Spedizione</label>
                            <div class="fw-bold">${shipment.tracking_number}</div>
                        </div>
                        <div class="col-md-6">
                            <label class="text-muted small">Rotta</label>
                            <div>${shipment.origin_country || 'N/A'} → ${shipment.metadata?.customer_country || 'N/A'}</div>
                        </div>
                    </div>
                    ${hasProducts ? `
                        <div class="alert alert-info py-2">
                            <i class="fas fa-info-circle"></i>
                            Questa spedizione ha già ${shipment.products.length} prodotti collegati
                        </div>
                    ` : ''}
                </div>

                <!-- Products Section -->
                <div class="products-section mt-4">
                    <div class="section-header d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">Prodotti Disponibili (${availableProducts.length})</h6>
                        <div class="btn-group btn-group-sm">
                            <button type="button" class="btn btn-outline-primary" 
                                    onclick="window.productLinking.selectAll(true)">
                                Seleziona Tutti
                            </button>
                            <button type="button" class="btn btn-outline-secondary" 
                                    onclick="window.productLinking.selectAll(false)">
                                Deseleziona
                            </button>
                        </div>
                    </div>
                    
                    <div class="products-container" style="max-height: 400px; overflow-y: auto;">
                        ${availableProducts.length === 0 ? 
                            this.renderNoProductsMessage() :
                            availableProducts.map(product => this.renderProductItem(product)).join('')
                        }
                    </div>
                </div>

                <!-- Summary -->
                <div class="selection-summary mt-3 p-3 bg-light rounded" id="selectionSummary" style="display: none;">
                    <div class="row text-center">
                        <div class="col-4">
                            <div class="h5 mb-0" id="summaryCount">0</div>
                            <small class="text-muted">Prodotti</small>
                        </div>
                        <div class="col-4">
                            <div class="h5 mb-0" id="summaryQuantity">0</div>
                            <small class="text-muted">Quantità Tot.</small>
                        </div>
                        <div class="col-4">
                            <div class="h5 mb-0" id="summaryValue">€0</div>
                            <small class="text-muted">Valore Tot.</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderNoProductsMessage() {
        return `
            <div class="text-center py-5">
                <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
                <p class="text-muted">Tutti i prodotti disponibili sono già collegati a questa spedizione</p>
                <button type="button" class="btn btn-sm btn-primary" 
                        onclick="window.productLinking.openProductsPage()">
                    <i class="fas fa-plus"></i> Crea Nuovo Prodotto
                </button>
            </div>
        `;
    }
    
    renderProductItem(product) {
        const value = product.unit_price || product.value || 0;
        const weight = product.weight || 0;
        
        return `
            <div class="product-select-item">
                <div class="form-check">
                    <input type="checkbox" 
                           class="form-check-input product-checkbox" 
                           id="product-${product.id}" 
                           value="${product.id}"
                           data-price="${value}"
                           data-name="${product.name}"
                           onchange="window.productLinking.updateSummary()">
                    <label class="form-check-label w-100" for="product-${product.id}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="product-info">
                                <div class="fw-bold">${product.name}</div>
                                <div class="text-muted small">
                                    SKU: ${product.sku || 'N/A'} | 
                                    ${weight}kg | 
                                    €${value.toLocaleString('it-IT')}
                                </div>
                            </div>
                            <div class="quantity-control">
                                <label class="small text-muted">Qtà:</label>
                                <input type="number" 
                                       class="form-control form-control-sm quantity-input" 
                                       id="qty-${product.id}"
                                       value="1" 
                                       min="1" 
                                       max="9999"
                                       style="width: 70px;"
                                       onchange="window.productLinking.updateSummary()">
                            </div>
                        </div>
                    </label>
                </div>
            </div>
        `;
    }
    
    setupLinkModalHandlers() {
        // Aggiorna summary iniziale
        this.updateSummary();
        
        // Focus sul primo prodotto
        const firstCheckbox = document.querySelector('.product-checkbox');
        if (firstCheckbox) firstCheckbox.focus();
    }
    
    selectAll(select) {
        document.querySelectorAll('.product-checkbox').forEach(cb => {
            cb.checked = select;
        });
        this.updateSummary();
    }
    
    updateSummary() {
        const summary = document.getElementById('selectionSummary');
        const checkedProducts = document.querySelectorAll('.product-checkbox:checked');
        
        if (checkedProducts.length === 0) {
            if (summary) summary.style.display = 'none';
            return;
        }
        
        if (summary) summary.style.display = 'block';
        
        let totalQuantity = 0;
        let totalValue = 0;
        
        checkedProducts.forEach(cb => {
            const productId = cb.value;
            const price = parseFloat(cb.dataset.price || 0);
            const quantity = parseInt(document.getElementById(`qty-${productId}`)?.value || 1);
            
            totalQuantity += quantity;
            totalValue += (price * quantity);
        });
        
        // Update UI
        document.getElementById('summaryCount').textContent = checkedProducts.length;
        document.getElementById('summaryQuantity').textContent = totalQuantity;
        document.getElementById('summaryValue').textContent = '€' + totalValue.toLocaleString('it-IT');
    }
    
    async processLinkProducts(shipmentId) {
        try {
            const checkedProducts = document.querySelectorAll('.product-checkbox:checked');
            
            if (checkedProducts.length === 0) {
                this.showNotification('warning', 'Seleziona almeno un prodotto');
                return;
            }
            
            // Raccogli dati prodotti
            const productsToLink = [];
            
            for (const cb of checkedProducts) {
                const productId = cb.value;
                const quantity = parseInt(document.getElementById(`qty-${productId}`)?.value || 1);
                const price = parseFloat(cb.dataset.price || 0);
                const name = cb.dataset.name;
                
                productsToLink.push({
                    product_id: productId,
                    product_name: name,
                    quantity: quantity,
                    unit_price: price,
                    total_value: price * quantity
                });
            }
            
            // Carica shipment corrente
            const shipment = await this.loadShipment(shipmentId);
            const existingProducts = shipment.products || [];
            
            // Combina prodotti
            const allProducts = [...existingProducts, ...productsToLink];
            
            // Aggiorna nel database
            const { error } = await this.supabase
                .from('shipments')
                .update({
                    products: allProducts,
                    updated_at: new Date().toISOString()
                })
                .eq('id', shipmentId)
                .eq('organization_id', this.organizationId);
                
            if (error) throw error;
            
            this.showNotification('success', 
                `${productsToLink.length} prodotti collegati con successo!`
            );
            
            // Ricarica tabella
            await this.reloadTable();
            
        } catch (error) {
            console.error('❌ Error linking products:', error);
            this.showNotification('error', 'Errore collegamento: ' + error.message);
        }
    }
    
    // ===== MODAL: GESTISCI PRODOTTI =====
    
    async showManageProductsModal(shipmentId) {
        console.log(`🔧 Opening manage products modal for shipment: ${shipmentId}`);
        
        try {
            const shipment = await this.loadShipment(shipmentId);
            
            if (!shipment) {
                throw new Error('Spedizione non trovata');
            }
            
            if (!shipment.products || shipment.products.length === 0) {
                this.showNotification('info', 'Questa spedizione non ha prodotti collegati');
                return;
            }
            
            const modalContent = this.generateManageModalContent(shipment);
            
            window.ModalSystem.show({
                title: `🔧 Gestisci Prodotti - ${shipment.tracking_number}`,
                content: modalContent,
                size: 'lg',
                buttons: [
                    {
                        text: 'Chiudi',
                        class: 'sol-btn-secondary',
                        onclick: () => true
                    },
                    {
                        text: 'Rimuovi Selezionati',
                        class: 'sol-btn-danger',
                        onclick: async () => {
                            await this.processUnlinkProducts(shipmentId);
                            return true;
                        }
                    }
                ]
            });
            
        } catch (error) {
            console.error('❌ Error showing manage modal:', error);
            this.showNotification('error', 'Errore: ' + error.message);
        }
    }
    
    generateManageModalContent(shipment) {
        const products = shipment.products || [];
        const totals = this.calculateProductTotals(products);
        
        return `
            <div class="manage-products-modal">
                <!-- Summary -->
                <div class="summary-card bg-light p-3 rounded mb-4">
                    <div class="row text-center">
                        <div class="col-4">
                            <div class="h4 mb-0">${products.length}</div>
                            <small class="text-muted">Prodotti</small>
                        </div>
                        <div class="col-4">
                            <div class="h4 mb-0">${totals.quantity}</div>
                            <small class="text-muted">Quantità Tot.</small>
                        </div>
                        <div class="col-4">
                            <div class="h4 mb-0">€${totals.value.toLocaleString('it-IT')}</div>
                            <small class="text-muted">Valore Tot.</small>
                        </div>
                    </div>
                </div>

                <!-- Products List -->
                <div class="products-list">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">Prodotti Collegati</h6>
                        <button type="button" class="btn btn-sm btn-outline-danger" 
                                onclick="window.productLinking.selectAllForRemoval(true)">
                            <i class="fas fa-check-square"></i> Seleziona Tutti
                        </button>
                    </div>
                    
                    <div class="products-container" style="max-height: 400px; overflow-y: auto;">
                        ${products.map((product, index) => 
                            this.renderLinkedProductItem(product, index)
                        ).join('')}
                    </div>
                </div>

                <!-- Warning -->
                <div class="alert alert-warning mt-3">
                    <i class="fas fa-exclamation-triangle"></i>
                    I prodotti selezionati verranno rimossi definitivamente da questa spedizione
                </div>
            </div>
        `;
    }
    
    renderLinkedProductItem(product, index) {
        const name = product.product_name || product.name || 'Prodotto';
        const quantity = product.quantity || 1;
        const price = product.unit_price || 0;
        const total = quantity * price;
        
        return `
            <div class="linked-product-item">
                <div class="form-check">
                    <input type="checkbox" 
                           class="form-check-input remove-checkbox" 
                           id="remove-${index}" 
                           value="${index}">
                    <label class="form-check-label w-100" for="remove-${index}">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-bold">${name}</div>
                                <small class="text-muted">
                                    ${quantity}x €${price.toLocaleString('it-IT')} = 
                                    €${total.toLocaleString('it-IT')}
                                </small>
                            </div>
                            <span class="badge bg-success">Collegato</span>
                        </div>
                    </label>
                </div>
            </div>
        `;
    }
    
    selectAllForRemoval(select) {
        document.querySelectorAll('.remove-checkbox').forEach(cb => {
            cb.checked = select;
        });
    }
    
    async processUnlinkProducts(shipmentId) {
        try {
            const checkedBoxes = document.querySelectorAll('.remove-checkbox:checked');
            
            if (checkedBoxes.length === 0) {
                this.showNotification('warning', 'Seleziona almeno un prodotto da rimuovere');
                return;
            }
            
            if (!confirm(`Rimuovere ${checkedBoxes.length} prodotti dalla spedizione?`)) {
                return;
            }
            
            // Carica shipment
            const shipment = await this.loadShipment(shipmentId);
            const currentProducts = shipment.products || [];
            
            // Indici da rimuovere
            const indicesToRemove = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
            
            // Filtra prodotti
            const remainingProducts = currentProducts.filter((_, index) => 
                !indicesToRemove.includes(index)
            );
            
            // Aggiorna database
            const { error } = await this.supabase
                .from('shipments')
                .update({
                    products: remainingProducts.length > 0 ? remainingProducts : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', shipmentId)
                .eq('organization_id', this.organizationId);
                
            if (error) throw error;
            
            this.showNotification('success', 
                `${checkedBoxes.length} prodotti rimossi con successo!`
            );
            
            // Ricarica tabella
            await this.reloadTable();
            
        } catch (error) {
            console.error('❌ Error unlinking products:', error);
            this.showNotification('error', 'Errore rimozione: ' + error.message);
        }
    }
    
    // ===== MODAL: VISUALIZZA PRODOTTI =====
    
    async showViewProductsModal(shipmentId) {
        console.log(`👁️ Opening view products modal for shipment: ${shipmentId}`);
        
        try {
            const shipment = await this.loadShipment(shipmentId);
            
            if (!shipment) {
                throw new Error('Spedizione non trovata');
            }
            
            const modalContent = this.generateViewModalContent(shipment);
            
            window.ModalSystem.show({
                title: `📦 Prodotti - ${shipment.tracking_number}`,
                content: modalContent,
                size: 'md',
                buttons: [
                    {
                        text: 'Chiudi',
                        class: 'sol-btn-secondary',
                        onclick: () => true
                    }
                ]
            });
            
        } catch (error) {
            console.error('❌ Error showing view modal:', error);
            this.showNotification('error', 'Errore: ' + error.message);
        }
    }
    
    generateViewModalContent(shipment) {
        const products = shipment.products || [];
        
        if (products.length === 0) {
            return `
                <div class="text-center py-5">
                    <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Nessun prodotto collegato a questa spedizione</p>
                    <button type="button" class="btn btn-primary" 
                            onclick="window.ModalSystem.close(); window.productLinking.showLinkProductsModal('${shipment.id}')">
                        <i class="fas fa-link"></i> Collega Prodotti
                    </button>
                </div>
            `;
        }
        
        const totals = this.calculateProductTotals(products);
        
        return `
            <div class="view-products-modal">
                <div class="products-table">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Prodotto</th>
                                <th class="text-center">Qtà</th>
                                <th class="text-end">Prezzo</th>
                                <th class="text-end">Totale</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.map(product => `
                                <tr>
                                    <td>${product.product_name || 'N/A'}</td>
                                    <td class="text-center">${product.quantity || 1}</td>
                                    <td class="text-end">€${(product.unit_price || 0).toLocaleString('it-IT')}</td>
                                    <td class="text-end">€${((product.quantity || 1) * (product.unit_price || 0)).toLocaleString('it-IT')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="fw-bold">
                                <td>Totale</td>
                                <td class="text-center">${totals.quantity}</td>
                                <td></td>
                                <td class="text-end">€${totals.value.toLocaleString('it-IT')}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    }
    
    // ===== HELPER METHODS =====
    
    async loadShipment(shipmentId) {
        if (!this.supabase) {
            this.showNotification('error', 'Database non disponibile');
            return null;
        }

        try {
            const { data, error } = await this.supabase
                .from('shipments')
                .select('*')
                .eq('id', shipmentId)
                .eq('organization_id', this.organizationId)
                .single();
                
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error loading shipment:', error);
            return null;
        }
    }
    
    async loadAvailableProducts() {
        if (!this.supabase) {
            this.showNotification('error', 'Database non disponibile');
            return [];
        }

        try {
            const { data, error } = await this.supabase
                .from('products')
                .select('*')
                .eq('organization_id', this.organizationId)
                .order('name');
                
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('Error loading products:', error);
            return [];
        }
    }
    
    calculateProductTotals(products) {
        return products.reduce((totals, product) => {
            totals.quantity += (product.quantity || 1);
            totals.value += ((product.quantity || 1) * (product.unit_price || 0));
            return totals;
        }, { quantity: 0, value: 0 });
    }
    
    async reloadTable() {
        // Prova diversi metodi per ricaricare
        if (window.loadRealShipments) {
            await window.loadRealShipments();
        } else if (window.refreshShipmentsTable) {
            await window.refreshShipmentsTable();
        } else {
            // Fallback: ricarica pagina
            location.reload();
        }
    }
    
    showNotification(type, message) {
        if (window.NotificationSystem) {
            window.NotificationSystem[type](message);
        } else {
            // Fallback
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };
            console.log(`${icons[type]} ${message}`);
            alert(message);
        }
    }
    
    openProductsPage() {
        window.location.href = '/products.html';
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // ===== SYSTEM TEST =====
    
    runSystemTest() {
        console.log('🧪 Running system test...');
        
        const tests = {
            dataManager: !!this.dataManager,
            supabase: !!this.supabase,
            modalSystem: !!window.ModalSystem,
            organizationId: !!this.organizationId,
            buttons: document.querySelectorAll('[data-product-button]').length
        };
        
        console.log('System test results:', tests);
        
        const allPassed = Object.values(tests).every(v => v);
        if (allPassed) {
            console.log('✅ All system tests passed');
        } else {
            console.warn('⚠️ Some tests failed:', tests);
        }
        
        return tests;
    }
}

// ===== INIZIALIZZAZIONE =====

// Crea istanza globale
window.productLinking = new ProductLinkingSystem();

// Auto-inizializza quando DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.productLinking.init().catch(() => {
            window.NotificationSystem?.show('error',
                'Impossibile inizializzare Product Linking System: dipendenze mancanti');
        });
    });
} else {
    // DOM già caricato
    window.productLinking.init().catch(() => {
        window.NotificationSystem?.show('error',
            'Impossibile inizializzare Product Linking System: dipendenze mancanti');
    });
}

// ===== API GLOBALI =====

// Funzioni helper per compatibilità
window.linkProductsToShipment = async (shipmentId) => {
    await window.productLinking.showLinkProductsModal(shipmentId);
};

window.manageShipmentProducts = async (shipmentId) => {
    await window.productLinking.showManageProductsModal(shipmentId);
};

window.viewShipmentProducts = async (shipmentId) => {
    await window.productLinking.showViewProductsModal(shipmentId);
};

// ===== AUTO-LINK UTILITY =====

window.autoLinkProducts = async () => {
    console.log('🤖 Starting auto-link process...');
    
    try {
        const { data: emptyShipments } = await window.productLinking.supabase
            .from('shipments')
            .select('id, tracking_number')
            .eq('organization_id', window.productLinking.organizationId)
            .is('products', null)
            .limit(10);
            
        if (!emptyShipments || emptyShipments.length === 0) {
            window.productLinking.showNotification('info', 
                'Tutte le spedizioni hanno già prodotti collegati!'
            );
            return;
        }
        
        const products = await window.productLinking.loadAvailableProducts();
        if (products.length === 0) {
            window.productLinking.showNotification('error', 
                'Nessun prodotto disponibile per il collegamento automatico'
            );
            return;
        }
        
        let linked = 0;
        
        for (const shipment of emptyShipments) {
            // Seleziona 1-3 prodotti random
            const numProducts = Math.floor(Math.random() * 3) + 1;
            const selectedProducts = [];
            
            for (let i = 0; i < numProducts && i < products.length; i++) {
                const randomProduct = products[Math.floor(Math.random() * products.length)];
                if (!selectedProducts.find(p => p.product_id === randomProduct.id)) {
                    selectedProducts.push({
                        product_id: randomProduct.id,
                        product_name: randomProduct.name,
                        quantity: Math.floor(Math.random() * 5) + 1,
                        unit_price: randomProduct.unit_price || 100
                    });
                }
            }
            
            await window.productLinking.supabase
                .from('shipments')
                .update({ products: selectedProducts })
                .eq('id', shipment.id);
                
            linked++;
        }
        
        window.productLinking.showNotification('success', 
            `Auto-link completato: ${linked} spedizioni aggiornate!`
        );
        
        await window.productLinking.reloadTable();
        
    } catch (error) {
        console.error('Auto-link error:', error);
        window.productLinking.showNotification('error', 
            'Errore durante auto-link: ' + error.message
        );
    }
};

// ===== DEBUG =====

window.debugProductLinking = () => {
    const system = window.productLinking;
    
    console.log('🔍 Product Linking System Debug:');
    console.log('- Version:', system.version);
    console.log('- Initialized:', system.initialized);
    console.log('- Organization:', system.organizationId);
    console.log('- Product buttons:', document.querySelectorAll('[data-product-button]').length);
    console.log('- All buttons:', document.querySelectorAll('button').length);
    
    return system.runSystemTest();
};

// ===== CSS STYLES =====

const styles = `
<style>
.product-select-item, .linked-product-item {
    padding: 12px;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    margin-bottom: 8px;
    transition: all 0.2s;
}

.product-select-item:hover {
    background-color: #f8f9fa;
    border-color: #007bff;
}

.linked-product-item:hover {
    background-color: #fff3cd;
}

.shipment-info-card {
    background: #f8f9fa;
    padding: 16px;
    border-radius: 8px;
    border-left: 4px solid #007bff;
}

.quantity-control {
    display: flex;
    align-items: center;
    gap: 8px;
}

.products-container {
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 8px;
}

.selection-summary {
    background: #e8f4fd;
    border: 1px solid #bee5eb;
}
</style>
`;

// Aggiungi stili se non esistono
if (!document.getElementById('product-linking-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'product-linking-styles';
    styleEl.innerHTML = styles;
    document.head.appendChild(styleEl);
}

console.log('✅ Product Linking System v2.0 loaded successfully!');
console.log('💡 Use window.debugProductLinking() for debug info');
console.log('🤖 Use window.autoLinkProducts() for auto-linking');

// ===== TRACKING SHIPMENTS =====

// (Method createShipmentFromTracking should be implemented inside ProductLinkingSystem class if needed)
// Remove or move this method inside the class definition to avoid syntax errors.