// shipment-details.js - Enhanced Modal System with Documents Integration
// Path: /pages/shipments/shipments-details.js

// Protection Against Script Duplication
if (window.ShipmentDetails) {
    console.log('⚠️ ShipmentDetails already loaded, skipping...');
} else {
    class ShipmentDetails {
        constructor() {
            this.currentShipment = null;
            this.activeTab = 'general';
            this.documentsManager = null;
            
            this.init();
        }
        
        async init() {
            console.log('🔍 Initializing Shipment Details Modal...');
            
            // Wait for documents manager
            if (window.documentsManager) {
                this.documentsManager = window.documentsManager;
            } else {
                window.addEventListener('DOMContentLoaded', () => {
                    this.documentsManager = window.documentsManager;
                });
            }
            
            console.log('✅ Shipment Details initialized');
        }
        
        // MAIN METHODS
        async show(shipmentId) {
            const shipment = this.getShipment(shipmentId);
            if (!shipment) {
                window.NotificationSystem?.show('Errore', 'Spedizione non trovata', 'error');
                return;
            }
            
            this.currentShipment = shipment;
            this.activeTab = 'general';
            
            // Create modal with enhanced content
            if (window.ModalSystem) {
                window.ModalSystem.show({
                    title: `Dettagli Spedizione - ${shipment.shipmentNumber}`,
                    content: this.getModalContent(shipment),
                    size: 'xl',
                    buttons: [
                        {
                            text: 'Modifica',
                            class: 'sol-btn-primary',
                            onclick: () => this.edit(shipmentId)
                        },
                        {
                            text: 'Chiudi',
                            class: 'sol-btn-glass',
                            onclick: () => window.ModalSystem.close()
                        }
                    ]
                });
                
                // Setup tab navigation after modal is created
                setTimeout(() => this.setupTabNavigation(), 100);
                
                // Load documents count
                this.updateDocumentsCount();
            }
        }
        
        async edit(shipmentId) {
            const shipment = this.getShipment(shipmentId);
            if (!shipment) return;
            
            this.currentShipment = shipment;
            
            if (window.ModalSystem) {
                window.ModalSystem.show({
                    title: `Modifica Spedizione - ${shipment.shipmentNumber}`,
                    content: this.getEditModalContent(shipment),
                    size: 'xl',
                    buttons: [
                        {
                            text: 'Annulla',
                            class: 'sol-btn-glass',
                            onclick: () => window.ModalSystem.close()
                        },
                        {
                            text: 'Salva Modifiche',
                            class: 'sol-btn-primary',
                            onclick: () => this.saveChanges()
                        }
                    ]
                });
            }
        }
        
        async create() {
            this.currentShipment = null;
            this.activeTab = 'general';
            
            if (window.ModalSystem) {
                window.ModalSystem.show({
                    title: 'Nuova Spedizione',
                    content: this.getCreateModalContent(),
                    size: 'xl',
                    buttons: [
                        {
                            text: 'Annulla',
                            class: 'sol-btn-glass',
                            onclick: () => window.ModalSystem.close()
                        },
                        {
                            text: 'Crea Spedizione',
                            class: 'sol-btn-primary',
                            onclick: () => this.createShipment()
                        }
                    ]
                });
            }
        }
        
        // MODAL CONTENT GENERATION
        getModalContent(shipment) {
            return `
                <div class="shipment-details-modal">
                    ${this.getModalHeader(shipment)}
                    ${this.getTabNavigation()}
                    <div class="tab-content-container">
                        ${this.getGeneralTabContent(shipment)}
                        ${this.getProductsTabContent(shipment)}
                        ${this.getCostsTabContent(shipment)}
                        ${this.getDocumentsTabContent(shipment)}
                        ${this.getTimelineTabContent(shipment)}
                    </div>
                </div>
            `;
        }
        
        getModalHeader(shipment) {
            return `
                <div class="shipment-modal-header">
                    <div class="shipment-info">
                        <h3 class="shipment-number">${shipment.shipmentNumber}</h3>
                        <span class="sol-badge status-${shipment.status}">
                            ${this.getStatusLabel(shipment.status)}
                        </span>
                    </div>
                    <div class="shipment-route">
                        <div class="route-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${shipment.route?.origin?.name || 'N/A'}</span>
                        </div>
                        <div class="route-arrow">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                        <div class="route-item">
                            <i class="fas fa-flag-checkered"></i>
                            <span>${shipment.route?.destination?.name || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        getTabNavigation() {
            const documentsCount = this.documentsManager ? 
                this.documentsManager.getShipmentDocuments(this.currentShipment?.id || '').length : 0;
            
            return `
                <div class="details-tabs">
                    <button class="tab-btn active" data-tab="general">
                        <i class="fas fa-info-circle"></i>
                        <span>Generale</span>
                    </button>
                    <button class="tab-btn" data-tab="products">
                        <i class="fas fa-cubes"></i>
                        <span>Prodotti</span>
                        ${(this.currentShipment?.products?.length || 0) > 0 ? 
                            `<span class="tab-badge">${this.currentShipment.products.length}</span>` : ''}
                    </button>
                    <button class="tab-btn" data-tab="costs">
                        <i class="fas fa-euro-sign"></i>
                        <span>Costi</span>
                    </button>
                    <button class="tab-btn" data-tab="documents">
                        <i class="fas fa-folder"></i>
                        <span>Documenti</span>
                        ${documentsCount > 0 ? 
                            `<span class="tab-badge documents-count">${documentsCount}</span>` : ''}
                    </button>
                    <button class="tab-btn" data-tab="timeline">
                        <i class="fas fa-history"></i>
                        <span>Timeline</span>
                    </button>
                </div>
            `;
        }
        
        // TAB CONTENT METHODS
        getGeneralTabContent(shipment) {
            return `
                <div class="tab-content active" data-tab="general">
                    <div class="general-info-grid">
                        <div class="info-section">
                            <h4><i class="fas fa-ship"></i> Informazioni Spedizione</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Numero Spedizione</label>
                                    <span class="font-mono">${shipment.shipmentNumber}</span>
                                </div>
                                <div class="info-item">
                                    <label>Tipo</label>
                                    <span>${this.getShipmentTypeIcon(shipment.type)} ${shipment.type}</span>
                                </div>
                                <div class="info-item">
                                    <label>Stato</label>
                                    <span class="sol-badge status-${shipment.status}">
                                        ${this.getStatusLabel(shipment.status)}
                                    </span>
                                </div>
                                <div class="info-item">
                                    <label>Creata il</label>
                                    <span>${this.formatDate(shipment.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="info-section">
                            <h4><i class="fas fa-truck"></i> Vettore</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Nome</label>
                                    <span>${shipment.carrier?.name || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Codice</label>
                                    <span class="font-mono">${shipment.carrier?.code || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Servizio</label>
                                    <span>${shipment.carrier?.service || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="info-section">
                            <h4><i class="fas fa-route"></i> Rotta</h4>
                            <div class="route-details">
                                <div class="route-point">
                                    <div class="route-marker origin">
                                        <i class="fas fa-circle"></i>
                                    </div>
                                    <div class="route-info">
                                        <strong>${shipment.route?.origin?.name || 'N/A'}</strong>
                                        <small>${shipment.route?.origin?.port || ''}</small>
                                    </div>
                                </div>
                                
                                ${shipment.route?.via && shipment.route.via.length > 0 ? `
                                    <div class="route-via">
                                        <div class="via-line"></div>
                                        <div class="via-points">
                                            ${shipment.route.via.map(via => `
                                                <span class="via-point">${via}</span>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <div class="route-point">
                                    <div class="route-marker destination">
                                        <i class="fas fa-flag-checkered"></i>
                                    </div>
                                    <div class="route-info">
                                        <strong>${shipment.route?.destination?.name || 'N/A'}</strong>
                                        <small>${shipment.route?.destination?.port || ''}</small>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="route-metrics">
                                <div class="metric">
                                    <i class="fas fa-clock"></i>
                                    <span>Transito Stimato: ${shipment.route?.estimatedTransit || 0} giorni</span>
                                </div>
                                <div class="metric">
                                    <i class="fas fa-route"></i>
                                    <span>Distanza: ${shipment.route?.distance || 0} km</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="info-section">
                            <h4><i class="fas fa-calendar"></i> Programmazione</h4>
                            <div class="schedule-grid">
                                <div class="schedule-item">
                                    <label>ETD (Partenza Stimata)</label>
                                    <span>${this.formatDate(shipment.schedule?.etd)}</span>
                                </div>
                                <div class="schedule-item">
                                    <label>ETA (Arrivo Stimato)</label>
                                    <span>${this.formatDate(shipment.schedule?.eta)}</span>
                                </div>
                                <div class="schedule-item">
                                    <label>ATD (Partenza Effettiva)</label>
                                    <span>${this.formatDate(shipment.schedule?.atd) || 'Non disponibile'}</span>
                                </div>
                                <div class="schedule-item">
                                    <label>ATA (Arrivo Effettivo)</label>
                                    <span>${this.formatDate(shipment.schedule?.ata) || 'Non disponibile'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        getProductsTabContent(shipment) {
            const products = shipment.products || [];
            
            return `
                <div class="tab-content" data-tab="products">
                    <div class="products-section">
                        <div class="section-header">
                            <h4><i class="fas fa-cubes"></i> Prodotti Collegati (${products.length})</h4>
                            <div class="section-actions">
                                <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="window.registryCore.linkProducts('${shipment.id}')">
                                    <i class="fas fa-link"></i> Collega Prodotti
                                </button>
                                ${products.length > 0 ? `
                                    <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="window.shipmentDetails.allocateCosts()">
                                        <i class="fas fa-calculator"></i> Alloca Costi
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        
                        ${products.length === 0 ? `
                            <div class="empty-products">
                                <i class="fas fa-cubes" style="font-size: 3rem; color: var(--sol-gray-400); margin-bottom: 1rem;"></i>
                                <h5>Nessun prodotto collegato</h5>
                                <p>Collega i prodotti a questa spedizione per abilitare l'allocazione dei costi e l'analisi per SKU.</p>
                                <button class="sol-btn sol-btn-primary" onclick="window.registryCore.linkProducts('${shipment.id}')">
                                    <i class="fas fa-link"></i> Collega Prodotti
                                </button>
                            </div>
                        ` : `
                            <div class="products-list">
                                ${products.map(product => this.getProductCard(product)).join('')}
                            </div>
                            
                            <div class="products-summary">
                                <h5>Riepilogo</h5>
                                <div class="summary-grid">
                                    <div class="summary-item">
                                        <label>Totale Prodotti</label>
                                        <span>${products.length}</span>
                                    </div>
                                    <div class="summary-item">
                                        <label>Quantità Totale</label>
                                        <span>${products.reduce((sum, p) => sum + (p.quantity || 0), 0)}</span>
                                    </div>
                                    <div class="summary-item">
                                        <label>Peso Totale</label>
                                        <span>${products.reduce((sum, p) => sum + ((p.weight || 0) * (p.quantity || 0)), 0).toFixed(2)} kg</span>
                                    </div>
                                    <div class="summary-item">
                                        <label>Volume Totale</label>
                                        <span>${products.reduce((sum, p) => sum + ((p.volume || 0) * (p.quantity || 0)), 0).toFixed(3)} m³</span>
                                    </div>
                                </div>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }
        
        getCostsTabContent(shipment) {
            const costs = shipment.costs || {};
            
            return `
                <div class="tab-content" data-tab="costs">
                    <div class="costs-section">
                        <div class="section-header">
                            <h4><i class="fas fa-euro-sign"></i> Struttura Costi</h4>
                            <div class="section-actions">
                                <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="window.shipmentDetails.editCosts()">
                                    <i class="fas fa-edit"></i> Modifica Costi
                                </button>
                            </div>
                        </div>
                        
                        <div class="costs-breakdown">
                            <div class="cost-categories">
                                <div class="cost-item">
                                    <label>Ocean Freight</label>
                                    <span class="cost-value">€${(costs.oceanFreight || 0).toLocaleString('it-IT')}</span>
                                </div>
                                <div class="cost-item">
                                    <label>Bunker Surcharge (BAF)</label>
                                    <span class="cost-value">€${(costs.bunkerSurcharge || 0).toLocaleString('it-IT')}</span>
                                </div>
                                <div class="cost-item">
                                    <label>Spese Portuali</label>
                                    <span class="cost-value">€${(costs.portCharges || 0).toLocaleString('it-IT')}</span>
                                </div>
                                <div class="cost-item">
                                    <label>Doganali</label>
                                    <span class="cost-value">€${(costs.customs || 0).toLocaleString('it-IT')}</span>
                                </div>
                                <div class="cost-item">
                                    <label>Assicurazione</label>
                                    <span class="cost-value">€${(costs.insurance || 0).toLocaleString('it-IT')}</span>
                                </div>
                                <div class="cost-item total">
                                    <label><strong>Totale</strong></label>
                                    <span class="cost-value total">
                                        <strong>€${(costs.total || 0).toLocaleString('it-IT')}</strong>
                                    </span>
                                </div>
                            </div>
                            
                            ${shipment.products && shipment.products.length > 0 ? `
                                <div class="cost-allocation">
                                    <h5>Allocazione Costi per Prodotto</h5>
                                    <div class="allocation-method">
                                        <label>Metodo di Allocazione:</label>
                                        <span class="method-badge">${costs.allocation || 'weight'}</span>
                                    </div>
                                    
                                    <div class="products-costs">
                                        ${shipment.products.map(product => {
                                            const unitCost = costs.costPerUnit?.[product.sku] || 0;
                                            const totalCost = unitCost * (product.quantity || 0);
                                            
                                            return `
                                                <div class="product-cost-item">
                                                    <div class="product-info">
                                                        <strong>${product.productName || product.sku}</strong>
                                                        <small>Qty: ${product.quantity || 0}</small>
                                                    </div>
                                                    <div class="cost-breakdown">
                                                        <div class="unit-cost">€${unitCost.toFixed(2)}/unità</div>
                                                        <div class="total-cost">€${totalCost.toFixed(2)} tot.</div>
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
        
        // NEW: DOCUMENTS TAB CONTENT
        getDocumentsTabContent(shipment) {
            const shipmentId = shipment.id;
            
            return `
                <div class="tab-content" data-tab="documents">
                    <div class="documents-section">
                        <div class="section-header">
                            <h4><i class="fas fa-folder"></i> Documenti Spedizione</h4>
                            <div class="section-actions">
                                <button class="sol-btn sol-btn-primary" onclick="window.shipmentDetails.uploadDocuments('${shipmentId}')">
                                    <i class="fas fa-upload"></i> Carica Documenti
                                </button>
                                <button class="sol-btn sol-btn-glass" onclick="window.shipmentDetails.viewAllDocuments('${shipmentId}')">
                                    <i class="fas fa-eye"></i> Visualizza Tutti
                                </button>
                            </div>
                        </div>
                        
                        <div id="documentsContainer-${shipmentId}" class="documents-container">
                            ${this.getDocumentsContent(shipmentId)}
                        </div>
                    </div>
                </div>
            `;
        }
        
        getDocumentsContent(shipmentId) {
            if (!this.documentsManager) {
                return `
                    <div class="documents-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Caricamento documenti...</p>
                    </div>
                `;
            }
            
            const documents = this.documentsManager.getShipmentDocuments(shipmentId);
            
            if (documents.length === 0) {
                return `
                    <div class="empty-documents">
                        <i class="fas fa-folder-open" style="font-size: 3rem; color: var(--sol-gray-400); margin-bottom: 1rem;"></i>
                        <h5>Nessun documento caricato</h5>
                        <p>Carica i documenti per questa spedizione (Bill of Lading, Invoice, Packing List, etc.)</p>
                        <button class="sol-btn sol-btn-primary" onclick="window.shipmentDetails.uploadDocuments('${shipmentId}')">
                            <i class="fas fa-upload"></i> Carica Primo Documento
                        </button>
                    </div>
                `;
            }
            
            // Group documents by category
            const grouped = {};
            documents.forEach(doc => {
                if (!grouped[doc.category]) {
                    grouped[doc.category] = [];
                }
                grouped[doc.category].push(doc);
            });
            
            return `
                <div class="documents-list">
                    ${Object.entries(grouped).map(([category, docs]) => `
                        <div class="document-category">
                            <h6 class="category-title">
                                <i class="fas ${this.documentsManager.getCategoryIcon(category)}"></i>
                                ${this.documentsManager.getCategoryName(category)}
                                <span class="category-count">${docs.length}</span>
                            </h6>
                            <div class="category-documents">
                                ${docs.slice(0, 3).map(doc => this.getDocumentPreviewCard(doc)).join('')}
                                ${docs.length > 3 ? `
                                    <div class="more-documents">
                                        <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="window.shipmentDetails.viewCategoryDocuments('${shipmentId}', '${category}')">
                                            <i class="fas fa-ellipsis-h"></i> +${docs.length - 3} altri
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                    
                    <div class="documents-stats">
                        <div class="stat">
                            <i class="fas fa-file"></i>
                            <span>${documents.length} documenti totali</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-hdd"></i>
                            <span>${this.getTotalDocumentsSize(documents)}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        getDocumentPreviewCard(doc) {
            return `
                <div class="document-preview-card">
                    <div class="doc-icon">
                        <i class="fas ${this.documentsManager.getFileIcon(doc.fileType)}"></i>
                    </div>
                    <div class="doc-info">
                        <div class="doc-name" title="${doc.fileName}">${doc.fileName}</div>
                        <div class="doc-meta">
                            ${this.documentsManager.formatFileSize(doc.fileSize)} • 
                            ${new Date(doc.uploadedAt).toLocaleDateString('it-IT')}
                        </div>
                    </div>
                    <div class="doc-actions">
                        <button class="sol-btn sol-btn-sm sol-btn-glass" 
                                onclick="window.documentsManager.previewDocument('${doc.id}')"
                                title="Anteprima">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="sol-btn sol-btn-sm sol-btn-glass" 
                                onclick="window.documentsManager.downloadDocument('${doc.id}')"
                                title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        getTimelineTabContent(shipment) {
            return `
                <div class="tab-content" data-tab="timeline">
                    <div class="timeline-section">
                        <div class="section-header">
                            <h4><i class="fas fa-history"></i> Timeline Eventi</h4>
                        </div>
                        
                        <div class="shipment-timeline">
                            ${this.getShipmentTimeline(shipment)}
                        </div>
                    </div>
                </div>
            `;
        }
        
        // DOCUMENTS INTEGRATION METHODS
        uploadDocuments(shipmentId) {
            if (this.documentsManager) {
                // Close current modal and open documents upload
                window.ModalSystem.close();
                this.documentsManager.showUploadModal(shipmentId);
            } else {
                window.NotificationSystem?.show('Errore', 'Sistema documenti non disponibile', 'error');
            }
        }
        
        viewAllDocuments(shipmentId) {
            if (this.documentsManager) {
                this.documentsManager.showDocumentsList(shipmentId);
            }
        }
        
        viewCategoryDocuments(shipmentId, category) {
            if (this.documentsManager) {
                const documents = this.documentsManager.getShipmentDocuments(shipmentId)
                    .filter(doc => doc.category === category);
                
                // Show filtered documents in modal
                window.ModalSystem?.show({
                    title: `${this.documentsManager.getCategoryName(category)} - ${documents.length} documenti`,
                    content: `
                        <div class="documents-grid">
                            ${documents.map(doc => this.documentsManager.getDocumentCard(doc)).join('')}
                        </div>
                    `,
                    size: 'xl'
                });
            }
        }
        
        updateDocumentsCount() {
            if (this.documentsManager && this.currentShipment) {
                const count = this.documentsManager.getShipmentDocuments(this.currentShipment.id).length;
                const badge = document.querySelector('.tab-btn[data-tab="documents"] .documents-count');
                const tabBtn = document.querySelector('.tab-btn[data-tab="documents"]');
                
                if (badge) {
                    if (count > 0) {
                        badge.textContent = count;
                        badge.style.display = 'inline';
                    } else {
                        badge.style.display = 'none';
                    }
                } else if (count > 0 && tabBtn) {
                    // Add badge if it doesn't exist
                    const newBadge = document.createElement('span');
                    newBadge.className = 'tab-badge documents-count';
                    newBadge.textContent = count;
                    tabBtn.appendChild(newBadge);
                }
            }
        }
        
        // TAB NAVIGATION
        setupTabNavigation() {
            const tabBtns = document.querySelectorAll('.tab-btn');
            const tabContents = document.querySelectorAll('.tab-content');
            
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetTab = btn.dataset.tab;
                    
                    // Update active tab button
                    tabBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // Update active tab content
                    tabContents.forEach(content => {
                        content.classList.remove('active');
                        if (content.dataset.tab === targetTab) {
                            content.classList.add('active');
                            
                            // Lazy load documents content when tab is activated
                            if (targetTab === 'documents' && this.currentShipment) {
                                this.refreshDocumentsTab();
                            }
                        }
                    });
                    
                    this.activeTab = targetTab;
                });
            });
            
            // Listen for documents updates
            window.addEventListener('documentsUpdated', (e) => {
                if (e.detail.document.shipmentId === this.currentShipment?.id) {
                    this.updateDocumentsCount();
                    if (this.activeTab === 'documents') {
                        this.refreshDocumentsTab();
                    }
                }
            });
        }
        
        refreshDocumentsTab() {
            if (!this.currentShipment) return;
            
            const container = document.getElementById(`documentsContainer-${this.currentShipment.id}`);
            if (container) {
                container.innerHTML = this.getDocumentsContent(this.currentShipment.id);
            }
        }
        
        // UTILITY METHODS
        getShipment(shipmentId) {
            if (window.shipmentsRegistry) {
                return window.shipmentsRegistry.shipments.find(s => s.id === shipmentId);
            }
            return null;
        }
        
        getStatusLabel(status) {
            const labels = {
                planned: 'Pianificata',
                departed: 'Partita', 
                in_transit: 'In Transito',
                arrived: 'Arrivata',
                delivered: 'Consegnata'
            };
            return labels[status] || status;
        }
        
        getShipmentTypeIcon(type) {
            const icons = {
                container: '<i class="fas fa-cube"></i>',
                awb: '<i class="fas fa-plane"></i>',
                bl: '<i class="fas fa-ship"></i>',
                lcl: '<i class="fas fa-boxes"></i>'
            };
            return icons[type] || '<i class="fas fa-box"></i>';
        }
        
        formatDate(date) {
            if (!date) return 'N/A';
            return new Date(date).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
            });
        }
        
        getProductCard(product) {
            const unitCost = this.currentShipment?.costs?.costPerUnit?.[product.sku] || 0;
            const totalCost = unitCost * (product.quantity || 0);
            
            return `
                <div class="product-card">
                    <div class="product-header">
                        <h5>${product.productName || product.sku}</h5>
                        <span class="product-sku">${product.sku}</span>
                    </div>
                    <div class="product-details">
                        <div class="detail-row">
                            <span>Quantità:</span>
                            <strong>${product.quantity || 0}</strong>
                        </div>
                        <div class="detail-row">
                            <span>Peso unitario:</span>
                            <span>${product.weight || 0} kg</span>
                        </div>
                        <div class="detail-row">
                            <span>Volume unitario:</span>
                            <span>${product.volume || 0} m³</span>
                        </div>
                        ${unitCost > 0 ? `
                            <div class="detail-row cost">
                                <span>Costo unitario:</span>
                                <strong>€${unitCost.toFixed(2)}</strong>
                            </div>
                            <div class="detail-row total-cost">
                                <span>Costo totale:</span>
                                <strong>€${totalCost.toFixed(2)}</strong>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        getTotalDocumentsSize(documents) {
            const totalBytes = documents.reduce((sum, doc) => sum + doc.fileSize, 0);
            return this.documentsManager ? this.documentsManager.formatFileSize(totalBytes) : '0 Bytes';
        }
        
        getShipmentTimeline(shipment) {
            const events = [
                { date: shipment.createdAt, event: 'Spedizione creata', icon: 'fa-plus-circle', status: 'completed' },
                { date: shipment.schedule?.etd, event: 'Partenza programmata', icon: 'fa-ship', status: 'planned' },
                { date: shipment.schedule?.atd, event: 'Partenza effettiva', icon: 'fa-ship', status: shipment.schedule?.atd ? 'completed' : 'pending' },
                { date: shipment.schedule?.eta, event: 'Arrivo programmato', icon: 'fa-flag-checkered', status: 'planned' },
                { date: shipment.schedule?.ata, event: 'Arrivo effettivo', icon: 'fa-flag-checkered', status: shipment.schedule?.ata ? 'completed' : 'pending' }
            ].filter(event => event.date);
            
            return events.map(event => `
                <div class="timeline-event ${event.status}">
                    <div class="timeline-marker">
                        <i class="fas ${event.icon}"></i>
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-title">${event.event}</div>
                        <div class="timeline-date">${this.formatDate(event.date)}</div>
                    </div>
                </div>
            `).join('');
        }
        
        // ACTION METHODS
        async saveChanges() {
            // Implementation for saving shipment changes
            console.log('Saving changes...');
            window.NotificationSystem?.show('Successo', 'Modifiche salvate', 'success');
            window.ModalSystem.close();
        }
        
        async createShipment() {
            try {
                const orgId = window.getActiveOrganizationId?.();
                if (!orgId) {
                    throw new Error("Organization ID non trovato! L'utente non ha selezionato alcuna organizzazione.");
                }
                const shipmentData = {
                    organization_id: orgId
                };

                console.log('Creating shipment with payload:', shipmentData, 'Org ID:', orgId);

                if (window.shipmentsRegistry?.createShipment) {
                    const shipment = await window.shipmentsRegistry.createShipment(shipmentData);

                    if (shipment === null) {
                        window.NotificationSystem?.warning('Spedizione già presente');
                        return null;
                    }

                    window.NotificationSystem?.show('Successo', 'Spedizione creata', 'success');
                    window.ModalSystem.close();
                    return shipment;
                }

                throw new Error('Shipments registry not available');
            } catch (error) {
                console.error('Errore creazione spedizione:', error);
                window.NotificationSystem?.show('Errore', 'Creazione spedizione fallita', 'error');
            }
        }
        
        async allocateCosts() {
            console.log('Allocating costs...');
            window.NotificationSystem?.show('Info', 'Allocazione costi in sviluppo', 'info');
        }
        
        async editCosts() {
            console.log('Editing costs...');
            window.NotificationSystem?.show('Info', 'Modifica costi in sviluppo', 'info');
        }
        
        // EDIT AND CREATE MODAL CONTENT (placeholder methods)
        getEditModalContent(shipment) {
            return `
                <div class="edit-shipment-form">
                    <p>Form di modifica spedizione in sviluppo...</p>
                    <div class="form-preview">
                        <strong>Numero:</strong> ${shipment.shipmentNumber}<br>
                        <strong>Tipo:</strong> ${shipment.type}<br>
                        <strong>Stato:</strong> ${shipment.status}
                    </div>
                </div>
            `;
        }
        
        getCreateModalContent() {
            return `
                <div class="create-shipment-form">
                    <p>Form di creazione spedizione in sviluppo...</p>
                </div>
            `;
        }
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        window.shipmentDetails = new ShipmentDetails();
    });

    // Export
    window.ShipmentDetails = ShipmentDetails;

    console.log('[ShipmentDetails] Enhanced module with Documents Integration loaded');
}