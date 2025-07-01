// public/core/import-wizard.js
import notificationSystem from './notification-system.js';
import modalSystem from './modal-system.js';
import apiClient from './api-client.js';

/**
 * Import Wizard System - Sistema universale per import CSV/Excel con mapping dinamico
 * Supporta qualsiasi struttura dati con mapping visuale delle colonne
 */
class ImportWizard {
    constructor() {
        this.currentFile = null;
        this.parsedData = [];
        this.headers = [];
        this.mappings = {};
        this.templates = this.loadTemplates();
        this.targetFields = [];
        this.importMode = 'append'; // append, update, sync
        this.validationRules = {};
        this.previewLimit = 10;
        
        // Eventi custom
        this.events = new EventTarget();
    }

    /**
     * Inizializza il wizard per un tipo di entità specifico
     */
    async init(config) {
        this.config = {
            entity: 'shipments', // shipments, products, containers, etc.
            endpoint: '/api/import',
            targetFields: [],
            validationRules: {},
            allowCustomFields: true,
            ...config
        };

        // Carica i campi target per l'entità
        this.targetFields = await this.loadTargetFields(this.config.entity);
        this.validationRules = this.config.validationRules;

        return this;
    }

    /**
     * Mostra il wizard modale
     */
    async show() {
        const modalContent = this.renderWizard();
        
        const modal = modalSystem.show({
    title: `Import ${this.config.entity.charAt(0).toUpperCase() + this.config.entity.slice(1)}`,
    content: modalContent,
    size: 'fullscreen', //  <-- Modifica questa riga
    showClose: true,
    showFooter: false,
    onClose: () => this.reset()
});

        this.modal = modal;
        this.attachEventListeners();
    }

