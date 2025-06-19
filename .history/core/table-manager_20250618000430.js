// table-manager.js - Gestione tabelle dinamiche con sorting, filtering, pagination

export class TableManager {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container ${containerId} not found`);
        }
        
        // Default options
        this.options = {
            sortable: true,
            filterable: true,
            searchable: true,
            paginate: true,
            pageSize: 20,
            pageSizes: [10, 20, 50, 100],
            responsive: true,
            hoverable: true,
            selectable: false,
            loading: false,
            emptyMessage: 'Nessun dato disponibile',
            ...options
        };
        
        // State
        this.data = [];
        this.filteredData = [];
        this.displayData = [];
        this.currentPage = 1;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.searchTerm = '';
        this.filters = {};
        this.selectedRows = new Set();
        
        this.init();
    }
    
    init() {
        this.loadColumnOrder(); // Carica ordine salvato
        this.render();
        this.attachEventListeners();
        this.enableColumnDrag(); // Abilita drag & drop
    }
    
    // Set data
    setData(data) {
        this.data = Array.isArray(data) ? data : [];
        this.filteredData = [...this.data];
        this.currentPage = 1;
        this.selectedRows.clear();
        this.applyFilters();
    }
    
    // Main render
    render() {
        this.container.innerHTML = `
            <div class="sol-table-wrapper">
                ${this.options.searchable || this.options.filterable ? this.renderControls() : ''}
                <div class="sol-table-container">
                    ${this.renderTable()}
                </div>
                ${this.options.paginate ? this.renderPagination() : ''}
            </div>
        `;
        
        this.attachEventListeners();
    }
    
    // Render controls (search, filters)
    renderControls() {
        return `
            <div class="sol-table-controls">
                ${this.options.searchable ? `
                    <div class="sol-table-search">
                        <i class="fas fa-search"></i>
                        <input 
                            type="text" 
                            class="sol-table-search-input" 
                            placeholder="Cerca..."
                            value="${this.searchTerm}"
                        >
                    </div>
                ` : ''}
                <div class="sol-table-actions">
                    ${this.options.exportable ? `
                        <button class="sol-btn sol-btn-sm sol-btn-glass" data-action="export-csv">
                            <i class="fas fa-file-csv"></i> CSV
                        </button>
                        <button class="sol-btn sol-btn-sm sol-btn-glass" data-action="export-excel">
                            <i class="fas fa-file-excel"></i> Excel
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Render table
    renderTable() {
        if (this.options.loading) {
            return this.renderLoading();
        }
        
        if (this.displayData.length === 0) {
            return this.renderEmpty();
        }
        
        const columns = this.getColumns();
        
        // NOTA: Aggiungiamo il wrapper div qui
        return `
            <div class="table-container">
                <table class="sol-table ${this.options.hoverable ? 'sol-table-hover' : ''}">
                    <thead>
                        <tr>
                            ${this.options.selectable ? `
                                <th class="sol-table-checkbox">
                                    <input type="checkbox" class="select-all">
                                </th>
                            ` : ''}
                            ${columns.map(col => this.renderHeader(col)).join('')}
                            ${this.options.actions ? '<th class="sol-table-actions">Azioni</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.displayData.map((row, index) => this.renderRow(row, index)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // Render header
    renderHeader(column) {
        const isSortable = this.options.sortable && column.sortable !== false;
        const isCurrentSort = this.sortColumn === column.key;
        
        return `
            <th class="${isSortable ? 'sol-table-sortable' : ''} ${column.className || ''}" 
                ${isSortable ? `data-sort="${column.key}"` : ''}>
                <div class="sol-table-header-content">
                    <span>${column.label || column.key}</span>
                    ${isSortable ? `
                        <i class="fas fa-sort${isCurrentSort ? `-${this.sortDirection === 'asc' ? 'up' : 'down'}` : ''}"></i>
                    ` : ''}
                </div>
            </th>
        `;
    }
    
    // Render row
    renderRow(row, index) {
        const columns = this.getColumns();
        const rowId = row.id || index;
        
        return `
            <tr data-row-id="${rowId}" class="${this.selectedRows.has(rowId) ? 'selected' : ''}">
                ${this.options.selectable ? `
                    <td class="sol-table-checkbox">
                        <input type="checkbox" class="select-row" data-id="${rowId}">
                    </td>
                ` : ''}
                ${columns.map(col => this.renderCell(row, col)).join('')}
                ${this.options.actions ? this.renderActions(row, rowId) : ''}
            </tr>
        `;
    }
    
    // Render cell
    renderCell(row, column) {
        const value = this.getCellValue(row, column.key);
        const formatter = column.formatter || this.options.formatters?.[column.key];
        const displayValue = formatter ? formatter(value, row) : value;
        
        return `<td class="${column.className || ''}">${displayValue ?? '-'}</td>`;
    }
    
    // Render actions
    renderActions(row, rowId) {
        const actions = typeof this.options.actions === 'function' 
            ? this.options.actions(row) 
            : this.options.actions;
        
        return `
            <td class="sol-table-actions">
                <div class="sol-table-actions-wrapper">
                    ${actions.map(action => `
                        <button 
                            class="sol-btn sol-btn-sm ${action.className || 'sol-btn-glass'}"
                            data-action="${action.handler}"
                            data-id="${rowId}"
                            title="${action.title || action.label}"
                        >
                            ${action.icon ? `<i class="${action.icon}"></i>` : ''}
                            ${action.label || ''}
                        </button>
                    `).join('')}
                </div>
            </td>
        `;
    }
    
    // Render pagination
    renderPagination() {
        const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
        const start = (this.currentPage - 1) * this.options.pageSize + 1;
        const end = Math.min(this.currentPage * this.options.pageSize, this.filteredData.length);
        
        return `
            <div class="sol-table-pagination">
                <div class="sol-table-info">
                    Mostrando ${start} - ${end} di ${this.filteredData.length} risultati
                </div>
                <div class="sol-table-pagination-controls">
                    <select class="sol-table-pagesize">
                        ${this.options.pageSizes.map(size => `
                            <option value="${size}" ${size === this.options.pageSize ? 'selected' : ''}>
                                ${size} per pagina
                            </option>
                        `).join('')}
                    </select>
                    <button 
                        class="sol-pagination-btn" 
                        data-action="prev-page"
                        ${this.currentPage === 1 ? 'disabled' : ''}
                    >
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span class="sol-pagination-info">
                        Pagina ${this.currentPage} di ${totalPages}
                    </span>
                    <button 
                        class="sol-pagination-btn" 
                        data-action="next-page"
                        ${this.currentPage === totalPages ? 'disabled' : ''}
                    >
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    // Render loading
    renderLoading() {
        return `
            <div class="sol-table-loading">
                <div class="loading-spinner"></div>
                <p>Caricamento dati...</p>
            </div>
        `;
    }
    
    // Render empty
    renderEmpty() {
        return `
            <div class="sol-table-empty">
                <i class="fas fa-inbox" style="font-size: 3rem; opacity: 0.3;"></i>
                <p>${this.options.emptyMessage}</p>
            </div>
        `;
    }
    
    // Get columns
    getColumns() {
        if (this.options.columns) {
            return this.options.columns;
        }
        
        // Auto-detect columns from data
        if (this.data.length > 0) {
            return Object.keys(this.data[0]).map(key => ({
                key,
                label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
            }));
        }
        
        return [];
    }
    
    // Get cell value (supports nested properties)
    getCellValue(row, key) {
        return key.split('.').reduce((obj, prop) => obj?.[prop], row);
    }
    
    // Apply filters and search
    applyFilters() {
        let filtered = [...this.data];
        
        // Apply search
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(row => {
                return Object.values(row).some(value => 
                    String(value).toLowerCase().includes(term)
                );
            });
        }
        
        // Apply column filters
        Object.entries(this.filters).forEach(([key, value]) => {
            if (value) {
                filtered = filtered.filter(row => {
                    const cellValue = this.getCellValue(row, key);
                    return String(cellValue).toLowerCase().includes(value.toLowerCase());
                });
            }
        });
        
        this.filteredData = filtered;
        
        // Apply sorting
        if (this.sortColumn) {
            this.sort(this.sortColumn, this.sortDirection);
        }
        
        // Apply pagination
        this.paginate();
    }
    
    // Sort
    sort(column, direction = null) {
        if (direction === null) {
            // Toggle direction
            if (this.sortColumn === column) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortColumn = column;
                this.sortDirection = 'asc';
            }
        } else {
            this.sortColumn = column;
            this.sortDirection = direction;
        }
        
        this.filteredData.sort((a, b) => {
            const aVal = this.getCellValue(a, column);
            const bVal = this.getCellValue(b, column);
            
            // Handle different types
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            
            let comparison = 0;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                comparison = aVal - bVal;
            } else {
                comparison = String(aVal).localeCompare(String(bVal));
            }
            
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });
        
        this.paginate();
    }
    
    // Paginate
    paginate() {
        const start = (this.currentPage - 1) * this.options.pageSize;
        const end = start + this.options.pageSize;
        this.displayData = this.filteredData.slice(start, end);
        this.render();
    }
    
    // Navigation
    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.paginate();
        }
    }
    
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.paginate();
        }
    }
    
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.paginate();
        }
    }
    
    // Event listeners
    attachEventListeners() {
        // Search
        const searchInput = this.container.querySelector('.sol-table-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
            });
        }
        
        // Sort
        const sortableHeaders = this.container.querySelectorAll('.sol-table-sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                this.sort(column);
            });
        });
        
        // Page size
        const pageSizeSelect = this.container.querySelector('.sol-table-pagesize');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.options.pageSize = parseInt(e.target.value);
                this.currentPage = 1;
                this.paginate();
            });
        }
        
        // Pagination buttons
        this.container.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action === 'next-page') this.nextPage();
            if (action === 'prev-page') this.previousPage();
            if (action === 'export-csv') this.export('csv');
            if (action === 'export-excel') this.export('excel');
            
            // Handle custom actions
            const actionBtn = e.target.closest('[data-action][data-id]');
            if (actionBtn) {
                const handler = actionBtn.dataset.action;
                const id = actionBtn.dataset.id;
                if (window[handler]) {
                    window[handler](id);
                }
            }
        });
        
        // Selection
        if (this.options.selectable) {
            // Select all
            const selectAll = this.container.querySelector('.select-all');
            if (selectAll) {
                selectAll.addEventListener('change', (e) => {
                    const checkboxes = this.container.querySelectorAll('.select-row');
                    checkboxes.forEach(cb => {
                        cb.checked = e.target.checked;
                        const id = cb.dataset.id;
                        if (e.target.checked) {
                            this.selectedRows.add(id);
                        } else {
                            this.selectedRows.delete(id);
                        }
                    });
                    this.onSelectionChange();
                });
            }
            
            // Individual rows
            const rowCheckboxes = this.container.querySelectorAll('.select-row');
            rowCheckboxes.forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const id = e.target.dataset.id;
                    if (e.target.checked) {
                        this.selectedRows.add(id);
                    } else {
                        this.selectedRows.delete(id);
                    }
                    this.onSelectionChange();
                });
            });
        }
    }
    
    // Selection change callback
    onSelectionChange() {
        if (this.options.onSelectionChange) {
            const selectedData = this.data.filter(row => 
                this.selectedRows.has(row.id || this.data.indexOf(row))
            );
            this.options.onSelectionChange(selectedData);
        }
    }
    
    // Public methods
    refresh() {
        this.applyFilters();
    }
    
    loading(state) {
        this.options.loading = state;
        this.render();
    }
    
    getSelectedRows() {
        return this.data.filter(row => 
            this.selectedRows.has(row.id || this.data.indexOf(row))
        );
    }
    
    clearSelection() {
        this.selectedRows.clear();
        this.render();
    }
    
    // Export functionality
    export(format = 'csv') {
        const data = this.filteredData;
        const columns = this.getColumns();
        
        if (format === 'csv') {
            this.exportCSV(data, columns);
        } else if (format === 'excel') {
            this.exportExcel(data, columns);
        }
    }
    
    exportCSV(data, columns) {
        const headers = columns.map(col => col.label || col.key).join(',');
        const rows = data.map(row => 
            columns.map(col => {
                const value = this.getCellValue(row, col.key);
                // Escape quotes and wrap in quotes if contains comma
                const escaped = String(value || '').replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            }).join(',')
        );
        
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `export-${Date.now()}.csv`;
        link.click();
    }
    
    exportExcel(data, columns) {
        if (!window.XLSX) {
            window.NotificationSystem?.error('XLSX library non caricata');
            return;
        }
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data');
        XLSX.writeFile(wb, `export-${Date.now()}.xlsx`);
    }

    // Aggiungi questo metodo alla classe TableManager
    enableColumnDrag() {
    // Aspetta che il DOM sia pronto
    setTimeout(() => {
        const headerRow = this.container.querySelector('.data-table thead tr, .sol-table thead tr');
        if (!headerRow || !window.Sortable) {
            console.warn('Cannot enable column drag: headerRow or Sortable not found');
            return;
        }
        
        // Distruggi istanza precedente se esiste
        if (this.columnSortable) {
            this.columnSortable.destroy();
        }
        
        // Inizializza Sortable sugli header
        this.columnSortable = new Sortable(headerRow, {
            animation: 150,
            ghostClass: 'column-drag-ghost',
            chosenClass: 'column-drag-chosen',
            dragClass: 'column-drag-active',
            handle: 'th:not(.no-drag)',  // Solo th non marcati come no-drag
            filter: '.no-drag',          // Escludi colonne non trascinabili
            onEnd: (evt) => {
                this.handleColumnReorder(evt.oldIndex, evt.newIndex);
            }
        });
        
        console.log('Column drag enabled');
    }, 100);
}

    // Gestisci il riordino delle colonne
    handleColumnReorder(oldIndex, newIndex) {
    if (oldIndex === newIndex) return;
    
    // Verifica che columns esista
    if (!this.options.columns) {
        console.error('No columns array found');
        return;
    }
    
    // Riordina l'array delle colonne
    const movedColumn = this.options.columns.splice(oldIndex, 1)[0];
    this.options.columns.splice(newIndex, 0, movedColumn);
    
    // Salva il nuovo ordine
    this.saveColumnOrder();
    
    // Riordina anche i dati della tabella senza re-renderizzare
    this.reorderTableColumns(oldIndex, newIndex);
    
    // Notifica del cambiamento
    if (window.NotificationSystem) {
        window.NotificationSystem.success('Colonne riordinate');
    }
}

// Nuovo metodo per riordinare le colonne nel DOM senza re-render
reorderTableColumns(oldIndex, newIndex) {
    // Riordina tutti i th
    const headerCells = this.container.querySelectorAll('thead tr th');
    const movedHeader = headerCells[oldIndex];
    const targetHeader = headerCells[newIndex];
    
    if (oldIndex < newIndex) {
        targetHeader.parentNode.insertBefore(movedHeader, targetHeader.nextSibling);
    } else {
        targetHeader.parentNode.insertBefore(movedHeader, targetHeader);
    }
    
    // Riordina tutti i td in ogni riga
    const rows = this.container.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const movedCell = cells[oldIndex];
        const targetCell = cells[newIndex];
        
        if (oldIndex < newIndex) {
            targetCell.parentNode.insertBefore(movedCell, targetCell.nextSibling);
        } else {
            targetCell.parentNode.insertBefore(movedCell, targetCell);
        }
    });
}

export default TableManager;