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
                            <label class="sol-form-label" for="shipsgoKey">
                                ShipsGo API Key
                                <a href="https://shipsgo.com" target="_blank" class="text-sm text-muted ml-2">
                                    <i class="fas fa-external-link-alt"></i> Ottieni API Key
                                </a>
                            </label>
                            <div class="input-group">
                                <input 
                                    type="password" 
                                    id="shipsgoKey" 
                                    class="sol-form-input" 
                                    placeholder="Inserisci ShipsGo API Key"
                                    value="${keys.shipsgo || ''}"
                                >
                                <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="toggleApiKeyVisibility('shipsgoKey')">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="sol-form-group">
                            <label class="sol-form-label" for="project44Key">
                                Project44 API Key
                                <a href="https://project44.com" target="_blank" class="text-sm text-muted ml-2">
                                    <i class="fas fa-external-link-alt"></i> Ottieni API Key
                                </a>
                            </label>
                            <div class="input-group">
                                <input 
                                    type="password" 
                                    id="project44Key" 
                                    class="sol-form-input" 
                                    placeholder="Inserisci Project44 API Key"
                                    value="${keys.project44 || ''}"
                                >
                                <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="toggleApiKeyVisibility('project44Key')">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="alert alert-info mt-3">
                            <i class="fas fa-info-circle"></i>
                            <small>Le API key sono criptate e salvate in modo sicuro nel database.</small>
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
        const shipsgoKey = document.getElementById('shipsgoKey')?.value;
        const project44Key = document.getElementById('project44Key')?.value;
        
        try {
            // Salva ShipsGo key
            if (shipsgoKey) {
                await userSettingsService.saveApiKey('shipsgo', shipsgoKey);
            }
            
            // Salva Project44 key
            if (project44Key) {
                await userSettingsService.saveApiKey('project44', project44Key);
            }
            
            notificationSystem.success('API Keys salvate con successo!', {
                subtitle: 'Le chiavi sono ora sincronizzate con il tuo account'
            });
            
            // Ricarica la pagina per applicare le nuove chiavi
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } catch (error) {
            console.error('Error saving API keys:', error);
            notificationSystem.error('Errore nel salvataggio delle API Keys');
        }
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