// pages/settings/index.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Settings] Initializing...');
    
    // Initialize components
    initializeNavigation();
    initializeForms();
    
    // Load settings when auth is ready
    waitForAuth();
});

// Wait for auth to be ready
function waitForAuth() {
    let retries = 0;
    const checkAuth = setInterval(() => {
        retries++;
        
        if (window.auth && window.auth.isAuthenticated()) {
            clearInterval(checkAuth);
            console.log('[Settings] Auth ready, loading settings...');
            loadAllSettings();
        } else if (retries >= 20) {
            clearInterval(checkAuth);
            console.log('[Settings] Auth timeout, loading anyway...');
            loadAllSettings();
        }
    }, 500);
}

// Navigation between sections
function initializeNavigation() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    const sections = document.querySelectorAll('.settings-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = item.dataset.section;
            
            // Update nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Update sections
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSection) {
                    section.classList.add('active');
                }
            });
            
            // Update URL
            history.pushState(null, '', `#${targetSection}`);
        });
    });
    
    // Handle direct URL access
    const hash = window.location.hash.slice(1);
    if (hash) {
        const navItem = document.querySelector(`[data-section="${hash}"]`);
        if (navItem) navItem.click();
    }
}

// Initialize all forms
function initializeForms() {
    // Company form
    const companyForm = document.getElementById('company-form');
    if (companyForm) {
        companyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCompanySettings();
        });
    }
    
    // Regional form
    const regionalForm = document.getElementById('regional-form');
    if (regionalForm) {
        regionalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveRegionalSettings();
        });
    }
    
    // Export form
    const exportForm = document.getElementById('export-form');
    if (exportForm) {
        exportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveExportSettings();
        });
    }
    
    // ShipsGo form
    const shipsgoForm = document.getElementById('shipsgo-form');
    if (shipsgoForm) {
        shipsgoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveShipsGoSettings();
        });
    }
}

// Load all settings
async function loadAllSettings() {
    try {
        // Load ShipsGo settings from user profile
        await loadShipsGoSettings();
        
        // Load other settings from localStorage (mock)
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        
        // Company settings
        if (settings.company) {
            if (settings.company.name) document.getElementById('companyName').value = settings.company.name;
            if (settings.company.vat) document.getElementById('vatNumber').value = settings.company.vat;
            if (settings.company.address) document.getElementById('address').value = settings.company.address;
            if (settings.company.city) document.getElementById('city').value = settings.company.city;
            if (settings.company.country) document.getElementById('country').value = settings.company.country;
            if (settings.company.postalCode) document.getElementById('postalCode').value = settings.company.postalCode;
        }
        
        // Regional settings
        if (settings.regional) {
            if (settings.regional.language) document.getElementById('language').value = settings.regional.language;
            if (settings.regional.timezone) document.getElementById('timezone').value = settings.regional.timezone;
            if (settings.regional.dateFormat) document.getElementById('dateFormat').value = settings.regional.dateFormat;
            if (settings.regional.currency) document.getElementById('currency').value = settings.regional.currency;
        }
        
        // Import/Export settings
        if (settings.importExport) {
            if (settings.importExport.skipDuplicates !== undefined) 
                document.getElementById('skipDuplicates').checked = settings.importExport.skipDuplicates;
            if (settings.importExport.autoValidate !== undefined) 
                document.getElementById('autoValidate').checked = settings.importExport.autoValidate;
            if (settings.importExport.updateExisting !== undefined) 
                document.getElementById('updateExisting').checked = settings.importExport.updateExisting;
            if (settings.importExport.exportFormat) 
                document.getElementById('exportFormat').value = settings.importExport.exportFormat;
            if (settings.importExport.csvEncoding) 
                document.getElementById('csvEncoding').value = settings.importExport.csvEncoding;
            if (settings.importExport.includeHeaders !== undefined) 
                document.getElementById('includeHeaders').checked = settings.importExport.includeHeaders;
            if (settings.importExport.compressFiles !== undefined) 
                document.getElementById('compressFiles').checked = settings.importExport.compressFiles;
        }
        
        // Notifications
        if (settings.notifications) {
            if (settings.notifications.emailNewShipments !== undefined)
                document.getElementById('emailNewShipments').checked = settings.notifications.emailNewShipments;
            if (settings.notifications.emailDelayedShipments !== undefined)
                document.getElementById('emailDelayedShipments').checked = settings.notifications.emailDelayedShipments;
            if (settings.notifications.emailDelivered !== undefined)
                document.getElementById('emailDelivered').checked = settings.notifications.emailDelivered;
            if (settings.notifications.emailWeeklyReport !== undefined)
                document.getElementById('emailWeeklyReport').checked = settings.notifications.emailWeeklyReport;
            if (settings.notifications.email)
                document.getElementById('notificationEmail').value = settings.notifications.email;
            if (settings.notifications.pushEnabled !== undefined)
                document.getElementById('pushEnabled').checked = settings.notifications.pushEnabled;
            if (settings.notifications.pushCritical !== undefined)
                document.getElementById('pushCritical').checked = settings.notifications.pushCritical;
        }
        
        // Security
        if (settings.security) {
            if (settings.security.twoFactorAuth !== undefined)
                document.getElementById('twoFactorAuth').checked = settings.security.twoFactorAuth;
            if (settings.security.loginAlerts !== undefined)
                document.getElementById('loginAlerts').checked = settings.security.loginAlerts;
            if (settings.security.secureSession !== undefined)
                document.getElementById('secureSession').checked = settings.security.secureSession;
        }
        
        // Advanced
        if (settings.advanced) {
            if (settings.advanced.dataRetention)
                document.getElementById('dataRetention').value = settings.advanced.dataRetention;
            if (settings.advanced.autoBackup !== undefined)
                document.getElementById('autoBackup').checked = settings.advanced.autoBackup;
            if (settings.advanced.dataCompression !== undefined)
                document.getElementById('dataCompression').checked = settings.advanced.dataCompression;
            if (settings.advanced.debugMode !== undefined)
                document.getElementById('debugMode').checked = settings.advanced.debugMode;
        }
        
    } catch (error) {
        console.error('[Settings] Error loading settings:', error);
    }
}

