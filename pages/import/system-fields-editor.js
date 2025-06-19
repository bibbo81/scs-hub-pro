// System Fields Editor - Permette di aggiungere/modificare campi sistema
// Da aggiungere a import.html dopo import-enhancements.js

console.log('🔧 Loading System Fields Editor...');

class SystemFieldsEditor {
    constructor() {
        this.customFields = JSON.parse(localStorage.getItem('customSystemFields') || '{}');
        this.fieldTypes = {
            'text': { name: 'Testo', icon: 'fa-font', color: 'var(--sol-gray-600)' },
            'number': { name: 'Numero', icon: 'fa-hashtag', color: 'var(--sol-info)' },
            'currency': { name: 'Valuta', icon: 'fa-euro-sign', color: 'var(--sol-success)' },
            'date': { name: 'Data', icon: 'fa-calendar', color: 'var(--sol-warning)' },
            'boolean': { name: 'Sì/No', icon: 'fa-toggle-on', color: 'var(--sol-primary)' },
            'email': { name: 'Email', icon: 'fa-envelope', color: 'var(--sol-info)' },
            'phone': { name: 'Telefono', icon: 'fa-phone', color: 'var(--sol-secondary)' },
            'url': { name: 'URL', icon: 'fa-link', color: 'var(--sol-primary)' },
            'percentage': { name: 'Percentuale', icon: 'fa-percent', color: 'var(--sol-warning)' }
        };
    }
    
    // Inizializza l'editor
    init() {
        // Aggiungi pulsante per aggiungere campi
        this.addFieldButton();
        
        // Applica campi custom salvati
        this.applyCustomFields();
        
        // Rendi editabili i campi esistenti
        this.makeFieldsEditable();
        
        console.log('✅ System Fields Editor initialized');
    }
    
    // Aggiungi pulsante "Aggiungi Campo" nell'interfaccia
    addFieldButton() {
        // Attendi che l'elemento target fields sia disponibile
        const checkInterval = setInterval(() => {
            const targetFieldsContainer = document.getElementById('targetFields');
            const sectionTitle = document.querySelector('.mapping-section:last-child .section-title');
            
            if (targetFieldsContainer && sectionTitle && !document.getElementById('addFieldBtn')) {
                clearInterval(checkInterval);
                
                // Crea pulsante
                const addButton = document.createElement('button');
                addButton.id = 'addFieldBtn';
                addButton.className = 'sol-btn sol-btn-sm sol-btn-success';
                addButton.style.marginLeft = 'auto';
                addButton.innerHTML = '<i class="fas fa-plus"></i> Aggiungi Campo';
                addButton.onclick = () => this.showAddFieldModal();
                
                // Aggiungi al titolo della sezione
                sectionTitle.style.display = 'flex';
                sectionTitle.style.justifyContent = 'space-between';
                sectionTitle.appendChild(addButton);
                
                console.log('✅ Add Field button added');
            }
        }, 100);
    }
    
