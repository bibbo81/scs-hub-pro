// pages/settings/index.js - VERSIONE INTEGRATA CON SUPABASE
import userSettingsService from '/core/services/user-settings-service.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Settings] Initializing with Supabase integration...');
    
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
    const navItems = document.querySelectorAll('.sol-tab[data-section]');
    const sections = document.querySelectorAll('.sol-tab-content');
    
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
    
    // ShipsGo form - IMPORTANTE
    const shipsgoForm = document.getElementById('shipsgo-form');
    if (shipsgoForm) {
        shipsgoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveShipsGoSettings();
        });
    }
    
    // Add event listeners for password toggle
    document.querySelectorAll('.api-key-toggle').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const inputId = button.getAttribute('onclick').match(/'([^']+)'/)[1];
            toggleApiKeyVisibility(inputId);
        });
    });
}

// Load all settings
async function loadAllSettings() {
    try {
        // Load ShipsGo settings from Supabase user settings
        await loadShipsGoSettings();
        
        // Load other settings from localStorage (per ora)
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        
        // Company settings
        if (settings.company) {
            safeSetValue('companyName', settings.company.name);
            safeSetValue('vatNumber', settings.company.vat);
            safeSetValue('address', settings.company.address);
            safeSetValue('city', settings.company.city);
            safeSetValue('country', settings.company.country);
            safeSetValue('postalCode', settings.company.postalCode);
        }
        
        // Regional settings
        if (settings.regional) {
            safeSetValue('language', settings.regional.language);
            safeSetValue('timezone', settings.regional.timezone);
            safeSetValue('dateFormat', settings.regional.dateFormat);
            safeSetValue('currency', settings.regional.currency);
        }
        
        // Import/Export settings
        if (settings.importExport) {
            safeSetChecked('skipDuplicates', settings.importExport.skipDuplicates);
            safeSetChecked('autoValidate', settings.importExport.autoValidate);
            safeSetChecked('updateExisting', settings.importExport.updateExisting);
            safeSetValue('exportFormat', settings.importExport.exportFormat);
            safeSetValue('csvEncoding', settings.importExport.csvEncoding);
            safeSetChecked('includeHeaders', settings.importExport.includeHeaders);
            safeSetChecked('compressFiles', settings.importExport.compressFiles);
        }
        
        // Notifications
        if (settings.notifications) {
            safeSetChecked('emailNewShipments', settings.notifications.emailNewShipments);
            safeSetChecked('emailDelayedShipments', settings.notifications.emailDelayedShipments);
            safeSetChecked('emailDelivered', settings.notifications.emailDelivered);
            safeSetChecked('emailWeeklyReport', settings.notifications.emailWeeklyReport);
            safeSetValue('notificationEmail', settings.notifications.email);
            safeSetChecked('pushEnabled', settings.notifications.pushEnabled);
            safeSetChecked('pushCritical', settings.notifications.pushCritical);
        }
        
        // Security
        if (settings.security) {
            safeSetChecked('twoFactorAuth', settings.security.twoFactorAuth);
            safeSetChecked('loginAlerts', settings.security.loginAlerts);
            safeSetChecked('secureSession', settings.security.secureSession);
        }
        
        // Advanced
        if (settings.advanced) {
            safeSetValue('dataRetention', settings.advanced.dataRetention);
            safeSetChecked('autoBackup', settings.advanced.autoBackup);
            safeSetChecked('dataCompression', settings.advanced.dataCompression);
            safeSetChecked('debugMode', settings.advanced.debugMode);
        }
        
    } catch (error) {
        console.error('[Settings] Error loading settings:', error);
    }
}

// SAFE HELPER FUNCTIONS
function safeSetValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element && value !== undefined && value !== null) {
        element.value = value;
    }
}

function safeSetChecked(elementId, checked) {
    const element = document.getElementById(elementId);
    if (element && checked !== undefined && checked !== null) {
        element.checked = checked;
    }
}

