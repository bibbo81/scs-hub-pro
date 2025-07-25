import ModalSystem from '/core/modal-system.js';

// Funzione per aprire l'editor delle colonne
export function openColumnEditor() {
    const availableColumns = window.AVAILABLE_COLUMNS || [];
    const visibleColumns = window.TABLE_COLUMNS.map(c => c.key);

    const modalContent = `
        <div class="column-editor-container">
            <p>Seleziona le colonne da visualizzare e riordinale.</p>
            <ul class="list-group" id="column-list">
                ${availableColumns.map(col => `
                    <li class="list-group-item">
                        <input type="checkbox" class="form-check-input" value="${col.key}" ${visibleColumns.includes(col.key) ? 'checked' : ''}>
                        ${col.label}
                    </li>
                `).join('')}
            </ul>
        </div>
    `;

    ModalSystem.show({
        title: 'Gestisci Colonne',
        content: modalContent,
        buttons: [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                action: () => ModalSystem.hide()
            },
            {
                text: 'Salva',
                className: 'btn-primary',
                action: () => {
                    const selectedColumns = Array.from(document.querySelectorAll('#column-list input:checked')).map(input => input.value);
                    localStorage.setItem('trackingVisibleColumns', JSON.stringify(selectedColumns));
                    location.reload();
                }
            }
        ]
    });
}
