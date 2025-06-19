// advanced-search.js - Sistema di ricerca avanzata per tabelle

export class AdvancedSearch {
    constructor(options = {}) {
        this.options = {
            caseSensitive: false,
            searchInMetadata: true,
            highlightResults: true,
            debounceMs: 300,
            minChars: 1,
            maxResults: 1000,
            ...options
        };
        
        this.searchHistory = this.loadSearchHistory();
        this.debounceTimer = null;
    }
    
    // Parser principale per query
    parseQuery(query) {
        if (!query || query.trim() === '') {
            return { type: 'empty', query: '' };
        }
        
        // Rimuovi spazi extra
        query = query.trim();
        
        // Check per ricerca campo:valore
        const fieldMatch = query.match(/^(\w+):(.+)$/);
        if (fieldMatch) {
            return {
                type: 'field',
                field: fieldMatch[1],
                value: fieldMatch[2],
                query: query
            };
        }
        
        // Check per operatori (OR, AND, NOT)
        if (query.includes(' OR ') || query.includes(' AND ') || query.startsWith('-')) {
            return this.parseComplexQuery(query);
        }
        
        // Check per frasi esatte tra virgolette
        const exactMatch = query.match(/^"(.+)"$/);
        if (exactMatch) {
            return {
                type: 'exact',
                term: exactMatch[1],
                query: query
            };
        }
        
        // Ricerca semplice
        return {
            type: 'simple',
            term: query,
            query: query
        };
    }
    
    // Parser per query complesse
    parseComplexQuery(query) {
        const conditions = [];
        
        // Split per OR
        const orParts = query.split(' OR ');
        
        orParts.forEach(part => {
            // Split per AND (implicito con spazi)
            const andParts = part.split(' ').filter(p => p);
            
            const andConditions = andParts.map(term => {
                if (term.startsWith('-')) {
                    return { type: 'not', term: term.substring(1) };
                }
                return { type: 'include', term: term };
            });
            
            if (andConditions.length > 0) {
                conditions.push({ type: 'and', conditions: andConditions });
            }
        });
        
        return {
            type: 'complex',
            conditions: conditions,
            query: query
        };
    }
    
    // Ricerca principale
    search(data, query) {
        const parsed = this.parseQuery(query);
        
        // Salva nella history
        if (query && query.length >= this.options.minChars) {
            this.addToHistory(query);
        }
        
        switch (parsed.type) {
            case 'empty':
                return data;
            case 'simple':
                return this.simpleSearch(data, parsed.term);
            case 'field':
                return this.fieldSearch(data, parsed.field, parsed.value);
            case 'exact':
                return this.exactSearch(data, parsed.term);
            case 'complex':
                return this.complexSearch(data, parsed.conditions);
            default:
                return data;
        }
    }
    
    // Ricerca semplice in tutti i campi
    simpleSearch(data, term) {
        const searchTerm = this.options.caseSensitive ? term : term.toLowerCase();
        
        return data.filter(row => {
            return this.searchInObject(row, searchTerm);
        });
    }
    
