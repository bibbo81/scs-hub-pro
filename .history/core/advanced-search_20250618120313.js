// advanced-search.js - Sistema di ricerca avanzata per tabelle

export class AdvancedSearch {
    constructor(options = {}) {
        this.options = {
            searchInMetadata: true,  // ✅ FIX 1: CAMBIATO da false a true!
            debounceMs: 300,
            maxSuggestions: 5,
            fuzzyThreshold: 0.6,
            ...options
        };
        
        this.searchHistory = this.loadSearchHistory();
        this.debounceTimer = null;
    }
    
    // Mappa completa per status italiano/inglese basata su Google Sheets
    getStatusMapping() {
        return {
            // Mapping da Google Sheets (Inglese -> Italiano)
            'sailing': 'in transito',
            'arrived': 'arrivata',
            'delivered': 'consegnato',
            'discharged': 'scaricato',
            'la spedizione è stata consegnata': 'consegnato',
            'on fedex vehicle for delivery': 'in consegna',
            'at local fedex facility': 'in transito',
            'departed fedex hub': 'in transito',
            'on the way': 'in transito',
            'arrived at fedex hub': 'in transito',
            'international shipment release - import': 'sdoganata',
            'at destination sort facility': 'in transito',
            'left fedex origin facility': 'in transito',
            'picked up': 'in transito',
            'shipment information sent to fedex': 'spedizione creata',
            'consegnata.': 'consegnato',
            'consegna prevista nel corso della giornata odierna.': 'in consegna',
            'arrivata nella sede gls locale.': 'in transito',
            'in transito.': 'in transito',
            'partita dalla sede mittente. in transito.': 'in transito',
            'la spedizione e\' stata creata dal mittente, attendiamo che ci venga affidata per l\'invio a destinazione.': 'spedizione creata',
            'la spedizione è stata consegnata': 'consegnato',
            'la spedizione è in consegna': 'in consegna',
            'la spedizione è in transito': 'in transito',
            
            // Reverse mapping (Italiano -> Stato sistema)
            'in transito': 'in_transit',
            'arrivata': 'arrived',
            'consegnato': 'delivered',
            'scaricato': 'arrived', // discharged = arrived nel sistema
            'in consegna': 'out_for_delivery',
            'sdoganata': 'customs_cleared',
            'spedizione creata': 'registered',
            
            // Stati sistema -> Italiano (per display)
            'in_transit': 'in transito',
            'arrived': 'arrivato',
            'delivered': 'consegnato',
            'out_for_delivery': 'in consegna',
            'customs_cleared': 'sdoganato',
            'registered': 'registrato',
            'delayed': 'in ritardo',
            'exception': 'eccezione'
        };
    }

    // Metodo principale di ricerca
    search(data, query) {
        if (!query || !query.trim()) {
            return data;
        }
        
        const trimmedQuery = query.trim();
        
        // Controlla se è una ricerca per campo specifico (campo:valore)
        if (trimmedQuery.includes(':')) {
            return this.searchByField(data, trimmedQuery);
        }
        
        // Ricerca globale
        return this.globalSearch(data, trimmedQuery);
    }
    
    // 🔧 FIX 4: OTTIMIZZA searchByField() per metadata
    searchByField(data, query) {
        const parts = query.split(':');
        if (parts.length !== 2) {
            return this.globalSearch(data, query);
        }
        
        const [fieldName, searchValue] = parts.map(p => p.trim());
        
        if (!fieldName || !searchValue) {
            return data;
        }
        
        // Gestione speciale per campo status
        if (fieldName.toLowerCase() === 'status' || fieldName.toLowerCase() === 'stato') {
            const statusMap = this.getStatusMapping();
            const searchTerm = searchValue.toLowerCase();
            
            return data.filter(row => {
                const status = row.status?.toLowerCase();
                
                return status === searchTerm ||
                       status === statusMap[searchTerm] ||
                       statusMap[status] === searchTerm;
            });
        }
        
        // 🆕 MIGLIORATO: Ricerca in campi normali E metadata
        return data.filter(row => {
            // 1. Cerca nei campi diretti
            const directMatch = this.searchInDirectFields(row, fieldName, searchValue);
            if (directMatch) return true;
            
            // 2. Cerca nei metadata se abilitato
            if (this.options.searchInMetadata && row.metadata) {
                return this.searchInMetadataFields(row.metadata, fieldName, searchValue);
            }
            
            return false;
        });
    }
    
