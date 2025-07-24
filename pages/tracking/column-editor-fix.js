// Fixed Column Editor - Risolve i problemi con i pulsanti della modale

function showColumnEditor() {
    if (!window.ModalSystem) {
        console.error('ModalSystem not available');
        return;
    }

    const currentVisible = tableManager?.options?.columns?.filter(c => !c.hidden).map(c => c.key) || window.DEFAULT_VISIBLE_COLUMNS;
    
    const content = `
        <div class="column-editor">
            <div class="column-editor-header">
                <p>Seleziona le colonne da visualizzare e trascinale per riordinarle</p>
                <div class="column-actions">
                    <button type="button" class="btn btn-sm btn-secondary" id="selectAllColumnsBtn">
                        Seleziona Tutto
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" id="resetDefaultColumnsBtn">
                        Ripristina Default
                    </button>
                </div>
            </div>
            
            <div class="column-list" id="columnEditorList">
                ${window.AVAILABLE_COLUMNS.map(col => `
                    <div class="column-item ${col.required ? 'required' : ''}" 
                         data-column="${col.key}"
                         draggable="${!col.required}">
                        <div class="column-drag-handle">
                            <i class="fas fa-grip-vertical"></i>
                        </div>
                        <label class="column-checkbox">
                            <input type="checkbox" 
                                   value="${col.key}" 
                                   ${currentVisible.includes(col.key) ? 'checked' : ''}
                                   ${col.required ? 'disabled' : ''}
                                   class="column-checkbox-input">
                            <span class="column-label">${col.label}</span>
                            ${col.required ? '<span class="badge badge-info ml-2">Obbligatorio</span>' : ''}
                        </label>
                    </div>
                `).join('')}
            </div>
            
            <div class="column-preview mt-3">
                <small class="text-muted">
                    <span id="selectedColumnsCount">${currentVisible.length}</span> colonne selezionate
                </small>
            </div>
        </div>
    `;

    // Mostra la modale
    window.ModalSystem.show({
        title: 'Gestione Colonne',
        content: content,
        size: 'md',
        buttons: [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                action: function() {
                    console.log('Annulla clicked');
                    window.ModalSystem.hide();
                }
            },
            {
                text: 'Applica',
                className: 'btn-primary',
                action: function() {
                    console.log('Applica clicked');
                    applyColumnChangesFixed();
                }
            }
        ]
    });

    // Aggiungi event listeners DOPO che la modale è stata creata
    setTimeout(() => {
        setupColumnEditorEventListeners();
        setupDragAndDrop();
    }, 200);
}

// Funzione separata per configurare gli event listeners
function setupColumnEditorEventListeners() {
    // Seleziona tutto
    const selectAllBtn = document.getElementById('selectAllColumnsBtn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Select all clicked');
            document.querySelectorAll('#columnEditorList input[type="checkbox"]:not(:disabled)').forEach(cb => {
                cb.checked = true;
            });
            updateColumnPreviewFixed();
        });
    }

    // Reset default
    const resetBtn = document.getElementById('resetDefaultColumnsBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Reset default clicked');
            document.querySelectorAll('#columnEditorList input[type="checkbox"]').forEach(cb => {
                cb.checked = window.DEFAULT_VISIBLE_COLUMNS.includes(cb.value) || cb.disabled;
            });
            updateColumnPreviewFixed();
        });
    }

    // Checkbox change events
    const checkboxes = document.querySelectorAll('.column-checkbox-input');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            updateColumnPreviewFixed();
        });
    });

    console.log('Column editor event listeners setup complete');
}

// Setup drag and drop
function setupDragAndDrop() {
    const list = document.getElementById('columnEditorList');
    if (list && window.Sortable) {
        new Sortable(list, {
            animation: 150,
            handle: '.column-drag-handle',
            filter: '.required',
            onEnd: function() {
                updateColumnPreviewFixed();
            }
        });
        console.log('Drag and drop initialized');
    }
}

// Fixed update preview function
function updateColumnPreviewFixed() {
    const checked = document.querySelectorAll('#columnEditorList input[type="checkbox"]:checked').length;
    const countElement = document.getElementById('selectedColumnsCount');
    if (countElement) {
        countElement.textContent = checked;
    }
}