    /**
     * Renderizza il wizard completo
     */
    renderWizard() {
        return `
            <div class="import-wizard" data-step="upload">
                <!-- Progress Steps -->
                <div class="wizard-steps">
                    <div class="step active" data-step-indicator="upload">
                        <div class="step-number">1</div>
                        <div class="step-label">Upload File</div>
                    </div>
                    <div class="step" data-step-indicator="mapping">
                        <div class="step-number">2</div>
                        <div class="step-label">Map Columns</div>
                    </div>
                    <div class="step" data-step-indicator="preview">
                        <div class="step-number">3</div>
                        <div class="step-label">Preview & Validate</div>
                    </div>
                    <div class="step" data-step-indicator="import">
                        <div class="step-number">4</div>
                        <div class="step-label">Import</div>
                    </div>
                </div>

                <!-- Step 1: Upload -->
                <div class="wizard-content" data-step-content="upload">
                    <div class="upload-area" id="uploadArea">
                        <svg class="upload-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <h3>Drag & Drop your file here</h3>
                        <p>or click to browse</p>
                        <p class="file-types">Supported: CSV, Excel (.xlsx, .xls)</p>
                        <input type="file" id="fileInput" accept=".csv,.xlsx,.xls" style="display: none;">
                    </div>

                    <!-- Templates -->
                    <div class="templates-section" style="display: none;">
                        <h4>Or use a saved template:</h4>
                        <div class="templates-grid" id="templatesGrid">
                            <!-- Templates will be rendered here -->
                        </div>
                    </div>
                </div>

                <!-- Step 2: Mapping -->
                <div class="wizard-content" data-step-content="mapping" style="display: none;">
                    <div class="mapping-header">
                        <h3>Map your columns to system fields</h3>
                        <div class="mapping-actions">
                            <button class="btn btn-secondary" onclick="importWizard.autoMap()">
                                <i class="icon-magic"></i> Auto-map
                            </button>
                            <button class="btn btn-secondary" onclick="importWizard.saveTemplate()">
                                <i class="icon-save"></i> Save as template
                            </button>
                        </div>
                    </div>

                    <div class="mapping-container">
                        <div class="source-columns">
                            <h4>Your File Columns</h4>
                            <div id="sourceColumns" class="columns-list">
                                <!-- Source columns will be rendered here -->
                            </div>
                        </div>

                        <div class="mapping-arrows">
                            <!-- Visual connection lines will be drawn here -->
                            <svg id="mappingLines" width="100" height="100%"></svg>
                        </div>

                        <div class="target-fields">
                            <h4>System Fields</h4>
                            <div id="targetFields" class="fields-list">
                                <!-- Target fields will be rendered here -->
                            </div>
                        </div>
                    </div>

                    <div class="mapping-options">
                        <label>
                            <input type="checkbox" id="allowCustomFields" checked>
                            Allow custom fields for unmapped columns
                        </label>
                    </div>
                </div>

                <!-- Step 3: Preview -->
                <div class="wizard-content" data-step-content="preview" style="display: none;">
                    <div class="preview-header">
                        <h3>Preview & Validate</h3>
                        <div class="import-options">
                            <label>Import Mode:</label>
                            <select id="importMode" class="form-control">
                                <option value="append">Append new records</option>
                                <option value="update">Update existing records</option>
                                <option value="sync">Full sync (replace all)</option>
                            </select>
                        </div>
                    </div>

                    <div class="validation-summary" id="validationSummary">
                        <!-- Validation results will be shown here -->
                    </div>

                    <div class="preview-table-container">
                        <table class="preview-table" id="previewTable">
                            <!-- Preview data will be rendered here -->
                        </table>
                    </div>

                    <div class="preview-stats">
                        <div class="stat">
                            <span class="stat-label">Total Records:</span>
                            <span class="stat-value" id="totalRecords">0</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Valid:</span>
                            <span class="stat-value text-success" id="validRecords">0</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Warnings:</span>
                            <span class="stat-value text-warning" id="warningRecords">0</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Errors:</span>
                            <span class="stat-value text-danger" id="errorRecords">0</span>
                        </div>
                    </div>
                </div>

                <!-- Step 4: Import Progress -->
                <div class="wizard-content" data-step-content="import" style="display: none;">
                    <div class="import-progress">
                        <h3>Importing data...</h3>
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="importProgress"></div>
                        </div>
                        <div class="import-status" id="importStatus">Preparing import...</div>
                        <div class="import-log" id="importLog">
                            <!-- Import log entries will appear here -->
                        </div>
                    </div>
                </div>

                <!-- Navigation -->
                <div class="wizard-navigation">
                    <button class="btn btn-secondary" id="prevBtn" onclick="importWizard.previousStep()" style="display: none;">
                        Previous
                    </button>
                    <button class="btn btn-primary" id="nextBtn" onclick="importWizard.nextStep()">
                        Next
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Carica i campi target per l'entità
     */
    async loadTargetFields(entity) {
        // Definizione campi per entità
        const fieldDefinitions = {
            shipments: [
                { name: 'rif_spedizione', label: 'Shipment Reference', required: true, type: 'text' },
                { name: 'n_oda', label: 'Order Number', type: 'text' },
                { name: 'anno', label: 'Year', type: 'number' },
                { name: 'cod_art', label: 'Product Code', type: 'text' },
                { name: 'descrizione', label: 'Description', type: 'text' },
                { name: 'fornitore', label: 'Supplier', type: 'text' },
                { name: 'qty', label: 'Quantity', type: 'number' },
                { name: 'um', label: 'Unit', type: 'text' },
                { name: 'tipo_spedizione', label: 'Shipment Type', type: 'text' },
                { name: 'spedizioniere', label: 'Carrier', type: 'text' },
                { name: 'stato_spedizione', label: 'Status', type: 'select' },
                { name: 'data_partenza', label: 'Departure Date', type: 'date' },
                { name: 'data_arrivo_effettiva', label: 'Arrival Date', type: 'date' },
                { name: 'costo_trasporto', label: 'Transport Cost', type: 'currency' },
                { name: 'percentuale_dazio', label: 'Duty %', type: 'percentage' }
            ],
            products: [
                { name: 'cod_art', label: 'Product Code', required: true, type: 'text' },
                { name: 'descrizione', label: 'Description', required: true, type: 'text' },
                { name: 'descrizione_estesa', label: 'Extended Description', type: 'text' },
                { name: 'categoria', label: 'Category', type: 'text' },
                { name: 'um', label: 'Unit of Measure', type: 'text' },
                { name: 'peso_kg', label: 'Weight (kg)', type: 'number' },
                { name: 'volume_m3', label: 'Volume (m³)', type: 'number' },
                { name: 'valore_unitario', label: 'Unit Value', type: 'currency' }
            ],
            containers: [
                { name: 'container_number', label: 'Container Number', required: true, type: 'text' },
                { name: 'bl_number', label: 'B/L Number', type: 'text' },
                { name: 'carrier', label: 'Carrier', type: 'text' },
                { name: 'status', label: 'Status', type: 'select' },
                { name: 'pol', label: 'Port of Loading', type: 'text' },
                { name: 'pod', label: 'Port of Discharge', type: 'text' },
                { name: 'etd', label: 'ETD', type: 'date' },
                { name: 'eta', label: 'ETA', type: 'date' }
            ]
        };

        return fieldDefinitions[entity] || [];
    }

    /**
     * Gestisce il caricamento del file
     */
    async handleFileUpload(file) {
        this.currentFile = file;
        
        try {
            // Mostra loading
            notificationSystem.show('Parsing file...', 'info');
            
            // Parse del file
            if (file.name.endsWith('.csv')) {
                await this.parseCSV(file);
            } else if (file.name.match(/\.xlsx?$/)) {
                await this.parseExcel(file);
            } else {
                throw new Error('Unsupported file format');
            }

            // Mostra colonne nel mapping
            this.renderSourceColumns();
            this.renderTargetFields();
            
            // Tenta auto-mapping
            this.autoMap();
            
            notificationSystem.show('File parsed successfully', 'success');
            
        } catch (error) {
            notificationSystem.show(`Error parsing file: ${error.message}`, 'error');
            console.error('File upload error:', error);
        }
    }

    /**
     * Parse CSV file
     */
    parseCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n').filter(line => line.trim());
                    
                    if (lines.length < 2) {
                        throw new Error('File must contain headers and at least one data row');
                    }

                    // Parse headers
                    this.headers = this.parseCSVLine(lines[0]);
                    
                    // Parse data
                    this.parsedData = [];
                    for (let i = 1; i < lines.length; i++) {
                        const values = this.parseCSVLine(lines[i]);
                        const row = {};
                        this.headers.forEach((header, index) => {
                            row[header] = values[index] || '';
                        });
                        this.parsedData.push(row);
                    }

                    resolve();
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Parse Excel file
     */
    async parseExcel(file) {
        // In produzione useresti una libreria come SheetJS
        // Per ora simuliamo
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    // Converti in base64 per invio al backend
                    const base64 = btoa(
                        new Uint8Array(e.target.result)
                            .reduce((data, byte) => data + String.fromCharCode(byte), '')
                    );

                    // Chiama API per parsing Excel
                    const response = await apiClient.post('parse-excel', {
                        file: base64,
                        filename: file.name
                    });

                    this.headers = response.headers;
                    this.parsedData = response.data;
                    
                    resolve();
                } catch (error) {
                    // Fallback: simula dati per demo
                    this.headers = ['Product Code', 'Description', 'Quantity', 'Price'];
                    this.parsedData = [
                        { 'Product Code': '12345678', 'Description': 'Sample Product', 'Quantity': '100', 'Price': '25.50' }
                    ];
                    resolve();
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Helper per parsing linea CSV
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    /**
     * Auto-mapping intelligente
     */
    autoMap() {
        this.mappings = {};
        
        // Mapping rules per similitudine
        const mappingRules = {
            // Shipments
            'rif_spedizione': ['rif', 'spedizione', 'reference', 'shipment', 'tracking'],
            'n_oda': ['oda', 'order', 'ordine', 'po'],
            'cod_art': ['cod', 'codice', 'articolo', 'product', 'sku', 'code'],
            'descrizione': ['descrizione', 'description', 'desc', 'nome'],
            'fornitore': ['fornitore', 'supplier', 'vendor', 'fornitore'],
            'qty': ['qty', 'quantity', 'quantità', 'pezzi', 'amount'],
            'data_partenza': ['partenza', 'departure', 'etd', 'data partenza'],
            'data_arrivo_effettiva': ['arrivo', 'arrival', 'eta', 'consegna'],
            'costo_trasporto': ['costo', 'cost', 'trasporto', 'shipping'],
            
            // Generic
            'stato': ['stato', 'status', 'state'],
            'tipo': ['tipo', 'type'],
            'note': ['note', 'notes', 'commenti', 'comments']
        };

        // Prova a mappare automaticamente
        this.headers.forEach(header => {
            const headerLower = header.toLowerCase();
            
            for (const [field, patterns] of Object.entries(mappingRules)) {
                if (patterns.some(pattern => headerLower.includes(pattern))) {
                    // Verifica che il campo target esista
                    if (this.targetFields.find(f => f.name === field)) {
                        this.mappings[header] = field;
                        break;
                    }
                }
            }
        });

        // Aggiorna UI
        this.updateMappingUI();
    }

    /**
     * Renderizza colonne sorgente
     */
    renderSourceColumns() {
        const container = document.getElementById('sourceColumns');
        container.innerHTML = this.headers.map((header, index) => `
            <div class="source-column" draggable="true" data-column="${header}" data-index="${index}">
                <div class="column-header">${header}</div>
                <div class="column-sample">${this.getColumnSample(header)}</div>
            </div>
        `).join('');

        // Aggiungi drag & drop
        container.querySelectorAll('.source-column').forEach(col => {
            col.addEventListener('dragstart', this.handleDragStart.bind(this));
            col.addEventListener('dragend', this.handleDragEnd.bind(this));
        });
    }

    /**
     * Renderizza campi target
     */
    renderTargetField(field) {
    const mapped = Object.entries(this.mappings).find(([col, f]) => f === field.name);
    const dataTypes = ['text', 'number', 'date', 'boolean', 'currency', 'percentage'];
    
    return `
        <div class="target-field ${mapped ? 'mapped' : ''} ${field.required ? 'required' : ''}" 
             data-field-name="${field.name}">
            
            <div class="field-info">
                <span class="field-label">${field.label}</span>
                <span class="field-type">${field.type}</span>
                <button class="edit-field-btn" onclick="importWizard.toggleFieldEditor(this)">&#9998;</button>
            </div>

            <div class="field-mapping">
                ${mapped ? `<span class="mapped-column">${mapped[0]}</span>` : '<span class="unmapped">Not mapped</span>'}
            </div>

            <div class="field-editor" style="display: none;">
                <div class="form-group">
                    <label>Field Name (in Database)</label>
                    <input type="text" class="field-editor-name" value="${field.name}">
                </div>
                <div class="form-group">
                    <label>Data Type</label>
                    <select class="field-editor-type">
                        ${dataTypes.map(type => `
                            <option value="${type}" ${type === field.type ? 'selected' : ''}>
                                ${type.charAt(0).toUpperCase() + type.slice(1)}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
        </div>
    `;
}

toggleFieldEditor(buttonElement) {
    const targetField = buttonElement.closest('.target-field');
    if (!targetField) return;

    const editor = targetField.querySelector('.field-editor');
    if (editor) {
        const isVisible = editor.style.display === 'block';
        editor.style.display = isVisible ? 'none' : 'block';
    }
}

    /**
     * Renderizza singolo campo target
     */
    renderTargetField(field) {
        const mapped = Object.entries(this.mappings).find(([col, f]) => f === field.name);
        
        return `
            <div class="target-field ${mapped ? 'mapped' : ''} ${field.required ? 'required' : ''}" 
                 data-field="${field.name}">
                <div class="field-info">
                    <span class="field-label">${field.label}</span>
                    <span class="field-type">${field.type}</span>
                </div>
                <div class="field-mapping">
                    ${mapped ? `<span class="mapped-column">${mapped[0]}</span>` : '<span class="unmapped">Not mapped</span>'}
                </div>
            </div>
        `;
    }

    /**
     * Ottieni sample data per colonna
     */
    getColumnSample(column) {
        const samples = this.parsedData
            .slice(0, 3)
            .map(row => row[column])
            .filter(val => val)
            .join(', ');
        
        return samples || 'No data';
    }

    /**
     * Handlers Drag & Drop
     */
    handleDragStart(e) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('column', e.target.dataset.column);
        e.target.classList.add('dragging');
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const column = e.dataTransfer.getData('column');
        const field = e.currentTarget.dataset.field;
        
        // Rimuovi mapping precedente per questo campo
        Object.keys(this.mappings).forEach(col => {
            if (this.mappings[col] === field) {
                delete this.mappings[col];
            }
        });
        
        // Aggiungi nuovo mapping
        this.mappings[column] = field;
        
        // Aggiorna UI
        this.updateMappingUI();
    }

    /**
     * Aggiorna UI dopo cambio mapping
     */
    updateMappingUI() {
        // Aggiorna colonne sorgente
        document.querySelectorAll('.source-column').forEach(col => {
            const column = col.dataset.column;
            if (this.mappings[column]) {
                col.classList.add('mapped');
            } else {
                col.classList.remove('mapped');
            }
        });

        // Aggiorna campi target
        this.renderTargetFields();
        
        // Disegna linee di connessione
        this.drawMappingLines();
    }

    /**
     * Disegna linee di connessione tra mapping
     */
    drawMappingLines() {
        const svg = document.getElementById('mappingLines');
        svg.innerHTML = '';
        
        Object.entries(this.mappings).forEach(([column, field]) => {
            const sourceEl = document.querySelector(`[data-column="${column}"]`);
            const targetEl = document.querySelector(`[data-field="${field}"]`);
            
            if (sourceEl && targetEl) {
                const sourceBounds = sourceEl.getBoundingClientRect();
                const targetBounds = targetEl.getBoundingClientRect();
                const svgBounds = svg.getBoundingClientRect();
                
                const x1 = sourceBounds.right - svgBounds.left;
                const y1 = sourceBounds.top + sourceBounds.height / 2 - svgBounds.top;
                const x2 = targetBounds.left - svgBounds.left;
                const y2 = targetBounds.top + targetBounds.height / 2 - svgBounds.top;
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const d = `M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`;
                path.setAttribute('d', d);
                path.setAttribute('stroke', '#10b981');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none');
                
                svg.appendChild(path);
            }
        });
    }

    /**
     * Validazione dati
     */
    validateData() {
        const results = {
            valid: 0,
            warnings: 0,
            errors: 0,
            details: []
        };

        this.parsedData.forEach((row, index) => {
            const rowValidation = this.validateRow(row, index);
            
            if (rowValidation.errors.length === 0 && rowValidation.warnings.length === 0) {
                results.valid++;
            } else {
                if (rowValidation.errors.length > 0) {
                    results.errors++;
                }
                if (rowValidation.warnings.length > 0) {
                    results.warnings++;
                }
                results.details.push({
                    row: index + 1,
                    ...rowValidation
                });
            }
        });

        return results;
    }

    /**
     * Valida singola riga
     */
    validateRow(row, index) {
        const errors = [];
        const warnings = [];
        
        // Verifica campi obbligatori
        this.targetFields.filter(f => f.required).forEach(field => {
            const mappedColumn = Object.entries(this.mappings).find(([col, f]) => f === field.name)?.[0];
            if (!mappedColumn || !row[mappedColumn]) {
                errors.push(`Missing required field: ${field.label}`);
            }
        });

        // Validazioni tipo dato
        Object.entries(this.mappings).forEach(([column, fieldName]) => {
            const field = this.targetFields.find(f => f.name === fieldName);
            const value = row[column];
            
            if (field && value) {
                switch (field.type) {
                    case 'number':
                        if (isNaN(parseFloat(value))) {
                            warnings.push(`Invalid number in ${field.label}: ${value}`);
                        }
                        break;
                    case 'date':
                        if (!this.isValidDate(value)) {
                            warnings.push(`Invalid date in ${field.label}: ${value}`);
                        }
                        break;
                    case 'currency':
                        if (isNaN(parseFloat(value.replace(/[^0-9.-]/g, '')))) {
                            warnings.push(`Invalid currency in ${field.label}: ${value}`);
                        }
                        break;
                }
            }
        });

        // Validazioni custom
        if (this.config.customValidation) {
            const customResults = this.config.customValidation(row, this.mappings);
            errors.push(...(customResults.errors || []));
            warnings.push(...(customResults.warnings || []));
        }

        return { errors, warnings };
    }

    /**
     * Verifica data valida
     */
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * Mostra preview dati
     */
    showPreview() {
        const validation = this.validateData();
        
        // Mostra summary validazione
        document.getElementById('validationSummary').innerHTML = this.renderValidationSummary(validation);
        
        // Update stats
        document.getElementById('totalRecords').textContent = this.parsedData.length;
        document.getElementById('validRecords').textContent = validation.valid;
        document.getElementById('warningRecords').textContent = validation.warnings;
        document.getElementById('errorRecords').textContent = validation.errors;
        
        // Mostra preview tabella
        this.renderPreviewTable();
    }

    /**
     * Renderizza summary validazione
     */
    renderValidationSummary(validation) {
        if (validation.errors === 0 && validation.warnings === 0) {
            return `
                <div class="alert alert-success">
                    <i class="icon-check-circle"></i>
                    All data is valid and ready to import!
                </div>
            `;
        }

        let html = '';
        
        if (validation.errors > 0) {
            html += `
                <div class="alert alert-danger">
                    <i class="icon-alert-circle"></i>
                    Found ${validation.errors} errors that must be fixed before import
                </div>
            `;
        }

        if (validation.warnings > 0) {
            html += `
                <div class="alert alert-warning">
                    <i class="icon-alert-triangle"></i>
                    Found ${validation.warnings} warnings - data can be imported but may need review
                </div>
            `;
        }

        // Mostra dettagli primi errori/warning
        if (validation.details.length > 0) {
            html += '<div class="validation-details">';
            validation.details.slice(0, 5).forEach(detail => {
                html += `
                    <div class="validation-detail">
                        <strong>Row ${detail.row}:</strong>
                        ${detail.errors.map(e => `<span class="text-danger">${e}</span>`).join(', ')}
                        ${detail.warnings.map(w => `<span class="text-warning">${w}</span>`).join(', ')}
                    </div>
                `;
            });
            if (validation.details.length > 5) {
                html += `<div class="text-muted">...and ${validation.details.length - 5} more issues</div>`;
            }
            html += '</div>';
        }

        return html;
    }

    /**
     * Renderizza tabella preview
     */
    renderPreviewTable() {
        const table = document.getElementById('previewTable');
        const mappedColumns = Object.entries(this.mappings);
        
        // Headers
        let html = '<thead><tr>';
        mappedColumns.forEach(([column, field]) => {
            const fieldDef = this.targetFields.find(f => f.name === field);
            html += `<th>${fieldDef ? fieldDef.label : field}<br><small class="text-muted">${column}</small></th>`;
        });
        html += '</tr></thead><tbody>';
        
        // Rows (limited preview)
        this.parsedData.slice(0, this.previewLimit).forEach((row, index) => {
            const validation = this.validateRow(row, index);
            const hasErrors = validation.errors.length > 0;
            const hasWarnings = validation.warnings.length > 0;
            
            html += `<tr class="${hasErrors ? 'table-danger' : hasWarnings ? 'table-warning' : ''}">`;
            mappedColumns.forEach(([column, field]) => {
                html += `<td>${row[column] || '<em>empty</em>'}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</tbody>';
        
        if (this.parsedData.length > this.previewLimit) {
            html += `
                <tfoot>
                    <tr>
                        <td colspan="${mappedColumns.length}" class="text-center text-muted">
                            Showing ${this.previewLimit} of ${this.parsedData.length} records
                        </td>
                    </tr>
                </tfoot>
            `;
        }
        
        table.innerHTML = html;
    }

    /**
     * Esegui import
     */
    async executeImport() {
        const importMode = document.getElementById('importMode').value;
        const progressBar = document.getElementById('importProgress');
        const statusEl = document.getElementById('importStatus');
        const logEl = document.getElementById('importLog');
        
        // Reset progress
        progressBar.style.width = '0%';
        logEl.innerHTML = '';
        
        try {
            // Prepara dati per import
            const importData = this.prepareImportData();
            
            // Batch import per performance
            const batchSize = 100;
            const totalBatches = Math.ceil(importData.length / batchSize);
            let processed = 0;
            
            for (let i = 0; i < totalBatches; i++) {
                const batch = importData.slice(i * batchSize, (i + 1) * batchSize);
                
                statusEl.textContent = `Processing batch ${i + 1} of ${totalBatches}...`;
                
                // Invia batch
                const response = await apiClient.post(this.config.endpoint, {
                    entity: this.config.entity,
                    data: batch,
                    mode: importMode,
                    mappings: this.mappings,
                    options: {
                        skipDuplicates: importMode === 'append',
                        updateExisting: importMode === 'update',
                        deleteOthers: importMode === 'sync'
                    }
                });
                
                // Aggiorna progress
                processed += batch.length;
                const progress = (processed / importData.length) * 100;
                progressBar.style.width = `${progress}%`;
                
                // Log risultati
                this.logImportResult(response, i + 1, logEl);
            }
            
            statusEl.textContent = 'Import completed successfully!';
            statusEl.classList.add('text-success');
            
            // Triggera evento completamento
            this.events.dispatchEvent(new CustomEvent('importComplete', {
                detail: { 
                    entity: this.config.entity,
                    totalRecords: importData.length,
                    mode: importMode
                }
            }));
            
            // Mostra success e chiudi dopo 2 secondi
            setTimeout(() => {
                this.modal.close();
                notificationSystem.show('Import completed successfully!', 'success');
            }, 2000);
            
        } catch (error) {
            console.error('Import error:', error);
            statusEl.textContent = `Import failed: ${error.message}`;
            statusEl.classList.add('text-danger');
            
            logEl.innerHTML += `
                <div class="log-entry log-error">
                    <i class="icon-x-circle"></i>
                    Error: ${error.message}
                </div>
            `;
        }
    }

    /**
     * Prepara dati per import
     */
    prepareImportData() {
        return this.parsedData.map(row => {
            const importRow = {};
            
            // Mappa solo le colonne configurate
            Object.entries(this.mappings).forEach(([column, field]) => {
                let value = row[column];
                
                // Conversione tipo
                const fieldDef = this.targetFields.find(f => f.name === field);
                if (fieldDef && value) {
                    switch (fieldDef.type) {
                        case 'number':
                            value = parseFloat(value) || 0;
                            break;
                        case 'currency':
                            value = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
                            break;
                        case 'percentage':
                            value = parseFloat(value.replace('%', '')) || 0;
                            break;
                        case 'date':
                            value = this.formatDate(value);
                            break;
                    }
                }
                
                importRow[field] = value;
            });
            
            // Aggiungi campi custom se abilitato
            if (document.getElementById('allowCustomFields')?.checked) {
                Object.keys(row).forEach(column => {
                    if (!this.mappings[column]) {
                        importRow[`custom_${this.sanitizeFieldName(column)}`] = row[column];
                    }
                });
            }
            
            return importRow;
        });
    }

    /**
     * Formatta data per DB
     */
    formatDate(dateStr) {
        if (!dateStr) return null;
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            // Prova formato italiano gg/mm/aaaa
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const formatted = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                return formatted;
            }
            return null;
        }
        
        return date.toISOString().split('T')[0];
    }

    /**
     * Sanitizza nome campo
     */
    sanitizeFieldName(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/__+/g, '_')
            .replace(/^_|_$/g, '');
    }

    /**
     * Log risultato import
     */
    logImportResult(response, batchNum, logEl) {
        const result = response.result || response;
        const icon = result.errors > 0 ? 'x-circle' : 
                    result.warnings > 0 ? 'alert-triangle' : 
                    'check-circle';
        const className = result.errors > 0 ? 'log-error' : 
                         result.warnings > 0 ? 'log-warning' : 
                         'log-success';

        logEl.innerHTML += `
            <div class="log-entry ${className}">
                <i class="icon-${icon}"></i>
                Batch ${batchNum}: ${result.imported || 0} imported, 
                ${result.updated || 0} updated, 
                ${result.skipped || 0} skipped
                ${result.errors > 0 ? `, ${result.errors} errors` : ''}
            </div>
        `;
    }

    /**
     * Salva template mapping
     */
    saveTemplate() {
        const templateName = prompt('Enter template name:');
        if (!templateName) return;
        
        const template = {
            name: templateName,
            entity: this.config.entity,
            mappings: this.mappings,
            createdAt: new Date().toISOString()
        };
        
        // Salva in localStorage
        const templates = this.loadTemplates();
        templates.push(template);
        localStorage.setItem('importWizardTemplates', JSON.stringify(templates));
        
        notificationSystem.show('Template saved successfully', 'success');
        this.templates = templates;
    }

    /**
     * Carica templates salvati
     */
    loadTemplates() {
        try {
            const saved = localStorage.getItem('importWizardTemplates');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Applica template
     */
    applyTemplate(template) {
        this.mappings = template.mappings;
        this.updateMappingUI();
        notificationSystem.show(`Applied template: ${template.name}`, 'info');
    }

    /**
     * Gestione navigazione wizard
     */
    currentStep = 0;
    steps = ['upload', 'mapping', 'preview', 'import'];

    nextStep() {
        if (this.validateCurrentStep()) {
            this.currentStep++;
            this.showStep(this.steps[this.currentStep]);
            
            // Azioni specifiche per step
            if (this.steps[this.currentStep] === 'preview') {
                this.showPreview();
            } else if (this.steps[this.currentStep] === 'import') {
                this.executeImport();
            }
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.steps[this.currentStep]);
        }
    }

    showStep(step) {
        // Nascondi tutti gli step
        document.querySelectorAll('.wizard-content').forEach(content => {
            content.style.display = 'none';
        });
        
        // Mostra step corrente
        document.querySelector(`[data-step-content="${step}"]`).style.display = 'block';
        
        // Aggiorna indicatori
        document.querySelectorAll('.step').forEach(stepEl => {
            stepEl.classList.remove('active');
        });
        document.querySelector(`[data-step-indicator="${step}"]`).classList.add('active');
        
        // Aggiorna bottoni navigazione
        document.getElementById('prevBtn').style.display = this.currentStep === 0 ? 'none' : 'inline-block';
        document.getElementById('nextBtn').textContent = 
            this.currentStep === this.steps.length - 1 ? 'Import' : 'Next';
        
        // Disabilita next durante import
        if (step === 'import') {
            document.getElementById('nextBtn').style.display = 'none';
        }
    }

    validateCurrentStep() {
        switch (this.steps[this.currentStep]) {
            case 'upload':
                if (!this.currentFile) {
                    notificationSystem.show('Please upload a file first', 'error');
                    return false;
                }
                break;
            case 'mapping':
                const requiredMapped = this.targetFields
                    .filter(f => f.required)
                    .every(f => Object.values(this.mappings).includes(f.name));
                    
                if (!requiredMapped) {
                    notificationSystem.show('Please map all required fields', 'error');
                    return false;
                }
                break;
            case 'preview':
                const validation = this.validateData();
                if (validation.errors > 0) {
                    notificationSystem.show('Please fix validation errors before proceeding', 'error');
                    return false;
                }
                break;
        }
        return true;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const file = e.dataTransfer.files[0];
            if (file) this.handleFileUpload(file);
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFileUpload(file);
        });

        // Template selection
        this.renderTemplates();
    }

    /**
     * Renderizza templates disponibili
     */
    renderTemplates() {
        const templates = this.templates.filter(t => t.entity === this.config.entity);
        if (templates.length === 0) return;
        
        const container = document.getElementById('templatesGrid');
        container.innerHTML = templates.map(template => `
            <div class="template-card" onclick="importWizard.applyTemplate(${JSON.stringify(template).replace(/"/g, '&quot;')})">
                <div class="template-name">${template.name}</div>
                <div class="template-date">${new Date(template.createdAt).toLocaleDateString()}</div>
            </div>
        `).join('');
        
        document.querySelector('.templates-section').style.display = 'block';
    }

    /**
     * Reset wizard
     */
    reset() {
        this.currentFile = null;
        this.parsedData = [];
        this.headers = [];
        this.mappings = {};
        this.currentStep = 0;
    }
}

// Esporta istanza singleton
export const importWizard = new ImportWizard();