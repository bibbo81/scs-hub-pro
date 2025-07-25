// Fixed Column Editor - Risolve i problemi con i pulsanti della modale

(function() {
    'use strict';
    
    console.log('🔧 Loading Column Editor - Clean Implementation');
    
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
            
            // Mostra la modale
            window.ModalSystem.show({
                title: 'Gestione Colonne',
                content: modalContent,
                size: 'md',
                buttons: [
                    {
                        text: 'Annulla',
                        className: 'btn-secondary',
                        action: function() {
                            console.log('❌ Column editor cancelled');
                            window.ModalSystem.hide();
                        }
                    },
                    {
                        text: 'Applica',
                        className: 'btn-primary',
                        action: function() {
                            console.log('✅ Applying column changes...');
                            applyColumnChanges();
                        }
                    }
                ]
            });
            
            // Setup degli event listeners dopo il rendering
            setTimeout(() => {
                setupColumnEditorEvents();
            }, 200);
            
        } catch (error) {
            console.error('❌ Error opening column editor:', error);
            if (window.NotificationSystem) {
                window.NotificationSystem.error('Errore nell\'apertura dell\'editor colonne');
            }
        }
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
    
    // Setup degli event listeners
    function setupColumnEditorEvents() {
        console.log('🔧 Setting up column editor events...');
        
        // Bottone "Seleziona Tutto"
        const selectAllBtn = document.getElementById('selectAllColumnsBtn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🔘 Select all columns');
                
                document.querySelectorAll('#columnEditorList input[type="checkbox"]:not(:disabled)').forEach(cb => {
                    cb.checked = true;
                });
                updateColumnPreview();
            });
        }
        
        // Bottone "Ripristina Default"
        const resetBtn = document.getElementById('resetDefaultColumnsBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🔄 Reset to default columns');
                
                const defaultColumns = window.DEFAULT_VISIBLE_COLUMNS || [];
                document.querySelectorAll('#columnEditorList input[type="checkbox"]').forEach(cb => {
                    cb.checked = defaultColumns.includes(cb.value) || cb.disabled;
                });
                updateColumnPreview();
            });
        }
        
        // Checkbox change events
        const checkboxes = document.querySelectorAll('.column-checkbox-input');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', function() {
                updateColumnPreview();
            });
        });
        
        // Drag and drop (se Sortable è disponibile)
        setupDragAndDrop();
        
        // Aggiorna il conteggio iniziale
        updateColumnPreview();
        
        console.log('✅ Column editor events setup completed');
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
    
    // Applica le modifiche alle colonne
    function applyColumnChanges() {
        try {
            console.log('📝 Applying column changes...');
            
            // Raccogli le colonne selezionate nell'ordine corretto
            const selectedColumns = [];
            const columnItems = document.querySelectorAll('#columnEditorList .column-item');
            
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
            
            // Chiudi la modale
            window.ModalSystem.hide();
            
            // Mostra conferma
            if (window.NotificationSystem) {
                window.NotificationSystem.success(`✅ Colonne aggiornate (${selectedColumns.length} visibili)`);
            }
            
            console.log('✅ Column changes applied successfully');
            
        } catch (error) {
            console.error('❌ Error applying column changes:', error);
            if (window.NotificationSystem) {
                window.NotificationSystem.error('Errore: ' + error.message);
            }
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
    window.applyColumnChanges = applyColumnChanges;
    
    // Funzione di debug
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
            }
        };
        
        console.table(info.dependencies);
        console.table(info.modal);
        console.log('Preferences:', info.preferences);
        
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
    
    console.log('✅ Column Editor - Clean Implementation loaded');
    
})();