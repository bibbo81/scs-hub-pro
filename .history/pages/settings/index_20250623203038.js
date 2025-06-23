// pages/settings/index.js - VERSIONE INTEGRATA CON SUPABASE E MIGRAZIONE COMPLETA

// Import the user settings service. This service is expected to handle
// interactions with Supabase or any other backend for user-specific settings.
import userSettingsService from '/core/services/user-settings-service.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Settings] Initializing with Supabase integration...');

    // Initialize core UI components.
    initializeNavigation();
    initializeForms();
    initializeActionHandlers(); // New function to centralize non-form related button clicks

    // Wait for authentication to be ready before loading settings.
    waitForAuth();
});

// Attendi che Supabase sia pronto prima di caricare settings
window.addEventListener('supabaseReady', async () => {
    console.log('[Settings] Supabase services ready, loading API keys...');
    
    if (window.userSettingsService) {
        try {
            // Carica API keys da Supabase
            const keys = await window.userSettingsService.getAllApiKeys();
            console.log('[Settings] API keys loaded:', Object.keys(keys));
            
            // Popola i campi
            if (keys.shipsgo_v1) {
                const v1Input = document.getElementById('shipsgoV1ApiKey');
                if (v1Input) v1Input.value = keys.shipsgo_v1;
            }
            
            if (keys.shipsgo_v2) {
                const v2Input = document.getElementById('shipsgoV2Token');
                if (v2Input) v2Input.value = keys.shipsgo_v2;
            }
            
        } catch (error) {
            console.error('[Settings] Error loading API keys:', error);
        }
    }
});

/**
 * Waits for the global authentication object to be ready and authenticated.
 * It retries checking at intervals to ensure settings are loaded only when the user's
 * authentication state is confirmed, or after a timeout.
 */
function waitForAuth() {
    let retries = 0;
    const maxRetries = 20; // Max attempts (20 * 500ms = 10 seconds)
    const intervalTime = 500; // Check every 500 milliseconds

    const checkAuth = setInterval(() => {
        retries++;

        // Check if `window.auth` exists and the user is authenticated.
        if (window.auth && window.auth.isAuthenticated()) {
            clearInterval(checkAuth); // Stop checking
            console.log('[Settings] Auth ready, loading settings...');
            loadAllSettings(); // Proceed to load settings
        } else if (retries >= maxRetries) {
            // If max retries reached and auth isn't ready, proceed anyway with a warning.
            // This might happen if auth service isn't loaded or user isn't logged in.
            clearInterval(checkAuth); // Stop checking
            console.warn('[Settings] Auth timeout or not authenticated after multiple retries, loading settings anyway...');
            loadAllSettings(); // Load settings (might be empty if not authenticated)
        }
    }, intervalTime);
}

/**
 * Initializes navigation between different setting sections.
 * It manages active tabs and updates the URL hash for direct access.
 */
function initializeNavigation() {
    const navItems = document.querySelectorAll('.sol-tab[data-section]');
    const sections = document.querySelectorAll('.sol-tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            const targetSection = item.dataset.section; // Get target section from data attribute

            // Remove 'active' class from all navigation items and add to the clicked one.
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Hide all content sections and show only the target section.
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSection) {
                    section.classList.add('active');
                }
            });

            // Update the URL hash to reflect the current section, allowing deep linking.
            history.pushState(null, '', `#${targetSection}`);
        });
    });

    // Handle direct URL access when the page loads (e.g., user navigates to #company).
    const hash = window.location.hash.slice(1); // Get hash without '#'
    if (hash) {
        const navItem = document.querySelector(`[data-section="${hash}"]`);
        if (navItem) navItem.click(); // Programmatically click the corresponding nav item
    }
}

/**
 * Initializes form submission handlers for various settings sections.
 */
