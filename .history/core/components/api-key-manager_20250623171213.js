// core/components/api-key-manager.js
import userSettingsService from '../services/user-settings-service.js';
import notificationSystem from '../notification-system.js';

export class ApiKeyManager {
    async showApiKeyModal() {
        // Carica le chiavi correnti
        const keys = await userSettingsService.getAllApiKeys();
        
        const modal = window.ModalSystem.show({
            title: '🔑 Gestione API Keys',
            size: 'md',
            content: `
                <div class="api-key-manager">
                    <p class="text-muted mb-3">
                        Le API key sono necessarie per il tracking in tempo reale delle spedizioni.
                        Sono salvate in modo sicuro nel tuo account.
                    </p>
                    
                    <div class="api-key-form">
                        <div class="sol-form-group">
                            <label class="sol-form-label" for="shipsgoV1Key">
                                ShipsGo API Key (v1.2)
                                <a href="https://shipsgo.com" target="_blank" class="text-sm text-muted ml-2">
                                    <i class="fas fa-external-link-alt"></i> Ottieni API Key
                                </a>
                            </label>
                            <div class="input-group">
                                <input 
                                    type="password" 
                                    id="shipsgoV1Key" 
                                    class="sol-form-input" 
                                    placeholder="Inserisci ShipsGo v1.2 API Key"
                                    value="${keys.shipsgo_v1 || ''}"
                                >
                                <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="toggleApiKeyVisibility('shipsgoV1Key')">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <small class="sol-form-hint">Per tracking Container e Bill of Lading</small>
                        </div>
                        
                        <div class="sol-form-group">
                            <label class="sol-form-label" for="shipsgoV2Token">
                                ShipsGo User Token (v2.0)
                                <a href="https://shipsgo.com" target="_blank" class="text-sm text-muted ml-2">
                                    <i class="fas fa-external-link-alt"></i> Ottieni User Token
                                </a>
                            </label>
                            <div class="input-group">
                                <input 
                                    type="password" 
                                    id="shipsgoV2Token" 
                                    class="sol-form-input" 
                                    placeholder="Inserisci ShipsGo v2.0 User Token"
                                    value="${keys.shipsgo_v2 || ''}"
                                >
                                <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="toggleApiKeyVisibility('shipsgoV2Token')">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <small class="sol-form-hint">Per tracking Air Waybill (AWB)</small>
                        </div>
                        
                        <div class="alert alert-info mt-3">
                            <i class="fas fa-info-circle"></i>
                            <small>
                                <strong>Nota:</strong> Le API key sono criptate e salvate in modo sicuro nel database.
                                <br>• v1.2: Per container marittimi e documenti di trasporto
                                <br>• v2.0: Per spedizioni aeree e tracking avanzato
                            </small>
                        </div>
                    </div>
                </div>
            `,
            buttons: [
                {
                    text: 'Annulla',
                    class: 'sol-btn-glass',
                    onclick: () => true
                },
                {
                    text: 'Salva API Keys',
                    class: 'sol-btn-primary',
                    onclick: async () => {
                        await this.saveApiKeys();
                        return true;
                    }
                }
            ]
        });
    }

    async saveApiKeys() {
        const shipsgoV1Key = document.getElementById('shipsgoV1Key')?.value;
        const shipsgoV2Token = document.getElementById('shipsgoV2Token')?.value;
        
        try {
            let saved = false;
            
            // Salva ShipsGo v1.2 key
            if (shipsgoV1Key !== undefined) {
                await userSettingsService.saveApiKey('shipsgo_v1', shipsgoV1Key);
                saved = true;
            }
            
            // Salva ShipsGo v2.0 token
            if (shipsgoV2Token !== undefined) {
                await userSettingsService.saveApiKey('shipsgo_v2', shipsgoV2Token);
                saved = true;
            }
            
            if (saved) {
                notificationSystem.success('API Keys salvate con successo!', {
                    subtitle: 'Le chiavi sono ora sincronizzate con il tuo account'
                });
                
                // Ricarica la pagina per applicare le nuove chiavi
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                notificationSystem.warning('Nessuna modifica da salvare');
            }
            
        } catch (error) {
            console.error('Error saving API keys:', error);
            notificationSystem.error('Errore nel salvataggio delle API Keys');
        }
    }
    
    // Metodo helper per verificare quali API sono configurate
    async checkApiStatus() {
        const keys = await userSettingsService.getAllApiKeys();
        
        return {
            v1_configured: !!(keys.shipsgo_v1 && keys.shipsgo_v1.length > 0),
            v2_configured: !!(keys.shipsgo_v2 && keys.shipsgo_v2.length > 0),
            any_configured: !!(keys.shipsgo_v1 || keys.shipsgo_v2)
        };
    }
}

// Helper function per toggle visibilità
window.toggleApiKeyVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};

// Export singleton
const apiKeyManager = new ApiKeyManager();
export default apiKeyManager;

// Esponi globalmente
window.apiKeyManager = apiKeyManager;