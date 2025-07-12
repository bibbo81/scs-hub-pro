// Fix corretto per i filtri nella sezione "Prodotti Collegati per Spedizione"
// Questo codice va eseguito DOPO che il sistema V20.1 è caricato

console.log('🎯 Loading Enhanced Products Link Filters Fix...');

// ===== ENHANCED PRODUCTS LINK FILTERS FIX =====

// Funzione per migliorare populateLinkedProductsGrid con supporto filtri
function enhancedPopulateLinkedProductsGrid() {
    const container = document.getElementById('linkedProductsGrid');
    if (!container) {
        console.warn('⚠️ linkedProductsGrid container not found');
        return;
    }
    
    const shipmentsRegistry = this.shipmentsRegistry || window.shipmentsRegistry;
    if (!shipmentsRegistry?.shipments) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 2rem;">Nessuna spedizione disponibile</p>';
        return;
    }
    
    // Get filter values
    const filterSelect = document.getElementById('linkedProductsFilter');
    const searchInput = document.getElementById('linkedProductsSearch');
    const filterValue = filterSelect?.value || 'all';
    const searchTerm = searchInput?.value.toLowerCase().trim() || '';
    
    console.log(`🔍 Applying filters: ${filterValue}, search: "${searchTerm}"`);
    
    // Apply filters
    let shipments = shipmentsRegistry.shipments;
    
    // Filter by status
    switch (filterValue) {
        case 'with-products':
            shipments = shipments.filter(s => s.products && s.products.length > 0);
            break;
        case 'without-products':
            shipments = shipments.filter(s => !s.products || s.products.length === 0);
            break;
        case 'all':
        default:
            // Show all shipments
            break;
    }
    
    // Apply search filter
    if (searchTerm) {
        shipments = shipments.filter(s => {
            // Search in shipment number
            if (s.shipment_number.toLowerCase().includes(searchTerm)) return true;
            
            // Search in route
            if (s.route?.origin?.name?.toLowerCase().includes(searchTerm)) return true;
            if (s.route?.destination?.name?.toLowerCase().includes(searchTerm)) return true;
            
            // Search in products
            if (s.products && s.products.length > 0) {
                return s.products.some(p => 
                    p.productName?.toLowerCase().includes(searchTerm) ||
                    p.sku?.toLowerCase().includes(searchTerm)
                );
            }
            
            return false;
        });
    }
    
    // Filter to show only shipments with products for the main grid
    const shipmentsWithProducts = shipments.filter(s => s.products && s.products.length > 0);
    
    console.log(`📊 Filtered results: ${shipmentsWithProducts.length} shipments with products`);
    
    if (shipmentsWithProducts.length === 0) {
        let emptyMessage = 'Nessun collegamento prodotto-spedizione presente';
        
        if (searchTerm) {
            emptyMessage = `Nessun risultato trovato per "${searchTerm}"`;
        } else if (filterValue === 'with-products') {
            emptyMessage = 'Nessuna spedizione con prodotti collegati';
        }
        
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #6c757d;">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; display: block; opacity: 0.3;"></i>
                <p style="margin: 0; font-size: 18px;">${emptyMessage}</p>
                <p style="margin: 8px 0 0; font-size: 14px;">
                    ${searchTerm || filterValue !== 'all' ? 
                        'Prova a modificare i filtri o la ricerca' : 
                        'Usa il bottone "Collega Prodotti" per iniziare'
                    }
                </p>
                ${searchTerm || filterValue !== 'all' ? `
                    <button class="sol-btn sol-btn-glass" 
                            onclick="resetLinkedProductsFiltersGlobal()"
                            style="margin-top: 1rem;">
                        <i class="fas fa-undo"></i> Reset Filtri
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }
    
    container.innerHTML = shipmentsWithProducts.map(shipment => {
        const totalQuantity = shipment.products.reduce((sum, p) => sum + (p.quantity || 1), 0);
        const totalWeight = shipment.products.reduce((sum, p) => sum + (p.weight || 0), 0);
        const totalValue = shipment.products.reduce((sum, p) => sum + (p.value || 0), 0);
        
        // Highlight search terms
        let shipment_numberDisplay = shipment.shipment_number;
        if (searchTerm && shipment.shipment_number.toLowerCase().includes(searchTerm)) {
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            shipment_numberDisplay = shipment.shipment_number.replace(regex, '<mark>$1</mark>');
        }
        
        return `
            <div class="shipment-products-card" style="animation: fadeInCard 0.3s ease-out;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="margin: 0; color: #1d1d1f; font-size: 16px;">
                        <i class="fas fa-ship" style="color: #007bff; margin-right: 8px;"></i>
                        ${shipment_numberDisplay}
                        ${searchTerm ? '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">MATCH</span>' : ''}
                    </h4>
                    <button class="sol-btn sol-btn-sm sol-btn-glass" 
                            onclick="window.productLinkingV20Final?.handleManageProducts('${shipment.id}')"
                            title="Gestisci prodotti collegati">
                        <i class="fas fa-cogs"></i>
                    </button>
                </div>
                
                <div style="font-size: 12px; color: #6c757d; margin-bottom: 16px;">
                    ${shipment.route?.origin?.name || 'N/A'} → ${shipment.route?.destination?.name || 'N/A'}
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; font-size: 12px;">
                    <div style="text-align: center; background: #e8f4fd; padding: 8px; border-radius: 4px;">
                        <div style="font-weight: bold; color: #007bff;">${shipment.products.length}</div>
                        <div style="color: #6c757d;">Prodotti</div>
                    </div>
                    <div style="text-align: center; background: #e8f4fd; padding: 8px; border-radius: 4px;">
                        <div style="font-weight: bold; color: #007bff;">${totalQuantity}</div>
                        <div style="color: #6c757d;">Quantità</div>
                    </div>
                    <div style="text-align: center; background: #e8f4fd; padding: 8px; border-radius: 4px;">
                        <div style="font-weight: bold; color: #007bff;">${totalWeight.toFixed(1)}kg</div>
                        <div style="color: #6c757d;">Peso</div>
                    </div>
                </div>
                
                <div style="border-top: 1px solid #dee2e6; padding-top: 12px;">
                    ${shipment.products.map(product => {
                        let productNameDisplay = product.productName;
                        let skuDisplay = product.sku;
                        
                        if (searchTerm) {
                            const regex = new RegExp(`(${searchTerm})`, 'gi');
                            if (product.productName?.toLowerCase().includes(searchTerm)) {
                                productNameDisplay = product.productName.replace(regex, '<mark>$1</mark>');
                            }
                            if (product.sku?.toLowerCase().includes(searchTerm)) {
                                skuDisplay = product.sku.replace(regex, '<mark>$1</mark>');
                            }
                        }
                        
                        return `
                            <div class="product-list-item">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-weight: 500; font-size: 14px;">${productNameDisplay}</div>
                                        <div style="font-size: 11px; color: #6c757d; font-family: monospace;">${skuDisplay}</div>
                                    </div>
                                    <div style="text-align: right; font-size: 12px;">
                                        <div style="font-weight: bold;">${product.quantity}x</div>
                                        <div style="color: #6c757d;">${(product.weight || 0).toFixed(1)}kg</div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    console.log(`✅ Populated ${shipmentsWithProducts.length} shipments with linked products (filtered)`);
}

// Funzione per applicare i filtri
function enhancedApplyLinkedProductsFilters() {
    console.log('🔍 Applying linked products filters...');
    
    // Clear any existing timeout
    if (window.filterTimeout) {
        clearTimeout(window.filterTimeout);
    }
    
    // Debounce the filter application
    window.filterTimeout = setTimeout(() => {
        try {
            // Call the enhanced populate function
            if (window.productLinkingV20Final) {
                enhancedPopulateLinkedProductsGrid.call(window.productLinkingV20Final);
            } else {
                enhancedPopulateLinkedProductsGrid();
            }
            
            // Update filter indicators
            updateFilterIndicators();
            
        } catch (error) {
            console.error('❌ Error applying filters:', error);
        }
    }, 300);
}

// Funzione per reset dei filtri
function resetLinkedProductsFiltersGlobal() {
    console.log('🔄 Resetting linked products filters...');
    
    try {
        // Reset filter select
        const filterSelect = document.getElementById('linkedProductsFilter');
        if (filterSelect) {
            filterSelect.value = 'all';
            // Trigger visual feedback
            filterSelect.style.background = '#e8f5e8';
            setTimeout(() => {
                filterSelect.style.background = '';
            }, 500);
        }
        
        // Reset search input
        const searchInput = document.getElementById('linkedProductsSearch');
        if (searchInput) {
            searchInput.value = '';
            // Trigger visual feedback
            searchInput.style.background = '#e8f5e8';
            setTimeout(() => {
                searchInput.style.background = '';
            }, 500);
        }
        
        // Apply filters to refresh the view
        enhancedApplyLinkedProductsFilters();
        
        // Show success feedback
        if (window.NotificationSystem) {
            window.NotificationSystem.show('Reset', 'Filtri prodotti azzerati', 'success', 2000);
        }
        
        console.log('✅ Filters reset successfully');
        
    } catch (error) {
        console.error('❌ Error resetting filters:', error);
        if (window.NotificationSystem) {
            window.NotificationSystem.show('Errore', 'Errore nel reset dei filtri', 'error');
        }
    }
}

// Funzione per aggiornare gli indicatori filtri
function updateFilterIndicators() {
    try {
        const filterSelect = document.getElementById('linkedProductsFilter');
        const searchInput = document.getElementById('linkedProductsSearch');
        const resetBtn = document.getElementById('resetLinkedFiltersBtn');
        
        const hasActiveFilters = (
            (filterSelect?.value && filterSelect.value !== 'all') ||
            (searchInput?.value && searchInput.value.trim() !== '')
        );
        
        // Update reset button state
        if (resetBtn) {
            if (hasActiveFilters) {
                resetBtn.style.opacity = '1';
                resetBtn.style.transform = 'scale(1)';
                resetBtn.disabled = false;
                resetBtn.title = 'Reset filtri attivi';
            } else {
                resetBtn.style.opacity = '0.6';
                resetBtn.style.transform = 'scale(0.95)';
                resetBtn.disabled = false; // Keep enabled for user feedback
                resetBtn.title = 'Nessun filtro attivo';
            }
        }
        
        // Add visual indicators for active filters
        [filterSelect, searchInput].forEach(element => {
            if (element) {
                const hasValue = element.value && (element.value !== 'all' && element.value.trim() !== '');
                if (hasValue) {
                    element.style.borderColor = '#007bff';
                    element.style.boxShadow = '0 0 0 2px rgba(0, 123, 255, 0.25)';
                } else {
                    element.style.borderColor = '';
                    element.style.boxShadow = '';
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error updating filter indicators:', error);
    }
}

// Funzione per setup degli event listener
function setupEnhancedLinkedProductsFilters() {
    console.log('🎯 Setting up enhanced linked products filters...');
    
    const filterSelect = document.getElementById('linkedProductsFilter');
    const searchInput = document.getElementById('linkedProductsSearch');
    const resetBtn = document.getElementById('resetLinkedFiltersBtn');
    
    // Filter select listener
    if (filterSelect) {
        // Remove existing listeners
        filterSelect.removeEventListener('change', enhancedApplyLinkedProductsFilters);
        
        filterSelect.addEventListener('change', () => {
            console.log(`🔍 Filter changed: ${filterSelect.value}`);
            enhancedApplyLinkedProductsFilters();
        });
        console.log('✅ Filter select listener attached');
    } else {
        console.warn('⚠️ Filter select not found');
    }
    
    // Search input listener with debounce
    if (searchInput) {
        // Remove existing listeners
        searchInput.removeEventListener('input', enhancedApplyLinkedProductsFilters);
        
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            console.log(`🔍 Search input: "${e.target.value}"`);
            
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                enhancedApplyLinkedProductsFilters();
            }, 300);
        });
        
        // Clear search on Escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                enhancedApplyLinkedProductsFilters();
            }
        });
        console.log('✅ Search input listener attached');
    } else {
        console.warn('⚠️ Search input not found');
    }
    
    // Reset button listener - FIXED!
    if (resetBtn) {
        // Remove any existing listeners
        resetBtn.removeEventListener('click', resetLinkedProductsFiltersGlobal);
        
        // Add new listener
        resetBtn.addEventListener('click', () => {
            console.log('🔄 Reset button clicked');
            resetLinkedProductsFiltersGlobal();
        });
        
        // Add visual feedback on hover
        resetBtn.addEventListener('mouseenter', () => {
            resetBtn.style.transform = 'scale(1.05)';
        });
        
        resetBtn.addEventListener('mouseleave', () => {
            resetBtn.style.transform = '';
        });
        
        console.log('✅ Reset button listener attached');
    } else {
        console.warn('⚠️ Reset button not found');
    }
    
    // Initial filter indicators update
    setTimeout(() => {
        updateFilterIndicators();
    }, 500);
    
    console.log('✅ Enhanced linked products filters setup complete');
}

// ===== CSS ENHANCEMENTS =====
function injectEnhancedFilterStyles() {
    if (document.getElementById('enhanced-filter-styles')) {
        return; // Already injected
    }
    
    const style = document.createElement('style');
    style.id = 'enhanced-filter-styles';
    style.textContent = `
        /* Enhanced filter animations */
        @keyframes fadeInCard {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Search highlighting */
        mark {
            background: #fff3cd;
            color: #856404;
            padding: 1px 2px;
            border-radius: 2px;
            font-weight: 600;
        }

        /* Filter controls enhancements */
        #linkedProductsFilter:focus,
        #linkedProductsSearch:focus {
            outline: none;
            border-color: #007bff !important;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15) !important;
        }

        #resetLinkedFiltersBtn {
            transition: all 0.2s ease;
        }

        #resetLinkedFiltersBtn:hover {
            background: #f8f9fa !important;
            border-color: #007bff !important;
            color: #007bff !important;
        }

        #resetLinkedFiltersBtn:active {
            transform: scale(0.95) !important;
        }

        /* Empty state enhancements */
        .products-grid .sol-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        /* Filter status indicators */
        .filter-active {
            position: relative;
        }

        .filter-active::after {
            content: '';
            position: absolute;
            top: -2px;
            right: -2px;
            width: 8px;
            height: 8px;
            background: #007bff;
            border-radius: 50%;
            border: 2px solid white;
        }
    `;
    
    document.head.appendChild(style);
    console.log('✅ Enhanced filter styles injected');
}

// ===== GLOBAL FUNCTIONS =====

// Expose global functions for HTML onclick handlers
window.resetLinkedProductsFiltersGlobal = resetLinkedProductsFiltersGlobal;
window.enhancedApplyLinkedProductsFilters = enhancedApplyLinkedProductsFilters;

// ===== INITIALIZATION =====

function initializeEnhancedFilters() {
    console.log('🚀 Initializing enhanced filters...');
    
    // Inject styles
    injectEnhancedFilterStyles();
    
    // Wait for the product linking system to be ready
    const checkAndInit = () => {
        const hasProductLinking = window.productLinkingV20Final && window.productLinkingV20Final.initialized;
        const hasElements = document.getElementById('linkedProductsFilter') && 
                          document.getElementById('linkedProductsSearch') && 
                          document.getElementById('resetLinkedFiltersBtn');
        
        if (hasProductLinking && hasElements) {
            // Override the existing methods
            if (window.productLinkingV20Final) {
                window.productLinkingV20Final.populateLinkedProductsGrid = enhancedPopulateLinkedProductsGrid;
                window.productLinkingV20Final.applyLinkedProductsFilters = enhancedApplyLinkedProductsFilters;
                window.productLinkingV20Final.resetLinkedProductsFilters = resetLinkedProductsFiltersGlobal;
                window.productLinkingV20Final.updateFilterIndicators = updateFilterIndicators;
            }
            
            // Setup the enhanced filters
            setupEnhancedLinkedProductsFilters();
            
            console.log('✅ Enhanced filters initialized and bound to V20.1 system');
            
            // Show success notification
            if (window.NotificationSystem) {
                window.NotificationSystem.show('Filter Fix', 'Enhanced filters activated - Reset button now works!', 'success', 3000);
            }
            
        } else {
            console.log('⏳ Waiting for system to be ready...', { hasProductLinking, hasElements });
            setTimeout(checkAndInit, 500);
        }
    };
    
    checkAndInit();
}

// Auto-initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEnhancedFilters);
} else {
    // If DOM is already loaded, wait a bit for the main system to load
    setTimeout(initializeEnhancedFilters, 1000);
}

// Fallback initialization after 5 seconds
setTimeout(() => {
    if (!window.enhancedFiltersInitialized) {
        console.log('🔄 Fallback initialization of enhanced filters...');
        initializeEnhancedFilters();
    }
}, 5000);

console.log('🎯 Enhanced Products Link Filters Fix loaded - SYNTAX CORRECTED!');
console.log('📝 Features: Enhanced filtering, search highlighting, visual feedback, working reset button');