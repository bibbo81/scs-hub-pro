export class TableManager {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container ${containerId} not found`);
        }
        
        // Default options with all features
        this.options = {
            sortable: true,
            filterable: true,
            searchable: true,
            paginate: true,
            pageSize: 20,
            pageSizes: [10, 20, 50, 100],
            responsive: true,
            hoverable: true,
            selectable: true,
            loading: false,
            emptyMessage: 'Nessun dato disponibile',
            enableColumnDrag: true,
            enableColumnManager: true,
            enableAdvancedSearch: true,
            ...options
        };
        
        // Alias for compatibility
        this.config = this.options;
        
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
        this.columnSortable = null;
        this.advancedSearch = null;
        this.searchDebounceTimer = null;
        
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        this.loadColumnOrder();
        
        // Initialize advanced search
        if (this.options.enableAdvancedSearch) {
            this.initAdvancedSearch();
        }
        
        // Enable column drag after a small delay
        if (this.options.enableColumnDrag) {
            setTimeout(() => this.enableColumnDrag(), 100);
        }
    }
    
    // Initialize advanced search functionality
    initAdvancedSearch() {
        this.advancedSearch = {
            searchHistory: this.loadSearchHistory(),
            
            search: (query) => {
                const results = [];
                const lowerQuery = query.toLowerCase();
                
                this.data.forEach((row, index) => {
                    let matches = 0;
                    let matchedFields = [];
                    
                    Object.entries(row).forEach(([key, value]) => {
                        if (value && value.toString().toLowerCase().includes(lowerQuery)) {
                            matches++;
                            matchedFields.push({ field: key, value: value });
                        }
                    });
                    
                    if (matches > 0) {
                        results.push({
                            row,
                            index,
                            matches,
                            matchedFields,
                            score: matches / Object.keys(row).length
                        });
                    }
                });
                
                // Sort by relevance score
                return results.sort((a, b) => b.score - a.score);
            },
            
            getSuggestions: (query) => {
                if (!query || query.length < 2) return [];
                
                const suggestions = [];
                const lowerQuery = query.toLowerCase();
                
                // Add history suggestions
                this.advancedSearch.searchHistory.forEach(hist => {
                    if (hist.toLowerCase().includes(lowerQuery)) {
                        suggestions.push({
                            type: 'history',
                            value: hist,
                            icon: 'fa-history'
                        });
                    }
                });
                
                // Add field suggestions
                const columns = this.getColumns();
                columns.forEach(col => {
                    if (col.label.toLowerCase().includes(lowerQuery)) {
                        suggestions.push({
                            type: 'field',
                            value: col.key,
                            label: col.label,
                            icon: 'fa-tag'
                        });
                    }
                });
                
                // Add value suggestions from data
                const uniqueValues = new Set();
                this.data.slice(0, 100).forEach(row => {
                    Object.values(row).forEach(value => {
                        if (value && value.toString().toLowerCase().includes(lowerQuery)) {
                            uniqueValues.add(value.toString());
                        }
                    });
                });
                
                Array.from(uniqueValues).slice(0, 5).forEach(value => {
                    suggestions.push({
                        type: 'value',
                        value: value,
                        icon: 'fa-search'
                    });
                });
                
                return suggestions.slice(0, 10);
            },
            
            addToHistory: (query) => {
                if (!query || query.length < 3) return;
                
                this.advancedSearch.searchHistory = this.advancedSearch.searchHistory.filter(q => q !== query);
                this.advancedSearch.searchHistory.unshift(query);
                this.advancedSearch.searchHistory = this.advancedSearch.searchHistory.slice(0, 20);
                
                localStorage.setItem('tableSearchHistory', JSON.stringify(this.advancedSearch.searchHistory));
            }
        };
    }
    
    loadSearchHistory() {
        try {
            return JSON.parse(localStorage.getItem('tableSearchHistory') || '[]');
        } catch {
            return [];
        }
    }
    
    // Set data
    setData(data) {
        this.data = Array.isArray(data) ? data : [];
        this.filteredData = [...this.data];
        this.currentPage = 1;
        this.selectedRows.clear();
        this.applyFilters();
    }
    
    // Main render method
    render() {
        const searchValue = this.container.querySelector('.sol-table-search-input')?.value || this.searchTerm;
        
        this.container.innerHTML = `
            <div class="sol-table-wrapper">
                ${this.renderControls()}
                <div class="sol-table-container">
                    ${this.renderTable()}
                </div>
                ${this.options.paginate ? this.renderPagination() : ''}
            </div>
        `;
        
        // Restore search value
        const searchInput = this.container.querySelector('.sol-table-search-input');
        if (searchInput && searchValue) {
            searchInput.value = searchValue;
        }
        
        // Re-enable column drag if it was enabled
        if (this.options.enableColumnDrag && this.columnSortable) {
            setTimeout(() => this.enableColumnDrag(), 100);
        }
    }
    
    // Render controls (search, column manager, etc.)
    renderControls() {
        return `
            <div class="sol-table-controls">
                ${this.options.searchable ? this.renderSearch() : ''}
                <div class="sol-table-actions">
                    ${this.options.enableColumnManager ? `
                        <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="window.tableManagerShowColumns('${this.container.id}')">
                            <i class="fas fa-columns"></i> Colonne
                        </button>
                    ` : ''}
                    <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="window.tableManagerExport('${this.container.id}', 'excel')">
                        <i class="fas fa-file-excel"></i> Excel
                    </button>
                    <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="window.tableManagerExport('${this.container.id}', 'pdf')">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                </div>
            </div>
        `;
    }
    
    // Render search with suggestions
    renderSearch() {
        return `
            <div class="sol-table-search">
                <div class="search-input-wrapper">
                    <input 
                        type="text" 
                        class="sol-table-search-input sol-form-control" 
                        placeholder="Cerca in tutti i campi..."
                        value="${this.searchTerm}"
                    >
                    <i class="fas fa-search search-icon"></i>
                </div>
                <div class="search-suggestions" style="display: none;"></div>
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
        
        return `
            <table class="sol-table data-table">
                <thead>
                    <tr>
                        ${this.options.selectable ? this.renderSelectAllHeader() : ''}
                        ${columns.map(col => this.renderHeader(col)).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${this.displayData.map((row, index) => this.renderRow(row, index)).join('')}
                </tbody>
            </table>
        `;
    }
    
    // Render select all checkbox header
    renderSelectAllHeader() {
        const allSelected = this.displayData.length > 0 &&
                          this.displayData.every(row => this.selectedRows.has(String(row.id ?? this.data.indexOf(row))));
        
        return `
            <th class="no-drag" style="width: 40px;">
                <input 
                    type="checkbox" 
                    class="select-all"
                    ${allSelected ? 'checked' : ''}
                    onchange="window.tableManagerSelectAll('${this.container.id}', this.checked)"
                >
            </th>
        `;
    }
    
    // Render column header
    renderHeader(column) {
        const isSorted = this.sortColumn === column.key;
        const sortIcon = isSorted 
            ? (this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down')
            : 'fa-sort';
        
        return `
            <th
                class="${column.sortable !== false ? 'sortable' : ''} ${column.className || ''}"
                data-column="${column.key}"
                ${column.sortable !== false ? `onclick="window.tableManagerSort('${this.container.id}', '${column.key}')"` : ''}
            >
                <div class="th-content">
                    ${this.options.enableColumnDrag ? '<span class="drag-handle"><i class="fas fa-grip-lines"></i></span>' : ''}
                    <span>${column.label || column.key}</span>
                    ${column.sortable !== false ? `<i class="fas ${sortIcon} sort-icon"></i>` : ''}
                </div>
            </th>
        `;
    }
    
    // Render table row
    renderRow(row, index) {
        const rowId = String(row.id ?? index);
        const isSelected = this.selectedRows.has(rowId);
        
        return `
            <tr class="${isSelected ? 'selected' : ''}" data-row-id="${rowId}">
                ${this.options.selectable ? this.renderSelectCell(rowId, isSelected) : ''}
                ${this.getColumns().map(col => this.renderCell(row, col)).join('')}
            </tr>
        `;
    }
    
    // Render select checkbox cell
    renderSelectCell(rowId, isSelected) {
    return `
        <td>
            <input 
                type="checkbox" 
                class="select-row"
                value="${rowId}"
                data-id="${rowId}"
                ${isSelected ? 'checked' : ''}
            >
        </td>
    `;
}
    
    // Render cell
    renderCell(row, column) {
        const value = this.getCellValue(row, column.key);
        const formatter = column.formatter || this.options.formatters?.[column.key];
        const displayValue = formatter ? formatter(value, row) : value;
        
        return `<td class="${column.className || ''}">${displayValue ?? '-'}</td>`;
    }
    
    // Render pagination with page selector
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
                    <select class="sol-table-pagesize" onchange="window.tableManagerChangePageSize('${this.container.id}', this.value)">
                        ${this.options.pageSizes.map(size => `
                            <option value="${size}" ${size === this.options.pageSize ? 'selected' : ''}>
                                ${size} per pagina
                            </option>
                        `).join('')}
                    </select>
                    
                    <div class="pagination-buttons">
                        <button 
                            class="sol-pagination-btn" 
                            onclick="window.tableManagerGoToPage('${this.container.id}', 1)"
                            ${this.currentPage === 1 ? 'disabled' : ''}
                        >
                            <i class="fas fa-angle-double-left"></i>
                        </button>
                        <button 
                            class="sol-pagination-btn" 
                            onclick="window.tableManagerPrevPage('${this.container.id}')"
                            ${this.currentPage === 1 ? 'disabled' : ''}
                        >
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        
                        ${this.renderPageNumbers(totalPages)}
                        
                        <button 
                            class="sol-pagination-btn" 
                            onclick="window.tableManagerNextPage('${this.container.id}')"
                            ${this.currentPage === totalPages ? 'disabled' : ''}
                        >
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <button 
                            class="sol-pagination-btn" 
                            onclick="window.tableManagerGoToPage('${this.container.id}', ${totalPages})"
                            ${this.currentPage === totalPages ? 'disabled' : ''}
                        >
                            <i class="fas fa-angle-double-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Render page numbers
    renderPageNumbers(totalPages) {
        const pages = [];
        const maxVisible = 5;
        
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(`
                <button 
                    class="sol-pagination-btn ${i === this.currentPage ? 'active' : ''}"
                    onclick="window.tableManagerGoToPage('${this.container.id}', ${i})"
                >
                    ${i}
                </button>
            `);
        }
        
        return pages.join('');
    }
    
    // Render loading state
    renderLoading() {
        return `
            <div class="sol-table-loading">
                <div class="loading-spinner"></div>
                <p>Caricamento dati...</p>
            </div>
        `;
    }
    
    // Render empty state
    renderEmpty() {
        return `
            <div class="sol-table-empty">
                <i class="fas fa-inbox" style="font-size: 3rem; opacity: 0.3;"></i>
                <p>${this.options.emptyMessage}</p>
            </div>
        `;
    }
    
    // Enable column drag & drop
    enableColumnDrag() {
        if (!this.options.enableColumnDrag || !window.Sortable) return;
        
        setTimeout(() => {
            const headerRow = this.container.querySelector('.data-table thead tr, .sol-table thead tr');
            
            if (!headerRow) {
                console.warn('Column drag: Header row not found');
                return;
            }
            
            // Destroy previous instance
            if (this.columnSortable) {
                this.columnSortable.destroy();
            }
            
            // Create new Sortable instance
            this.columnSortable = new Sortable(headerRow, {
                animation: 150,
                ghostClass: 'column-drag-ghost',
                chosenClass: 'column-drag-chosen',
                dragClass: 'column-drag-active',
                filter: '.no-drag',
                preventOnFilter: false,
                onEnd: (evt) => {
                    this.handleColumnReorder(evt.oldIndex, evt.newIndex);
                }
            });
            
            console.log('✅ Column drag enabled');
        }, 100);
    }
    
    // Handle column reorder
    handleColumnReorder(oldIndex, newIndex) {
        if (oldIndex === newIndex) return;
        
        // Adjust indices if selectable column exists
        if (this.options.selectable) {
            oldIndex--;
            newIndex--;
        }
        
        if (oldIndex < 0 || newIndex < 0) return;
        
        // Reorder columns array
        const columns = this.getColumns();
        const movedColumn = columns.splice(oldIndex, 1)[0];
        columns.splice(newIndex, 0, movedColumn);
        
        // Update columns in options
        this.options.columns = columns;
        
        // Save column order
        this.saveColumnOrder();
        
        // Trigger callback
        if (this.options.onColumnReorder) {
            this.options.onColumnReorder(columns);
        }
        
        // Re-render table
        this.render();
    }
    
    // Save column order to localStorage
    saveColumnOrder() {
        const columns = this.getColumns();
        const columnOrder = columns.map(col => col.key);
        localStorage.setItem(`tableColumns_${this.container.id}`, JSON.stringify(columnOrder));
    }
    
    // Load column order from localStorage
    loadColumnOrder() {
        try {
            const saved = localStorage.getItem(`tableColumns_${this.container.id}`);
            if (saved && this.options.columns) {
                const order = JSON.parse(saved);
                const columns = this.options.columns;
                
                // Reorder columns based on saved order
                this.options.columns = order
                    .map(key => columns.find(col => col.key === key))
                    .filter(Boolean)
                    .concat(columns.filter(col => !order.includes(col.key)));
            }
        } catch (e) {
            console.error('Error loading column order:', e);
        }
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
            filtered = this.performSearch(filtered, this.searchTerm);
        }
        
        // Apply column filters
        Object.entries(this.filters).forEach(([column, value]) => {
            if (value) {
                filtered = filtered.filter(row => {
                    const cellValue = this.getCellValue(row, column);
                    return cellValue?.toString().toLowerCase().includes(value.toLowerCase());
                });
            }
        });
        
        this.filteredData = filtered;
        this.sort();
    }
    
    // Perform search across all columns
    performSearch(data, term) {
        const lowerTerm = term.toLowerCase();
        
        return data.filter(row => {
            return Object.values(row).some(value => {
                if (value === null || value === undefined) return false;
                return value.toString().toLowerCase().includes(lowerTerm);
            });
        });
    }
    
    // Sort data
    sort() {
        if (!this.sortColumn) {
            this.paginate();
            return;
        }
        
        this.filteredData.sort((a, b) => {
            const aVal = this.getCellValue(a, this.sortColumn);
            const bVal = this.getCellValue(b, this.sortColumn);
            
            if (aVal === bVal) return 0;
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            
            const comparison = aVal < bVal ? -1 : 1;
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });
        
        this.paginate();
    }
    
    // Paginate data
    paginate() {
        const start = (this.currentPage - 1) * this.options.pageSize;
        const end = start + this.options.pageSize;
        this.displayData = this.filteredData.slice(start, end);
        this.render();
    }
    
    // Search with debouncing
    search(term) {
        clearTimeout(this.searchDebounceTimer);
        
        this.searchDebounceTimer = setTimeout(() => {
            this.searchTerm = term;
            this.currentPage = 1;
            this.applyFilters();
            
            // Add to search history
            if (this.advancedSearch && term) {
                this.advancedSearch.addToHistory(term);
            }
        }, 300);
    }
    
   attachEventListeners() {
    // Search input
    this.container.addEventListener('input', (e) => {
        if (e.target.classList.contains('sol-table-search-input')) {
            const value = e.target.value;
            this.search(value);
            
            // Show suggestions
            if (this.advancedSearch && value.length >= 2) {
                this.showSearchSuggestions(value);
            } else {
                this.hideSearchSuggestions();
            }
        }
    });
    
    // Hide suggestions on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.sol-table-search')) {
            this.hideSearchSuggestions();
        }
    });
    
    // AGGIUNGI QUESTO CODICE QUI:
    // Gestione click su checkbox con event delegation
    this.container.addEventListener('change', (e) => {
        if (e.target.classList.contains('select-row') && e.target.type === 'checkbox') {
            e.stopPropagation();
            
            const rowId = e.target.value || e.target.dataset.id;
            if (rowId && rowId !== 'on') {
                this.selectRow(rowId, e.target.checked);
            }
        }
    });
}
    
    // Show search suggestions
    showSearchSuggestions(query) {
        if (!this.advancedSearch) return;
        
        const suggestions = this.advancedSearch.getSuggestions(query);
        const suggestionsEl = this.container.querySelector('.search-suggestions');
        
        if (!suggestionsEl || suggestions.length === 0) {
            this.hideSearchSuggestions();
            return;
        }
        
        suggestionsEl.innerHTML = suggestions.map((sugg, index) => `
            <div class="search-suggestion ${index === 0 ? 'active' : ''}" 
                 onclick="window.tableManagerSelectSuggestion('${this.container.id}', '${sugg.value}')">
                <i class="fas ${sugg.icon}"></i>
                <span>${sugg.label || sugg.value}</span>
                ${sugg.type === 'history' ? '<small>Ricerca recente</small>' : ''}
            </div>
        `).join('');
        
        suggestionsEl.style.display = 'block';
    }
    
    // Hide search suggestions
    hideSearchSuggestions() {
        const suggestionsEl = this.container.querySelector('.search-suggestions');
        if (suggestionsEl) {
            suggestionsEl.style.display = 'none';
        }
    }
    
    // Public API methods
    
    // Select all rows
    selectAll(selected) {
        if (selected) {
            this.displayData.forEach(row => {
                const id = String(row.id ?? this.data.indexOf(row));
                this.selectedRows.add(id);
            });
        } else {
            this.selectedRows.clear();
        }
        
        this.onSelectionChange();
        this.render();
    }
    
    // Select/deselect single row
    selectRow(rowId, selected) {
        const id = String(rowId);
        
        if (selected) {
            this.selectedRows.add(id);
        } else {
            this.selectedRows.delete(id);
        }
        
        this.onSelectionChange();
        this.render();
    }
    
    // Get selected rows data
    getSelectedRows() {
        return this.data.filter(row => {
            const id = String(row.id ?? this.data.indexOf(row));
            return this.selectedRows.has(id);
        });
    }
    
    // Clear selection
    clearSelection() {
        this.selectedRows.clear();
        this.onSelectionChange();
        this.render();
    }
    
    // Selection change callback
    onSelectionChange() {
        if (this.options.onSelectionChange) {
            const selectedData = this.getSelectedRows();
            this.options.onSelectionChange(selectedData);
        }
    }
    
    // Change page
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.paginate();
        }
    }
    
    // Next page
    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.paginate();
        }
    }
    
    // Previous page
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.paginate();
        }
    }
    
    // Change page size
    changePageSize(size) {
        this.options.pageSize = parseInt(size);
        this.currentPage = 1;
        this.paginate();
    }
    
    // Sort by column
    sortBy(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        
        this.sort();
    }
    
    // Export data
    export(format = 'csv') {
        const data = this.filteredData;
        const columns = this.getColumns();
        
        if (format === 'csv') {
            this.exportCSV(data, columns);
        } else if (format === 'excel') {
            this.exportExcel(data, columns);
        } else if (format === 'pdf') {
            this.exportPDF(data, columns);
        }
    }
    
    // Export to CSV
    exportCSV(data, columns) {
        const headers = columns.map(col => col.label || col.key).join(',');
        const rows = data.map(row => 
            columns.map(col => {
                const value = this.getCellValue(row, col.key);
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
    
    // Export to Excel
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
    
    // Export to PDF
    exportPDF(data, columns) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            window.NotificationSystem?.error('jsPDF library non caricata');
            return;
        }
        
        const doc = new window.jspdf.jsPDF();
        const tableColumns = columns.map(col => col.label || col.key);
        const tableRows = data.map(row => 
            columns.map(col => this.getCellValue(row, col.key) || '')
        );
        
        doc.autoTable({
            head: [tableColumns],
            body: tableRows,
            startY: 20
        });
        
        doc.save(`export-${Date.now()}.pdf`);
    }
    
    // Refresh table
    refresh() {
        this.applyFilters();
    }
    
    // Set loading state
    loading(state) {
        this.options.loading = state;
        this.render();
    }
}

// Global functions for inline event handlers
window.tableManagerInstances = window.tableManagerInstances || new Map();

// Store instance reference
window.registerTableManager = function(containerId, instance) {
    window.tableManagerInstances.set(containerId, instance);
};

// Get instance
window.getTableManager = function(containerId) {
    return window.tableManagerInstances.get(containerId);
};

// Global event handlers
window.tableManagerSort = function(containerId, column) {
    const instance = window.getTableManager(containerId);
    if (instance) instance.sortBy(column);
};

window.tableManagerSelectAll = function(containerId, checked) {
    const instance = window.getTableManager(containerId);
    if (instance) instance.selectAll(checked);
};

window.tableManagerSelectRow = function(containerId, rowId, checked) {
    const instance = window.getTableManager(containerId);
    if (instance) instance.selectRow(rowId, checked);
};

window.tableManagerGoToPage = function(containerId, page) {
    const instance = window.getTableManager(containerId);
    if (instance) instance.goToPage(page);
};

window.tableManagerPrevPage = function(containerId) {
    const instance = window.getTableManager(containerId);
    if (instance) instance.previousPage();
};

window.tableManagerNextPage = function(containerId) {
    const instance = window.getTableManager(containerId);
    if (instance) instance.nextPage();
};

window.tableManagerChangePageSize = function(containerId, size) {
    const instance = window.getTableManager(containerId);
    if (instance) instance.changePageSize(size);
};

window.tableManagerExport = function(containerId, format) {
    const instance = window.getTableManager(containerId);
    if (instance) instance.export(format);
};

window.tableManagerSelectSuggestion = function(containerId, value) {
    const instance = window.getTableManager(containerId);
    if (instance) {
        const searchInput = instance.container.querySelector('.sol-table-search-input');
        if (searchInput) {
            searchInput.value = value;
            instance.search(value);
            instance.hideSearchSuggestions();
        }
    }
};

window.tableManagerShowColumns = function(containerId) {
    const instance = window.getTableManager(containerId);
    if (!instance || !window.ModalSystem) return;
    
    const columns = instance.getColumns();
    const visibleColumns = columns.filter(col => !col.hidden);
    
    const content = `
        <div class="column-manager">
            <div class="column-manager-header">
                <p>Seleziona le colonne da visualizzare</p>
            </div>
            <div class="column-list" id="columnManagerList">
                ${columns.map(col => `
                    <div class="column-item" data-column="${col.key}">
                        <div class="column-drag-handle">
                            <i class="fas fa-grip-vertical"></i>
                        </div>
                        <label class="column-checkbox">
                            <input type="checkbox" 
                                   value="${col.key}" 
                                   ${!col.hidden ? 'checked' : ''}>
                            <span>${col.label || col.key}</span>
                        </label>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    window.ModalSystem.show({
        title: 'Gestione Colonne',
        content: content,
        size: 'md',
        buttons: [
            {
                text: 'Annulla',
                class: 'sol-btn-secondary',
                action: 'close'
            },
            {
                text: 'Applica',
                class: 'sol-btn-primary',
                action: () => {
                    // Apply column visibility changes
                    const checkboxes = document.querySelectorAll('#columnManagerList input[type="checkbox"]');
                    checkboxes.forEach(cb => {
                        const col = columns.find(c => c.key === cb.value);
                        if (col) {
                            col.hidden = !cb.checked;
                        }
                    });
                    
                    instance.render();
                    window.ModalSystem.close();
                }
            }
        ]
    });
    
    // Enable sortable on column list
    setTimeout(() => {
        const list = document.getElementById('columnManagerList');
        if (list && window.Sortable) {
            new Sortable(list, {
                animation: 150,
                handle: '.column-drag-handle'
            });
        }
    }, 100);
};
export default TableManager;