function safeGetValue(elementId, defaultValue = '') {
    const element = document.getElementById(elementId);
    return element ? element.value : defaultValue;
}

function safeGetChecked(elementId, defaultValue = false) {
    const element = document.getElementById(elementId);
    return element ? element.checked : defaultValue;
}

// ===== NUOVA IMPLEMENTAZIONE CON SUPABASE =====
// Load ShipsGo settings from Supabase
async function loadShipsGoSettings() {
    console.log('[Settings] Loading ShipsGo settings from Supabase...');
    
    // Clear fields first
    safeSetValue('shipsgoV1ApiKey', '');
    safeSetValue('shipsgoV2Token', '');
    
    try {
        // Verifica se userSettingsService è disponibile
        if (!window.userSettingsService) {
            console.warn('[Settings] userSettingsService not available, using localStorage fallback');
            loadShipsGoSettingsFromLocalStorage();
            return;
        }
        
        // Carica da Supabase
        const apiKeys = await userSettingsService.getAllApiKeys();
        console.log('[Settings] Loaded API keys from Supabase:', Object.keys(apiKeys));
        
        // ShipsGo v1 key
        if (apiKeys.shipsgo_v1) {
            safeSetValue('shipsgoV1ApiKey', apiKeys.shipsgo_v1);
        }
        
        // ShipsGo v2 token
        if (apiKeys.shipsgo_v2) {
            safeSetValue('shipsgoV2Token', apiKeys.shipsgo_v2);
        }
        
        // Mostra stato configurazione
        updateApiStatusIndicator();
        
    } catch (error) {
        console.error('[Settings] Error loading ShipsGo settings from Supabase:', error);
        // Fallback to localStorage
        loadShipsGoSettingsFromLocalStorage();
    }
}

// Fallback: Load from localStorage
function loadShipsGoSettingsFromLocalStorage() {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    if (settings?.apiKeys) {
        safeSetValue('shipsgoV1ApiKey', settings.apiKeys.shipsgo_v1);
        safeSetValue('shipsgoV2Token', settings.apiKeys.shipsgo_v2);
    }
}

// Update API status indicator
function updateApiStatusIndicator() {
    const v1Key = safeGetValue('shipsgoV1ApiKey');
    const v2Token = safeGetValue('shipsgoV2Token');
    
    const statusEl = document.createElement('div');
    statusEl.className = 'api-status-indicator';
    statusEl.style.cssText = 'margin-bottom: 1rem; padding: 0.75rem; border-radius: 0.5rem;';
    
    if (v1Key || v2Token) {
        statusEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; color: #10b981;">
                <i class="fas fa-check-circle"></i>
                <span>API Keys configurate</span>
            </div>
        `;
        statusEl.style.background = '#10b98120';
        statusEl.style.border = '1px solid #10b981';
    } else {
        statusEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; color: #f59e0b;">
                <i class="fas fa-exclamation-circle"></i>
                <span>Nessuna API Key configurata</span>
            </div>
        `;
        statusEl.style.background = '#f59e0b20';
        statusEl.style.border = '1px solid #f59e0b';
    }
    
    // Inserisci l'indicatore nel form
    const form = document.getElementById('shipsgo-form');
    const existingIndicator = form?.querySelector('.api-status-indicator');
    if (existingIndicator) {
        existingIndicator.replaceWith(statusEl);
    } else if (form) {
        form.insertBefore(statusEl, form.firstChild);
    }
}

