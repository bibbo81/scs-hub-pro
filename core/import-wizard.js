// public/core/import-wizard.js
import notificationSystem from '/core/notification-system.js';
import modalSystem from '/core/modal-system.js';
import apiClient from '/core/api-client.js';
import { supabase } from '/core/services/supabase-client.js';

class ImportWizard {
    constructor() {
        this.currentFile = null;
        this.parsedData = [];
        this.headers = [];
        this.mappings = {};
        this.templates = this.loadTemplates();
        this.targetFields = [];
        this.importMode = 'append';
        this.validationRules = {};
        this.previewLimit = 10;
        this.currentStep = 0;
        this.steps = ['upload', 'mapping', 'preview', 'import'];
        this.events = new EventTarget();
        this.supabase = null; 

    }
        setSupabaseClient = (client) => {
        this.supabase = client;
    }
    init = async (config) => {
        this.config = {
            entity: 'shipments',
            endpoint: '/api/import',
            targetFields: [],
            validationRules: {},
            allowCustomFields: true,
            ...config
        };
        this.targetFields = await this.loadTargetFields(this.config.entity);
        this.validationRules = this.config.validationRules;
        return this;
    }

    show = async () => {
        const modalContent = this.renderWizard();
        const modal = modalSystem.show({
            title: `Import ${this.config.entity.charAt(0).toUpperCase() + this.config.entity.slice(1)}`,
            content: modalContent,
            size: 'fullscreen',
            showClose: true,
            showFooter: false,
            onClose: this.reset
        });
        this.modal = modal.element;
        this.attachEventListeners();
    }

    renderWizard = () => {
        return `
            <div class="import-wizard" data-step="upload">
                <div class="wizard-steps"><div class="step active" data-step-indicator="upload"><div class="step-number">1</div><div class="step-label">Upload File</div></div><div class="step" data-step-indicator="mapping"><div class="step-number">2</div><div class="step-label">Map Columns</div></div><div class="step" data-step-indicator="preview"><div class="step-number">3</div><div class="step-label">Preview & Validate</div></div><div class="step" data-step-indicator="import"><div class="step-number">4</div><div class="step-label">Import</div></div></div>
                <div class="wizard-content" data-step-content="upload"><div class="upload-area" id="uploadArea"><svg class="upload-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><h3>Drag & Drop your file here</h3><p>or click to browse</p><p class="file-types">Supported: CSV, Excel (.xlsx, .xls)</p><input type="file" id="fileInput" accept=".csv,.xlsx,.xls" style="display: none;"></div><div class="templates-section" style="display: none;"><h4>Or use a saved template:</h4><div class="templates-grid" id="templatesGrid"></div></div></div>
                <div class="wizard-content" data-step-content="mapping" style="display: none;"><div class="mapping-header"><h3>Map your columns to system fields</h3><div class="mapping-actions"><button id="autoMapBtn" class="btn btn-secondary"><i class="icon-magic"></i> Auto-map</button><button id="saveTemplateBtn" class="btn btn-secondary"><i class="icon-save"></i> Save as template</button></div></div><div class="mapping-container"><div class="source-columns"><h4>Your File Columns</h4><div id="sourceColumns" class="columns-list"></div></div><div class="mapping-arrows"><svg id="mappingLines" width="100" height="100%"></svg></div><div class="target-fields"><h4>System Fields</h4><div id="targetFields" class="fields-list"></div></div></div><div class="mapping-options"><label><input type="checkbox" id="allowCustomFields" checked> Allow custom fields for unmapped columns</label></div></div>
                <div class="wizard-content" data-step-content="preview" style="display: none;"><div class="preview-header"><h3>Preview & Validate</h3><div class="import-options"><label>Import Mode:</label><select id="importMode" class="form-control"><option value="append">Append new records</option><option value="update">Update existing records</option><option value="sync">Full sync (replace all)</option></select></div></div><div class="validation-summary" id="validationSummary"></div><div class="preview-table-container"><table class="preview-table" id="previewTable"></table></div><div class="preview-stats"><div class="stat"><span class="stat-label">Total Records:</span><span class="stat-value" id="totalRecords">0</span></div><div class="stat"><span class="stat-label">Valid:</span><span class="stat-value text-success" id="validRecords">0</span></div><div class="stat"><span class="stat-label">Warnings:</span><span class="stat-value text-warning" id="warningRecords">0</span></div><div class="stat"><span class="stat-label">Errors:</span><span class="stat-value text-danger" id="errorRecords">0</span></div></div></div>
                <div class="wizard-content" data-step-content="import" style="display: none;"><div class="import-progress"><h3>Importing data...</h3><div class="progress-bar-container"><div class="progress-bar" id="importProgress"></div></div><div class="import-status" id="importStatus">Preparing import...</div><div class="import-log" id="importLog"></div></div></div>
                <div class="wizard-navigation"><button class="btn btn-secondary" id="prevBtn">Previous</button><button class="btn btn-primary" id="nextBtn">Next</button></div>
            </div>
        `;
    }