function initializeForms() {
    // Select all forms that have a 'data-setting-category' attribute
    document.querySelectorAll('form[data-setting-category]').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent default form submission

            const category = form.dataset.settingCategory; // Get the setting category (e.g., 'company', 'regional')
            const formData = {};

            // Collect form data based on input IDs
            form.querySelectorAll('input, select, textarea').forEach(input => {
                // Determine the correct value based on input type (checkbox vs. others)
                formData[input.id] = input.type === 'checkbox' ? input.checked : input.value;
            });

            // Call the generic save function
            await saveSettings(category, formData);
        });
    });

    // Add event listeners for password toggle buttons.
    document.querySelectorAll('.api-key-toggle').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            // Extract inputId from the onclick attribute or data attribute if present
            const inputId = button.getAttribute('data-target-input'); // Assuming data-target-input is used
            if (!inputId) {
                // Fallback to parsing onclick if data-target-input is not found
                const onclickAttr = button.getAttribute('onclick');
                if (onclickAttr) {
                    const match = onclickAttr.match(/'([^']+)'/);
                    if (match && match[1]) {
                        toggleApiKeyVisibility(match[1], e); // Pass the event object
                        return;
                    }
                }
                console.warn('[Settings] toggleApiKeyVisibility: Could not find target input for button:', button);
                return;
            }
            toggleApiKeyVisibility(inputId, e); // Pass the event object
        });
    });
}

/**
 * Initializes event listeners for various non-form related buttons and dangerous actions.
 */
function initializeActionHandlers() {
    document.addEventListener('click', async (e) => {
        // Handle dangerous actions (reset, delete)
        if (e.target.matches('.sol-btn-danger')) {
            const action = e.target.textContent.trim();

            if (action.includes('Resetta')) {
                // Custom confirmation for "Reset All Settings"
                const confirmed = await showConfirmDialog('Sei sicuro di voler resettare tutte le impostazioni? Questa azione è irreversibile e pulirà tutti i dati locali e quelli sul server (se implementato).');
                if (confirmed) {
                    try {
                        showStatus('Resettando le impostazioni...', 'info');
                        // Attempt to reset all settings via userSettingsService
                        if (window.userSettingsService) {
                            await window.userSettingsService.resetAllSettings(); // Assuming such a method exists
                            // Clear local storage for fallback settings that might still be there
                            localStorage.clear();
                            showStatus('Impostazioni resettate con successo. Ricarica la pagina.', 'success');
                        } else {
                            // Fallback if userSettingsService is not available
                            localStorage.clear();
                            showStatus('Impostazioni locali resettate. Ricarica la pagina.', 'warning');
                        }
                        setTimeout(() => location.reload(), 2000);
                    } catch (error) {
                        console.error('[Settings] Error resetting settings:', error);
                        showStatus('Errore durante il reset delle impostazioni: ' + error.message, 'error');
                    }
                }
            } else if (action.includes('Elimina')) {
                // Custom confirmation for "Delete All Data"
                const confirmedFirst = await showConfirmDialog('SEI SICURO? Questa azione eliminerà TUTTI i dati salvati sia localmente che sul server! QUESTA AZIONE È IRREVERSIBILE.');
                if (confirmedFirst) {
                    const confirmedSecond = await showConfirmDialog('ULTIMA CONFERMA: vuoi DAVVERO eliminare TUTTO? Non potrai recuperare i dati.');
                    if (confirmedSecond) {
                        try {
                            showStatus('Eliminazione dati in corso...', 'error');
                            if (window.userSettingsService) {
                                await window.userSettingsService.deleteAllData(); // Assuming such a method exists
                            }
                            localStorage.clear(); // Clear local storage too
                            showStatus('Tutti i dati sono stati eliminati.', 'error');
                            setTimeout(() => {
                                // Redirect to login or home after data deletion
                                window.location.href = '/login.html';
                            }, 2000);
                        } catch (error) {
                            console.error('[Settings] Error deleting all data:', error);
                            showStatus('Errore durante l\'eliminazione di tutti i dati: ' + error.message, 'error');
                        }
                    }
                }
            }
        }

        // Handle other secondary button clicks
        if (e.target.matches('.sol-btn-secondary')) {
            const text = e.target.textContent.trim();

            if (text.includes('Cambia Password')) {
                showStatus('Funzione cambio password in arrivo...', 'info');
            } else if (text.includes('Sessioni Attive')) {
                showStatus('Visualizzazione sessioni in arrivo...', 'info');
            } else if (text.includes('Esporta')) {
                showStatus('Export dati in arrivo...', 'info');
            } else if (text.includes('Cache')) {
                const confirmed = await showConfirmDialog('Vuoi pulire la cache?');
                if (confirmed) {
                    if (window.trackingService) {
                        window.trackingService.clearCache();
                        showStatus('Cache pulita con successo', 'success');
                    } else {
                        showStatus('Tracking service non disponibile per pulire la cache.', 'warning');
                    }
                }
            }
        }
    });

    // Handle toggle changes for auto-saving
    document.addEventListener('change', async (e) => {
        if (e.target.type === 'checkbox' && e.target.closest('.toggle-switch')) {
            const toggleId = e.target.id;
            const value = e.target.checked;
            console.log(`[Settings] Toggle ${toggleId} changed to ${value}`);

            // Determine which category of settings to save based on the toggle ID.
            // This assumes a convention where toggle IDs indicate their section.
            if (toggleId.startsWith('email') || toggleId.startsWith('push') || toggleId === 'notificationEmail') {
                await saveNotificationSettings();
            } else if (toggleId === 'skipDuplicates' || toggleId === 'autoValidate' || toggleId === 'updateExisting') {
                await saveImportExportSettings(); // Renamed from saveImportSettings
            } else if (toggleId.startsWith('twoFactorAuth') || toggleId.startsWith('loginAlerts') || toggleId.startsWith('secureSession')) {
                await saveSecuritySettings();
            } else if (toggleId.startsWith('dataRetention') || toggleId.startsWith('autoBackup') || toggleId.startsWith('dataCompression') || toggleId.startsWith('debugMode')) {
                await saveAdvancedSettings();
            }
        }
    });
}

