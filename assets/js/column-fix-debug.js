// column-fix-debug.js - FIX COLONNE E DEBUG
// Questo file si occupa solo di fixare le colonne mancanti e aggiungere debug

(function() {
    'use strict';
    
    console.log('🔧 Loading Column Fix & Debug System');
    
    // Aspetta che il sistema tracking sia caricato
    function waitForTrackingSystem() {
        if (typeof window.getColumnFormatter === 'function') {
            console.log('✅ Tracking system found, applying fixes...');
            applyColumnFixes();
        } else {
            console.log('⏳ Waiting for tracking system...');
            setTimeout(waitForTrackingSystem, 500);
        }
    }
    
    function applyColumnFixes() {
        // Override dei formatter problematici
        const originalGetColumnFormatter = window.getColumnFormatter;
        
        window.getColumnFormatter = function() {
            const formatters = originalGetColumnFormatter();
            
            // ===== FIX COLONNE AWB MANCANTI - RICERCA ESTESA =====
            formatters.awb_number = (value, row) => {
                // Debug: vediamo cosa c'è nei metadata
                if (row.metadata && Object.keys(row.metadata).length > 0) {
                    console.log('🔍 AWB Number debug - metadata keys:', Object.keys(row.metadata));
                    console.log('🔍 AWB Number debug - row:', row);
                }
                
                const awb = value || 
                           row.metadata?.awb_number || 
                           row.metadata?.['AWB Number'] || 
                           row.metadata?.awb || 
                           row.metadata?.AWB ||
                           row.tracking_number || 
                           '-';
                return `<span class="awb-number">${awb}</span>`;
            };

            formatters.origin_country = (value, row) => {
                const country = value || 
                               row.metadata?.origin_country || 
                               row.metadata?.['Origin Country'] ||
                               row.metadata?.['POL Country'] ||
                               row.metadata?.pol_country ||
                               row.metadata?.originCountry ||
                               '-';
                return `<span class="country">${country}</span>`;
            };

            formatters.origin_country_code = (value, row) => {
                const code = value || 
                            row.metadata?.origin_country_code || 
                            row.metadata?.['Origin Country Code'] ||
                            row.metadata?.['POL Country Code'] ||
                            row.metadata?.pol_country_code ||
                            row.metadata?.originCountryCode ||
                            '-';
                return `<span class="country-code">${code}</span>`;
            };

            formatters.destination_country = (value, row) => {
                const country = value || 
                               row.metadata?.destination_country || 
                               row.metadata?.['Destination Country'] ||
                               row.metadata?.['POD Country'] ||
                               row.metadata?.pod_country ||
                               row.metadata?.destinationCountry ||
                               '-';
                return `<span class="country">${country}</span>`;
            };

            formatters.destination_country_code = (value, row) => {
                const code = value || 
                            row.metadata?.destination_country_code || 
                            row.metadata?.['Destination Country Code'] ||
                            row.metadata?.['POD Country Code'] ||
                            row.metadata?.pod_country_code ||
                            row.metadata?.destinationCountryCode ||
                            '-';
                return `<span class="country-code">${code}</span>`;
            };

            formatters.t5_count = (value, row) => {
                const count = value || 
                             row.metadata?.t5_count || 
                             row.metadata?.['T5 Count'] ||
                             row.metadata?.['Container Count'] ||
                             row.metadata?.container_count ||
                             row.metadata?.t5Count ||
                             '-';
                return `<span class="count">${count}</span>`;
            };
            
            return formatters;
        };
        
        console.log('✅ Column formatters fixed!');
    }
    
    // ===== FUNZIONI DEBUG =====
    
    function debugTrackingData() {
        const trackings = JSON.parse(localStorage.getItem('trackings') || '[]');
        console.log('🔍 DEBUG: Totale trackings:', trackings.length);
        
        if (trackings.length > 0) {
            const lastTracking = trackings[trackings.length - 1];
            console.log('🔍 DEBUG: Ultimo tracking completo:', lastTracking);
            console.log('🔍 DEBUG: Metadata keys:', Object.keys(lastTracking.metadata || {}));
            console.log('🔍 DEBUG: Metadata completo:', lastTracking.metadata);
            
            // Test dei valori che cerchiamo
            const metadata = lastTracking.metadata || {};
            console.log('🔍 DEBUG: Valori cercati:');
            console.log('  - AWB Number:', metadata['AWB Number']);
            console.log('  - Origin Country:', metadata['Origin Country']);
            console.log('  - Origin Country Code:', metadata['Origin Country Code']);
            console.log('  - Destination Country:', metadata['Destination Country']);
            console.log('  - Destination Country Code:', metadata['Destination Country Code']);
            console.log('  - T5 Count:', metadata['T5 Count']);
            
            // Test formatter
            if (typeof window.getColumnFormatter === 'function') {
                const formatters = window.getColumnFormatter();
                console.log('🔍 DEBUG: Test formatters:');
                console.log('  - AWB Number result:', formatters.awb_number?.('', lastTracking));
                console.log('  - Origin Country result:', formatters.origin_country?.('', lastTracking));
                console.log('  - Origin Country Code result:', formatters.origin_country_code?.('', lastTracking));
            }
        }
    }
    
    function testColumnFix() {
        // Simula un tracking con dati di test
        const testTracking = {
            id: 'test-123',
            tracking_number: 'TEST-AWB-123',
            tracking_type: 'awb',
            status: 'in_transit',
            metadata: {
                'AWB Number': 'TEST-AWB-123',
                'Airline': 'TEST AIRLINE',
                'Origin': 'PEK',
                'Origin Country': 'China',
                'Origin Country Code': 'CN',
                'Destination': 'MXP',
                'Destination Country': 'Italy',
                'Destination Country Code': 'IT',
                'T5 Count': '5',
                'Date Of Departure': '19/05/2025',
                'Date Of Arrival': '20/05/2025'
            }
        };
        
        console.log('🧪 TEST: Tracking di test creato:', testTracking);
        
        if (typeof window.getColumnFormatter === 'function') {
            const formatters = window.getColumnFormatter();
            console.log('🧪 TEST: Risultati formatter:');
            console.log('  - AWB Number:', formatters.awb_number?.('', testTracking));
            console.log('  - Origin Country:', formatters.origin_country?.('', testTracking));
            console.log('  - Origin Country Code:', formatters.origin_country_code?.('', testTracking));
            console.log('  - Destination Country:', formatters.destination_country?.('', testTracking));
            console.log('  - Destination Country Code:', formatters.destination_country_code?.('', testTracking));
            console.log('  - T5 Count:', formatters.t5_count?.('', testTracking));
        }
    }
    
    function addDebugButtons() {
        // Cerca la debug bar o crea una
        let debugBar = document.querySelector('.debug-bar');
        if (!debugBar) {
            debugBar = document.createElement('div');
            debugBar.className = 'debug-bar';
            debugBar.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px;
                border-radius: 8px;
                z-index: 9999;
                display: flex;
                gap: 10px;
                font-family: monospace;
                font-size: 12px;
            `;
            document.body.appendChild(debugBar);
        }
        
        // Aggiungi bottoni se non esistono
        if (!document.querySelector('#debug-data-btn')) {
            const debugBtn = document.createElement('button');
            debugBtn.id = 'debug-data-btn';
            debugBtn.textContent = '🔍 Debug Data';
            debugBtn.style.cssText = 'padding: 5px 10px; margin: 2px; border: none; border-radius: 4px; cursor: pointer;';
            debugBtn.onclick = debugTrackingData;
            debugBar.appendChild(debugBtn);
        }
        
        if (!document.querySelector('#test-fix-btn')) {
            const testBtn = document.createElement('button');
            testBtn.id = 'test-fix-btn';
            testBtn.textContent = '🧪 Test Fix';
            testBtn.style.cssText = 'padding: 5px 10px; margin: 2px; border: none; border-radius: 4px; cursor: pointer;';
            testBtn.onclick = testColumnFix;
            debugBar.appendChild(testBtn);
        }
        
        if (!document.querySelector('#clear-data-btn')) {
            const clearBtn = document.createElement('button');
            clearBtn.id = 'clear-data-btn';
            clearBtn.textContent = '🧹 Clear';
            clearBtn.style.cssText = 'padding: 5px 10px; margin: 2px; border: none; border-radius: 4px; cursor: pointer; background: #ff4444; color: white;';
            clearBtn.onclick = () => {
                localStorage.removeItem('trackings');
                if (typeof window.loadTrackings === 'function') {
                    window.loadTrackings();
                }
                console.log('🧹 Trackings cleared');
            };
            debugBar.appendChild(clearBtn);
        }
    }
    
    // Esponi le funzioni debug a livello globale
    window.debugTrackingData = debugTrackingData;
    window.testColumnFix = testColumnFix;
    window.getLastTracking = () => {
        const trackings = JSON.parse(localStorage.getItem('trackings') || '[]');
        return trackings[trackings.length - 1];
    };
    
    // Inizializzazione
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🔧 Column Fix & Debug System loading...');
        
        // Aspetta un po' per il caricamento del sistema principale
        setTimeout(() => {
            waitForTrackingSystem();
            addDebugButtons();
        }, 1000);
    });
    
    // Se il documento è già caricato
    if (document.readyState === 'complete') {
        setTimeout(() => {
            waitForTrackingSystem();
            addDebugButtons();
        }, 1000);
    }
    
    console.log('🎯 Column Fix & Debug System loaded');
    
})();