    // 🆕 AGGIUNGI: Ricerca nei campi diretti
    searchInDirectFields(row, fieldName, searchValue) {
        const matchingKey = Object.keys(row).find(key => 
            key.toLowerCase().includes(fieldName.toLowerCase()) ||
            this.normalizeKey(key).toLowerCase().includes(fieldName.toLowerCase())
        );
        
        if (matchingKey) {
            const cellValue = this.getCellValue(row, matchingKey);
            return this.matchesValue(cellValue, searchValue);
        }
        
        return false;
    }
    
    // 🆕 AGGIUNGI: Ricerca nei metadata
    searchInMetadataFields(metadata, fieldName, searchValue) {
        // Cerca chiave esatta nei metadata
        const exactKey = Object.keys(metadata).find(key => 
            key.toLowerCase() === fieldName.toLowerCase() ||
            this.normalizeKey(key).toLowerCase() === fieldName.toLowerCase()
        );
        
        if (exactKey) {
            return this.matchesValue(metadata[exactKey], searchValue);
        }
        
        // Cerca chiave parziale nei metadata
        const partialKey = Object.keys(metadata).find(key => 
            key.toLowerCase().includes(fieldName.toLowerCase()) ||
            this.normalizeKey(key).toLowerCase().includes(fieldName.toLowerCase())
        );
        
        if (partialKey) {
            return this.matchesValue(metadata[partialKey], searchValue);
        }
        
        // Ricerca ricorsiva in oggetti nested nei metadata
        for (const [key, value] of Object.entries(metadata)) {
            if (typeof value === 'object' && value !== null) {
                if (this.searchInMetadataFields(value, fieldName, searchValue)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // 🔧 FIX 2: SOSTITUISCI globalSearch() con ricerca ricorsiva + mapping status
    globalSearch(data, query) {
        const searchTerm = query.toLowerCase();
        
        return data.filter(row => {
            // 🆕 NUOVO: Ricerca in tutti i valori della riga INCLUSI METADATA
            if (this.searchInRow(row, searchTerm)) {
                return true;
            }
            
            // 🆕 AGGIUNTO: Ricerca con mapping status per termini italiani
            return this.searchWithStatusMapping(row, searchTerm);
        });
    }
    
    // 🆕 AGGIUNGI: Nuovo metodo per ricerca ricorsiva
    searchInRow(row, searchTerm) {
        // Cerca in tutti i campi diretti della riga
        for (const [key, value] of Object.entries(row)) {
            if (this.matchesValue(value, searchTerm)) {
                return true;
            }
            
            // 🔥 RICERCA RICORSIVA: Se il valore è un oggetto, cerca dentro
            if (this.options.searchInMetadata && typeof value === 'object' && value !== null) {
                if (this.searchInObject(value, searchTerm)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // 🆕 AGGIUNGI: Ricerca con mapping status nella ricerca globale
    searchWithStatusMapping(row, searchTerm) {
        const statusMap = this.getStatusMapping();
        
        // Se il termine cercato è un status italiano, cerca il corrispondente inglese
        const englishStatus = statusMap[searchTerm];
        if (englishStatus && row.status) {
            const rowStatus = row.status.toLowerCase();
            if (rowStatus === englishStatus.toLowerCase()) {
                return true;
            }
        }
        
        // Se il termine cercato è un status inglese, cerca il corrispondente italiano
        const italianStatus = statusMap[searchTerm];
        if (italianStatus && row.status) {
            const rowStatus = row.status.toLowerCase();
            if (statusMap[rowStatus] && statusMap[rowStatus].toLowerCase() === searchTerm) {
                return true;
            }
        }
        
        return false;
    }
    
    // 🆕 AGGIUNGI: Metodo per ricerca ricorsiva negli oggetti nested
    searchInObject(obj, searchTerm, depth = 0) {
        // Evita ricorsione infinita
        if (depth > 5 || obj === null || typeof obj !== 'object') {
            return false;
        }
        
        // Se è un array, cerca in ogni elemento
        if (Array.isArray(obj)) {
            return obj.some(item => {
                if (typeof item === 'object' && item !== null) {
                    return this.searchInObject(item, searchTerm, depth + 1);
                }
                return this.matchesValue(item, searchTerm);
            });
        }
        
        // Se è un oggetto, cerca in ogni proprietà
        for (const [key, value] of Object.entries(obj)) {
            // Cerca nel valore
            if (this.matchesValue(value, searchTerm)) {
                return true;
            }
            
            // Cerca nella chiave stessa (es: "origin_name" matcherebbe "origin")
            if (typeof key === 'string' && key.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            // Ricorsione per oggetti nested
            if (typeof value === 'object' && value !== null) {
                if (this.searchInObject(value, searchTerm, depth + 1)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // 🔧 FIX 3: MIGLIORA matchesValue()
    matchesValue(value, searchTerm) {
        if (value === null || value === undefined) {
            return false;
        }
        
        const stringValue = String(value).toLowerCase();
        const term = searchTerm.toLowerCase();
        
        // Ricerca esatta (più veloce)
        if (stringValue.includes(term)) {
            return true;
        }
        
        // 🆕 MIGLIORATO: Ricerca fuzzy solo per termini di lunghezza appropriata
        if (term.length >= 3 && stringValue.length >= 3) {
            return this.fuzzyMatch(stringValue, term);
        }
        
        return false;
    }
    
    // Ricerca fuzzy (per correggere errori di battitura)
    fuzzyMatch(text, pattern) {
        if (pattern.length < 3) {
            return false; // Non applicare fuzzy per termini troppo corti
        }
        
        const similarity = this.calculateSimilarity(text, pattern);
        return similarity >= this.options.fuzzyThreshold;
    }
    
    // Calcola la similarità tra due stringhe (algoritmo di Levenshtein semplificato)
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) {
            return 1.0;
        }
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    // Distanza di Levenshtein
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    // Genera suggerimenti di ricerca
    getSuggestions(query, data, columns) {
        const suggestions = [];
        
        // Suggerimenti dalla cronologia
        const historySuggestions = this.getHistorySuggestions(query);
        suggestions.push(...historySuggestions);
        
        // Suggerimenti basati sui dati
        const dataSuggestions = this.getDataSuggestions(query, data, columns);
        suggestions.push(...dataSuggestions);
        
        // Rimuovi duplicati e limita il numero
        const uniqueSuggestions = suggestions
            .filter((suggestion, index, self) => 
                index === self.findIndex(s => s.value === suggestion.value)
            )
            .slice(0, this.options.maxSuggestions);
        
        return uniqueSuggestions;
    }
    
    // Suggerimenti dalla cronologia
    getHistorySuggestions(query) {
        if (!query || query.length < 2) {
            return this.searchHistory.slice(0, 3).map(term => ({
                type: 'history',
                value: term,
                label: term
            }));
        }
        
        return this.searchHistory
            .filter(term => term.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 2)
            .map(term => ({
                type: 'history',
                value: term,
                label: term
            }));
    }
    
    // Suggerimenti basati sui dati
    getDataSuggestions(query, data, columns) {
        if (!query || query.length < 2 || !data.length) {
            return [];
        }
        
        const suggestions = [];
        const queryLower = query.toLowerCase();
        
        // Se la query contiene ":", suggerisci valori per quel campo
        if (query.includes(':')) {
            const [fieldName, partialValue] = query.split(':');
            if (partialValue !== undefined) {
                return this.getFieldValueSuggestions(fieldName.trim(), partialValue.trim(), data, columns);
            }
        }
        
        // Suggerimenti per campi
        columns.forEach(column => {
            const fieldName = column.key;
            const fieldLabel = column.label || this.normalizeKey(fieldName);
            
            if (fieldLabel.toLowerCase().includes(queryLower) || 
                fieldName.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    type: 'field',
                    value: `${fieldName}:`,
                    label: `Cerca in ${fieldLabel}`
                });
            }
        });
        
        // Suggerimenti per valori comuni
        const valueSuggestions = this.getCommonValueSuggestions(query, data);
        suggestions.push(...valueSuggestions);
        
        return suggestions.slice(0, 3);
    }
    
    // Suggerimenti per valori di un campo specifico
    getFieldValueSuggestions(fieldName, partialValue, data, columns) {
        const suggestions = [];
        
        // Trova la colonna corrispondente
        const column = columns.find(col => 
            col.key.toLowerCase() === fieldName.toLowerCase() ||
            this.normalizeKey(col.key).toLowerCase().includes(fieldName.toLowerCase())
        );
        
        if (!column) {
            return suggestions;
        }
        
        // Raccoglie valori unici per questo campo
        const uniqueValues = new Set();
        data.forEach(row => {
            const value = this.getCellValue(row, column.key);
            if (value !== null && value !== undefined) {
                const stringValue = String(value);
                if (!partialValue || stringValue.toLowerCase().includes(partialValue.toLowerCase())) {
                    uniqueValues.add(stringValue);
                }
            }
        });
        
        // Converti in suggerimenti
        Array.from(uniqueValues)
            .slice(0, 5)
            .forEach(value => {
                suggestions.push({
                    type: 'value',
                    value: `${column.key}:${value}`,
                    label: `${column.label || column.key}: ${value}`
                });
            });
        
        return suggestions;
    }
    
    // Suggerimenti per valori comuni
    getCommonValueSuggestions(query, data) {
        const suggestions = [];
        const queryLower = query.toLowerCase();
        const valueCount = new Map();
        
        // Conta la frequenza dei valori
        data.forEach(row => {
            Object.values(row).forEach(value => {
                if (value !== null && value !== undefined) {
                    const stringValue = String(value);
                    if (stringValue.toLowerCase().includes(queryLower)) {
                        valueCount.set(stringValue, (valueCount.get(stringValue) || 0) + 1);
                    }
                }
            });
        });
        
        // Ordina per frequenza e prendi i più comuni
        const sortedValues = Array.from(valueCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        sortedValues.forEach(([value, count]) => {
            suggestions.push({
                type: 'value',
                value: value,
                label: `${value} (${count} risultati)`
            });
        });
        
        return suggestions;
    }
    
    // Normalizza le chiavi dei campi (rimuove underscore, camelCase, etc.)
    normalizeKey(key) {
        return key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .toLowerCase();
    }
    
    // Ottiene il valore di una cella (supporta proprietà annidate)
    getCellValue(row, key) {
        return key.split('.').reduce((obj, prop) => obj?.[prop], row);
    }
    
    // Gestione cronologia ricerche
    addToHistory(query) {
        if (!query || query.trim().length < 2) {
            return;
        }
        
        const trimmedQuery = query.trim();
        
        // Rimuovi se già presente
        this.searchHistory = this.searchHistory.filter(term => term !== trimmedQuery);
        
        // Aggiungi all'inizio
        this.searchHistory.unshift(trimmedQuery);
        
        // Mantieni solo gli ultimi 10
        this.searchHistory = this.searchHistory.slice(0, 10);
        
        // Salva nel localStorage
        this.saveSearchHistory();
    }
    
    // Carica cronologia dal localStorage
    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('table_search_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn('Error loading search history:', e);
            return [];
        }
    }
    
    // Salva cronologia nel localStorage
    saveSearchHistory() {
        try {
            localStorage.setItem('table_search_history', JSON.stringify(this.searchHistory));
        } catch (e) {
            console.warn('Error saving search history:', e);
        }
    }
    
    // Pulisci cronologia
    clearHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
    }
}

// ========================================
// 🆕 INTEGRAZIONE TABLEMANAGER
// ========================================

export class TableManager {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            throw new Error(`Container with ID "${containerId}" not found`);
        }
        
        this.options = {
            pagination: true,
            pageSize: 50,
            sortable: true,
            searchable: true,
            exportable: true,
            resizable: true,
            ...options
        };
        
        this.data = [];
        this.filteredData = [];
        this.columns = [];
        this.currentPage = 1;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.searchQuery = '';
        
        // ✅ INIZIALIZZA AdvancedSearch se disponibile
        if (window.AdvancedSearch) {
            this.advancedSearch = new window.AdvancedSearch({
                searchInMetadata: true,
                debounceMs: 300
            });
            console.log('✅ AdvancedSearch inizializzato in TableManager');
        } else if (typeof AdvancedSearch !== 'undefined') {
            this.advancedSearch = new AdvancedSearch({
                searchInMetadata: true,
                debounceMs: 300
            });
            console.log('✅ AdvancedSearch inizializzato in TableManager (import)');
        } else {
            this.advancedSearch = null;
            console.warn('⚠️ AdvancedSearch non disponibile, usando ricerca semplice');
        }
        
        this.init();
    }
    
    init() {
        this.createTableStructure();
        this.bindEvents();
    }
    
    createTableStructure() {
        this.container.innerHTML = `
            <div class="table-manager">
                ${this.options.searchable ? this.createSearchBar() : ''}
                <div class="table-container">
                    <table class="data-table">
                        <thead></thead>
                        <tbody></tbody>
                    </table>
                </div>
                ${this.options.pagination ? this.createPagination() : ''}
            </div>
        `;
    }
    
    createSearchBar() {
        return `
            <div class="search-bar">
                <div class="search-input-container">
                    <input 
                        type="text" 
                        class="search-input" 
                        placeholder="Cerca nella tabella..."
                        autocomplete="off"
                    >
                    <div class="search-suggestions"></div>
                </div>
                <button class="search-clear-btn" title="Pulisci ricerca">×</button>
            </div>
        `;
    }
    
    createPagination() {
        return `
            <div class="pagination">
                <div class="pagination-info">
                    <span class="results-count">0 risultati</span>
                </div>
                <div class="pagination-controls">
                    <button class="pagination-btn prev-btn" disabled>← Precedente</button>
                    <div class="pagination-numbers"></div>
                    <button class="pagination-btn next-btn" disabled>Successivo →</button>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        if (this.options.searchable) {
            const searchInput = this.container.querySelector('.search-input');
            const clearBtn = this.container.querySelector('.search-clear-btn');
            
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.handleSearch(e.target.value);
                });
                
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.performSearch(e.target.value);
                    }
                });
            }
            
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.clearSearch();
                });
            }
        }
    }
    
    // 🔥 METODO PRINCIPALE DI RICERCA MIGLIORATO
    handleSearch(query) {
        this.searchQuery = query;
        
        if (this.advancedSearch) {
            // 🆕 USA AdvancedSearch se disponibile
            this.filteredData = this.advancedSearch.search(this.data, query);
            
            // Aggiungi alla cronologia se la query è significativa
            if (query && query.trim().length >= 2) {
                this.advancedSearch.addToHistory(query.trim());
            }
        } else {
            // 🔄 Fallback alla ricerca semplice
            this.filteredData = this.simpleSearch(this.data, query);
        }
        
        this.currentPage = 1;
        this.render();
    }
    
    // 🆕 RICERCA SEMPLICE (fallback)
    simpleSearch(data, query) {
        if (!query || !query.trim()) {
            return data;
        }
        
        const searchTerm = query.toLowerCase();
        
        return data.filter(row => {
            return Object.values(row).some(value => {
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(searchTerm);
            });
        });
    }
    
    performSearch(query) {
        this.handleSearch(query);
    }
    
    clearSearch() {
        const searchInput = this.container.querySelector('.search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        this.handleSearch('');
    }
    
    // Metodi per gestire i dati
    setData(data, columns = null) {
        this.data = Array.isArray(data) ? data : [];
        this.filteredData = [...this.data];
        
        if (columns) {
            this.columns = columns;
        } else if (this.data.length > 0) {
            // Auto-genera colonne dai dati
            this.columns = Object.keys(this.data[0]).map(key => ({
                key,
                label: this.formatColumnLabel(key),
                sortable: true
            }));
        }
        
        this.currentPage = 1;
        this.render();
    }
    
    formatColumnLabel(key) {
        return key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace(/^\w/, c => c.toUpperCase());
    }
    
    render() {
        this.renderTable();
        if (this.options.pagination) {
            this.renderPagination();
        }
    }
    
    renderTable() {
        const thead = this.container.querySelector('thead');
        const tbody = this.container.querySelector('tbody');
        
        if (!thead || !tbody) return;
        
        // Render header
        thead.innerHTML = `
            <tr>
                ${this.columns.map(col => `
                    <th class="sortable ${this.sortColumn === col.key ? 'sorted-' + this.sortDirection : ''}"
                        data-column="${col.key}">
                        ${col.label}
                        ${this.options.sortable ? '<span class="sort-indicator"></span>' : ''}
                    </th>
                `).join('')}
            </tr>
        `;
        
        // Render body
        const startIndex = (this.currentPage - 1) * this.options.pageSize;
        const endIndex = startIndex + this.options.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        tbody.innerHTML = pageData.map(row => `
            <tr>
                ${this.columns.map(col => `
                    <td>${this.formatCellValue(row[col.key])}</td>
                `).join('')}
            </tr>
        `).join('');
        
        // Bind sort events
        if (this.options.sortable) {
            thead.querySelectorAll('th.sortable').forEach(th => {
                th.addEventListener('click', () => {
                    this.handleSort(th.dataset.column);
                });
            });
        }
    }
    
    formatCellValue(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }
    
    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        
        this.filteredData.sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];
            
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            
            let comparison = 0;
            if (aVal < bVal) comparison = -1;
            else if (aVal > bVal) comparison = 1;
            
            return this.sortDirection === 'desc' ? -comparison : comparison;
        });
        
        this.currentPage = 1;
        this.render();
    }
    
    renderPagination() {
        const pagination = this.container.querySelector('.pagination');
        if (!pagination) return;
        
        const totalResults = this.filteredData.length;
        const totalPages = Math.ceil(totalResults / this.options.pageSize);
        
        // Update results count
        const resultsCount = pagination.querySelector('.results-count');
        if (resultsCount) {
            resultsCount.textContent = `${totalResults} risultati`;
        }
        
        // Update pagination controls
        const prevBtn = pagination.querySelector('.prev-btn');
        const nextBtn = pagination.querySelector('.next-btn');
        const numbersContainer = pagination.querySelector('.pagination-numbers');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage === 1;
            prevBtn.onclick = () => this.goToPage(this.currentPage - 1);
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage === totalPages;
            nextBtn.onclick = () => this.goToPage(this.currentPage + 1);
        }
        
        if (numbersContainer) {
            numbersContainer.innerHTML = this.generatePageNumbers(totalPages);
        }
    }
    
    generatePageNumbers(totalPages) {
        if (totalPages <= 1) return '';
        
        const current = this.currentPage;
        const maxVisible = 5;
        let start = Math.max(1, current - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        let html = '';
        
        if (start > 1) {
            html += `<button class="page-number" onclick="tableManager.goToPage(1)">1</button>`;
            if (start > 2) html += '<span class="page-ellipsis">...</span>';
        }
        
        for (let i = start; i <= end; i++) {
            html += `
                <button class="page-number ${i === current ? 'active' : ''}" 
                        onclick="tableManager.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        if (end < totalPages) {
            if (end < totalPages - 1) html += '<span class="page-ellipsis">...</span>';
            html += `<button class="page-number" onclick="tableManager.goToPage(${totalPages})">${totalPages}</button>`;
        }
        
        return html;
    }
    
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.render();
        }
    }
    
    // Metodi utili
    getData() {
        return this.data;
    }
    
    getFilteredData() {
        return this.filteredData;
    }
    
    refresh() {
        this.render();
    }
    
    destroy() {
        this.container.innerHTML = '';
    }
}

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.AdvancedSearch = AdvancedSearch;
    window.TableManager = TableManager;
}

export default AdvancedSearch;