/**
 * Loads all user settings from the userSettingsService (Supabase).
 * This function is the central point for fetching all user preferences.
 */
async function loadAllSettings() {
    try {
        console.log('[Settings] Attempting to load all settings from userSettingsService...');
        // Fetch all settings from the service. This should return a consolidated object.
        const allSettings = await userSettingsService.getAllSettings();
        console.log('[Settings] Loaded all settings:', allSettings);

        // Populate form fields for each category.
        // Company settings
        if (allSettings.company) {
            safeSetValue('companyName', allSettings.company.name);
            safeSetValue('vatNumber', allSettings.company.vat);
            safeSetValue('address', allSettings.company.address);
            safeSetValue('city', allSettings.company.city);
            safeSetValue('country', allSettings.company.country);
            safeSetValue('postalCode', allSettings.company.postalCode);
        }

        // Regional settings
        if (allSettings.regional) {
            safeSetValue('language', allSettings.regional.language);
            safeSetValue('timezone', allSettings.regional.timezone);
            safeSetValue('dateFormat', allSettings.regional.dateFormat);
            safeSetValue('currency', allSettings.regional.currency);
        }

        // Import/Export settings
        if (allSettings.importExport) {
            safeSetChecked('skipDuplicates', allSettings.importExport.skipDuplicates);
            safeSetChecked('autoValidate', allSettings.importExport.autoValidate);
            safeSetChecked('updateExisting', allSettings.importExport.updateExisting);
            safeSetValue('exportFormat', allSettings.importExport.exportFormat);
            safeSetValue('csvEncoding', allSettings.importExport.csvEncoding);
            safeSetChecked('includeHeaders', allSettings.importExport.includeHeaders);
            safeSetChecked('compressFiles', allSettings.importExport.compressFiles);
        }

        // Notifications settings
        if (allSettings.notifications) {
            safeSetChecked('emailNewShipments', allSettings.notifications.emailNewShipments);
            safeSetChecked('emailDelayedShipments', allSettings.notifications.emailDelayedShipments);
            safeSetChecked('emailDelivered', allSettings.notifications.emailDelivered);
            safeSetChecked('emailWeeklyReport', allSettings.notifications.emailWeeklyReport);
            safeSetValue('notificationEmail', allSettings.notifications.email);
            safeSetChecked('pushEnabled', allSettings.notifications.pushEnabled);
            safeSetChecked('pushCritical', allSettings.notifications.pushCritical);
        }

        // Security settings
        if (allSettings.security) {
            safeSetChecked('twoFactorAuth', allSettings.security.twoFactorAuth);
            safeSetChecked('loginAlerts', allSettings.security.loginAlerts);
            safeSetChecked('secureSession', allSettings.security.secureSession);
        }

        // Advanced settings
        if (allSettings.advanced) {
            safeSetValue('dataRetention', allSettings.advanced.dataRetention);
            safeSetChecked('autoBackup', allSettings.advanced.autoBackup);
            safeSetChecked('dataCompression', allSettings.advanced.dataCompression);
            safeSetChecked('debugMode', allSettings.advanced.debugMode);
        }

        // Load ShipsGo specific API keys, which are handled separately by userSettingsService.
        await loadShipsGoSettings();

    } catch (error) {
        console.error('[Settings] Error loading all settings:', error);
        showStatus('Errore nel caricamento delle impostazioni: ' + error.message, 'error', 5000);
        // Fallback to localStorage could be re-added here if necessary for very specific cases,
        // but the goal is full Supabase integration. For now, just show error.
    }
}