// Fixed apply changes function
function applyColumnChangesFixed() {
    try {
        console.log('Applying column changes...');
        
        // Ottieni l'ordine delle colonne dalla DOM
        const columnOrder = [];
        const columnItems = document.querySelectorAll('#columnEditorList .column-item');
        
        columnItems.forEach(item => {
            const key = item.dataset.column;
            const checkbox = item.querySelector('input[type="checkbox"]');
            
            if (checkbox && checkbox.checked) {
                columnOrder.push(key);
            }
        });

        console.log('Selected columns:', columnOrder);

        if (columnOrder.length === 0) {
            window.NotificationSystem?.error('Seleziona almeno una colonna');
            return;
        }

        // Trova le definizioni delle colonne disponibili
        const availableColumns = window.AVAILABLE_COLUMNS || [];
        const tableColumns = window.TABLE_COLUMNS || [];

        // Ricostruisci le colonne con il nuovo ordine
        const newColumns = columnOrder.map(key => {
            // Prima cerca nelle colonne esistenti
            const existingCol = tableColumns.find(c => c.key === key);
            if (existingCol) {
                return existingCol;
            }

            // Poi cerca nelle colonne disponibili
            const availableCol = availableColumns.find(c => c.key === key);
            if (availableCol) {
                return {
                    key: key,
                    label: availableCol.label,
                    sortable: availableCol.sortable,
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

        // Aggiungi sempre la colonna azioni alla fine (se esiste)
        const actionsCol = tableColumns.find(c => c.key === 'actions');
        if (actionsCol && !newColumns.find(c => c.key === 'actions')) {
            newColumns.push(actionsCol);
        }

        console.log('New columns configuration:', newColumns);

        // Aggiorna TABLE_COLUMNS se disponibile
        if (window.TABLE_COLUMNS) {
            window.TABLE_COLUMNS.length = 0;
            window.TABLE_COLUMNS.push(...newColumns);
        }

        // Salva le preferenze nel localStorage
        try {
            localStorage.setItem('trackingVisibleColumns', JSON.stringify(columnOrder));
            console.log('Column preferences saved');
        } catch (e) {
            console.warn('Could not save column preferences:', e);
        }

        // Aggiorna il table manager se disponibile
        if (window.tableManager) {
            console.log('Updating table manager...');
            window.tableManager.options.columns = newColumns;
            
            // Forza il refresh della tabella
            if (window.updateTable) {
                window.updateTable();
            } else if (window.tableManager.render) {
                window.tableManager.render();
            } else if (window.tableManager.setData) {
                // Re-imposta i dati per forzare il re-render
                const currentData = window.filteredTrackings || window.trackings || [];
                window.tableManager.setData(currentData);
            }
        }

        // Chiudi la modale
        window.ModalSystem.hide();
        
        // Mostra messaggio di successo
        if (window.NotificationSystem) {
            window.NotificationSystem.success('Colonne aggiornate con successo');
        }

        console.log('Column changes applied successfully');

    } catch (error) {
        console.error('Error applying column changes:', error);
        if (window.NotificationSystem) {
            window.NotificationSystem.error('Errore nell\'applicazione delle modifiche: ' + error.message);
        }
    }
}

// Esporta le funzioni per uso globale (mantieni compatibilità)
window.showColumnEditor = showColumnEditor;
window.updateColumnPreviewFixed = updateColumnPreviewFixed;
window.applyColumnChangesFixed = applyColumnChangesFixed;

// Override delle funzioni legacy per evitare conflitti
window.selectAllColumns = function() {
    console.log('Legacy selectAllColumns called - using fixed version');
    const selectAllBtn = document.getElementById('selectAllColumnsBtn');
    if (selectAllBtn) {
        selectAllBtn.click();
    }
};

window.resetDefaultColumns = function() {
    console.log('Legacy resetDefaultColumns called - using fixed version');
    const resetBtn = document.getElementById('resetDefaultColumnsBtn');
    if (resetBtn) {
        resetBtn.click();
    }
};

window.updateColumnPreview = function() {
    console.log('Legacy updateColumnPreview called - using fixed version');
    updateColumnPreviewFixed();
};

window.applyColumnChanges = function() {
    console.log('Legacy applyColumnChanges called - using fixed version');
    applyColumnChangesFixed();
};

// Debug helper
window.debugColumnEditor = function() {
    console.log('=== COLUMN EDITOR DEBUG ===');
    console.log('ModalSystem available:', !!window.ModalSystem);
    console.log('TABLE_COLUMNS available:', !!window.TABLE_COLUMNS);
    console.log('AVAILABLE_COLUMNS available:', !!window.AVAILABLE_COLUMNS);
    console.log('tableManager available:', !!window.tableManager);
    console.log('Current modal visible:', !!document.querySelector('.modal.show'));
    
    if (document.querySelector('.modal.show')) {
        console.log('Modal buttons:', {
            selectAll: !!document.getElementById('selectAllColumnsBtn'),
            reset: !!document.getElementById('resetDefaultColumnsBtn'),
            checkboxes: document.querySelectorAll('.column-checkbox-input').length
        });
    }
    
    return {
        modalSystem: !!window.ModalSystem,
        tableColumns: !!window.TABLE_COLUMNS,
        availableColumns: !!window.AVAILABLE_COLUMNS,
        tableManager: !!window.tableManager,
        modalVisible: !!document.querySelector('.modal.show')
    };
};

console.log('✅ Fixed Column Editor loaded');