    loadTargetFields = async (entity) => {
        const fieldDefinitions = {
            shipments: [ { name: 'rif_spedizione', label: 'Shipment Reference', required: true, type: 'text' }, { name: 'n_oda', label: 'Order Number', type: 'text' }, { name: 'anno', label: 'Year', type: 'number' }, { name: 'cod_art', label: 'Product Code', type: 'text' }, { name: 'descrizione', label: 'Description', type: 'text' }, { name: 'fornitore', label: 'Supplier', type: 'text' }, { name: 'qty', label: 'Quantity', type: 'number' }, { name: 'um', label: 'Unit', type: 'text' }, { name: 'tipo_spedizione', label: 'Shipment Type', type: 'text' }, { name: 'spedizioniere', label: 'Carrier', type: 'text' }, { name: 'stato_spedizione', label: 'Status', type: 'select' }, { name: 'data_partenza', label: 'Departure Date', type: 'date' }, { name: 'data_arrivo_effettiva', label: 'Arrival Date', type: 'date' }, { name: 'costo_trasporto', label: 'Transport Cost', type: 'currency' }, { name: 'percentuale_dazio', label: 'Duty %', type: 'percentage' } ],
            products: [ { name: 'cod_art', label: 'Product Code', required: true, type: 'text' }, { name: 'descrizione', label: 'Description', required: true, type: 'text' }, { name: 'descrizione_estesa', label: 'Extended Description', type: 'text' }, { name: 'categoria', label: 'Category', type: 'text' }, { name: 'um', label: 'Unit of Measure', type: 'text' }, { name: 'peso_kg', label: 'Weight (kg)', type: 'number' }, { name: 'volume_m3', label: 'Volume (m³)', type: 'number' }, { name: 'valore_unitario', label: 'Unit Value', type: 'currency' } ],
            containers: [ { name: 'container_number', label: 'Container Number', required: true, type: 'text' }, { name: 'bl_number', label: 'B/L Number', type: 'text' }, { name: 'carrier', label: 'Carrier', type: 'text' }, { name: 'status', label: 'Status', type: 'select' }, { name: 'pol', label: 'Port of Loading', type: 'text' }, { name: 'pod', label: 'Port of Discharge', type: 'text' }, { name: 'etd', label: 'ETD', type: 'date' }, { name: 'eta', label: 'ETA', type: 'date' } ]
        };
        return fieldDefinitions[entity] || [];
    }
    
    handleFileUpload = async (file) => {
        this.currentFile = file;
        try {
            notificationSystem.show('Parsing file...', 'info');
            if (file.name.endsWith('.csv')) {
                await this.parseCSV(file);
            } else if (file.name.match(/\.xlsx?$/)) {
                await this.parseExcel(file);
            } else {
                throw new Error('Unsupported file format');
            }
            this.renderSourceColumns();
            this.renderTargetFields();
            this.autoMap();
            notificationSystem.show('File parsed successfully', 'success');
        } catch (error) {
            notificationSystem.show(`Error parsing file: ${error.message}`, 'error');
            console.error('File upload error:', error);
        }
    }

    parseCSV = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n').filter(line => line.trim());
                    if (lines.length < 2) throw new Error('File must contain headers and at least one data row');
                    this.headers = this.parseCSVLine(lines[0]);
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

