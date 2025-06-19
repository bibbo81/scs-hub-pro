// advanced-search.js - Sistema di ricerca avanzata per tabelle

export class AdvancedSearch {
    constructor(options = {}) {
        this.options = {
            searchInMetadata: true,  // ✅ ABILITATO DI DEFAULT
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
            
            // Mapping inverso per ricerca (Italiano -> Array Stati)
            'in transito': ['sailing', 'at local fedex facility', 'departed fedex hub', 'on the way', 'arrived at fedex hub', 'at destination sort facility', 'left fedex origin facility', 'picked up', 'arrivata nella sede gls locale.', 'in transito.', 'partita dalla sede mittente. in transito.', 'la spedizione è in transito'],
            'arrivata': ['arrived'],
            'consegnato': ['delivered', 'la spedizione è stata consegnata', 'consegnata.'],
            'scaricato': ['discharged'],
            'in consegna': ['on fedex vehicle for delivery', 'consegna prevista nel corso della giornata odierna.', 'la spedizione è in consegna'],
            'sdoganata': ['international shipment release - import'],
            'spedizione creata': ['shipment information sent to fedex', 'la spedizione e\' stata creata dal mittente, attendiamo che ci venga affidata per l\'invio a destinazione.'],
            
            // Stati sistema standard
            'in_transit': 'in transito',
            'registered': 'spedizione creata',
            'customs_cleared': 'sdoganata',
            'out_for_delivery': 'in consegna',
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
    
    // Ricerca per campo specifico
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
            return data.filter(row => {
                return this.searchWithStatusMapping(row, searchValue.toLowerCase());
            });
        }
        
        // Ricerca in campi normali E metadata
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
    
    // Ricerca nei campi diretti
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
    
    // Ricerca nei metadata
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
    
    // Ricerca globale con mapping status
    globalSearch(data, query) {
        const searchTerm = query.toLowerCase();
        
        return data.filter(row => {
            // Ricerca in tutti i valori della riga INCLUSI METADATA
            if (this.searchInRow(row, searchTerm)) {
                return true;
            }
            
            // Ricerca con mapping status per termini italiani
            if (this.searchWithStatusMapping(row, searchTerm)) {
                return true;
            }
            
            return false;
        });
    }
    
    // Metodo per ricerca ricorsiva
    searchInRow(row, searchTerm) {
        // Cerca in tutti i campi diretti della riga
        for (const [key, value] of Object.entries(row)) {
            if (this.matchesValue(value, searchTerm)) {
                return true;
            }
            
            // RICERCA RICORSIVA: Se il valore è un oggetto, cerca dentro
            if (this.options.searchInMetadata && typeof value === 'object' && value !== null) {
                if (this.searchInObject(value, searchTerm)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Ricerca con mapping status
    searchWithStatusMapping(row, searchTerm) {
        const statusMap = this.getStatusMapping();
        const rowStatus = row.status?.toLowerCase();
        
        if (!rowStatus) return false;
        
        // Se cerchiamo un termine italiano (es: "consegnato")
        const mappedStates = statusMap[searchTerm];
        if (Array.isArray(mappedStates)) {
            for (const state of mappedStates) {
                if (rowStatus === state.toLowerCase()) {
                    return true;
                }
            }
        } else if (mappedStates && rowStatus === mappedStates.toLowerCase()) {
            return true;
        }
        
        // Se lo status della riga ha un mapping italiano
        const italianStatus = statusMap[rowStatus];
        if (italianStatus && italianStatus.toLowerCase() === searchTerm) {
            return true;
        }
        
        return false;
    }
    
    // Metodo per ricerca ricorsiva negli oggetti nested
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
    
    // Verifica se un valore matcha il termine di ricerca
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
        
        // Ricerca fuzzy solo per termini di lunghezza appropriata
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

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.AdvancedSearch = AdvancedSearch;
    console.log('✅ AdvancedSearch esposto globalmente');
}

export default AdvancedSearch;