    // Mostra modal per aggiungere nuovo campo
    showAddFieldModal() {
        const modalContent = `
            <div class="add-field-modal">
                <form id="addFieldForm" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div class="sol-form-group">
                        <label class="sol-form-label">Nome Campo <span style="color: var(--sol-danger);">*</span></label>
                        <input type="text" id="fieldName" class="sol-form-input" placeholder="es. Codice Interno" required>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">Chiave Sistema (lowercase, no spazi) <span style="color: var(--sol-danger);">*</span></label>
                        <input type="text" id="fieldKey" class="sol-form-input" placeholder="es. codice_interno" pattern="[a-z0-9_]+" required>
                        <small style="color: var(--sol-gray-600);">Solo lettere minuscole, numeri e underscore</small>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">Descrizione</label>
                        <input type="text" id="fieldDescription" class="sol-form-input" placeholder="es. Codice identificativo interno aziendale">
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">Tipo Dati <span style="color: var(--sol-danger);">*</span></label>
                        <select id="fieldType" class="sol-form-select" required>
                            ${Object.entries(this.fieldTypes).map(([key, type]) => 
                                `<option value="${key}">${type.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <input type="checkbox" id="fieldRequired" style="margin-right: 0.5rem;">
                            Campo Obbligatorio
                        </label>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">Parole Chiave (per auto-mapping, separate da virgola)</label>
                        <input type="text" id="fieldKeywords" class="sol-form-input" placeholder="es. codice, interno, ref, riferimento">
                        <small style="color: var(--sol-gray-600);">Aiuta il sistema a riconoscere automaticamente questo campo</small>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                        <button type="button" class="sol-btn sol-btn-glass" onclick="window.ModalSystem.close('addFieldModal')">
                            Annulla
                        </button>
                        <button type="submit" class="sol-btn sol-btn-primary">
                            <i class="fas fa-plus"></i> Aggiungi Campo
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        if (window.ModalSystem) {
            window.ModalSystem.show({
                id: 'addFieldModal',
                title: 'Aggiungi Nuovo Campo Sistema',
                content: modalContent,
                size: 'md'
            });
            
            // Gestisci form submission
            setTimeout(() => {
                const form = document.getElementById('addFieldForm');
                if (form) {
                    // Auto-genera field key dal nome
                    document.getElementById('fieldName').addEventListener('input', (e) => {
                        const fieldKeyInput = document.getElementById('fieldKey');
                        if (!fieldKeyInput.value || fieldKeyInput.value === this.lastAutoKey) {
                            const autoKey = e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '_')
                                .replace(/^_|_$/g, '');
                            fieldKeyInput.value = autoKey;
                            this.lastAutoKey = autoKey;
                        }
                    });
                    
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        this.addCustomField();
                    });
                }
            }, 100);
        }
    }
    
    // Aggiungi campo custom
    addCustomField() {
        const fieldData = {
            name: document.getElementById('fieldName').value,
            key: document.getElementById('fieldKey').value,
            description: document.getElementById('fieldDescription').value || '',
            type: document.getElementById('fieldType').value,
            required: document.getElementById('fieldRequired').checked,
            keywords: document.getElementById('fieldKeywords').value
                .split(',')
                .map(k => k.trim())
                .filter(k => k.length > 0),
            custom: true
        };
        
        // Verifica che la chiave non esista già
        if (window.importSystem && window.importSystem.systemFields[fieldData.key]) {
            window.NotificationSystem.show('Errore', 'Una campo con questa chiave esiste già', 'error');
            return;
        }
        
        // Salva in localStorage
        this.customFields[fieldData.key] = fieldData;
        localStorage.setItem('customSystemFields', JSON.stringify(this.customFields));
        
        // Aggiungi al sistema
        if (window.importSystem) {
            window.importSystem.systemFields[fieldData.key] = {
                name: fieldData.name,
                description: fieldData.description,
                type: fieldData.type,
                required: fieldData.required,
                icon: this.fieldTypes[fieldData.type].icon,
                keywords: fieldData.keywords,
                custom: true
            };
            
            // Re-render mapping interface
            window.importSystem.renderMappingInterface();
        }
        
        // Chiudi modal e mostra successo
        window.ModalSystem.close('addFieldModal');
        window.NotificationSystem.show('Campo Aggiunto', `Il campo "${fieldData.name}" è stato aggiunto con successo`, 'success');
        
        console.log('✅ Custom field added:', fieldData);
    }
    
    // Applica campi custom salvati al caricamento
    applyCustomFields() {
        if (!window.importSystem) {
            setTimeout(() => this.applyCustomFields(), 100);
            return;
        }
        
        Object.entries(this.customFields).forEach(([key, field]) => {
            if (!window.importSystem.systemFields[key]) {
                window.importSystem.systemFields[key] = {
                    name: field.name,
                    description: field.description,
                    type: field.type,
                    required: field.required,
                    icon: this.fieldTypes[field.type].icon,
                    keywords: field.keywords || [],
                    custom: true
                };
            }
        });
        
        console.log(`✅ Applied ${Object.keys(this.customFields).length} custom fields`);
    }
    
    // Rendi editabili i campi esistenti
    makeFieldsEditable() {
        // Monitora quando i campi vengono renderizzati
        const observer = new MutationObserver(() => {
            const targetFields = document.querySelectorAll('.target-field');
            
            targetFields.forEach(field => {
                const fieldKey = field.dataset.field;
                const labelElement = field.querySelector('.field-label');
                
                // Aggiungi icone di azione se non esistono
                if (labelElement && !field.querySelector('.field-actions')) {
                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'field-actions';
                    actionsDiv.style.cssText = `
                        display: flex;
                        gap: 0.5rem;
                        margin-left: auto;
                    `;
                    
                    // Pulsante Edit (per tutti i campi)
                    const editBtn = document.createElement('button');
                    editBtn.className = 'field-action-btn';
                    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                    editBtn.title = 'Modifica campo';
                    editBtn.style.cssText = `
                        background: none;
                        border: none;
                        color: var(--sol-gray-400);
                        cursor: pointer;
                        padding: 0.25rem;
                        font-size: 0.875rem;
                        transition: color var(--sol-transition-fast);
                    `;
                    editBtn.onmouseover = () => editBtn.style.color = 'var(--sol-primary)';
                    editBtn.onmouseout = () => editBtn.style.color = 'var(--sol-gray-400)';
                    editBtn.onclick = () => this.editField(fieldKey);
                    
                    actionsDiv.appendChild(editBtn);
                    
                    // Pulsante Delete (solo per campi custom)
                    if (this.customFields[fieldKey]) {
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'field-action-btn';
                        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                        deleteBtn.title = 'Elimina campo';
                        deleteBtn.style.cssText = editBtn.style.cssText;
                        deleteBtn.onmouseover = () => deleteBtn.style.color = 'var(--sol-danger)';
                        deleteBtn.onmouseout = () => deleteBtn.style.color = 'var(--sol-gray-400)';
                        deleteBtn.onclick = () => this.deleteField(fieldKey);
                        
                        actionsDiv.appendChild(deleteBtn);
                    }
                    
                    labelElement.style.display = 'flex';
                    labelElement.style.alignItems = 'center';
                    labelElement.appendChild(actionsDiv);
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Modifica campo esistente
    editField(fieldKey) {
        const field = window.importSystem.systemFields[fieldKey];
        if (!field) return;
        
        const isCustom = this.customFields[fieldKey] !== undefined;
        
        const modalContent = `
            <div class="edit-field-modal">
                <form id="editFieldForm" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div class="sol-form-group">
                        <label class="sol-form-label">Nome Campo</label>
                        <input type="text" id="editFieldName" class="sol-form-input" value="${field.name}" required>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">Descrizione</label>
                        <input type="text" id="editFieldDescription" class="sol-form-input" value="${field.description || ''}">
                    </div>
                    
                    ${isCustom ? `
                        <div class="sol-form-group">
                            <label class="sol-form-label">Tipo Dati</label>
                            <select id="editFieldType" class="sol-form-select">
                                ${Object.entries(this.fieldTypes).map(([key, type]) => 
                                    `<option value="${key}" ${field.type === key ? 'selected' : ''}>${type.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="sol-form-group">
                            <label class="sol-form-label">
                                <input type="checkbox" id="editFieldRequired" ${field.required ? 'checked' : ''} style="margin-right: 0.5rem;">
                                Campo Obbligatorio
                            </label>
                        </div>
                    ` : ''}
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">Parole Chiave (per auto-mapping)</label>
                        <input type="text" id="editFieldKeywords" class="sol-form-input" value="${(field.keywords || []).join(', ')}">
                    </div>
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                        <button type="button" class="sol-btn sol-btn-glass" onclick="window.ModalSystem.close('editFieldModal')">
                            Annulla
                        </button>
                        <button type="submit" class="sol-btn sol-btn-primary">
                            <i class="fas fa-save"></i> Salva Modifiche
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        if (window.ModalSystem) {
            window.ModalSystem.show({
                id: 'editFieldModal',
                title: `Modifica Campo: ${field.name}`,
                content: modalContent,
                size: 'md'
            });
            
            setTimeout(() => {
                const form = document.getElementById('editFieldForm');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        this.saveFieldChanges(fieldKey, isCustom);
                    });
                }
            }, 100);
        }
    }
    
    // Salva modifiche campo
    saveFieldChanges(fieldKey, isCustom) {
        const field = window.importSystem.systemFields[fieldKey];
        
        // Aggiorna dati
        field.name = document.getElementById('editFieldName').value;
        field.description = document.getElementById('editFieldDescription').value;
        field.keywords = document.getElementById('editFieldKeywords').value
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);
        
        if (isCustom) {
            field.type = document.getElementById('editFieldType').value;
            field.required = document.getElementById('editFieldRequired').checked;
            field.icon = this.fieldTypes[field.type].icon;
            
            // Aggiorna in localStorage
            this.customFields[fieldKey] = {
                name: field.name,
                key: fieldKey,
                description: field.description,
                type: field.type,
                required: field.required,
                keywords: field.keywords,
                custom: true
            };
            localStorage.setItem('customSystemFields', JSON.stringify(this.customFields));
        }
        
        // Re-render
        window.importSystem.renderMappingInterface();
        
        // Chiudi modal
        window.ModalSystem.close('editFieldModal');
        window.NotificationSystem.show('Campo Aggiornato', `Le modifiche al campo "${field.name}" sono state salvate`, 'success');
    }
    
    // Elimina campo custom
    deleteField(fieldKey) {
        const field = window.importSystem.systemFields[fieldKey];
        
        if (window.ModalSystem) {
            window.ModalSystem.confirm({
                title: 'Conferma Eliminazione',
                message: `Sei sicuro di voler eliminare il campo "${field.name}"?`,
                confirmText: 'Elimina',
                cancelText: 'Annulla',
                type: 'danger'
            }).then(confirmed => {
                if (confirmed) {
                    // Rimuovi dal sistema
                    delete window.importSystem.systemFields[fieldKey];
                    
                    // Rimuovi da localStorage
                    delete this.customFields[fieldKey];
                    localStorage.setItem('customSystemFields', JSON.stringify(this.customFields));
                    
                    // Rimuovi eventuali mapping
                    Object.keys(window.importSystem.fieldMappings).forEach(col => {
                        if (window.importSystem.fieldMappings[col] === fieldKey) {
                            delete window.importSystem.fieldMappings[col];
                        }
                    });
                    
                    // Re-render
                    window.importSystem.renderMappingInterface();
                    
                    window.NotificationSystem.show('Campo Eliminato', `Il campo "${field.name}" è stato eliminato`, 'success');
                }
            });
        }
    }
}

// Inizializza quando il sistema è pronto
function initSystemFieldsEditor() {
    if (!window.importSystem) {
        setTimeout(initSystemFieldsEditor, 100);
        return;
    }
    
    window.systemFieldsEditor = new SystemFieldsEditor();
    window.systemFieldsEditor.init();
}

// Avvia
document.addEventListener('DOMContentLoaded', initSystemFieldsEditor);
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initSystemFieldsEditor();
}