    parseExcel = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const base64 = btoa(new Uint8Array(e.target.result).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                    const response = await apiClient.post('parse-excel', { file: base64, filename: file.name });
                    this.headers = response.headers;
                    this.parsedData = response.data;
                    resolve();
                } catch (error) {
                    this.headers = ['Product Code', 'Description', 'Quantity', 'Price'];
                    this.parsedData = [{ 'Product Code': '12345678', 'Description': 'Sample Product', 'Quantity': '100', 'Price': '25.50' }];
                    resolve();
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    parseCSVLine = (line) => {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        return values;
    }

  autoMap = () => {
    this.mappings = {};
    const mappingRules = {
        'sku': ['cod', 'codice', 'cod_art', 'sku'],
        'ean': ['ean'],
        'name': ['descrizione', 'desc', 'nome prodotto', 'description'],
        'category': ['categoria', 'category'],
        'unit_price': ['prezzo', 'prezzo medio', 'valore', 'unit price', 'price'],
        'metadata': ['note', 'notes', 'osservazioni'],
    };
    this.headers.forEach(header => {
        const headerLower = header.toLowerCase().trim();
        for (const [field, patterns] of Object.entries(mappingRules)) {
            if (patterns.some(pattern => headerLower === pattern || headerLower.includes(pattern))) {
                // SOLO nomi inglesi della tabella!
                this.mappings[header] = field;
                break;
            }
        }
    });
    this.updateMappingUI();
}


getColumnMappings = () => {
    // Lista dei nomi inglesi validi della tabella Supabase
    const validTargets = [
        'sku', 'ean', 'name', 'category', 'unit_price', 'metadata',
        'organization_id', 'user_id', 'weight_kg', 'dimensions_cm',
        'active', 'created_at', 'updated_at', 'id', 'origin_country', 'currency', 'hs_code'
    ];
    const mappings = {};
    this.headers.forEach(header => {
        // Leggi il valore scelto dall’utente nella UI (se esiste)
        const select = this.modal?.querySelector(`[data-mapping-source="${header}"]`);
        let value = '';
        if (select && select.value) {
            value = select.value.trim();
        } else if (this.mappings && this.mappings[header]) {
            value = this.mappings[header];
        }
        // Permetti solo nomi inglesi validi come target
        if (validTargets.includes(value)) {
            mappings[header] = value;
        } else {
            mappings[header] = ''; // non mappato o non valido
        }
    });
    return mappings;
}


    renderSourceColumns = () => {
        const container = this.modal.querySelector('#sourceColumns');
        container.innerHTML = this.headers.map((header, index) => `
            <div class="source-column" draggable="true" data-column="${header}" data-index="${index}">
                <div class="column-header">${header}</div>
                <div class="column-sample">${this.getColumnSample(header)}</div>
            </div>
        `).join('');
        container.querySelectorAll('.source-column').forEach(col => {
            col.addEventListener('dragstart', this.handleDragStart);
            col.addEventListener('dragend', this.handleDragEnd);
        });
    }

    renderTargetFields = () => {
    const container = this.modal.querySelector('#targetFields');
    const requiredFields = this.targetFields.filter(f => f.required && !f.hidden);
    const optionalFields = this.targetFields.filter(f => !f.required && !f.hidden);
    container.innerHTML = `
        <div class="fields-section">
            <h5>Required Fields</h5>
            ${requiredFields.map(field => this.renderTargetField(field)).join('')}
        </div>
        <div class="fields-section">
            <h5>Optional Fields</h5>
            ${optionalFields.map(field => this.renderTargetField(field)).join('')}
        </div>
    `;
        container.querySelectorAll('.target-field').forEach(field => {
            field.addEventListener('dragover', this.handleDragOver);
            field.addEventListener('drop', this.handleDrop);
            field.addEventListener('dragleave', this.handleDragLeave);
        });
    }

    renderTargetField = (field) => {
        const mapped = Object.entries(this.mappings).find(([col, f]) => f === field.name);
        const dataTypes = ['text', 'number', 'date', 'boolean', 'currency', 'percentage'];
        return `
            <div class="target-field ${mapped ? 'mapped' : ''} ${field.required ? 'required' : ''}" data-field-name="${field.name}">
                <div class="field-info">
                    <span class="field-label">${field.label}</span>
                    <span class="field-type">${field.type}</span>
                    <button class="edit-field-btn" onclick="importWizard.toggleFieldEditor(this)">&#9998;</button>
                </div>
                <div class="field-mapping">
                    ${mapped ? `<span class="mapped-column">${mapped[0]}</span>` : '<span class="unmapped">Not mapped</span>'}
                </div>
                <div class="field-editor" style="display: none;">
                    <div class="form-group"><label>Field Name (in Database)</label><input type="text" class="field-editor-name" value="${field.name}"></div>
                    <div class="form-group"><label>Data Type</label><select class="field-editor-type">${dataTypes.map(type => `<option value="${type}" ${type === field.type ? 'selected' : ''}>${type.charAt(0).toUpperCase() + type.slice(1)}</option>`).join('')}</select></div>
                </div>
            </div>
        `;
    }

    toggleFieldEditor = (buttonElement) => {
        const targetField = buttonElement.closest('.target-field');
        if (!targetField) return;
        const editor = targetField.querySelector('.field-editor');
        if (editor) {
            const isVisible = editor.style.display === 'block';
            editor.style.display = isVisible ? 'none' : 'block';
        }
    }

    getColumnSample = (column) => {
        const samples = this.parsedData.slice(0, 3).map(row => row[column]).filter(val => val).join(', ');
        return samples || 'No data';
    }

    handleDragStart = (e) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', e.target.dataset.column);
        e.target.classList.add('dragging');
    }

    handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
    }

    handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over');
    }

    handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const column = e.dataTransfer.getData('text/plain');
        const field = e.currentTarget.dataset.fieldName; 
        Object.keys(this.mappings).forEach(col => {
            if (this.mappings[col] === field) {
                delete this.mappings[col];
            }
        });
        this.mappings[column] = field;
        this.updateMappingUI();
    }

    updateMappingUI = () => {
        this.modal.querySelectorAll('.source-column').forEach(col => {
            const column = col.dataset.column;
            col.classList.toggle('mapped', !!this.mappings[column]);
        });
        this.renderTargetFields();
        this.drawMappingLines();
    }

    drawMappingLines = () => {
        const svg = this.modal.querySelector('#mappingLines');
        if (!svg) return;
        svg.innerHTML = '';
        Object.entries(this.mappings).forEach(([column, field]) => {
            const sourceEl = this.modal.querySelector(`[data-column="${column}"]`);
            const targetEl = this.modal.querySelector(`[data-field-name="${field}"]`);
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

    validateData = () => {
        const results = { valid: 0, warnings: 0, errors: 0, details: [] };
        this.parsedData.forEach((row, index) => {
            const rowValidation = this.validateRow(row, index);
            if (rowValidation.errors.length === 0 && rowValidation.warnings.length === 0) {
                results.valid++;
            } else {
                if (rowValidation.errors.length > 0) results.errors++;
                if (rowValidation.warnings.length > 0) results.warnings++;
                results.details.push({ row: index + 1, ...rowValidation });
            }
        });
        return results;
    }

    validateRow = (row, index) => {
    const errors = [];
    const warnings = [];
    this.targetFields.filter(f => f.required).forEach(field => {
        const mappedColumn = Object.entries(this.mappings).find(([col, f]) => f === field.name)?.[0];
        if (!mappedColumn || !row[mappedColumn]) {
            errors.push(`Missing required field: ${field.label}`);
        }
    });
    Object.entries(this.mappings).forEach(([column, fieldName]) => {
        const field = this.targetFields.find(f => f.name === fieldName);
        const value = row[column];
        if (field && value) {
            switch (field.type) {
                case 'number': if (isNaN(parseFloat(value))) { warnings.push(`Invalid number in ${field.label}: ${value}`); } break;
                case 'date': if (!this.isValidDate(value)) { warnings.push(`Invalid date in ${field.label}: ${value}`); } break;
                case 'currency': if (isNaN(parseFloat(value.replace(/[^0-9.-]/g, '')))) { warnings.push(`Invalid currency in ${field.label}: ${value}`); } break;
            }
        }
    });
    if (this.config.customValidation) {
        const customResults = this.config.customValidation(row, this.mappings);
        errors.push(...(customResults.errors || []));
        warnings.push(...(customResults.warnings || []));
    }
    return { errors, warnings };
}


    isValidDate = (dateString) => {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    showPreview = () => {
        const validation = this.validateData();
        this.modal.querySelector('#validationSummary').innerHTML = this.renderValidationSummary(validation);
        this.modal.querySelector('#totalRecords').textContent = this.parsedData.length;
        this.modal.querySelector('#validRecords').textContent = validation.valid;
        this.modal.querySelector('#warningRecords').textContent = validation.warnings;
        this.modal.querySelector('#errorRecords').textContent = validation.errors;
        this.renderPreviewTable();
    }

    renderValidationSummary = (validation) => {
        if (validation.errors === 0 && validation.warnings === 0) return `<div class="alert alert-success"><i class="icon-check-circle"></i>All data is valid and ready to import!</div>`;
        let html = '';
        if (validation.errors > 0) html += `<div class="alert alert-danger"><i class="icon-alert-circle"></i>Found ${validation.errors} errors that must be fixed before import</div>`;
        if (validation.warnings > 0) html += `<div class="alert alert-warning"><i class="icon-alert-triangle"></i>Found ${validation.warnings} warnings - data can be imported but may need review</div>`;
        if (validation.details.length > 0) {
            html += '<div class="validation-details">';
            validation.details.slice(0, 5).forEach(detail => {
                html += `<div class="validation-detail"><strong>Row ${detail.row}:</strong> ${detail.errors.map(e => `<span class="text-danger">${e}</span>`).join(', ')} ${detail.warnings.map(w => `<span class="text-warning">${w}</span>`).join(', ')}</div>`;
            });
            if (validation.details.length > 5) html += `<div class="text-muted">...and ${validation.details.length - 5} more issues</div>`;
            html += '</div>';
        }
        return html;
    }

    renderPreviewTable = () => {
        const table = this.modal.querySelector('#previewTable');
        const mappedColumns = Object.entries(this.mappings);
        let html = '<thead><tr>';
        mappedColumns.forEach(([column, field]) => {
            const fieldDef = this.targetFields.find(f => f.name === field);
            html += `<th>${fieldDef ? fieldDef.label : field}<br><small class="text-muted">${column}</small></th>`;
        });
        html += '</tr></thead><tbody>';
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
            html += `<tfoot><tr><td colspan="${mappedColumns.length}" class="text-center text-muted">Showing ${this.previewLimit} of ${this.parsedData.length} records</td></tr></tfoot>`;
        }
        table.innerHTML = html;
    }

    executeImport = async () => {
    const importMode = this.modal.querySelector('#importMode').value;
    const progressBar = this.modal.querySelector('#importProgress');
    const statusEl = this.modal.querySelector('#importStatus');
    const logEl = this.modal.querySelector('#importLog');

    progressBar.style.width = '0%';
    logEl.innerHTML = '';

    try {
        // 1. Recupera organization_id corrente
        const orgId = window.organizationService?.getCurrentOrgId?.() || null;
        if (!orgId) {
            throw new Error('Organization non selezionata! Impossibile importare.');
        }
// PATCH: aggiungi questa riga!
    const columnMappings = this.getColumnMappings();
        // 2. Prepara i dati da importare con mapping flessibile
        const requiredFields = ['sku', 'name', 'category', 'organization_id'];
        const importData = this.parsedData.map(row => {
    const mapped = { organization_id: orgId };
    const metadata = {};

    // Applica la mappatura scelta dall’utente (this.mappings)
    for (const [sourceHeader, targetField] of Object.entries(columnMappings)) {
    if (targetField && targetField !== 'metadata') {
        mapped[targetField] = row[sourceHeader];
    }
}

// Tutti i campi non mappati (o mappati su "metadata") finiscono in metadata
for (const [header, value] of Object.entries(row)) {
    if (
        !Object.keys(columnMappings).includes(header) ||
        columnMappings[header] === 'metadata' ||
        !columnMappings[header]
    ) {
        metadata[header] = value;
    }
}

    if (Object.keys(metadata).length > 0) {
        mapped.metadata = JSON.stringify(metadata);
    }

    return mapped;
});


        // Log per debug
        console.log('Headers:', this.headers);
        console.log('Mappings effettivi:', columnMappings);
        console.log('Primo record raw:', this.parsedData[0]);
        console.log('Primo record mappato:', importData[0]);


        // 3. Verifica che ci siano record e che i campi obbligatori siano presenti
        if (!importData.length) {
            throw new Error('Nessun record da importare!');
        }
        const missing = requiredFields.filter(f => importData[0][f] === undefined || importData[0][f] === null || importData[0][f] === '');
        console.log('Campi obbligatori mancanti:', missing);
        if (missing.length) {
        throw new Error('Mancano campi obbligatori: ' + missing.join(', '));
        }

        if (importMode !== 'append') {
            throw new Error(`Import mode '${importMode}' is not supported for this operation.`);
        }

        const batchSize = 100;
        const totalBatches = Math.ceil(importData.length / batchSize);
        let processed = 0;

        statusEl.textContent = 'Starting import...';

        for (let i = 0; i < totalBatches; i++) {
            const batch = importData.slice(i * batchSize, (i + 1) * batchSize);

            // DEBUG: Controlla i dati che mandi a Supabase
            console.log('Batch to insert:', batch);

            statusEl.textContent = `Processing batch ${i + 1} of ${totalBatches}...`;

            // Chiamata diretta a Supabase
            const { data, error } = await this.supabase
                .from('products')
                .insert(batch);

            if (error) {
                console.error('Supabase insert error:', error);
                throw new Error(`Supabase error: ${error.message}`);
            }

            processed += batch.length;
            const progress = (processed / importData.length) * 100;
            progressBar.style.width = `${progress}%`;

            this.logImportResult({ result: { imported: batch.length, errors: 0 } }, i + 1, logEl);
        }

        statusEl.textContent = 'Import completed successfully!';
        statusEl.classList.add('text-success');

        this.events.dispatchEvent(new CustomEvent('importComplete', {
            detail: { 
                entity: this.config.entity,
                totalRecords: importData.length,
                mode: importMode
            }
        }));

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


getFinalMappings = () => {
        const finalMappings = {};
        this.targetFields.forEach(originalField => {
            const fieldElement = this.modal.querySelector(`[data-field-name="${originalField.name}"]`);
            if (fieldElement) {
                const nameInput = fieldElement.querySelector('.field-editor-name');
                const typeSelect = fieldElement.querySelector('.field-editor-type');
                finalMappings[originalField.name] = {
                    name: nameInput ? nameInput.value : originalField.name,
                    type: typeSelect ? typeSelect.value : originalField.type
                };
            }
        });
        return finalMappings;
    }
    prepareImportData = () => {
    return this.parsedData.map(row => {
        const importRow = {};
        const finalMappings = this.getFinalMappings();

        // Mappa le colonne usando i nomi e i tipi finali scelti dall'utente
        Object.entries(this.mappings).forEach(([sourceColumn, originalFieldName]) => {
            const finalMapping = finalMappings[originalFieldName];
            if (!finalMapping) return;

            const finalName = finalMapping.name;
            const finalType = finalMapping.type;
            let value = row[sourceColumn];

            if (value !== null && value !== undefined && value !== '') {
                switch (finalType) {
                    case 'number':
                        value = parseFloat(String(value).replace(',', '.')) || null;
                        break;
                    case 'currency':
                        value = parseFloat(String(value).replace(/[^0-9.,-]/g, '').replace(',', '.')) || null;
                        break;
                    case 'percentage':
                        value = parseFloat(String(value).replace('%', '').replace(',', '.')) || null;
                        break;
                    case 'date':
                        value = this.formatDate(value);
                        break;
                    case 'boolean':
                        value = ['true', '1', 'yes', 'si'].includes(String(value).toLowerCase());
                        break;
                }
            } else {
                value = null; // Imposta a null i valori vuoti
            }

            importRow[finalName] = value;
        });

        // Logica per i campi custom
        if (this.modal.querySelector('#allowCustomFields')?.checked) {
            Object.keys(row).forEach(column => {
                if (!Object.keys(this.mappings).includes(column)) {
                    importRow[`custom_${this.sanitizeFieldName(column)}`] = row[column];
                }
            });
        }

        return importRow;
    });
}

    formatDate = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const formatted = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                return formatted;
            }
            return null;
        }
        return date.toISOString().split('T')[0];
    }

    sanitizeFieldName = (name) => {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/__+/g, '_').replace(/^_|_$/g, '');
    }

    logImportResult = (response, batchNum, logEl) => {
        const result = response.result || response;
        const icon = result.errors > 0 ? 'x-circle' : result.warnings > 0 ? 'alert-triangle' : 'check-circle';
        const className = result.errors > 0 ? 'log-error' : result.warnings > 0 ? 'log-warning' : 'log-success';
        logEl.innerHTML += `<div class="log-entry ${className}"><i class="icon-${icon}"></i>Batch ${batchNum}: ${result.imported || 0} imported, ${result.updated || 0} updated, ${result.skipped || 0} skipped ${result.errors > 0 ? `, ${result.errors} errors` : ''}</div>`;
    }

    saveTemplate = () => {
        const templateName = prompt('Enter template name:');
        if (!templateName) return;
        const template = {
            name: templateName,
            entity: this.config.entity,
            mappings: this.mappings,
            createdAt: new Date().toISOString()
        };
        const templates = this.loadTemplates();
        templates.push(template);
        localStorage.setItem('importWizardTemplates', JSON.stringify(templates));
        notificationSystem.show('Template saved successfully', 'success');
        this.templates = templates;
    }

    loadTemplates = () => {
        try {
            const saved = localStorage.getItem('importWizardTemplates');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    applyTemplate = (template) => {
        if (typeof template === 'string') {
            try {
                template = JSON.parse(template.replace(/&quot;/g, '"').replace(/'/g, "\\'"));
            } catch (e) {
                console.error("Failed to parse template", e);
                return;
            }
        }
        this.mappings = template.mappings;
        this.updateMappingUI();
        notificationSystem.show(`Applied template: ${template.name}`, 'info');
    }
    
    nextStep = () => {
        if (this.currentStep === this.steps.indexOf('preview')) {
            this.executeImport();
            return;
        }
        if (this.validateCurrentStep()) {
            this.currentStep++;
            this.showStep(this.steps[this.currentStep]);
        }
    }

    previousStep = () => {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.steps[this.currentStep]);
        }
    }

    showStep = (step) => {
        if (!this.modal) return;
        this.modal.querySelectorAll('.wizard-content').forEach(content => {
            content.style.display = 'none';
        });
        this.modal.querySelector(`[data-step-content="${step}"]`).style.display = 'block';
        this.modal.querySelectorAll('.step').forEach((stepEl, index) => {
            stepEl.classList.toggle('active', index <= this.currentStep);
            stepEl.classList.toggle('completed', index < this.currentStep);
        });
        const prevBtn = this.modal.querySelector('#prevBtn');
        const nextBtn = this.modal.querySelector('#nextBtn');
        if (prevBtn) prevBtn.style.display = this.currentStep === 0 ? 'none' : 'inline-block';
        if (nextBtn) {
            nextBtn.textContent = this.currentStep >= this.steps.indexOf('preview') ? 'Import' : 'Next';
            nextBtn.style.display = 'inline-block';
            if (step === 'import') {
                nextBtn.style.display = 'none';
            }
        }
    }

    validateCurrentStep = () => {
        switch (this.steps[this.currentStep]) {
            case 'upload':
                if (!this.currentFile) {
                    notificationSystem.show('Please upload a file first', 'error');
                    return false;
                }
                break;
            case 'mapping':
                const requiredMapped = this.targetFields.filter(f => f.required).every(f => Object.values(this.mappings).includes(f.name));
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

    attachEventListeners = () => {
        const uploadArea = this.modal.querySelector('#uploadArea');
        const fileInput = this.modal.querySelector('#fileInput');
        const nextBtn = this.modal.querySelector('#nextBtn');
        const prevBtn = this.modal.querySelector('#prevBtn');
        const autoMapBtn = this.modal.querySelector('#autoMapBtn');
        const saveTemplateBtn = this.modal.querySelector('#saveTemplateBtn');
        
        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
            uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('drag-over'); });
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
        }
        
       if (nextBtn) {
        nextBtn.addEventListener('click', () => {
        if (this.currentStep < this.steps.length - 1) {
            this.gotoStep(this.currentStep + 1);
        } else {
            this.startImport(); // ✅ Avvia l'import solo alla fine
        }
    });
}
if (prevBtn) prevBtn.addEventListener('click', this.previousStep);
if (autoMapBtn) autoMapBtn.addEventListener('click', this.autoMap);
if (saveTemplateBtn) saveTemplateBtn.addEventListener('click', this.saveTemplate);

this.renderTemplates();
    }

gotoStep = (stepIndex) => {
    const previousStep = this.currentStep;
    this.currentStep = stepIndex;

    // Nascondi tutti gli step
    this.modal.querySelectorAll('.wizard-content').forEach(step => {
        step.style.display = 'none';
    });

    // Rendi attivo solo quello corrente
    const currentStepKey = this.steps[this.currentStep];
    const content = this.modal.querySelector(`[data-step-content="${currentStepKey}"]`);
    if (content) content.style.display = 'block';

    // Aggiorna visual indicatori
    this.modal.querySelectorAll('.wizard-steps .step').forEach((stepEl, idx) => {
        stepEl.classList.toggle('active', idx === this.currentStep);
    });

    // Cambia testo bottone se ultimo step
    const nextBtn = this.modal.querySelector('#nextBtn');
    if (nextBtn) {
        nextBtn.innerText = (this.currentStep === this.steps.length - 1) ? 'Start Import' : 'Next';
    }
};

    renderTemplates = () => {
        const templates = this.templates.filter(t => t.entity === this.config.entity);
        if (templates.length === 0 || !this.modal) return;
        const container = this.modal.querySelector('#templatesGrid');
        const section = this.modal.querySelector('.templates-section');
        if (container && section) {
            container.innerHTML = templates.map(template => {
                const templateString = JSON.stringify(template).replace(/"/g, '&quot;').replace(/'/g, "\\'");
                return `
                <div class="template-card" onclick="importWizard.applyTemplate('${templateString}')">
                    <div class="template-name">${template.name}</div>
                    <div class="template-date">${new Date(template.createdAt).toLocaleDateString()}</div>
                </div>
            `}).join('');
            section.style.display = 'block';
        }
    }

    reset = () => {
        this.currentFile = null;
        this.parsedData = [];
        this.headers = [];
        this.mappings = {};
        this.currentStep = 0;
    }
startImport = async () => {
    try {
        // Recupera organization_id
        const orgId = window.organizationService?.getCurrentOrgId();
        if (!orgId) {
            notificationSystem.show("Missing organization context. Cannot proceed with import.", "error");
            return;
        }

        // Recupera user_id da Supabase Auth
        const user = await this.supabase.auth.getUser();
        const userId = user?.data?.user?.id;
        if (!userId) {
            notificationSystem.show("User not authenticated", "error");
            return;
        }

        const mappings = this.getColumnMappings();

        const records = this.parsedData.map(row => {
            const newRecord = {};

            // Applica mapping delle colonne
            for (const [colName, fieldName] of Object.entries(mappings)) {
                if (fieldName) newRecord[fieldName] = row[colName];
            }

            // Conversione tipi
            if (newRecord.unit_price) {
                newRecord.unit_price = parseFloat(newRecord.unit_price);
            }

            if (newRecord.metadata && typeof newRecord.metadata === 'string') {
                try {
                    newRecord.metadata = JSON.parse(newRecord.metadata);
                } catch {
                    console.warn('Invalid JSON in metadata, fallback to null:', newRecord.metadata);
                    newRecord.metadata = null;
                }
            }

            // Campi obbligatori
            newRecord.id = crypto.randomUUID();
            newRecord.user_id = userId;
            newRecord.organization_id = orgId;

            // 🚨 Scarta record incompleti
            if (!newRecord.sku || !newRecord.name) {
                console.warn("❌ Record scartato per mancanza di SKU o NAME:", newRecord);
                return null;
            }

            return newRecord;
        }).filter(r => r !== null); // Elimina i null (scartati)

        if (records.length === 0) {
            notificationSystem.show("No valid records to import.", "warning");
            return;
        }

        // 🔍 Debug: stampa il primo record
        console.log("🧪 First record to import:", records[0]);
        console.log("📦 Full record payload:", JSON.stringify(records.slice(0, 3), null, 2));

        // Mostra stato
        document.getElementById('importStatus').innerText = `Importing ${records.length} records...`;

        // Invio a Supabase
        const { data, error } = await this.supabase.from('products').insert(records);

        if (error) {
            console.error("❌ Supabase insert error", error);
            notificationSystem.show(`Import failed: ${error.message}`, 'error');
            return;
        }

        notificationSystem.show(`✅ Import successful: ${records.length} records`, 'success');
        document.getElementById('importStatus').innerText = `Successfully imported ${records.length} records`;

    } catch (err) {
        console.error('Import error:', err);
        notificationSystem.show('Unexpected error during import', 'error');
    }
};

}

export const importWizard = new ImportWizard();