// Save ShipsGo settings to Supabase
async function saveShipsGoSettings() {
    const v1Key = safeGetValue('shipsgoV1ApiKey').trim();
    const v2Token = safeGetValue('shipsgoV2Token').trim();
    
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
        showStatus('Salvataggio in corso...', 'info');
        
        // Verifica se userSettingsService è disponibile
        if (!window.userSettingsService) {
            console.warn('[Settings] userSettingsService not available, using localStorage');
            saveShipsGoSettingsToLocalStorage(v1Key, v2Token);
            return;
        }
        
        // Salva su Supabase
        const promises = [];
        
        if (v1Key) {
            promises.push(userSettingsService.saveApiKey('shipsgo_v1', v1Key));
        } else {
            promises.push(userSettingsService.removeApiKey('shipsgo_v1'));
        }
        
        if (v2Token) {
            promises.push(userSettingsService.saveApiKey('shipsgo_v2', v2Token));
        } else {
            promises.push(userSettingsService.removeApiKey('shipsgo_v2'));
        }
        
        await Promise.all(promises);
        
        showStatus('API Keys salvate su Supabase con successo!', 'success');
        
        // Aggiorna indicatore stato
        updateApiStatusIndicator();
        
        // Aggiorna anche il tracking service se presente
        if (window.trackingService) {
            await window.trackingService.initialize();
            console.log('[Settings] Tracking service reinitialized with new keys');
        }
        
        // Trigger evento per aggiornare altre parti dell'app
        window.dispatchEvent(new CustomEvent('apiKeysUpdated', { 
            detail: { hasV1: !!v1Key, hasV2: !!v2Token } 
        }));
        
    } catch (error) {
        console.error('[Settings] Save error:', error);
        showStatus('Errore: ' + error.message, 'error');
        
        // Fallback to localStorage
        saveShipsGoSettingsToLocalStorage(v1Key, v2Token);
    }
}

// Fallback: Save to localStorage
function saveShipsGoSettingsToLocalStorage(v1Key, v2Token) {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    settings.apiKeys = {
        shipsgo_v1: v1Key,
        shipsgo_v2: v2Token
    };
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    // Salva anche per il tracking service
    const trackingConfig = {
        shipsgo_v1_key: v1Key,
        shipsgo_v2_token: v2Token,
        shipsgo_v1_enabled: !!v1Key,
        shipsgo_v2_enabled: !!v2Token
    };
    localStorage.setItem('trackingServiceConfig', JSON.stringify(trackingConfig));
    
    showStatus('API Keys salvate localmente (Supabase non disponibile)', 'warning');
    updateApiStatusIndicator();
}

// Save company settings
async function saveCompanySettings() {
    const data = {
        name: safeGetValue('companyName'),
        vat: safeGetValue('vatNumber'),
        address: safeGetValue('address'),
        city: safeGetValue('city'),
        country: safeGetValue('country'),
        postalCode: safeGetValue('postalCode')
    };
    
    await saveToLocalStorage('company', data);
    showStatus('Informazioni azienda salvate con successo', 'success');
}

// Save regional settings
async function saveRegionalSettings() {
    const data = {
        language: safeGetValue('language'),
        timezone: safeGetValue('timezone'),
        dateFormat: safeGetValue('dateFormat'),
        currency: safeGetValue('currency')
    };
    
    await saveToLocalStorage('regional', data);
    showStatus('Preferenze regionali salvate con successo', 'success');
}

// Save export settings
async function saveExportSettings() {
    const data = {
        exportFormat: safeGetValue('exportFormat'),
        csvEncoding: safeGetValue('csvEncoding'),
        includeHeaders: safeGetChecked('includeHeaders'),
        compressFiles: safeGetChecked('compressFiles')
    };
    
    await saveToLocalStorage('export', data);
    showStatus('Configurazione export salvata con successo', 'success');
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
    // Use NotificationSystem for better UX if available
    if (window.NotificationSystem) {
        window.NotificationSystem.show(message, type, duration);
        return;
    }
    
    // Fallback to status element
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
    statusEl.className = `sol-alert sol-alert-${type}`;
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
    
    if (!input) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
};