/**
 * Saves a specific category of settings to the userSettingsService.
 * This is a generic function to handle saving for company, regional, etc.
 * @param {string} category - The category name (e.g., 'company', 'regional').
 * @param {object} data - The data object for that category.
 */
async function saveSettings(category, data) {
    try {
        showStatus('Salvataggio in corso...', 'info');
        if (window.userSettingsService) {
            await window.userSettingsService.saveSetting(category, data);
            showStatus(`Impostazioni "${category}" salvate con successo!`, 'success');
        } else {
            console.warn('[Settings] userSettingsService not available, cannot save settings for:', category);
            // Optionally, fallback to localStorage if needed for development/testing,
            // but for production, this should ideally not be reached if Supabase is mandatory.
            showStatus('Servizio di salvataggio non disponibile. Dati non salvati.', 'error');
        }
    } catch (error) {
        console.error(`[Settings] Error saving ${category} settings:`, error);
        showStatus(`Errore nel salvataggio delle impostazioni "${category}": ` + error.message, 'error');
    }
}

// SAFE HELPER FUNCTIONS - Prevent null or undefined errors when interacting with DOM elements.

/**
 * Safely sets the value of an HTML input element.
 * @param {string} elementId - The ID of the HTML element.
 * @param {*} value - The value to set.
 */
function safeSetValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element && value !== undefined && value !== null) {
        element.value = value;
    }
}

/**
 * Safely sets the 'checked' property of an HTML checkbox element.
 * @param {string} elementId - The ID of the HTML checkbox element.
 * @param {boolean} checked - The boolean value to set for 'checked'.
 */
function safeSetChecked(elementId, checked) {
    const element = document.getElementById(elementId);
    if (element && checked !== undefined && checked !== null) {
        element.checked = checked;
    }
}

/**
 * Safely gets the value of an HTML input element.
 * @param {string} elementId - The ID of the HTML element.
 * @param {string} defaultValue - The default value to return if the element is not found or has no value.
 * @returns {string} The element's value or the default value.
 */
function safeGetValue(elementId, defaultValue = '') {
    const element = document.getElementById(elementId);
    return element ? element.value : defaultValue;
}

/**
 * Safely gets the 'checked' property of an HTML checkbox element.
 * @param {string} elementId - The ID of the HTML checkbox element.
 * @param {boolean} defaultValue - The default value to return if the element is not found.
 * @returns {boolean} The element's checked status or the default value.
 */
function safeGetChecked(elementId, defaultValue = false) {
    const element = document.getElementById(elementId);
    return element ? element.checked : defaultValue;
}

// ===== SUPABASE INTEGRATION FOR SHIPSGO API KEYS =====
/**
 * Loads ShipsGo API settings from Supabase via userSettingsService.
 */