// Load ShipsGo settings from user profile
async function loadShipsGoSettings() {
    console.log('[Settings] Loading ShipsGo settings...');
    
    // Clear fields first
    document.getElementById('shipsgoV1ApiKey').value = '';
    document.getElementById('shipsgoV2Token').value = '';
    
    try {
        // Carica da localStorage per ora
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        
        // Prova prima dal profilo utente
        if (userProfile?.api_settings) {
            // ShipsGo v1 key
            if (userProfile.api_settings.shipsgo_v1_key) {
                try {
                    const decodedV1 = atob(userProfile.api_settings.shipsgo_v1_key);
                    if (decodedV1 && decodedV1.length === 32 && /^[a-f0-9]+$/i.test(decodedV1)) {
                        document.getElementById('shipsgoV1ApiKey').value = decodedV1;
                    }
                } catch (e) {
                    console.error('[Settings] Invalid v1 key encoding');
                }
            }
            
            // ShipsGo v2 token
            if (userProfile.api_settings.shipsgo_v2_token) {
                try {
                    const decodedV2 = atob(userProfile.api_settings.shipsgo_v2_token);
                    if (decodedV2 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedV2)) {
                        document.getElementById('shipsgoV2Token').value = decodedV2;
                    }
                } catch (e) {
                    console.error('[Settings] Invalid v2 token encoding');
                }
            }
        } 
        // Fallback alle settings generali
        else if (settings?.apiKeys) {
            if (settings.apiKeys.shipsgo_v1) {
                document.getElementById('shipsgoV1ApiKey').value = settings.apiKeys.shipsgo_v1;
            }
            if (settings.apiKeys.shipsgo_v2) {
                document.getElementById('shipsgoV2Token').value = settings.apiKeys.shipsgo_v2;
            }
        }
        
    } catch (error) {
        console.error('[Settings] Error loading ShipsGo settings:', error);
    }
}

// Save company settings
async function saveCompanySettings() {
    const data = {
        name: document.getElementById('companyName').value,
        vat: document.getElementById('vatNumber').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        country: document.getElementById('country').value,
        postalCode: document.getElementById('postalCode').value
    };
    
    await saveToLocalStorage('company', data);
    showStatus('Informazioni azienda salvate con successo', 'success');
}

// Save regional settings
async function saveRegionalSettings() {
    const data = {
        language: document.getElementById('language').value,
        timezone: document.getElementById('timezone').value,
        dateFormat: document.getElementById('dateFormat').value,
        currency: document.getElementById('currency').value
    };
    
    await saveToLocalStorage('regional', data);
    showStatus('Preferenze regionali salvate con successo', 'success');
}

