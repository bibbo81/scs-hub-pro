// Advanced Import System - Column Renaming & Data Type Selection
// This file should be included in import.html AFTER the main import system script

console.log('🔧 Loading Import System Enhancements...');

// Wait for import system to be ready
function enhanceImportSystem() {
    if (!window.importSystem) {
        console.log('⏳ Waiting for import system...');
        setTimeout(enhanceImportSystem, 100);
        return;
    }
    
    console.log('✅ Import system found, applying enhancements...');
    
    // ===== COLUMN RENAMING ENHANCEMENT =====
    
    // Override the renderMappingInterface to add renaming after render
    const originalRenderMappingInterface = window.importSystem.renderMappingInterface;
    window.importSystem.renderMappingInterface = function() {
        // Call original method
        originalRenderMappingInterface.call(this);
        
        // Add renaming capability after a short delay to ensure DOM is ready
        setTimeout(() => {
            console.log('🔧 Enabling column renaming...');
            enableColumnRenaming();
            console.log('🔧 Adding data type selectors...');
            addDataTypeSelectors();
        }, 100);
    };
    
    // Enable column renaming function
    function enableColumnRenaming() {
        const columnElements = document.querySelectorAll('.source-column');
        console.log(`📝 Found ${columnElements.length} columns to enhance`);
        
        columnElements.forEach(element => {
            const columnName = element.dataset.column;
            const headerElement = element.querySelector('.column-header');
            const nameElement = element.querySelector('.column-name');
            
            if (!nameElement) {
                // Create column-name span if it doesn't exist
                const columnNameSpan = document.createElement('span');
                columnNameSpan.className = 'column-name';
                columnNameSpan.textContent = columnName;
                
                // Find where to insert it
                const gripIcon = headerElement.querySelector('.fa-grip-vertical');
                if (gripIcon && gripIcon.nextSibling) {
                    gripIcon.parentNode.insertBefore(columnNameSpan, gripIcon.nextSibling);
                } else {
                    headerElement.insertBefore(columnNameSpan, headerElement.firstChild);
                }
            }
            
            const nameEl = element.querySelector('.column-name');
            if (nameEl && !nameEl.querySelector('.column-edit-icon')) {
                // Add edit icon
                const editIcon = document.createElement('i');
                editIcon.className = 'fas fa-edit column-edit-icon';
                editIcon.style.marginLeft = '0.5rem';
                editIcon.style.cursor = 'pointer';
                editIcon.style.color = 'var(--sol-gray-400)';
                editIcon.style.fontSize = '0.875rem';
                editIcon.title = 'Click to rename column';
                
                nameEl.appendChild(editIcon);
                
                // Add click handler
                editIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    startEditingColumn(nameEl, columnName);
                });
                
                console.log(`✅ Added rename capability to column: ${columnName}`);
            }
        });
    }
    
    // Start editing column name
    function startEditingColumn(nameElement, originalColumn) {
        const currentText = nameElement.textContent.replace(/\s*$/, '').trim();
        
        console.log(`📝 Starting edit for column: ${originalColumn}`);
        
        // Create input field
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.className = 'column-rename-input';
        input.style.cssText = `
            border: 2px solid var(--sol-primary);
            border-radius: var(--sol-radius-sm);
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
            width: 150px;
            background: white;
            font-weight: 600;
            color: var(--sol-gray-900);
        `;
        
        // Store original content
        const originalContent = nameElement.innerHTML;
        
        // Replace with input
        nameElement.innerHTML = '';
        nameElement.appendChild(input);
        
        // Focus and select
        input.focus();
        input.select();
        
        // Save function
        const saveEdit = () => {
            const newName = input.value.trim();
            if (newName && newName !== originalColumn) {
                console.log(`✅ Renaming column: "${originalColumn}" → "${newName}"`);
                
                // Update in import system
                renameColumnInSystem(originalColumn, newName);
                
                // Update display
                nameElement.innerHTML = `${newName} <i class="fas fa-edit column-edit-icon" style="margin-left: 0.5rem; cursor: pointer; color: var(--sol-gray-400); font-size: 0.875rem;"></i>`;
                
                // Update dataset
                nameElement.closest('.source-column').dataset.column = newName;
                
                // Re-enable editing on new icon
                const newEditIcon = nameElement.querySelector('.column-edit-icon');
                newEditIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    startEditingColumn(nameElement, newName);
                });
                
                // Show success notification
                if (window.NotificationSystem) {
                    window.NotificationSystem.show('Column Renamed', `"${originalColumn}" → "${newName}"`, 'success');
                }
            } else {
                // Restore original
                nameElement.innerHTML = originalContent;
                enableColumnRenaming(); // Re-enable handlers
            }
        };
        
        // Cancel function
        const cancelEdit = () => {
            nameElement.innerHTML = originalContent;
            enableColumnRenaming(); // Re-enable handlers
        };
        
        // Event handlers
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur(); // Will trigger save
            } else if (e.key === 'Escape') {
                e.preventDefault();
                input.removeEventListener('blur', saveEdit); // Prevent double action
                cancelEdit();
            }
        });
    }
    
    // Rename column in import system
    function renameColumnInSystem(oldName, newName) {
        if (!window.importSystem) return;
        
        // Update source columns array
        const index = window.importSystem.sourceColumns.indexOf(oldName);
        if (index > -1) {
            window.importSystem.sourceColumns[index] = newName;
        }
        
        // Update field mappings
        if (window.importSystem.fieldMappings[oldName]) {
            window.importSystem.fieldMappings[newName] = window.importSystem.fieldMappings[oldName];
            delete window.importSystem.fieldMappings[oldName];
        }
        
        // Update file data
        if (window.importSystem.fileData && window.importSystem.fileData.data) {
            window.importSystem.fileData.data.forEach(row => {
                if (oldName in row) {
                    row[newName] = row[oldName];
                    delete row[oldName];
                }
            });
            
            // Update columns array in fileData
            const colIndex = window.importSystem.fileData.columns.indexOf(oldName);
            if (colIndex > -1) {
                window.importSystem.fileData.columns[colIndex] = newName;
            }
        }
        
        // Update any mapped fields display
        updateMappedFieldsDisplay();
    }
    
    // Update mapped fields display after rename
    function updateMappedFieldsDisplay() {
        const targetFields = document.querySelectorAll('.target-field.mapped');
        targetFields.forEach(field => {
            const fieldKey = field.dataset.field;
            const mappedColumn = Object.keys(window.importSystem.fieldMappings).find(
                col => window.importSystem.fieldMappings[col] === fieldKey
            );
            
            if (mappedColumn) {
                const mappingDiv = field.querySelector('.mapped-column');
                if (mappingDiv) {
                    mappingDiv.innerHTML = `
                        <i class="fas fa-link"></i>
                        ${mappedColumn}
                        <button onclick="unmapField('${fieldKey}')" class="sol-btn sol-btn-sm sol-btn-danger" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem;">
                            <i class="fas fa-unlink"></i>
                        </button>
                    `;
                }
            }
        });
    }
    
    // ===== DATA TYPE SELECTION ENHANCEMENT =====
    
    const dataTypes = {
        'text': {
            name: 'Testo',
            icon: 'fas fa-font',
            color: 'var(--sol-gray-600)',
            validation: (value) => typeof value === 'string'
        },
        'number': {
            name: 'Numero',
            icon: 'fas fa-hashtag',
            color: 'var(--sol-info)',
            validation: (value) => !isNaN(parseFloat(value))
        },
        'currency': {
            name: 'Valuta',
            icon: 'fas fa-euro-sign',
            color: 'var(--sol-success)',
            validation: (value) => !isNaN(parseFloat(String(value).replace(/[€$£,]/g, '')))
        },
        'date': {
            name: 'Data',
            icon: 'fas fa-calendar',
            color: 'var(--sol-warning)',
            validation: (value) => !isNaN(Date.parse(value))
        },
        'boolean': {
            name: 'Sì/No',
            icon: 'fas fa-toggle-on',
            color: 'var(--sol-primary)',
            validation: (value) => ['true', 'false', '1', '0', 'yes', 'no', 'si', 'no'].includes(String(value).toLowerCase())
        },
        'weight': {
            name: 'Peso (kg)',
            icon: 'fas fa-weight',
            color: 'var(--sol-secondary)',
            validation: (value) => !isNaN(parseFloat(value)) && parseFloat(value) >= 0
        }
    };
    
    // Add data type selectors to columns
    function addDataTypeSelectors() {
        const columnElements = document.querySelectorAll('.source-column');
        
        columnElements.forEach(element => {
            const columnName = element.dataset.column;
            
            // Check if type selector already exists
            if (element.querySelector('.column-type-selector')) return;
            
            // Create type selector container
            const typeContainer = document.createElement('div');
            typeContainer.className = 'column-type-selector';
            typeContainer.style.cssText = `
                margin-top: 0.5rem;
                padding-top: 0.5rem;
                border-top: 1px solid var(--sol-gray-200);
            `;
            
            // Auto-detect type
            const detectedType = detectColumnType(columnName);
            
            // Create type indicator
            const typeIndicator = document.createElement('div');
            typeIndicator.className = 'type-indicator';
            typeIndicator.style.cssText = `
                display: flex;
                align-items: center;
                gap: 0.25rem;
                margin-bottom: 0.25rem;
                font-size: 0.75rem;
            `;
            updateTypeIndicator(typeIndicator, detectedType);
            
            // Create dropdown
            const select = document.createElement('select');
            select.className = 'sol-form-select';
            select.style.cssText = `
                font-size: 0.75rem;
                padding: 0.25rem 0.5rem;
                width: 100%;
                border: 1px solid var(--sol-gray-300);
                border-radius: var(--sol-radius-sm);
                background: white;
            `;
            
            // Add options
            Object.entries(dataTypes).forEach(([typeKey, typeDef]) => {
                const option = document.createElement('option');
                option.value = typeKey;
                option.textContent = typeDef.name;
                option.selected = typeKey === detectedType;
                select.appendChild(option);
            });
            
            // Event handler
            select.addEventListener('change', (e) => {
                const newType = e.target.value;
                updateTypeIndicator(typeIndicator, newType);
                
                console.log(`🎯 Column "${columnName}" type changed to: ${dataTypes[newType].name}`);
                
                // Store type selection
                if (!window.importSystem.columnTypes) {
                    window.importSystem.columnTypes = {};
                }
                window.importSystem.columnTypes[columnName] = newType;
                
                // Show validation feedback
                validateColumnWithType(columnName, newType);
            });
            
            typeContainer.appendChild(typeIndicator);
            typeContainer.appendChild(select);
            element.appendChild(typeContainer);
            
            // Store initial type
            if (!window.importSystem.columnTypes) {
                window.importSystem.columnTypes = {};
            }
            window.importSystem.columnTypes[columnName] = detectedType;
        });
    }
    
    // Update type indicator display
    function updateTypeIndicator(indicator, typeKey) {
        const typeDef = dataTypes[typeKey];
        indicator.innerHTML = `
            <i class="${typeDef.icon}" style="color: ${typeDef.color};"></i>
            <span style="color: ${typeDef.color}; font-weight: 500;">${typeDef.name}</span>
        `;
    }
    
    // Auto-detect column type
    function detectColumnType(columnName) {
        const name = columnName.toLowerCase();
        
        if (name.includes('peso') || name.includes('weight')) return 'weight';
        if (name.includes('prezzo') || name.includes('price') || name.includes('valore') || name.includes('cost') || name.includes('€') || name.includes('$')) return 'currency';
        if (name.includes('data') || name.includes('date')) return 'date';
        if (name.includes('quantit') || name.includes('qty') || name.includes('numero') || name.includes('count')) return 'number';
        if (name.includes('attivo') || name.includes('active') || name.includes('enabled')) return 'boolean';
        
        // Check sample data if available
        if (window.importSystem && window.importSystem.fileData && window.importSystem.fileData.data.length > 0) {
            const samples = window.importSystem.fileData.data.slice(0, 5).map(row => row[columnName]).filter(v => v != null);
            
            if (samples.length > 0) {
                // Check if all samples are numbers
                if (samples.every(v => !isNaN(v))) return 'number';
                // Check if all samples are dates
                if (samples.every(v => !isNaN(Date.parse(v)))) return 'date';
                // Check if currency pattern
                if (samples.some(v => String(v).match(/[€$£]/))) return 'currency';
            }
        }
        
        return 'text'; // Default
    }
    
    // Validate column data with selected type
    function validateColumnWithType(columnName, typeKey) {
        if (!window.importSystem || !window.importSystem.fileData) return;
        
        const typeDef = dataTypes[typeKey];
        const data = window.importSystem.fileData.data;
        let validCount = 0;
        let invalidCount = 0;
        
        data.forEach(row => {
            const value = row[columnName];
            if (value && typeDef.validation(value)) {
                validCount++;
            } else if (value) {
                invalidCount++;
            }
        });
        
        const total = validCount + invalidCount;
        const validationRate = total > 0 ? (validCount / total * 100) : 100;
        
        console.log(`📊 Column "${columnName}" as ${typeDef.name}: ${validCount}/${total} valid (${validationRate.toFixed(1)}%)`);
        
        // Show warning if validation rate is low
        if (validationRate < 80 && total > 0) {
            if (window.NotificationSystem) {
                window.NotificationSystem.show(
                    'Data Type Warning',
                    `Only ${validationRate.toFixed(1)}% of "${columnName}" values match ${typeDef.name} format`,
                    'warning'
                );
            }
        }
    }
    
    console.log('✅ Import system enhancements loaded successfully!');
}

// Start enhancement process
document.addEventListener('DOMContentLoaded', enhanceImportSystem);

// Also try to enhance immediately in case DOM is already loaded
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    enhanceImportSystem();
}