async function loadShipsGoSettings() {
    console.log('[Settings] Loading ShipsGo settings from Supabase...');

    // Clear fields first to ensure no stale data is shown.
    safeSetValue('shipsgoV1ApiKey', '');
    safeSetValue('shipsgoV2Token', '');

    try {
        if (!window.userSettingsService) {
            console.warn('[Settings] userSettingsService not available, cannot load ShipsGo API keys.');
            // This is a critical warning as Supabase integration is intended.
            // A fallback here would mean reloading from localStorage, which goes against full Supabase migration.
            // For now, it will simply show empty fields.
            showStatus('Servizio impostazioni utente non disponibile. Impossibile caricare le API Keys.', 'warning');
            updateApiStatusIndicator(); // Update status based on empty fields
            return;
        }

        // Fetch API keys using the dedicated service method.
        const apiKeys = await userSettingsService.getAllApiKeys();
        console.log('[Settings] Loaded API keys from Supabase:', Object.keys(apiKeys));

        // Populate fields if keys exist.
        if (apiKeys.shipsgo_v1) {
            safeSetValue('shipsgoV1ApiKey', apiKeys.shipsgo_v1);
        }
        if (apiKeys.shipsgo_v2) {
            safeSetValue('shipsgoV2Token', apiKeys.shipsgo_v2);
        }

        // Update the visual status indicator for API keys.
        updateApiStatusIndicator();

    } catch (error) {
        console.error('[Settings] Error loading ShipsGo settings from Supabase:', error);
        showStatus('Errore nel caricamento delle API Keys: ' + error.message, 'error', 5000);
        // Ensure status is updated even on error
        updateApiStatusIndicator();
    }
}

/**
 * Updates the visual indicator for ShipsGo API key configuration status.
 */
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

    // Insert or replace the indicator within the form.
    const form = document.getElementById('shipsgo-form');
    const existingIndicator = form?.querySelector('.api-status-indicator');
    if (existingIndicator) {
        existingIndicator.replaceWith(statusEl);
    } else if (form) {
        form.insertBefore(statusEl, form.firstChild);
    }
}

/**
 * Saves ShipsGo API keys to Supabase via userSettingsService.
 */
async function saveShipsGoSettings() {
    const v1Key = safeGetValue('shipsgoV1ApiKey').trim();
    const v2Token = safeGetValue('shipsgoV2Token').trim();

    if (!v1Key && !v2Token) {
        showStatus('Inserisci almeno una API key', 'error');
        return;
    }

    // Validate API key formats.
    // ShipsGo v1 API Key is typically a 32-character hexadecimal string.
    if (v1Key && !/^[a-f0-9]{32}$/i.test(v1Key)) {
        showStatus('API Key v1.2 non valida. Deve essere 32 caratteri esadecimali.', 'error');
        return;
    }

    // ShipsGo v2 Bearer Token is typically a UUID format.
    if (v2Token && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v2Token)) {
        showStatus('Bearer Token v2.0 non valido. Deve essere in formato UUID.', 'error');
        return;
    }

    try {
        showStatus('Salvataggio API Keys in corso...', 'info');

        if (!window.userSettingsService) {
            console.warn('[Settings] userSettingsService not available, cannot save ShipsGo API keys.');
            showStatus('Servizio impostazioni utente non disponibile. API Keys non salvate.', 'error');
            return;
        }

        // Use Promise.all to save/remove keys concurrently.
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

        // Update the visual API status indicator after saving.
        updateApiStatusIndicator();

        // Reinitialize tracking service if it exists to pick up new keys.
        if (window.trackingService) {
            await window.trackingService.initialize();
            console.log('[Settings] Tracking service reinitialized with new keys');
        }

        // Dispatch a custom event to notify other parts of the application about API key updates.
        window.dispatchEvent(new CustomEvent('apiKeysUpdated', {
            detail: { hasV1: !!v1Key, hasV2: !!v2Token }
        }));

    } catch (error) {
        console.error('[Settings] Save ShipsGo API keys error:', error);
        showStatus('Errore durante il salvataggio delle API Keys: ' + error.message, 'error');
    }
}

/**
 * Saves company-related settings to the userSettingsService.
 * This replaces the old saveCompanySettings that used localStorage.
 */