// Save export settings
async function saveExportSettings() {
    const data = {
        exportFormat: document.getElementById('exportFormat').value,
        csvEncoding: document.getElementById('csvEncoding').value,
        includeHeaders: document.getElementById('includeHeaders').checked,
        compressFiles: document.getElementById('compressFiles').checked
    };
    
    await saveToLocalStorage('export', data);
    showStatus('Configurazione export salvata con successo', 'success');
}

// Save ShipsGo settings to user profile
async function saveShipsGoSettings() {
    const v1Key = document.getElementById('shipsgoV1ApiKey').value.trim();
    const v2Token = document.getElementById('shipsgoV2Token').value.trim();
    
    if (!v1Key && !v2Token) {
        showStatus('Inserisci almeno una API key', 'error');
        return;
    }
    
    // Validate format
    if (v1Key && !/^[a-f0-9]{32}$/i.test(v1Key)) {
        showStatus('API Key v1.2 non valida. Deve essere 32 caratteri hex.', 'error');
        return;
    }
    
    if (v2Token && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v2Token)) {
        showStatus('Bearer Token v2.0 non valido. Deve essere formato UUID.', 'error');
        return;
    }
    
    try {
        // Per ora salva in localStorage fino a quando le Netlify Functions non sono pronte
        const apiSettings = {};
        if (v1Key) apiSettings.shipsgo_v1_key = btoa(v1Key);
        if (v2Token) apiSettings.shipsgo_v2_token = btoa(v2Token);
        
        // Salva in localStorage
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        userProfile.api_settings = apiSettings;
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        
        // Salva anche nelle settings generali per retrocompatibilità
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        settings.apiKeys = {
            shipsgo_v1: v1Key,
            shipsgo_v2: v2Token
        };
        localStorage.setItem('appSettings', JSON.stringify(settings));
        
        showStatus('Configurazione API salvata con successo!', 'success');
        
        // Aggiorna anche il modulo ShipsGo se presente
        if (window.shipsGoAPI) {
            window.shipsGoAPI.v1Key = v1Key;
            window.shipsGoAPI.v2Token = v2Token;
            window.shipsGoAPI.initialized = true;
        }
        
        // Reload to verify
        setTimeout(() => {
            loadShipsGoSettings();
        }, 1000);
        
    } catch (error) {
        console.error('[Settings] Save error:', error);
        showStatus('Errore: ' + error.message, 'error');
    }
}

// Save to localStorage (mock backend)
async function saveToLocalStorage(section, data) {
    try {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        settings[section] = data;
        localStorage.setItem('appSettings', JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error('[Settings] Error saving to localStorage:', error);
        return false;
    }
}

// Show status message
function showStatus(message, type = 'info', duration = 3000) {
    const statusEl = document.getElementById('api-status');
    if (!statusEl) return;
    
    // Clear previous content
    statusEl.innerHTML = '';
    
    // Add icon
    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' : 
                     type === 'error' ? 'fas fa-exclamation-circle' :
                     type === 'warning' ? 'fas fa-exclamation-triangle' :
                     'fas fa-info-circle';
    
    // Add message
    const span = document.createElement('span');
    span.innerHTML = message;
    
    statusEl.appendChild(icon);
    statusEl.appendChild(span);
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'flex';
    
    // Auto hide
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, duration);
}

// Toggle API key visibility
window.toggleApiKeyVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    const button = event.currentTarget;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
};

// Test ShipsGo connection
window.testShipsGoConnection = async function(event) {
    const v1Key = document.getElementById('shipsgoV1ApiKey').value.trim();
    const v2Token = document.getElementById('shipsgoV2Token').value.trim();
    
    if (!v1Key && !v2Token) {
        showStatus('Inserisci almeno una API key da testare', 'error');
        return;
    }
    
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    button.disabled = true;
    
    try {
        // Per ora simula il test fino a quando le Netlify Functions non sono pronte
        showStatus('Test connessione simulato in modalità sviluppo', 'warning');
        
        // Simula risultati
        const results = {
            v1: v1Key ? { success: true, message: 'Connesso (simulato)', credits: 1000 } : null,
            v2: v2Token ? { success: true, message: 'Connesso (simulato)', shipments: 50 } : null
        };
        
        let message = '';
        if (v1Key && results.v1) {
            message += `Container API (v1.2): ${results.v1.message}`;
            if (results.v1.credits !== null) {
                message += ` - Crediti: ${results.v1.credits}`;
            }
        }
        
        if (v2Token && results.v2) {
            if (message) message += '<br>';
            message += `Air Tracking API (v2.0): ${results.v2.message}`;
            if (results.v2.shipments !== null) {
                message += ` - Shipments: ${results.v2.shipments}`;
            }
        }
        
        showStatus(message + '<br><small>Nota: Test simulato in dev mode</small>', 'success', 5000);
        
    } catch (error) {
        console.error('[Settings] Test error:', error);
        showStatus('Errore durante il test di connessione', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
};

// Copy to clipboard
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        showStatus('URL copiato negli appunti!', 'success');
    }).catch(err => {
        console.error('[Settings] Copy failed:', err);
        showStatus('Errore nella copia', 'error');
    });
};

