// public/core/import-wizard.js
import notificationSystem from '/core/notification-system.js';
import modalSystem from '/core/modal-system.js';
import apiClient from '/core/api-client.js';
import { supabase } from '/core/services/supabase-client.js';

function normalizeTrackingType(type) {
  const mapping = {
    sea: 'container',
    ocean: 'container',
    air: 'awb',
    awb: 'awb',
    bl: 'bl',
    parcel: 'parcel',
    express: 'parcel',
    courier: 'parcel'
  };
  return mapping[type?.toLowerCase?.()] || 'container';
}

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
    // PATCH: fallback automatico
    this.supabase = supabase; // Usa sempre quello importato
    }

        setSupabaseClient = (client) => {
    this.supabase = client || supabase;
    }

    attachEventListeners = () => {
    const uploadArea = this.modal.querySelector('#uploadArea');
    const fileInput = this.modal.querySelector('#fileInput');
    const nextBtn = this.modal.querySelector('#nextBtn');
    const prevBtn = this.modal.querySelector('#prevBtn');
    const autoMapBtn = this.modal.querySelector('#autoMapBtn');
    const saveTemplateBtn = this.modal.querySelector('#saveTemplateBtn');

    // STEP STRATEGY: radio buttons
    const importStrategyRadios = this.modal.querySelectorAll('input[name="importStrategy"]');
    if (importStrategyRadios && importStrategyRadios.length) {
        importStrategyRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.importStrategy = e.target.value;
            });
        });
    }

    // File summary per strategia
    const fileSummary = this.modal.querySelector('#importFileSummary');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && fileSummary) {
                fileSummary.innerHTML = `<b>Selected file:</b> ${file.name}`;
            }
            if (file) this.handleFileUpload(file);
        });
    }

    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
        uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('drag-over'); });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) {
                if (fileSummary) fileSummary.innerHTML = `<b>Selected file:</b> ${file.name}`;
                this.handleFileUpload(file);
            }
        });
    }

    if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        const step = this.getCurrentStep();
        if (step === 'strategy') {
            this.showStep('upload');
        } else if (step === 'upload') {
            this.showStep('mapping');
        } else if (step === 'mapping') {
            this.showStep('import');
            this.startImport(); // Avvia l'import qui o dopo conferma utente!
        }
    });
}

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const step = this.getCurrentStep();
            if (step === 'upload') this.showStep('strategy');
            else if (step === 'mapping') this.showStep('upload');
            else if (step === 'import') this.showStep('mapping');
        });
    }

    if (autoMapBtn) autoMapBtn.addEventListener('click', this.autoMap);
    if (saveTemplateBtn) saveTemplateBtn.addEventListener('click', this.saveTemplate);

    // Template
    this.renderTemplates && this.renderTemplates();
};

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
        if (!this.supabase) {
        this.supabase = supabase;
        }
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
  this.showStep('strategy'); // 🚀 Step iniziale: strategia!
};