async function saveCompanySettings() {
    const data = {
        name: safeGetValue('companyName'),
        vat: safeGetValue('vatNumber'),
        address: safeGetValue('address'),
        city: safeGetValue('city'),
        country: safeGetValue('country'),
        postalCode: safeGetValue('postalCode')
    };
    await saveSettings('company', data);
}

/**
 * Saves regional settings to the userSettingsService.
 * This replaces the old saveRegionalSettings that used localStorage.
 */
async function saveRegionalSettings() {
    const data = {
        language: safeGetValue('language'),
        timezone: safeGetValue('timezone'),
        dateFormat: safeGetValue('dateFormat'),
        currency: safeGetValue('currency')
    };
    await saveSettings('regional', data);
}

/**
 * Saves import/export settings to the userSettingsService.
 * This function also handles auto-saving for specific toggles.
 */
async function saveImportExportSettings() {
    try {
        // Fetch current settings to merge with updated toggle values, if needed.
        // Or assume saveSetting overwrites the entire category.
        const currentImportExportSettings = (await userSettingsService.getSettings('importExport')) || {};

        const data = {
            ...currentImportExportSettings, // Merge with existing settings
            exportFormat: safeGetValue('exportFormat'),
            csvEncoding: safeGetValue('csvEncoding'),
            includeHeaders: safeGetChecked('includeHeaders'),
            compressFiles: safeGetChecked('compressFiles'),
            // These are for auto-save from toggles in the 'import' part
            skipDuplicates: safeGetChecked('skipDuplicates'),
            autoValidate: safeGetChecked('autoValidate'),
            updateExisting: safeGetChecked('updateExisting')
        };

        await saveSettings('importExport', data);
        console.log('[Settings] Import/Export settings auto-saved');
    } catch (error) {
        console.error('[Settings] Error saving Import/Export settings:', error);
    }
}


/**
 * Saves notification settings to the userSettingsService.
 * This function handles auto-saving for notification-related toggles and email.
 */
async function saveNotificationSettings() {
    try {
        const currentNotificationSettings = (await userSettingsService.getSettings('notifications')) || {};

        const data = {
            ...currentNotificationSettings, // Merge with existing settings
            emailNewShipments: safeGetChecked('emailNewShipments'),
            emailDelayedShipments: safeGetChecked('emailDelayedShipments'),
            emailDelivered: safeGetChecked('emailDelivered'),
            emailWeeklyReport: safeGetChecked('emailWeeklyReport'),
            email: safeGetValue('notificationEmail'),
            pushEnabled: safeGetChecked('pushEnabled'),
            pushCritical: safeGetChecked('pushCritical')
        };

        await saveSettings('notifications', data);
        console.log('[Settings] Notifications auto-saved');
    } catch (error) {
        console.error('[Settings] Error saving notifications:', error);
    }
}

/**
 * Saves security settings to the userSettingsService.
 * This function handles auto-saving for security-related toggles.
 */
async function saveSecuritySettings() {
    try {
        const currentSecuritySettings = (await userSettingsService.getSettings('security')) || {};
        const data = {
            ...currentSecuritySettings,
            twoFactorAuth: safeGetChecked('twoFactorAuth'),
            loginAlerts: safeGetChecked('loginAlerts'),
            secureSession: safeGetChecked('secureSession')
        };
        await saveSettings('security', data);
        console.log('[Settings] Security settings auto-saved');
    } catch (error) {
        console.error('[Settings] Error saving security settings:', error);
    }
}

/**
 * Saves advanced settings to the userSettingsService.
 * This function handles auto-saving for advanced-related toggles.
 */
async function saveAdvancedSettings() {
    try {
        const currentAdvancedSettings = (await userSettingsService.getSettings('advanced')) || {};
        const data = {
            ...currentAdvancedSettings,
            dataRetention: safeGetValue('dataRetention'),
            autoBackup: safeGetChecked('autoBackup'),
            dataCompression: safeGetChecked('dataCompression'),
            debugMode: safeGetChecked('debugMode')
        };
        await saveSettings('advanced', data);
        console.log('[Settings] Advanced settings auto-saved');
    } catch (error) {
        console.error('[Settings] Error saving advanced settings:', error);
    }
}


