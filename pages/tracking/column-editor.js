import ModalSystem from '/core/modal-system.js';
import { showNotification } from '/core/notification-system.js';
import userPreferencesService from '/core/services/user-preferences-service.js';

/**
 * Opens the column management modal, allowing users to select and reorder columns.
 * @param {object} tableManager - The instance of TableManager for the current table.
 * @param {Array} availableColumns - The full list of available column definitions.
 */
export function showColumnEditor(tableManager, availableColumns) {
    // 1. Check for Sortable.js dependency
    if (typeof Sortable === 'undefined') {
        console.warn('Sortable.js not loaded yet.');
        showNotification('Funzionalità di riordino non ancora pronta. Riprova tra un istante.', 'warning');
        return;
    }

    // 2. Check for TableManager dependency
    if (!tableManager) {
        console.error('TableManager is not available yet.');
        showNotification('La tabella non è ancora pronta. Riprova tra un istante.', 'error');
        return;
    }

    ModalSystem.show({
        title: 'Gestisci Colonne',
        content: `
            <p class="text-muted">Seleziona le colonne da visualizzare e trascinale per riordinarle.</p>
            <ul class="list-group" id="column-editor-list"></ul>
        `,
        size: 'large',
        buttons: [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                action: (modal) => modal.hide()
            },
            {
                text: 'Salva',
                className: 'btn-primary',
                action: async (modal) => {
                    try {
                        const list = modal.element.querySelector('#column-editor-list');
                        if (!list) throw new Error("Column list not found in modal.");

                        const newVisibleKeys = Array.from(list.querySelectorAll('li'))
                            .filter(li => li.querySelector('input[type="checkbox"]').checked)
                            .map(li => li.dataset.columnKey);

                        const { success } = await userPreferencesService.savePreferences('tracking', { column_keys: newVisibleKeys });

                        if (success) {
                            const newColumns = newVisibleKeys
                                .map(key => availableColumns.find(c => c.key === key))
                                .filter(Boolean);

                            tableManager.updateColumns(newColumns);
                            modal.hide();
                            showNotification('Preferenze colonne salvate con successo.', 'success');
                        } else {
                            showNotification('Errore durante il salvataggio delle preferenze. Riprova.', 'error');
                        }
                    } catch (error) {
                        console.error("Error saving columns:", error);
                        showNotification('Si è verificato un errore imprevisto durante il salvataggio.', 'error');
                    }
                }
            }
        ],
        onMounted: (modal) => {
            // 3. Add a try-catch inside onMounted for maximum safety
            try {
                const list = modal.element.querySelector('#column-editor-list');
                if (!list) throw new Error("Could not find #column-editor-list in the modal.");

                const currentVisibleKeys = tableManager.getColumns().map(c => c.key);

                availableColumns.forEach(col => {
                    const isVisible = currentVisibleKeys.includes(col.key);
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                    listItem.dataset.columnKey = col.key;
                    listItem.innerHTML = `
                        <div>
                            <span class="drag-handle" style="cursor: move; margin-right: 10px;">&#9776;</span>
                            <span>${col.label}</span>
                        </div>
                        <input class="form-check-input" type="checkbox" ${isVisible ? 'checked' : ''}>
                    `;
                    list.appendChild(listItem);
                });

                new Sortable(list, {
                    animation: 150,
                    handle: '.drag-handle',
                    ghostClass: 'bg-light'
                });
            } catch (error) {
                console.error("Error mounting column editor modal content:", error);
                showNotification('Errore durante l\'apertura dell\'editor. Riprova.', 'error');
                modal.hide(); // Close the broken modal
            }
        }
    });
}