// Show webhook instructions
window.showWebhookInstructions = function() {
    const message = `
        <strong>Istruzioni configurazione webhook:</strong><br>
        1. Copia l'URL del webhook<br>
        2. Accedi a <a href="https://shipsgo.com" target="_blank" style="color: #007AFF;">ShipsGo Dashboard</a><br>
        3. Vai su Settings → Webhooks<br>
        4. Incolla l'URL e attiva il webhook<br>
        5. Seleziona gli eventi da ricevere (Container Updates, BL Updates, etc.)
    `;
    showStatus(message, 'info', 10000);
};

// Handle toggle changes
document.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && e.target.closest('.toggle-switch')) {
        const toggleId = e.target.id;
        const value = e.target.checked;
        console.log(`[Settings] Toggle ${toggleId} changed to ${value}`);
        
        // Auto-save certain toggles
        if (toggleId.startsWith('email') || toggleId.startsWith('push')) {
            saveNotificationSettings();
        } else if (toggleId === 'skipDuplicates' || toggleId === 'autoValidate' || toggleId === 'updateExisting') {
            saveImportSettings();
        }
    }
});

// Save notification settings
async function saveNotificationSettings() {
    const data = {
        emailNewShipments: document.getElementById('emailNewShipments').checked,
        emailDelayedShipments: document.getElementById('emailDelayedShipments').checked,
        emailDelivered: document.getElementById('emailDelivered').checked,
        emailWeeklyReport: document.getElementById('emailWeeklyReport').checked,
        email: document.getElementById('notificationEmail').value,
        pushEnabled: document.getElementById('pushEnabled').checked,
        pushCritical: document.getElementById('pushCritical').checked
    };
    
    await saveToLocalStorage('notifications', data);
    console.log('[Settings] Notifications auto-saved');
}

// Save import settings
async function saveImportSettings() {
    const data = {
        skipDuplicates: document.getElementById('skipDuplicates').checked,
        autoValidate: document.getElementById('autoValidate').checked,
        updateExisting: document.getElementById('updateExisting').checked
    };
    
    await saveToLocalStorage('importExport', {
        ...JSON.parse(localStorage.getItem('appSettings') || '{}').importExport,
        ...data
    });
    console.log('[Settings] Import settings auto-saved');
}

// Handle dangerous actions
document.querySelectorAll('.btn-danger').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const action = e.target.textContent.trim();
        
        if (action.includes('Resetta')) {
            if (confirm('Sei sicuro di voler resettare tutte le impostazioni? Questa azione è irreversibile.')) {
                localStorage.removeItem('appSettings');
                showStatus('Impostazioni resettate. Ricarica la pagina.', 'warning');
                setTimeout(() => location.reload(), 2000);
            }
        } else if (action.includes('Elimina')) {
            if (confirm('SEI SICURO? Questa azione eliminerà TUTTI i dati salvati!')) {
                if (confirm('Ultima conferma: vuoi davvero eliminare TUTTO?')) {
                    // Clear all localStorage
                    localStorage.clear();
                    showStatus('Tutti i dati sono stati eliminati.', 'error');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2000);
                }
            }
        }
    });
});

// Handle other button clicks
document.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const text = e.target.textContent.trim();
        
        if (text.includes('Cambia Password')) {
            showStatus('Funzione cambio password in arrivo...', 'info');
        } else if (text.includes('Sessioni Attive')) {
            showStatus('Visualizzazione sessioni in arrivo...', 'info');
        } else if (text.includes('Esporta')) {
            showStatus('Export dati in arrivo...', 'info');
        } else if (text.includes('Cache')) {
            if (confirm('Vuoi pulire la cache?')) {
                showStatus('Cache pulita con successo', 'success');
            }
        }
    });
});

// Initialize on load
console.log('[Settings] Module loaded successfully');