/**
 * Displays a status message to the user using the NotificationSystem or a fallback element.
 * @param {string} message - The message to display.
 * @param {string} type - The type of message ('info', 'success', 'warning', 'error').
 * @param {number} duration - How long the message should be visible in milliseconds.
 */
function showStatus(message, type = 'info', duration = 3000) {
    // Prefer NotificationSystem for better UX if available
    if (window.NotificationSystem) {
        window.NotificationSystem.show(message, type, duration);
        return;
    }

    // Fallback to a simple status element if NotificationSystem is not present.
    const statusEl = document.getElementById('api-status'); // Assuming an element with this ID exists for messages.
    if (!statusEl) {
        console.warn(`[Settings] showStatus: No status element found with ID 'api-status'. Message: ${message}`);
        return;
    }

    // Clear previous content.
    statusEl.innerHTML = '';

    // Add an icon based on message type for visual feedback.
    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' :
                     type === 'error' ? 'fas fa-exclamation-circle' :
                     type === 'warning' ? 'fas fa-exclamation-triangle' :
                     'fas fa-info-circle';

    // Add the message text.
    const span = document.createElement('span');
    span.innerHTML = message; // Use innerHTML to allow for HTML formatting in messages (e.g., from testShipsGoConnection).

    // Append icon and message, apply styling.
    statusEl.appendChild(icon);
    statusEl.appendChild(span);
    statusEl.className = `sol-alert sol-alert-${type}`; // Apply CSS classes for styling.
    statusEl.style.display = 'flex'; // Make the element visible.

    // Automatically hide the message after the specified duration.
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, duration);
}

/**
 * Displays a custom confirmation dialog. This replaces native `confirm()`.
 * It creates a temporary overlay and resolves a Promise based on user's 'Yes' or 'No'.
 * @param {string} message - The message to display in the confirmation dialog.
 * @returns {Promise<boolean>} A Promise that resolves to true if confirmed, false otherwise.
 */
