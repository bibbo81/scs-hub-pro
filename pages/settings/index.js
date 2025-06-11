// pages/settings/index.js
document.addEventListener('DOMContentLoaded', () => {
    // Initialize
    initializeNavigation();
    loadSettings();
    initializeForms();

    // Navigation
    function initializeNavigation() {
        const navLinks = document.querySelectorAll('.settings-sidebar a');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetSection = link.dataset.section;
                
                // Update active states
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Show target section
                document.querySelectorAll('.settings-section').forEach(section => {
                    section.classList.remove('active');
                });
                document.getElementById(targetSection).classList.add('active');
                
                // Update URL without reload
                history.pushState(null, '', `#${targetSection}`);
            });
        });

        // Handle direct URL access
        const hash = window.location.hash.slice(1);
        if (hash) {
            const link = document.querySelector(`[data-section="${hash}"]`);
            if (link) link.click();
        }
    }

    // Load saved settings
    async function loadSettings() {
        try {
            // Load ShipsGo settings specifically
            await loadShipsGoSettings();
            
            const settings = await apiClient.get('/api/settings');
            
            // Tracking preferences
            if (settings.tracking) {
                document.getElementById('auto-refresh').checked = settings.tracking.autoRefresh || false;
                document.getElementById('push-notifications').checked = settings.tracking.pushNotifications || false;
                document.getElementById('refresh-interval').value = settings.tracking.refreshInterval || '60';
                document.getElementById('retention-days').value = settings.tracking.retentionDays || '90';
            }

            // Notifications
            if (settings.notifications) {
                document.getElementById('email-summary').checked = settings.notifications.emailSummary || false;
                document.getElementById('delay-alerts').checked = settings.notifications.delayAlerts || false;
                document.getElementById('delivery-alerts').checked = settings.notifications.deliveryAlerts || false;
                document.getElementById('notification-email').value = settings.notifications.email || '';
            }

            // Import/Export
            if (settings.importExport) {
                document.getElementById('default-format').value = settings.importExport.defaultFormat || 'excel';
                document.getElementById('include-history').checked = settings.importExport.includeHistory || false;
                document.getElementById('auto-backup').checked = settings.importExport.autoBackup || false;
            }

            // Account
            if (settings.account) {
                document.getElementById('user-name').value = settings.account.name || '';
                document.getElementById('user-email').value = settings.account.email || '';
                document.getElementById('user-company').value = settings.account.company || '';
                document.getElementById('user-role').value = settings.account.role || '';
            }

        } catch (error) {
            console.error('Error loading settings:', error);
            // In development, use mock data
            loadMockSettings();
        }
    }

    // Load ShipsGo settings from profile
    async function loadShipsGoSettings() {
        console.log('Loading ShipsGo settings...');
        
        // Clear fields first
        document.getElementById('shipsgoV1ApiKey').value = '';
        document.getElementById('shipsgoV2Token').value = '';
        
        try {
            const user = window.auth?.getCurrentUser();
            if (!user?.id) {
                console.log('No user logged in');
                return;
            }
            
            const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
            if (!token) {
                console.log('No auth token found');
                return;
            }
            
            const response = await fetch(`/.netlify/functions/get-profile?id=${user.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const profileData = await response.json();
                console.log('Profile loaded successfully');
                
                if (profileData?.api_settings && typeof profileData.api_settings === 'object') {
                    // ShipsGo v1 key
                    if (profileData.api_settings.shipsgo_v1_key) {
                        try {
                            const decodedV1 = atob(profileData.api_settings.shipsgo_v1_key);
                            if (decodedV1 && decodedV1.length === 32 && /^[a-f0-9]+$/i.test(decodedV1)) {
                                document.getElementById('shipsgoV1ApiKey').value = decodedV1;
                            }
                        } catch (e) {
                            console.error('Invalid v1 key encoding');
                        }
                    }
                    
                    // ShipsGo v2 token
                    if (profileData.api_settings.shipsgo_v2_token) {
                        try {
                            const decodedV2 = atob(profileData.api_settings.shipsgo_v2_token);
                            if (decodedV2 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedV2)) {
                                document.getElementById('shipsgoV2Token').value = decodedV2;
                            }
                        } catch (e) {
                            console.error('Invalid v2 token encoding');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error loading ShipsGo settings:', error);
        }
    }

    // Save ShipsGo settings
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
            const user = window.auth?.getCurrentUser();
            if (!user) {
                showStatus('Devi essere autenticato', 'error');
                return;
            }
            
            const token = localStorage.getItem('sb-access-token') || sessionStorage.getItem('sb-access-token');
            
            const apiSettings = {};
            if (v1Key) apiSettings.shipsgo_v1_key = btoa(v1Key);
            if (v2Token) apiSettings.shipsgo_v2_token = btoa(v2Token);
            
            const response = await fetch('/.netlify/functions/update-profile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'update_api_settings',
                    data: {
                        api_settings: apiSettings
                    }
                })
            });
            
            if (response.ok) {
                showStatus('Configurazione API salvata con successo!', 'success');
                
                // Reload to verify
                setTimeout(() => {
                    loadShipsGoSettings();
                }, 1000);
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Errore salvataggio');
            }
        } catch (error) {
            console.error('Save error:', error);
            showStatus('Errore: ' + error.message, 'error');
        }
    }

    // Mock settings for development
    function loadMockSettings() {
        const mockUser = JSON.parse(localStorage.getItem('mockUser') || '{}');
        document.getElementById('user-email').value = mockUser.email || 'user@example.com';
        document.getElementById('user-name').value = mockUser.name || 'John Doe';
    }

    // Initialize forms
    function initializeForms() {
        // API Keys form - ShipsGo specific
        document.getElementById('api-keys-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveShipsGoSettings();
        });

        // Tracking form
        document.getElementById('tracking-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data = {
                autoRefresh: document.getElementById('auto-refresh').checked,
                pushNotifications: document.getElementById('push-notifications').checked,
                refreshInterval: document.getElementById('refresh-interval').value,
                retentionDays: document.getElementById('retention-days').value
            };

            await saveSettings('tracking', data);
        });

        // Notifications form
        document.getElementById('notifications-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data = {
                emailSummary: document.getElementById('email-summary').checked,
                delayAlerts: document.getElementById('delay-alerts').checked,
                deliveryAlerts: document.getElementById('delivery-alerts').checked,
                email: document.getElementById('notification-email').value
            };

            await saveSettings('notifications', data);
        });

        // Import/Export form
        document.getElementById('import-export-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data = {
                defaultFormat: document.getElementById('default-format').value,
                includeHistory: document.getElementById('include-history').checked,
                autoBackup: document.getElementById('auto-backup').checked
            };

            await saveSettings('importExport', data);
        });

        // Account form
        document.getElementById('account-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data = {
                name: document.getElementById('user-name').value,
                company: document.getElementById('user-company').value,
                role: document.getElementById('user-role').value
            };

            await saveSettings('account', data);
        });
    }

    // Save settings
    async function saveSettings(section, data) {
        const statusEl = document.getElementById('api-status');
        
        try {
            // Show loading state
            const activeSection = document.querySelector('.settings-section.active');
            const saveBtn = activeSection.querySelector('.btn-save');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';
            saveBtn.disabled = true;

            // Save to API
            await apiClient.put(`/api/settings/${section}`, data);

            // For development, save to localStorage
            const allSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            allSettings[section] = data;
            localStorage.setItem('appSettings', JSON.stringify(allSettings));

            // Show success message
            showStatus('Impostazioni salvate con successo', 'success');

            // Restore button
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }, 1000);

            // If API keys were saved, update the global config
            if (section === 'apiKeys') {
                window.apiKeys = data;
            }

        } catch (error) {
            console.error('Error saving settings:', error);
            showStatus('Errore nel salvataggio delle impostazioni', 'error');
            
            // Restore button
            const activeSection = document.querySelector('.settings-section.active');
            const saveBtn = activeSection.querySelector('.btn-save');
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva';
            saveBtn.disabled = false;
        }
    }

    // Show status message
    function showStatus(message, type, duration = 3000) {
        const statusEl = document.getElementById('api-status');
        statusEl.innerHTML = message;
        statusEl.className = `status-message ${type}`;
        statusEl.style.display = 'flex';

        // Update icon
        const icon = document.createElement('i');
        icon.className = type === 'success' ? 'fas fa-check-circle' : 
                       type === 'error' ? 'fas fa-exclamation-circle' :
                       type === 'warning' ? 'fas fa-exclamation-triangle' :
                       'fas fa-info-circle';
        statusEl.prepend(icon);

        // Auto hide
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, duration);
    }

    // Toggle API key visibility
    window.toggleApiKeyVisibility = function(inputId) {
        const input = document.getElementById(inputId);
        const button = input.nextElementSibling;
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
            const response = await fetch('/.netlify/functions/test-shipsgo-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    v1Key: v1Key,
                    v2Token: v2Token
                })
            });
            
            if (!response.ok) {
                throw new Error('Test fallito');
            }
            
            const results = await response.json();
            
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
            
            const hasSuccess = (results.v1?.success) || (results.v2?.success);
            const hasFailure = (v1Key && !results.v1?.success) || (v2Token && !results.v2?.success);
            
            if (hasSuccess && !hasFailure) {
                showStatus(message, 'success');
            } else if (hasFailure && !hasSuccess) {
                showStatus(message, 'error');
            } else {
                showStatus(message, 'warning');
            }
            
        } catch (error) {
            console.error('Test error:', error);
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
        });
    };

    // Show webhook instructions
    window.showWebhookInstructions = function() {
        showStatus(`
            <strong>Istruzioni configurazione webhook:</strong><br>
            1. Copia l'URL del webhook<br>
            2. Accedi a ShipsGo Dashboard<br>
            3. Vai su Settings → Webhooks<br>
            4. Incolla l'URL e attiva il webhook<br>
            5. Seleziona gli eventi da ricevere
        `, 'info', 8000);
    };

    // Reset API keys form
    window.resetApiKeysForm = function() {
        document.getElementById('api-keys-form').reset();
        // Reload original values
        loadSettings();
    };

    // Handle auto-refresh toggle
    document.getElementById('auto-refresh').addEventListener('change', (e) => {
        const intervalSelect = document.getElementById('refresh-interval');
        intervalSelect.disabled = !e.target.checked;
        if (!e.target.checked) {
            intervalSelect.style.opacity = '0.5';
        } else {
            intervalSelect.style.opacity = '1';
        }
    });

    // Handle email summary toggle
    document.getElementById('email-summary').addEventListener('change', (e) => {
        const emailInput = document.getElementById('notification-email');
        if (e.target.checked && !emailInput.value) {
            emailInput.focus();
            showStatus('Inserisci un indirizzo email per ricevere il riepilogo', 'error');
        }
    });

    // Load settings on startup
    let loadRetries = 0;
    const tryLoadSettings = setInterval(() => {
        loadRetries++;
        
        if (window.auth && window.auth.isAuthenticated()) {
            console.log('Auth ready, loading settings...');
            loadSettings();
            clearInterval(tryLoadSettings);
        } else if (loadRetries >= 20) {
            console.log('Auth timeout, trying to load settings anyway...');
            loadSettings();
            clearInterval(tryLoadSettings);
        }
    }, 500);
});