renderWizard = () => {
  return `
    <div class="import-wizard" data-step="strategy">
      <!-- STEP 0: STRATEGY -->
      <div class="wizard-content" data-step-content="strategy">
        <h3>Import strategy</h3>
        <p>Choose how you want to import your data:</p>
        <div style="margin-bottom:1.5em;">
          <label><input type="radio" name="importStrategy" value="append" checked> <b>Append</b> <span style="color:#888;">Add new records to existing ones</span></label><br>
          <label><input type="radio" name="importStrategy" value="replace"> <b>Replace All</b> <span style="color:#888;">Delete ALL and import only new ones</span></label><br>
          <label><input type="radio" name="importStrategy" value="update"> <b>Update</b> <span style="color:#888;">Update if code already exists, else create new</span></label>
        </div>
        <div id="importFileSummary" style="margin-bottom:2em;color:#7a7a7a;"></div>
      </div>

      <!-- STEP 1: UPLOAD -->
      <div class="wizard-content" data-step-content="upload" style="display:none;">
        <div class="upload-area" id="uploadArea">
          <h3>Drag & Drop your file here</h3>
          <p>or click to browse</p>
          <input type="file" id="fileInput" accept=".csv,.xlsx,.xls" style="display: none;">
        </div>
      </div>

      <!-- STEP 2: MAPPING -->
      <div class="wizard-content" data-step-content="mapping" style="display: none;">
        <div class="mapping-header">
          <h3>Map your columns to system fields</h3>
          <div class="mapping-actions">
            <button id="autoMapBtn" class="btn btn-secondary">Auto-map</button>
            <button id="saveTemplateBtn" class="btn btn-secondary">Save as template</button>
          </div>
        </div>

        <div id="mappingContainer" class="mapping-container">
          <div class="source-columns">
            <h4>Your File Columns</h4>
            <div id="sourceColumns" class="columns-list"></div>
          </div>
          <div class="mapping-arrows">
            <svg id="mappingLines" width="100%" height="100%"></svg>
          </div>
          <div class="target-fields">
            <h4>System Fields</h4>
            <div id="targetFields" class="fields-list"></div>
          </div>
        </div>
      </div>

      <!-- STEP 3: IMPORT -->
      <div class="wizard-content" data-step-content="import" style="display: none;">
        <h3>Import in corso...</h3>
        <div id="importStatus" class="import-status"></div>
        <div id="importProgressBar" class="progress-bar" style="margin-top: 10px; height: 8px; background: #f0f0f0;">
          <div id="importProgress" style="height: 100%; width: 0; background: #1abc9c;"></div>
        </div>
        <div id="importLog" class="import-log"></div>
      </div>

      <!-- NAVIGATION -->
      <div class="wizard-navigation">
        <button class="btn btn-secondary" id="prevBtn">Previous</button>
        <button class="btn btn-primary" id="nextBtn">Next</button>
      </div>
    </div>
  `;
};

    loadTargetFields = async (entity) => {
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
            { name: 'sku', label: 'Product Code', required: true, type: 'text' },
            { name: 'description', label: 'Description', required: true, type: 'text' },
            { name: 'other_description', label: 'Extended Description', type: 'text' },
            { name: 'category', label: 'Category', type: 'text' },
            { name: 'ean', label: 'EAN', type: 'text' }, // opzionale
            { name: 'unit_price', label: 'Unit Price', type: 'currency' },
            { name: 'metadata', label: 'Metadata', type: 'text' }
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
};
    
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

    this.showStep('mapping');
    // Usa setTimeout + requestAnimationFrame per garantire il DOM
   setTimeout(() => {
    if (!this.targetFields || !Array.isArray(this.targetFields) || this.targetFields.length === 0) {
        console.error('❌ targetFields non inizializzato!');
        return;
    }
    // Le render partono solo dentro showStep('mapping')!
}, 100);

    notificationSystem.show('File parsed successfully', 'success');
  } catch (error) {
    notificationSystem.show(`Error parsing file: ${error.message}`, 'error');
    console.error('File upload error:', error);
  }
};
    
    parseCSV = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
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

                // ✅ Appena hai finito di popolare:
                const tryRenderMapping = () => {
  if (
    this.targetFields &&
    Array.isArray(this.targetFields) &&
    this.targetFields.length > 0 &&
    this.headers &&
    Array.isArray(this.headers) &&
    this.headers.length > 0 &&
    this.modal.querySelector('#mappingContainer')
  ) {
    this.renderMappingUI();
    this.autoMap();
  } else {
    setTimeout(tryRenderMapping, 100);
  }
};
setTimeout(tryRenderMapping, 0);


                resolve();
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
};

    parseExcel = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64 = btoa(
                    new Uint8Array(e.target.result).reduce(
                        (data, byte) => data + String.fromCharCode(byte),
                        ''
                    )
                );

                const response = await apiClient.post('parse-excel', {
                    file: base64,
                    filename: file.name
                });

                this.headers = response.headers.map(h => h.trim());
                this.parsedData = response.data;

                // ✅ UI + AutoMap subito qui
                const tryRenderMapping = () => {
  if (
    this.targetFields &&
    Array.isArray(this.targetFields) &&
    this.targetFields.length > 0 &&
    this.headers &&
    Array.isArray(this.headers) &&
    this.headers.length > 0 &&
    this.modal.querySelector('#mappingContainer')
  ) {
    this.renderMappingUI();
    this.autoMap();
  } else {
    setTimeout(tryRenderMapping, 100);
  }
};
setTimeout(tryRenderMapping, 0);


                resolve();
            } catch (error) {
                console.error("❌ parseExcel error:", error);

                this.headers = [];
                this.parsedData = [];

                reject(error);
            }
        };
        reader.readAsArrayBuffer(file);
    });
};

    parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '"';

    // Rileva separatore probabile
    const separator = line.includes(';') ? ';' :
                      line.includes('\t') ? '\t' : ',';

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === quoteChar) {
            if (inQuotes && nextChar === quoteChar) {
                // Escaped quote ("")
                current += quoteChar;
                i++; // salta una
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === separator && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
};

 autoMap = () => {
    this.mappings = {};

    const normalize = str => str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    const mappingRules = {
        'sku': ['cod', 'codice', 'cod_art'],
        'ean': ['ean', 'barcode', 'bar code'],
        'description': ['descrizione', 'desc', 'nome prodotto'],
        'other_description': ['descrizione estesa', 'descrizione_2', 'dettagli', 'extended description'],
        'category': ['categoria'],
        'unit_price': ['prezzo', 'prezzo medio', 'valore', 'price'],
        'metadata': ['note', 'osservazioni', 'metadata']
    };

    this.headers.forEach(header => {
        const normHeader = normalize(header);
        for (const [field, patterns] of Object.entries(mappingRules)) {
            if (patterns.some(p => normHeader.includes(normalize(p)))) {
                this.mappings[header] = field;
                // Imposta il valore nel <select>
                const select = this.modal.querySelector(`select[data-header="${header}"]`);
                if (select) {
                    select.value = field;
                    select.dispatchEvent(new Event('change'));
                }
                break;
            }
        }
    });

    console.log("📌 AutoMap Result:", this.mappings);
    notificationSystem.show("✅ Mappatura automatica completata", "info");
};

getColumnMappings = () => {
    // Lista dei campi validi (in inglese) della tabella Supabase
    const validTargets = [
        'sku', 'ean', 'name', 'category', 'unit_price', 'metadata',
        'organization_id', 'user_id', 'weight_kg', 'dimensions_cm',
        'active', 'created_at', 'updated_at', 'id',
        'origin_country', 'currency', 'hs_code'
    ];

    const mappings = {};

    this.headers.forEach(header => {
        // Cerca il <select> associato alla colonna CSV
        const select = this.modal?.querySelector(`select[data-header="${header}"]`);
        let value = '';

        if (select && select.value) {
            value = select.value.trim();
        } else if (this.mappings && this.mappings[header]) {
            value = this.mappings[header];
        }

        // Solo se il valore scelto è valido
        if (validTargets.includes(value)) {
            mappings[header] = value;
        } else {
            mappings[header] = ''; // campo non mappato o non valido
        }
    });

    console.log("✅ Mappatura finale:", mappings);
    return mappings;
};

renderSourceColumns = () => {
    console.log('🟦 targetFields:', this.targetFields);
    console.log('🟦 headers:', this.headers);
if (!this.targetFields || !Array.isArray(this.targetFields) || this.targetFields.length === 0) {
    console.error('❌ targetFields non inizializzato!');
    return;
  }
  if (!this.headers || !Array.isArray(this.headers) || this.headers.length === 0) {
    console.error('❌ headers non inizializzati!');
    return;
  }

  // Controllo sul container DOM
  const container = this.modal?.querySelector('#sourceColumns');
  if (!container) {
    console.error('❌ sourceColumns non trovato! Sei nello step MAPPING?');
    return;
  }
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
};

    renderTargetFields = () => {
    console.log('🟦 targetFields:', this.targetFields);
    console.log('🟦 headers:', this.headers);
  if (!this.targetFields || !Array.isArray(this.targetFields) || this.targetFields.length === 0) {
    console.warn('❌ targetFields non inizializzato!');
    return;
  }
  if (!this.headers || !Array.isArray(this.headers) || this.headers.length === 0) {
    console.warn('❌ headers non inizializzati!');
    return;
  }

  // Controllo sul container DOM
  const container = this.modal?.querySelector('#targetFields');
  if (!container) {
    console.warn('❌ targetFields non trovato! Sei nello step MAPPING?');
    return;
  }
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
};

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
        if (!this.modal) return;
        const sourceCols = this.modal.querySelectorAll('.source-column');
        sourceCols.forEach(col => {
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
        // 1. Organization e User ID
        const orgId = window.organizationService?.getCurrentOrgId?.() || null;
        if (!orgId) throw new Error('Organization non selezionata!');
        
        let supa = this.supabase || supabase || window.supabase;
        if (!supa || !supa.auth) {
            console.error('Supabase client not initialized');
            notificationSystem.show('Supabase client not initialized', 'error');
            return;
        }
        const user = await supa.auth.getUser();
        const userId = user?.data?.user?.id;
        if (!userId) throw new Error('Utente non autenticato su Supabase');

        // 2. Mapping dinamico
        const columnMappings = this.getColumnMappings();

        // 3. Prepara dati per import dinamico
        const importData = this.parsedData.map(row => {
            const mapped = { organization_id: orgId, user_id: userId };
            const metadata = {};

            for (const [sourceHeader, targetField] of Object.entries(columnMappings)) {
                if (targetField && targetField !== 'metadata') {
                    mapped[targetField] = row[sourceHeader];
                }
            }
            // Metti tutti i campi non mappati in metadata (anche quelli mappati su "metadata")
            for (const [header, value] of Object.entries(row)) {
                if (!Object.keys(columnMappings).includes(header) || columnMappings[header] === 'metadata' || !columnMappings[header]) {
                    metadata[header] = value;
                }
            }
            if (Object.keys(metadata).length > 0) mapped.metadata = JSON.stringify(metadata);
            return mapped;
        });

        // 4. Verifica almeno sku, name, category, organization_id (o altri obbligatori)
        const requiredFields = ['sku', 'name', 'category', 'organization_id'];
        const missing = requiredFields.filter(f => importData[0][f] === undefined || importData[0][f] === null || importData[0][f] === '');
        if (missing.length) throw new Error('Mancano campi obbligatori: ' + missing.join(', '));

        // 5. Import a batch
        const batchSize = 100;
        const totalBatches = Math.ceil(importData.length / batchSize);
        let processed = 0;
        statusEl.textContent = 'Starting import...';
        for (let i = 0; i < totalBatches; i++) {
            const batch = importData.slice(i * batchSize, (i + 1) * batchSize);

            let dataToInsert = batch;
            // Se stiamo importando tracking, normalizza il tipo
            if (this.config.entity === 'trackings') {
                dataToInsert = batch.map(t => ({
                    ...t,
                    tracking_type: normalizeTrackingType(t.tracking_type)
                }));
            }

            // Usa l'entità configurata invece di 'products'
            const { data, error } = await supa.from(this.config.entity).insert(dataToInsert);
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
            detail: { entity: this.config.entity, totalRecords: importData.length, mode: importMode }
        }));
        setTimeout(() => {
            this.modal.close();
            notificationSystem.show('Import completed successfully!', 'success');
        }, 2000);
    } catch (error) {
        console.error('Import error:', error);
        statusEl.textContent = `Import failed: ${error.message}`;
        statusEl.classList.add('text-danger');
        logEl.innerHTML += `<div class="log-entry log-error"><i class="icon-x-circle"></i>Error: ${error.message}</div>`;
    }
};

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

  // Nascondi tutti gli step
  this.modal.querySelectorAll('.wizard-content').forEach(content => {
    content.style.display = 'none';
  });

  // Mostra lo step corrente
  const currentContent = this.modal.querySelector(`[data-step-content="${step}"]`);
  if (currentContent) currentContent.style.display = 'block';

  // Aggiorna step indicatori (se hai una barra di step)
  this.modal.querySelectorAll('.step').forEach((stepEl, index) => {
    stepEl.classList.toggle('active', index <= this.currentStep);
    stepEl.classList.toggle('completed', index < this.currentStep);
  });

  // Bottoni prev/next
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

  // === PATCH: Render mapping columns SOLO nello step "mapping" ===
  if (step === 'mapping') {
  const tryRenderMapping = () => {
    if (
      this.targetFields &&
      Array.isArray(this.targetFields) &&
      this.targetFields.length > 0 &&
      this.headers &&
      Array.isArray(this.headers) &&
      this.headers.length > 0 &&
      this.modal.querySelector('#sourceColumns') &&
      this.modal.querySelector('#targetFields')
    ) {
      this.renderSourceColumns();
      this.renderTargetFields();
    } else {
      setTimeout(tryRenderMapping, 100);
    }
  };
  setTimeout(tryRenderMapping, 0);
}
};


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
        const orgId = window.organizationService?.getCurrentOrgId();
        if (!orgId) {
            notificationSystem.show("Missing organization context. Cannot proceed with import.", "error");
            return;
        }
        let supa = this.supabase || supabase || window.supabase;
        if (!supa || !supa.auth) {
            console.error('Supabase client not initialized');
            throw new Error('Supabase client not initialized');
        }
        this.supabase = supa;
        const user = await supa.auth.getUser();
        const userId = user?.data?.user?.id;
        if (!userId) {
            notificationSystem.show("User not authenticated", "error");
            return;
        }
        // Assicurati che mappings sia pronto (autoMap già chiamato)
        const records = this.parsedData.map(row => {
            const newRecord = {};
            for (const [colName, fieldName] of Object.entries(this.mappings)) {
                if (fieldName && fieldName !== "id") newRecord[fieldName] = row[colName];
            }
            newRecord.user_id = userId;
            newRecord.organization_id = orgId;
            return newRecord;
        }).filter(r => r.sku && r.description);

        if (records.length === 0) {
            notificationSystem.show("No valid records to import.", "warning");
            return;
        }
        console.log("🧪 First record to import:", records[0]);
        document.getElementById('importStatus').innerText = `Importing ${records.length} records...`;

        const { data, error } = await supa
          .from('products')
          .upsert(records, { onConflict: 'user_id,sku' });

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

