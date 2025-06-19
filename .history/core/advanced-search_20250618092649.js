// advanced-search.js - Sistema di ricerca avanzata per tabelle

export class AdvancedSearch {
    constructor(options = {}) {
        this.options = {
            searchInMetadata: false,
            debounceMs: 300,
            maxSuggestions: 5,
            fuzzyThreshold: 0.6,
            ...options
        };
        
        this.searchHistory = this.loadSearchHistory();
        this.debounceTimer = null;
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
        
        return data.filter(row => {
            // Cerca il campo che corrisponde (case-insensitive)
            const matchingKey = Object.keys(row).find(key => 
                key.toLowerCase().includes(fieldName.toLowerCase()) ||
                this.normalizeKey(key).toLowerCase().includes(fieldName.toLowerCase())
            );
            
            if (!matchingKey) {
                return false;
            }
            
            const cellValue = this.getCellValue(row, matchingKey);
            return this.matchesValue(cellValue, searchValue);
        });
    }
    
    // Ricerca globale
    globalSearch(data, query) {
        const searchTerm = query.toLowerCase();
        
        return data.filter(row => {
            // Cerca in tutti i valori della riga
            return Object.values(row).some(value => {
                if (value === null || value === undefined) {
                    return false;
                }
                
                const stringValue = String(value).toLowerCase();
                
                // Ricerca esatta
                if (stringValue.includes(searchTerm)) {
                    return true;
                }
                
                // Ricerca fuzzy per correggere errori di battitura
                return this.fuzzyMatch(stringValue, searchTerm);
            });
        });
    }
    
    // Verifica se un valore corrisponde al termine di ricerca
    matchesValue(value, searchTerm) {
        if (value === null || value === undefined) {
            return false;
        }
        
        const stringValue = String(value).toLowerCase();
        const term = searchTerm.toLowerCase();
        
        // Ricerca esatta
        if (stringValue.includes(term)) {
            return true;
        }
        
        // Ricerca fuzzy
        return this.fuzzyMatch(stringValue, term);
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
    
    // Status mapping consolidato basato su Google Sheets
const STATUS_MAPPING = {
    // Mapping principale da Google Sheets
    'Sailing': 'in_transit',
    'Arrived': 'arrived',
    'Delivered': 'delivered',
    'Discharged': 'arrived',
    'LA spedizione è stata consegnata': 'delivered',
    'On FedEx vehicle for delivery': 'out_for_delivery',
    'At local FedEx facility': 'in_transit',
    'Departed FedEx hub': 'in_transit',
    'On the way': 'in_transit',
    'Arrived at FedEx hub': 'in_transit',
    'International shipment release - Import': 'customs_cleared',
    'At destination sort facility': 'in_transit',
    'Left FedEx origin facility': 'in_transit',
    'Picked up': 'in_transit',
    'Shipment information sent to FedEx': 'registered',
    'Consegnata.': 'delivered',
    'Consegna prevista nel corso della giornata odierna.': 'out_for_delivery',
    'Arrivata nella Sede GLS locale.': 'in_transit',
    'In transito.': 'in_transit',
    'Partita dalla sede mittente. In transito.': 'in_transit',
    'La spedizione e\' stata creata dal mittente, attendiamo che ci venga affidata per l\'invio a destinazione.': 'registered',
    'La spedizione è stata consegnata': 'delivered',
    'La spedizione è in consegna': 'out_for_delivery',
    'La spedizione è in transito': 'in_transit',
    
    // Altri mapping esistenti
    'In Transit': 'in_transit',
    'In transito': 'in_transit',
    'Arrivata': 'arrived',
    'Scaricato': 'arrived',
    'Consegnato': 'delivered',
    'Empty': 'delivered',
    'Empty Returned': 'delivered',
    'POD': 'delivered',
    'Sdoganata': 'customs_cleared',
    'Registered': 'registered',
    'Pending': 'registered',
    'Booked': 'registered',
    'Booking Confirmed': 'registered',
    'Spedizione creata': 'registered',
    'In consegna': 'out_for_delivery'
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

export default AdvancedSearch;