function showConfirmDialog(message) {
    return new Promise((resolve) => {
        // Create overlay and dialog elements
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center;
            z-index: 1000;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            text-align: center; max-width: 400px; margin: 20px;
            font-family: 'Inter', sans-serif;
        `;

        dialog.innerHTML = `
            <p>${message}</p>
            <div style="margin-top: 20px;">
                <button id="confirm-yes" style="
                    background-color: #007AFF; color: white; border: none; padding: 10px 20px;
                    border-radius: 5px; cursor: pointer; margin-right: 10px; font-size: 1rem;
                    transition: background-color 0.2s ease;
                ">Sì</button>
                <button id="confirm-no" style="
                    background-color: #f44336; color: white; border: none; padding: 10px 20px;
                    border-radius: 5px; cursor: pointer; font-size: 1rem;
                    transition: background-color 0.2s ease;
                ">No</button>
            </div>
        `;

        // Append to body
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Add event listeners for buttons
        document.getElementById('confirm-yes').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(true);
        });

        document.getElementById('confirm-no').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(false);
        });
    });
}


/**
 * Toggles the visibility of an API key input field between 'password' and 'text' type.
 * @param {string} inputId - The ID of the input element to toggle.
 * @param {Event} event - The event object from the click.
 */
window.toggleApiKeyVisibility = function(inputId, event) {
    const input = document.getElementById(inputId);
    const button = event.currentTarget; // Get the button that was clicked
    const icon = button.querySelector('i');

    if (!input) {
        console.warn(`[Settings] toggleApiKeyVisibility: Input element with ID '${inputId}' not found.`);
        return;
    }

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash'; // Change icon to 'hide'
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye'; // Change icon to 'show'
    }
};

/**
 * Tests the ShipsGo API connection using the `trackingService`.
 * Assumes `window.trackingService` is available and initialized.
 * @param {Event} event - The event object from the button click.
 */
window.testShipsGoConnection = async function(event) {
    const v1Key = safeGetValue('shipsgoV1ApiKey').trim();
    const v2Token = safeGetValue('shipsgoV2Token').trim();

    if (!v1Key && !v2Token) {
        showStatus('Inserisci almeno una API key da testare', 'error');
        return;
    }

    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...'; // Show spinner
    button.disabled = true; // Disable button during test

    try {
        if (window.trackingService) {
            // Update tracking service configuration temporarily for the test.
            await window.trackingService.updateConfiguration({
                shipsgo_v1_key: v1Key,
                shipsgo_v2_token: v2Token,
                shipsgo_v1_enabled: !!v1Key,
                shipsgo_v2_enabled: !!v2Token,
                force_mock_mode: false // Ensure it's not in mock mode for a real test
            });

            // Execute the connection test.
            const results = await window.trackingService.testConnection();

            let message = '<div>';
            if (v1Key) { // Only show v1 status if a key was provided
                message += `<strong>Container API (v1.2):</strong> ${
                    results.v1 && results.v1.success ?
                    '<span style="color: #10b981;">✓ Connesso</span>' :
                    `<span style="color: #ef4444;">✗ Errore: ${(results.v1 && results.v1.message) || 'N/A'}</span>`
                }<br>`;
            } else {
                 message += `<strong>Container API (v1.2):</strong> Non configurato<br>`;
            }

            if (v2Token) { // Only show v2 status if a token was provided
                message += `<strong>Air Tracking API (v2.0):</strong> ${
                    results.v2 && results.v2.success ?
                    '<span style="color: #10b981;">✓ Connesso</span>' :
                    `<span style="color: #ef4444;">✗ Errore: ${(results.v2 && results.v2.message) || 'N/A'}</span>`
                }`;
            } else {
                 message += `<strong>Air Tracking API (v2.0):</strong> Non configurato`;
            }
            message += '</div>';

            showStatus(message, results.overall ? 'success' : 'error', 5000);
        } else {
            showStatus('Tracking service non disponibile per il test di connessione.', 'error');
        }

    } catch (error) {
        console.error('[Settings] Test error:', error);
        showStatus('Errore durante il test: ' + error.message, 'error');
    } finally {
        button.innerHTML = originalText; // Restore button text
        button.disabled = false; // Re-enable button
    }
};

/**
 * Copies the provided text to the clipboard.
 * @param {string} text - The text to copy.
 */
window.copyToClipboard = function(text) {
    // Use `document.execCommand('copy')` for clipboard operations within iframes
    // as `navigator.clipboard.writeText()` might be restricted.
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; // Ensure it's not visible
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showStatus('URL copiato negli appunti!', 'success');
        } else {
            showStatus('Errore nella copia: Fallback non riuscito.', 'error');
        }
    } catch (err) {
        console.error('[Settings] Copy failed:', err);
        showStatus('Errore nella copia: ' + err.message, 'error');
    } finally {
        document.body.removeChild(textarea); // Clean up the temporary textarea
    }
};

/**
 * Displays instructions for configuring webhooks.
 */
window.showWebhookInstructions = function() {
    const message = `
        <strong>Istruzioni configurazione webhook:</strong><br>
        1. Copia l'URL del webhook<br>
        2. Accedi a <a href="https://shipsgo.com" target="_blank" style="color: #007AFF;">ShipsGo Dashboard</a><br>
        3. Vai su Settings → Webhooks<br>
        4. Incolla l'URL e attiva il webhook<br>
        5. Seleziona gli eventi da ricevere (Container Updates, BL Updates, etc.)
    `;
    showStatus(message, 'info', 10000); // Display for 10 seconds
};


// Initialize global access to userSettingsService once the module is loaded.
// This ensures that other parts of the application can interact with it.
window.addEventListener('load', async () => {
    try {
        // Only expose if it's not already, and if the import was successful.
        if (!window.userSettingsService && userSettingsService) {
            window.userSettingsService = userSettingsService;
            console.log('[Settings] userSettingsService exposed globally');
        }
    } catch (error) {
        console.warn('[Settings] userSettingsService module not available or failed to expose:', error);
    }
});

console.log('[Settings] Module loaded successfully with Supabase integration');