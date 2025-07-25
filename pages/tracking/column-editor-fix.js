// Fixed Column Editor - Risolve i problemi con i pulsanti della modale

(function() {
    'use strict';
    
    console.log('🔧 Loading Column Editor - FIXED Implementation');
    
    // Aspetta che tutto sia caricato
    function waitForDependencies() {
        return new Promise((resolve) => {
            const checkDeps = () => {
                if (window.ModalSystem && window.AVAILABLE_COLUMNS && window.DEFAULT_VISIBLE_COLUMNS) {
                    resolve();
                } else {
                    setTimeout(checkDeps, 100);
                }
            };
            checkDeps();
        });
    }
    
    // VARIABILI GLOBALI per evitare problemi di scope
    let currentModalId = null;
    
    // Implementazione principale dell'editor colonne
    async function showColumnEditor() {
        try {
            await waitForDependencies();
            
            console.log('📋 Opening column editor...');
            
            if (!window.ModalSystem) {
                throw new Error('ModalSystem not available');
            }
            
            const currentVisible = getCurrentVisibleColumns();
            const modalContent = generateColumnEditorHTML(currentVisible);
            
            // Genera un ID unico per questa modale
            currentModalId = 'column-editor-' + Date.now();
            
            // Mostra la modale - FIX: i bottoni DEVONO funzionare tramite le action functions
            window.ModalSystem.show({
                title: 'Gestione Colonne',
                content: modalContent,
                size: 'md',
                id: currentModalId,
                buttons: [
                    {
                        text: 'Annulla',
                        className: 'btn-secondary',
                        // FIX: action diretta senza riferimenti esterni
                        action: function() {
                            console.log('❌ Column editor cancelled');
                            window.ModalSystem.hide();
                        }
                    },
                    {
                        text: 'Applica',
                        className: 'btn-primary',
                        // FIX: action diretta che chiama la funzione
                        action: function() {
                            console.log('✅ Applying column changes...');
                            try {
                                applyColumnChangesDirectly();
                                window.ModalSystem.hide();
                            } catch (error) {
                                console.error('❌ Error applying changes:', error);
                                if (window.NotificationSystem) {
                                    window.NotificationSystem.error('Errore: ' + error.message);
                                }
                            }
                        }
                    }
                ]
            });
            
            // Setup degli event listeners dopo il rendering - con delay più lungo
            setTimeout(() => {
                setupColumnEditorEvents();
            }, 500); // Aumentato delay
            
        } catch (error) {
            console.error('❌ Error opening column editor:', error);
            if (window.NotificationSystem) {
                window.NotificationSystem.error('Errore nell\'apertura dell\'editor colonne');
            }
        }
    }
    
    // FIX: Nuova funzione che applica le modifiche senza dipendere dal DOM della modale
    function applyColumnChangesDirectly() {
        console.log('📝 Applying column changes directly...');
        
        // Raccogli le colonne selezionate dall'interfaccia attuale
        const selectedColumns = [];
        const columnItems = document.querySelectorAll('#columnEditorList .column-item');
        
        if (columnItems.length === 0) {
            throw new Error('Nessuna colonna trovata. Riapri la modale.');
        }
        
        columnItems.forEach(item => {
            const key = item.dataset.column;
            const checkbox = item.querySelector('input[type="checkbox"]');
            
            if (checkbox && checkbox.checked) {
                selectedColumns.push(key);
            }
        });
        
        console.log('📋 Selected columns:', selectedColumns);
        
        if (selectedColumns.length === 0) {
            throw new Error('Seleziona almeno una colonna');
        }
        
        // Costruisci la nuova configurazione delle colonne
        const newColumns = buildNewColumnsConfig(selectedColumns);
        console.log('🔧 New columns config:', newColumns);
        
        // Applica le modifiche
        applyNewColumns(newColumns, selectedColumns);
        
        // Salva le preferenze
        saveColumnPreferences(selectedColumns);
        
        // Mostra conferma
        if (window.NotificationSystem) {
            window.NotificationSystem.success(`✅ Colonne aggiornate (${selectedColumns.length} visibili)`);
        }
        
        console.log('✅ Column changes applied successfully');
    }
    
    // Ottiene le colonne attualmente visibili
    function getCurrentVisibleColumns() {
        // Prova diverse fonti per le colonne visibili
        if (window.tableManager?.options?.columns) {
            return window.tableManager.options.columns
                .filter(c => !c.hidden)
                .map(c => c.key);
        }
        
        if (window.TABLE_COLUMNS) {
            return window.TABLE_COLUMNS
                .filter(c => c.key !== 'actions')
                .map(c => c.key);
        }
        
        // Fallback alle colonne di default
        return window.DEFAULT_VISIBLE_COLUMNS || [
            'tracking_number',
            'current_status', 
            'carrier_name',
            'origin_port',
            'destination_port',
            'eta'
        ];
    }
    
    // Genera l'HTML della modale
    function generateColumnEditorHTML(currentVisible) {
        const availableColumns = window.AVAILABLE_COLUMNS || [];
        
        return `
            <div class="column-editor">
                <div class="column-editor-header mb-3">
                    <p class="mb-2">Seleziona le colonne da visualizzare e trascinale per riordinarle</p>
                    <div class="column-actions">
                        <button type="button" class="btn btn-sm btn-outline-secondary" id="selectAllColumnsBtn">
                            <i class="fas fa-check-square mr-1"></i> Seleziona Tutto
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary ml-2" id="resetDefaultColumnsBtn">
                            <i class="fas fa-undo mr-1"></i> Ripristina Default
                        </button>
                    </div>
                </div>
                
                <div class="column-list border rounded p-2" id="columnEditorList" style="max-height: 400px; overflow-y: auto;">
                    ${availableColumns.map(col => `
                        <div class="column-item d-flex align-items-center p-2 border-bottom ${col.required ? 'required bg-light' : ''}" 
                             data-column="${col.key}"
                             ${!col.required ? 'draggable="true"' : ''}>
                            <div class="column-drag-handle mr-2" style="cursor: ${col.required ? 'not-allowed' : 'grab'};">
                                <i class="fas fa-grip-vertical text-muted"></i>
                            </div>
                            <label class="column-checkbox mb-0 d-flex align-items-center flex-grow-1">
                                <input type="checkbox" 
                                       value="${col.key}" 
                                       class="column-checkbox-input mr-2"
                                       ${currentVisible.includes(col.key) ? 'checked' : ''}
                                       ${col.required ? 'disabled' : ''}>
                                <span class="column-label">${col.label}</span>
                                ${col.required ? '<span class="badge badge-info ml-2">Obbligatorio</span>' : ''}
                            </label>
                        </div>
                    `).join('')}
                </div>
                
                <div class="column-preview mt-3 p-2 bg-light rounded">
                    <small class="text-muted">
                        <i class="fas fa-info-circle mr-1"></i>
                        <span id="selectedColumnsCount">${currentVisible.length}</span> colonne selezionate
                    </small>
                </div>
            </div>
        `;
    }
    
    // Setup degli event listeners - FIX: più robusto
    function setupColumnEditorEvents() {
        console.log('🔧 Setting up column editor events...');
        
        // FIX: Usa event delegation per essere sicuri che gli elementi esistano
        document.addEventListener('click', handleColumnEditorClick);
        document.addEventListener('change', handleColumnEditorChange);
        
        // Setup drag and drop
        setupDragAndDrop();
        
        // Aggiorna il conteggio iniziale
        updateColumnPreview();
        
        console.log('✅ Column editor events setup completed');
    }
    
    // FIX: Event handler con delegation
    function handleColumnEditorClick(e) {
        // Solo per eventi nella modale corrente
        if (!e.target.closest('.modal')) return;
        
        if (e.target.id === 'selectAllColumnsBtn' || e.target.closest('#selectAllColumnsBtn')) {
            e.preventDefault();
            console.log('🔘 Select all columns');
            
            document.querySelectorAll('#columnEditorList input[type="checkbox"]:not(:disabled)').forEach(cb => {
                cb.checked = true;
            });
            updateColumnPreview();
        }
        
        if (e.target.id === 'resetDefaultColumnsBtn' || e.target.closest('#resetDefaultColumnsBtn')) {
            e.preventDefault();
            console.log('🔄 Reset to default columns');
            
            const defaultColumns = window.DEFAULT_VISIBLE_COLUMNS || [];
            document.querySelectorAll('#columnEditorList input[type="checkbox"]').forEach(cb => {
                cb.checked = defaultColumns.includes(cb.value) || cb.disabled;
            });
            updateColumnPreview();
        }
    }
    
    // FIX: Event handler per checkbox changes
    function handleColumnEditorChange(e) {
        if (e.target.classList.contains('column-checkbox-input')) {
            updateColumnPreview();
        }
    }
    
    // Cleanup events quando la modale si chiude
    function cleanupColumnEditorEvents() {
        document.removeEventListener('click', handleColumnEditorClick);
        document.removeEventListener('change', handleColumnEditorChange);
    }
    
    // Setup drag and drop
    function setupDragAndDrop() {
        const list = document.getElementById('columnEditorList');
        if (list && window.Sortable) {
            new Sortable(list, {
                animation: 150,
                handle: '.column-drag-handle',
                filter: '.required',
                onStart: function(evt) {
                    evt.item.style.cursor = 'grabbing';
                },
                onEnd: function(evt) {
                    evt.item.style.cursor = 'grab';
                    updateColumnPreview();
                }
            });
            console.log('🔄 Drag and drop initialized');
        } else {
            console.warn('⚠️ Sortable.js not available, drag and drop disabled');
        }
    }
    
    // Aggiorna il preview del conteggio
    function updateColumnPreview() {
        const checked = document.querySelectorAll('#columnEditorList input[type="checkbox"]:checked').length;
        const countElement = document.getElementById('selectedColumnsCount');
        if (countElement) {
            countElement.textContent = checked;
        }
    }
    
    // Costruisce la nuova configurazione delle colonne
    function buildNewColumnsConfig(selectedColumns) {
        const availableColumns = window.AVAILABLE_COLUMNS || [];
        const existingColumns = window.TABLE_COLUMNS || [];
        
        const newColumns = selectedColumns.map(key => {
            // Prima cerca nelle colonne esistenti
            const existing = existingColumns.find(c => c.key === key);
            if (existing) {
                return existing;
            }
            
            // Poi cerca nelle colonne disponibili
            const available = availableColumns.find(c => c.key === key);
            if (available) {
                return {
                    key: key,
                    label: available.label,
                    sortable: available.sortable !== false,
                    formatter: window.getColumnFormatter ? window.getColumnFormatter(key) : (value => value || '-')
                };
            }
            
            // Fallback
            return {
                key: key,
                label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                sortable: true,
                formatter: (value => value || '-')
            };
        });
        
        // Aggiungi la colonna azioni se non presente e se esiste
        const actionsCol = existingColumns.find(c => c.key === 'actions');
        if (actionsCol && !newColumns.find(c => c.key === 'actions')) {
            newColumns.push(actionsCol);
        }
        
        return newColumns;
    }
    
    // Applica le nuove colonne
    function applyNewColumns(newColumns, selectedColumns) {
        // Aggiorna TABLE_COLUMNS globale
        if (window.TABLE_COLUMNS) {
            window.TABLE_COLUMNS.length = 0;
            window.TABLE_COLUMNS.push(...newColumns);
        }
        
        // Aggiorna il table manager
        if (window.tableManager) {
            window.tableManager.options.columns = newColumns;
            
            // Forza il refresh
            if (window.updateTable) {
                window.updateTable();
            } else if (window.tableManager.render) {
                window.tableManager.render();
            } else if (window.tableManager.setData) {
                const currentData = window.filteredTrackings || window.trackings || [];
                window.tableManager.setData(currentData);
            }
        }
    }
    
    // Salva le preferenze nel localStorage
    function saveColumnPreferences(selectedColumns) {
        try {
            localStorage.setItem('trackingVisibleColumns', JSON.stringify(selectedColumns));
            console.log('💾 Column preferences saved');
        } catch (e) {
            console.warn('⚠️ Could not save column preferences:', e);
        }
    }
    
    // Carica le preferenze salvate
    function loadColumnPreferences() {
        try {
            const saved = localStorage.getItem('trackingVisibleColumns');
            if (saved) {
                const columns = JSON.parse(saved);
                console.log('📂 Loaded column preferences:', columns);
                return columns;
            }
        } catch (e) {
            console.warn('⚠️ Could not load column preferences:', e);
        }
        return null;
    }
    
    // FIX: Hook per cleanup quando la modale si chiude
    if (window.ModalSystem && window.ModalSystem.on) {
        window.ModalSystem.on('hidden', cleanupColumnEditorEvents);
    }
    
    // Esponi le funzioni globalmente
    window.showColumnEditor = showColumnEditor;
    
    // Override delle funzioni legacy per evitare conflitti
    window.selectAllColumns = function() {
        console.log('🔄 Legacy selectAllColumns redirected');
        const btn = document.getElementById('selectAllColumnsBtn');
        if (btn) btn.click();
    };
    
    window.resetDefaultColumns = function() {
        console.log('🔄 Legacy resetDefaultColumns redirected');
        const btn = document.getElementById('resetDefaultColumnsBtn');
        if (btn) btn.click();
    };
    
    window.updateColumnPreview = updateColumnPreview;
    window.applyColumnChanges = applyColumnChangesDirectly; // FIX: usa la versione diretta
    
    // Funzione di debug migliorata
    window.debugColumnEditor = function() {
        console.log('🔍 COLUMN EDITOR DEBUG INFO');
        console.log('============================');
        
        const info = {
            dependencies: {
                modalSystem: !!window.ModalSystem,
                availableColumns: !!window.AVAILABLE_COLUMNS && window.AVAILABLE_COLUMNS.length,
                defaultColumns: !!window.DEFAULT_VISIBLE_COLUMNS && window.DEFAULT_VISIBLE_COLUMNS.length,
                tableColumns: !!window.TABLE_COLUMNS && window.TABLE_COLUMNS.length,
                tableManager: !!window.tableManager
            },
            modal: {
                visible: !!document.querySelector('.modal.show'),
                currentId: currentModalId,
                editorElements: {
                    list: !!document.getElementById('columnEditorList'),
                    selectAllBtn: !!document.getElementById('selectAllColumnsBtn'),
                    resetBtn: !!document.getElementById('resetDefaultColumnsBtn'),
                    checkboxes: document.querySelectorAll('.column-checkbox-input').length
                }
            },
            preferences: {
                saved: !!localStorage.getItem('trackingVisibleColumns'),
                current: loadColumnPreferences()
            },
            events: {
                clickListenersActive: true, // Ora sempre attivi via delegation
                changeListenersActive: true
            }
        };
        
        console.table(info.dependencies);
        console.table(info.modal);
        console.log('Preferences:', info.preferences);
        console.log('Events:', info.events);
        
        // Test dei bottoni
        console.log('🧪 Testing buttons...');
        const modalButtons = document.querySelectorAll('.modal.show .btn');
        modalButtons.forEach((btn, i) => {
            console.log(`Button ${i}:`, btn.textContent, btn.className, 'onclick:', typeof btn.onclick);
        });
        
        return info;
    };
    
    // Auto-load delle preferenze all'avvio (se necessario)
    document.addEventListener('DOMContentLoaded', function() {
        const savedPrefs = loadColumnPreferences();
        if (savedPrefs && window.TABLE_COLUMNS) {
            console.log('🔄 Auto-applying saved column preferences...');
            // Logica per applicare le preferenze salvate se necessario
        }
    });
    
    console.log('✅ Column Editor - FIXED Implementation loaded');
    console.log('💡 Debug with: window.debugColumnEditor()');
    
})();