// Test ShipsGo connection using tracking service
window.testShipsGoConnection = async function(event) {
    const v1Key = safeGetValue('shipsgoV1ApiKey').trim();
    const v2Token = safeGetValue('shipsgoV2Token').trim();
    
    if (!v1Key && !v2Token) {
        showStatus('Inserisci almeno una API key da testare', 'error');
        return;
    }
    
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    button.disabled = true;
    
    try {
        // Prima salva temporaneamente le keys per il test
        if (window.trackingService) {
            await window.trackingService.updateConfiguration({
                shipsgo_v1_key: v1Key,
                shipsgo_v2_token: v2Token,
                shipsgo_v1_enabled: !!v1Key,
                shipsgo_v2_enabled: !!v2Token,
                force_mock_mode: false
            });
            
            // Esegui il test
            const results = await window.trackingService.testConnection();
            
            let message = '<div>';
            if (results.v1) {
                message += `<strong>Container API (v1.2):</strong> ${
                    results.v1.success ? 
                    '<span style="color: #10b981;">✓ Connesso</span>' : 
                    '<span style="color: #ef4444;">✗ Errore: ' + results.v1.message + '</span>'
                }<br>`;
            }
            
            if (results.v2) {
                message += `<strong>Air Tracking API (v2.0):</strong> ${
                    results.v2.success ? 
                    '<span style="color: #10b981;">✓ Connesso</span>' : 
                    '<span style="color: #ef4444;">✗ Errore: ' + results.v2.message + '</span>'
                }`;
            }
            message += '</div>';
            
            showStatus(message, results.overall ? 'success' : 'error', 5000);
        } else {
            showStatus('Tracking service non disponibile', 'error');
        }
        
    } catch (error) {
        console.error('[Settings] Test error:', error);
        showStatus('Errore durante il test: ' + error.message, 'error');
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
    try {
        const data = {
            emailNewShipments: safeGetChecked('emailNewShipments'),
            emailDelayedShipments: safeGetChecked('emailDelayedShipments'),
            emailDelivered: safeGetChecked('emailDelivered'),
            emailWeeklyReport: safeGetChecked('emailWeeklyReport'),
            email: safeGetValue('notificationEmail'),
            pushEnabled: safeGetChecked('pushEnabled'),
            pushCritical: safeGetChecked('pushCritical')
        };
        
        await saveToLocalStorage('notifications', data);
        console.log('[Settings] Notifications auto-saved');
    } catch (error) {
        console.error('[Settings] Error saving notifications:', error);
    }
}

// Save import settings
async function saveImportSettings() {
    try {
        const currentSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        const data = {
            ...currentSettings.importExport,
            skipDuplicates: safeGetChecked('skipDuplicates'),
            autoValidate: safeGetChecked('autoValidate'),
            updateExisting: safeGetChecked('updateExisting')
        };
        
        await saveToLocalStorage('importExport', data);
        console.log('[Settings] Import settings auto-saved');
    } catch (error) {
        console.error('[Settings] Error saving import settings:', error);
    }
}

// Handle dangerous actions
document.addEventListener('click', (e) => {
    if (e.target.matches('.sol-btn-danger')) {
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
    }
    
    // Handle other button clicks
    if (e.target.matches('.sol-btn-secondary')) {
        const text = e.target.textContent.trim();
        
        if (text.includes('Cambia Password')) {
            showStatus('Funzione cambio password in arrivo...', 'info');
        } else if (text.includes('Sessioni Attive')) {
            showStatus('Visualizzazione sessioni in arrivo...', 'info');
        } else if (text.includes('Esporta')) {
            showStatus('Export dati in arrivo...', 'info');
        } else if (text.includes('Cache')) {
            if (confirm('Vuoi pulire la cache?')) {
                if (window.trackingService) {
                    window.trackingService.clearCache();
                }
                showStatus('Cache pulita con successo', 'success');
            }
        }
    }
});

// Initialize userSettingsService globally if available
window.addEventListener('load', async () => {
    try {
        if (!window.userSettingsService && userSettingsService) {
            window.userSettingsService = userSettingsService;
            console.log('[Settings] userSettingsService exposed globally');
        }
    } catch (error) {
        console.warn('[Settings] userSettingsService module not available:', error);
    }
});

// Initialize on load
console.log('[Settings] Module loaded successfully with Supabase integration');