renderMappingUI = () => {
    console.log('🟦 targetFields:', this.targetFields);
    console.log('🟦 headers:', this.headers);
    // Trova il contenitore della mappatura nel modal
    // Cambia se usi un altro ID, esempio: #mappingContainer oppure .columnMappingContainer
    const container = this.modal.querySelector('#mappingContainer') || this.modal.querySelector('.columnMappingContainer');
    if (!container) {
        console.error('❌ mappingContainer non trovato nella modale!');
        return;
    }

    // Pulizia precedente
    container.innerHTML = '';

    // Lista campi target disponibili (aggiorna se vuoi altri)
    const validFields = [
        '', 'sku', 'ean', 'name', 'category', 'unit_price',
        'metadata', 'description', 'origin_country',
        'currency', 'hs_code', 'weight_kg', 'dimensions_cm',
        'active', 'created_at', 'updated_at', 'id', 'user_id', 'organization_id'
    ];

    // Genera la tabella/righe di mapping colonne
    const table = document.createElement('table');
    table.className = 'mapping-table';
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    trHead.innerHTML = '<th>Colonna File</th><th>Mappa su Campo</th>';
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    this.headers.forEach(header => {
        const tr = document.createElement('tr');

        // Etichetta della colonna sorgente (file)
        const tdLabel = document.createElement('td');
        tdLabel.textContent = header;

        // Select campo target
        const tdSelect = document.createElement('td');
        const select = document.createElement('select');
        select.setAttribute('data-header', header);
        select.className = 'form-select';

        validFields.forEach(field => {
            const option = document.createElement('option');
            option.value = field;
            option.textContent = field ? field : '--';
            select.appendChild(option);
        });

        // Eventuale valore predefinito dal mapping precedente
        if (this.mappings && this.mappings[header]) {
            select.value = this.mappings[header];
        }

        tdSelect.appendChild(select);

        tr.appendChild(tdLabel);
        tr.appendChild(tdSelect);
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
container.querySelectorAll('select[data-header]').forEach(select => {
    select.addEventListener('change', (e) => {
        this.mappings[select.getAttribute('data-header')] = select.value;
        this.updateMappingUI();
    });
});

    // Debug/log
    console.log('🧩 UI mapping generata per headers:', this.headers);
};

getCurrentStep = () => {
    const visible = Array.from(this.modal.querySelectorAll('.wizard-content')).find(content => content.style.display !== 'none');
    return visible ? visible.getAttribute('data-step-content') : this.steps[this.currentStep];
};

}

const importWizard = new ImportWizard();
window.importWizard = importWizard;
export { importWizard };
export default importWizard;