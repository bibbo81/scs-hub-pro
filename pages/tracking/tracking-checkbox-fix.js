// tracking-checkbox-fix.js - Fix per checkbox non cliccabili
(function() {
    'use strict';
    
    console.log('🔧 TRACKING CHECKBOX FIX: Starting...');
    
    // ========================================
    // FIX 1: PROBLEMA IDENTIFICATO
    // ========================================
    // Il problema è che TableManager usa parseInt() su rowId
    // ma i tracking IDs sono stringhe UUID, non numeri!
    // Quando parseInt() fallisce su UUID, ritorna NaN
    
    function waitForTableManager(callback) {
        const containerId = 'trackingTableContainer';
        let attempts = 0;

        const interval = setInterval(() => {
            const tableManager = window.getTableManager ? window.getTableManager(containerId) : window.tableManager;
            if (tableManager) {
                clearInterval(interval);
                callback(tableManager);
            } else if (attempts > 20) { // 10 secondi di attesa massima
                clearInterval(interval);
                console.error(`❌ TableManager non trovato per ${containerId} dopo 10 secondi.`);
            } else {
                console.log(`⏳ In attesa di TableManager per ${containerId}... tentativo ${attempts + 1}`);
            }
            attempts++;
        }, 500);
    }

    async function fixCheckboxSelection() {
        console.log('🔧 Fixing checkbox selection logic...');

        waitForTableManager(tableManager => {
            // OVERRIDE selectRow per gestire UUID strings
            const originalSelectRow = tableManager.selectRow;
            tableManager.selectRow = function(rowId, selected) {
                console.log('🎯 Fixed selectRow called:', { rowId, selected, type: typeof rowId });

                const id = String(rowId);

                if (selected) {
                    this.selectedRows.add(id);
                } else {
                    this.selectedRows.delete(id);
                }

                console.log('✅ Selected rows after update:', Array.from(this.selectedRows));

                this.onSelectionChange();

                // Aggiorna solo lo stato visuale della riga
                this.updateRowVisualState(id, selected);
            };

            // Aggiungi metodo per aggiornare stato visuale senza re-render completo
            if (!tableManager.updateRowVisualState) {
                tableManager.updateRowVisualState = function(rowId, selected) {
                    const row = this.container.querySelector(`tr[data-row-id="${rowId}"]`);
                    if (row) {
                        row.classList.toggle('selected', selected);
                    }
                };
            }

            // OVERRIDE getSelectedRows per gestire UUID
            tableManager.getSelectedRows = function() {
                console.log('🔍 Getting selected rows, selectedRows Set:', this.selectedRows);

                return this.data.filter(row => {
                    const id = String(row.id || this.data.indexOf(row));
                    return this.selectedRows.has(id);
                });
            };

            // FIX: Assicurati che selectedRows usi stringhe
            if (tableManager.selectedRows) {
                const newSelectedRows = new Set(Array.from(tableManager.selectedRows, String));
                tableManager.selectedRows = newSelectedRows;
            }

            console.log('✅ selectRow and getSelectedRows fixed for UUID support');
        });
    }
    
    // ========================================
    // FIX 2: EVENT DELEGATION MIGLIORATO
    // ========================================
    
    function setupImprovedEventDelegation() {
        console.log('🔧 Setting up improved event delegation...');
        
        // Rimuovi vecchi listener se esistono
        const oldListeners = document.querySelectorAll('[data-checkbox-listener]');
        oldListeners.forEach(el => {
            const newEl = el.cloneNode(true);
            el.parentNode.replaceChild(newEl, el);
        });
        
        // Nuovo event delegation sul container
        const container = document.getElementById('trackingTableContainer');
        if (!container) {
            console.warn('⚠️ trackingTableContainer not found');
            return;
        }
        
        // Mark container to avoid duplicate listeners
        if (container.dataset.checkboxListener === 'true') {
            console.log('✅ Event delegation already set up');
            return;
        }
        container.dataset.checkboxListener = 'true';
        
        // Gestisci clicks su checkbox con event delegation
        container.addEventListener('click', function(e) {
            // Trova il checkbox più vicino
            const checkbox = e.target.closest('input[type="checkbox"].select-row');
            if (!checkbox) return;
            
            e.stopPropagation();
            
            const rowId = checkbox.value || checkbox.dataset.id;
            const checked = checkbox.checked;
            
            // Ignora se rowId non è valido
            if (!rowId || rowId === 'on' || rowId === 'undefined') {
                console.warn('❌ Invalid checkbox rowId:', rowId);
                checkbox.checked = false; // Reset checkbox
                return;
            }
            
            console.log('✅ Checkbox clicked via delegation:', { rowId, checked });
            
            // Usa tableManager se disponibile
            if (window.tableManager) {
                window.tableManager.selectRow(rowId, checked);
            } else {
                console.error('❌ TableManager not available');
            }
        });
        
        // Gestisci anche il select-all
        container.addEventListener('click', function(e) {
            const selectAll = e.target.closest('input[type="checkbox"].select-all');
            if (!selectAll) return;
            
            e.stopPropagation();
            
            console.log('✅ Select all clicked:', selectAll.checked);
            
            if (window.tableManager) {
                window.tableManager.selectAll(selectAll.checked);
            }
        });
        
        console.log('✅ Improved event delegation set up');
    }
    
    // ========================================
    // FIX 3: SELEZIONE VISUALE
    // ========================================
    
    function fixVisualSelection() {
        console.log('🔧 Fixing visual selection feedback...');
        
        // Aggiungi stili CSS per feedback visuale immediato
        const style = document.createElement('style');
        style.textContent = `
            /* Feedback visuale immediato per checkbox */
            .select-row {
                cursor: pointer;
                width: 18px;
                height: 18px;
                transition: transform 0.1s ease;
            }
            
            .select-row:hover {
                transform: scale(1.1);
            }
            
            .select-row:active {
                transform: scale(0.95);
            }
            
            /* Highlight riga quando checkbox è checked */
            tr:has(.select-row:checked) {
                background-color: rgba(99, 102, 241, 0.1) !important;
            }
            
            /* Animazione per stato selected */
            tr.selected {
                background-color: rgba(99, 102, 241, 0.1) !important;
                transition: background-color 0.2s ease;
            }
            
            /* Fix per mobile */
            @media (max-width: 768px) {
                .select-row {
                    width: 24px;
                    height: 24px;
                    -webkit-tap-highlight-color: transparent;
                }
                
                td:has(.select-row) {
                    padding: 8px !important;
                }
            }
        `;
        
        // Aggiungi solo se non esiste già
        if (!document.getElementById('checkbox-visual-fix')) {
            style.id = 'checkbox-visual-fix';
            document.head.appendChild(style);
        }
        
        console.log('✅ Visual selection styles added');
    }
    
    // ========================================
    // FIX 4: BULK ACTIONS BAR UPDATE
    // ========================================
    
    function fixBulkActionsUpdate() {
        console.log('🔧 Fixing bulk actions bar update...');
        
        // Sovrascrivi handleSelectionChange globale se necessario
        if (!window.handleSelectionChange) {
            window.handleSelectionChange = function(selected) {
                console.log('📊 handleSelectionChange called, selected:', selected?.length || 0);
                
                const bulkBar = document.getElementById('bulkActionsBar');
                const count = document.getElementById('selectedCount');
                
                if (bulkBar) {
                    bulkBar.style.display = selected && selected.length > 0 ? 'block' : 'none';
                }
                
                if (count) {
                    count.textContent = selected ? selected.length : 0;
                }
                
                // Aggiorna anche il select-all checkbox
                const selectAll = document.querySelector('.select-all');
                if (selectAll && window.tableManager) {
                    const allRowIds = window.tableManager.displayData.map(row => String(row.id));
                    const allSelected = allRowIds.length > 0 && 
                                       allRowIds.every(id => window.tableManager.selectedRows.has(id));
                    selectAll.checked = allSelected;
                    selectAll.indeterminate = window.tableManager.selectedRows.size > 0 && !allSelected;
                }
            };
        }
        
        console.log('✅ Bulk actions update fixed');
    }
    
    // ========================================
    // FIX 5: FORCE RE-RENDER DOPO FIX
    // ========================================
    
    async function forceTableReRender() {
        console.log('🔧 Forcing table re-render with fixes...');
        
        // Attendi un po' per assicurarsi che tutti i fix siano applicati
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (window.tableManager && window.tableManager.render) {
            // Clear selection prima del re-render
            window.tableManager.selectedRows.clear();
            
            // Re-render
            window.tableManager.render();
            
            console.log('✅ Table re-rendered with checkbox fixes');
        }
    }
    
    // ========================================
    // DEBUG HELPER
    // ========================================
    
    window.debugCheckbox = function() {
        console.log('🔍 Checkbox Debug Info:');
        console.log('- TableManager exists:', !!window.tableManager);
        console.log('- Selected rows:', window.tableManager ? Array.from(window.tableManager.selectedRows) : 'N/A');
        console.log('- Display data sample:', window.tableManager?.displayData?.slice(0, 3));
        console.log('- Checkboxes in DOM:', document.querySelectorAll('.select-row').length);
        console.log('- Container has listener:', document.getElementById('trackingTableContainer')?.dataset.checkboxListener);
        
        // Test click su primo checkbox
        const firstCheckbox = document.querySelector('.select-row');
        if (firstCheckbox) {
            console.log('- First checkbox value:', firstCheckbox.value);
            console.log('- First checkbox data-id:', firstCheckbox.dataset.id);
        }
        
        return {
            tableManager: !!window.tableManager,
            selectedCount: window.tableManager?.selectedRows?.size || 0,
            checkboxCount: document.querySelectorAll('.select-row').length
        };
    };
    
    // ========================================
    // INIZIALIZZAZIONE
    // ========================================
    App.onReady(() => {
        console.log('🚀 Initializing checkbox fixes...');
        try {
            fixCheckboxSelection();
            setupImprovedEventDelegation();
            fixVisualSelection();
            fixBulkActionsUpdate();
            forceTableReRender();
            console.log('✅ All checkbox fixes applied successfully!');
        } catch (error) {
            console.error('❌ Error applying checkbox fixes:', error);
        }
    });
    
})();

console.log('✅ Tracking checkbox fix loaded - UUID support enabled');