    // Ricerca ricorsiva in oggetto (include metadata)
    searchInObject(obj, term, depth = 0) {
        // Previeni ricorsione infinita
        if (depth > 10) return false;
        
        for (let key in obj) {
            if (!obj.hasOwnProperty(key)) continue;
            
            const value = obj[key];
            
            // Skip metadata se non abilitato
            if (key === 'metadata' && !this.options.searchInMetadata) {
                continue;
            }
            
            if (value === null || value === undefined) continue;
            
            // Se è un oggetto, ricerca ricorsiva
            if (typeof value === 'object' && !Array.isArray(value)) {
                if (this.searchInObject(value, term, depth + 1)) {
                    return true;
                }
            }
            // Se è un array
            else if (Array.isArray(value)) {
                for (let item of value) {
                    if (typeof item === 'object') {
                        if (this.searchInObject(item, term, depth + 1)) {
                            return true;
                        }
                    } else {
                        const itemStr = this.options.caseSensitive ? 
                            String(item) : String(item).toLowerCase();
                        if (itemStr.includes(term)) {
                            return true;
                        }
                    }
                }
            }
            // Valore semplice
            else {
                const valueStr = this.options.caseSensitive ? 
                    String(value) : String(value).toLowerCase();
                if (valueStr.includes(term)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Ricerca per campo specifico
    fieldSearch(data, field, value) {
        const searchValue = this.options.caseSensitive ? value : value.toLowerCase();
        
        return data.filter(row => {
            // Cerca anche nei campi nested (es: metadata.origin)
            const fieldValue = this.getNestedValue(row, field);
            
            if (fieldValue === null || fieldValue === undefined) return false;
            
            const valueStr = this.options.caseSensitive ? 
                String(fieldValue) : String(fieldValue).toLowerCase();
            
            return valueStr.includes(searchValue);
        });
    }
    
    // Ricerca esatta
    exactSearch(data, term) {
        const searchTerm = this.options.caseSensitive ? term : term.toLowerCase();
        
        return data.filter(row => {
            return this.exactMatchInObject(row, searchTerm);
        });
    }
    
    // Match esatto in oggetto
    exactMatchInObject(obj, term, depth = 0) {
        if (depth > 10) return false;
        
        for (let key in obj) {
            if (!obj.hasOwnProperty(key)) continue;
            
            const value = obj[key];
            
            if (value === null || value === undefined) continue;
            
            if (typeof value === 'object' && !Array.isArray(value)) {
                if (this.exactMatchInObject(value, term, depth + 1)) {
                    return true;
                }
            } else {
                const valueStr = this.options.caseSensitive ? 
                    String(value) : String(value).toLowerCase();
                if (valueStr === term) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Ricerca complessa con operatori
    complexSearch(data, conditions) {
        return data.filter(row => {
            // OR tra i gruppi
            return conditions.some(group => {
                // AND dentro il gruppo
                if (group.type === 'and') {
                    return group.conditions.every(cond => {
                        if (cond.type === 'not') {
                            return !this.searchInObject(row, cond.term);
                        }
                        return this.searchInObject(row, cond.term);
                    });
                }
                return false;
            });
        });
    }
    
    // Ottieni valore nested (es: metadata.origin)
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }
    
    // Gestione search history
    addToHistory(query) {
        // Rimuovi duplicati
        this.searchHistory = this.searchHistory.filter(q => q !== query);
        
        // Aggiungi all'inizio
        this.searchHistory.unshift(query);
        
        // Mantieni solo le ultime 10
        if (this.searchHistory.length > 10) {
            this.searchHistory = this.searchHistory.slice(0, 10);
        }
        
        this.saveSearchHistory();
    }
    
    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('searchHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }
    
    saveSearchHistory() {
        try {
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        } catch (e) {
            console.error('Error saving search history:', e);
        }
    }
    
    // Ottieni suggerimenti per autocomplete
    getSuggestions(query, data, fields) {
        const suggestions = [];
        
        // Suggerisci campi se sta digitando ":"
        if (query.includes(':')) {
            const [fieldPart] = query.split(':');
            fields.forEach(field => {
                if (field.key.toLowerCase().startsWith(fieldPart.toLowerCase())) {
                    suggestions.push({
                        type: 'field',
                        value: `${field.key}:`,
                        label: `Cerca in ${field.label}`
                    });
                }
            });
        }
        
        // Suggerisci dalla history
        this.searchHistory.forEach(historyQuery => {
            if (historyQuery.toLowerCase().startsWith(query.toLowerCase()) && 
                historyQuery !== query) {
                suggestions.push({
                    type: 'history',
                    value: historyQuery,
                    label: historyQuery
                });
            }
        });
        
        return suggestions.slice(0, 5); // Max 5 suggerimenti
    }
}

export default AdvancedSearch;