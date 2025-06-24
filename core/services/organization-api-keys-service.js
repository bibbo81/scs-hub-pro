// core/services/organization-api-keys-service.js
import { supabase, requireAuth } from './supabase-client.js';
import userSettingsService from './user-settings-service.js';

class OrganizationApiKeysService {
    constructor() {
        this.cache = new Map();
        this.currentOrg = null;
        this.userRole = null;
    }

    // Ottieni l'organizzazione corrente dell'utente
    async getCurrentOrganization() {
        if (this.currentOrg) return this.currentOrg;

        try {
            const user = await requireAuth();
            
            const { data, error } = await supabase
                .from('organization_members')
                .select(`
                    organization_id,
                    role,
                    organizations (
                        id,
                        name
                    )
                `)
                .eq('user_id', user.id)
                .single();

            if (error) throw error;

            this.currentOrg = data.organizations;
            this.userRole = data.role;
            
            return this.currentOrg;
        } catch (error) {
            console.log('No organization found for user:', error);
            return null;
        }
    }

    // Verifica se l'utente è admin
    async isAdmin() {
        await this.getCurrentOrganization();
        return this.userRole === 'admin';
    }

    // Salva API key aziendale (solo admin)
    async saveOrganizationApiKey(provider, apiKey) {
        try {
            if (!await this.isAdmin()) {
                throw new Error('Solo gli amministratori possono modificare le API keys aziendali');
            }

            const org = await this.getCurrentOrganization();
            if (!org) throw new Error('Nessuna organizzazione trovata');

            const user = await requireAuth();

            // Cripta la API key
            const encryptedKey = btoa(apiKey);

            // Upsert (insert o update)
            const { data, error } = await supabase
                .from('organization_api_keys')
                .upsert({
                    organization_id: org.id,
                    provider: provider,
                    api_key: encryptedKey,
                    created_by: user.id,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'organization_id,provider'
                })
                .select()
                .single();

            if (error) throw error;

            // Invalida cache
            this.cache.delete(`${org.id}_${provider}`);
            
            console.log(`✅ API key aziendale per ${provider} salvata`);
            
            // Notifica altri utenti dell'organizzazione
            await this.notifyApiKeyUpdate(provider);
            
            return true;

        } catch (error) {
            console.error('Errore salvataggio API key aziendale:', error);
            throw error;
        }
    }

    // Ottieni API key (prima aziendale, poi personale)
    async getApiKey(provider) {
        try {
            // 1. Prima cerca API key aziendale
            const orgKey = await this.getOrganizationApiKey(provider);
            if (orgKey) {
                console.log(`📢 Usando API key aziendale per ${provider}`);
                return orgKey;
            }

            // 2. Se non trova, usa quella personale
            console.log(`👤 Usando API key personale per ${provider}`);
            return await userSettingsService.getApiKey(provider);

        } catch (error) {
            console.error('Errore recupero API key:', error);
            // Fallback a personale
            return await userSettingsService.getApiKey(provider);
        }
    }

    // Ottieni solo API key aziendale
    async getOrganizationApiKey(provider) {
        try {
            const org = await this.getCurrentOrganization();
            if (!org) return null;

            // Check cache
            const cacheKey = `${org.id}_${provider}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            // Fetch from database
            const { data, error } = await supabase
                .from('organization_api_keys')
                .select('api_key, is_active')
                .eq('organization_id', org.id)
                .eq('provider', provider)
                .eq('is_active', true)
                .single();

            if (error || !data) return null;

            // Decripta
            const decryptedKey = atob(data.api_key);
            
            // Salva in cache
            this.cache.set(cacheKey, decryptedKey);
            
            return decryptedKey;

        } catch (error) {
            console.error('Errore recupero API key aziendale:', error);
            return null;
        }
    }

    // Ottieni tutte le API keys (aziendali + personali)
    async getAllApiKeys() {
        const keys = {};
        const providers = ['shipsgo_v1', 'shipsgo_v2'];

        for (const provider of providers) {
            const key = await this.getApiKey(provider);
            if (key) {
                keys[provider] = {
                    value: key,
                    source: await this.getKeySource(provider)
                };
            }
        }

        return keys;
    }

    // Determina origine della key
    async getKeySource(provider) {
        const orgKey = await this.getOrganizationApiKey(provider);
        return orgKey ? 'organization' : 'personal';
    }

    // Rimuovi API key aziendale (solo admin)
    async removeOrganizationApiKey(provider) {
        try {
            if (!await this.isAdmin()) {
                throw new Error('Solo gli amministratori possono rimuovere le API keys aziendali');
            }

            const org = await this.getCurrentOrganization();
            if (!org) throw new Error('Nessuna organizzazione trovata');

            const { error } = await supabase
                .from('organization_api_keys')
                .update({ is_active: false })
                .eq('organization_id', org.id)
                .eq('provider', provider);

            if (error) throw error;

            // Invalida cache
            this.cache.delete(`${org.id}_${provider}`);
            
            console.log(`✅ API key aziendale per ${provider} rimossa`);
            
            // Notifica altri utenti
            await this.notifyApiKeyUpdate(provider);
            
            return true;

        } catch (error) {
            console.error('Errore rimozione API key aziendale:', error);
            return false;
        }
    }

    // Notifica aggiornamenti API key agli altri utenti
    async notifyApiKeyUpdate(provider) {
        try {
            const org = await this.getCurrentOrganization();
            if (!org) return;

            // Usa Supabase Realtime per notificare
            await supabase
                .channel(`org-${org.id}-api-keys`)
                .send({
                    type: 'broadcast',
                    event: 'api-key-updated',
                    payload: {
                        provider: provider,
                        timestamp: new Date().toISOString()
                    }
                });

        } catch (error) {
            console.error('Errore notifica:', error);
        }
    }

    // Ascolta aggiornamenti API keys aziendali
    subscribeToApiKeyUpdates(callback) {
        this.getCurrentOrganization().then(org => {
            if (!org) return;

            supabase
                .channel(`org-${org.id}-api-keys`)
                .on('broadcast', { event: 'api-key-updated' }, (payload) => {
                    console.log('📢 API key aziendale aggiornata:', payload);
                    
                    // Invalida cache
                    const provider = payload.payload.provider;
                    this.cache.delete(`${org.id}_${provider}`);
                    
                    // Chiama callback
                    if (callback) callback(payload.payload);
                })
                .subscribe();
        });
    }

    // Info dashboard per admin
    async getOrganizationApiKeysInfo() {
        try {
            const org = await this.getCurrentOrganization();
            if (!org) return { hasOrganization: false };

            const isAdmin = await this.isAdmin();

            // Info base per tutti
            const info = {
                hasOrganization: true,
                organizationName: org.name,
                isAdmin: isAdmin,
                apiKeys: {}
            };

            // Dettagli API keys
            const providers = ['shipsgo_v1', 'shipsgo_v2'];
            for (const provider of providers) {
                const hasOrgKey = !!(await this.getOrganizationApiKey(provider));
                const hasPersonalKey = !!(await userSettingsService.getApiKey(provider));
                
                info.apiKeys[provider] = {
                    hasOrganizationKey: hasOrgKey,
                    hasPersonalKey: hasPersonalKey,
                    activeSource: hasOrgKey ? 'organization' : (hasPersonalKey ? 'personal' : 'none')
                };
            }

            // Se admin, aggiungi info su chi ha configurato
            if (isAdmin) {
                const { data } = await supabase
                    .from('organization_api_keys')
                    .select(`
                        provider,
                        created_at,
                        updated_at,
                        created_by,
                        auth.users!created_by (
                            email
                        )
                    `)
                    .eq('organization_id', org.id)
                    .eq('is_active', true);

                if (data) {
                    info.configuredKeys = data.map(key => ({
                        provider: key.provider,
                        configuredBy: key.users?.email || 'Unknown',
                        configuredAt: key.created_at,
                        lastUpdated: key.updated_at
                    }));
                }
            }

            return info;

        } catch (error) {
            console.error('Errore info API keys:', error);
            return { hasOrganization: false, error: error.message };
        }
    }

    // Crea organizzazione demo (per test)
    async createDemoOrganization(name = 'Demo Organization') {
        try {
            const user = await requireAuth();

            // Crea organizzazione
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert({ name })
                .select()
                .single();

            if (orgError) throw orgError;

            // Aggiungi utente come admin
            const { error: memberError } = await supabase
                .from('organization_members')
                .insert({
                    organization_id: org.id,
                    user_id: user.id,
                    role: 'admin'
                });

            if (memberError) throw memberError;

            console.log('✅ Organizzazione demo creata:', org);
            
            // Reset cache
            this.currentOrg = null;
            this.userRole = null;
            
            return org;

        } catch (error) {
            console.error('Errore creazione org demo:', error);
            throw error;
        }
    }
}

// Export singleton
const orgApiKeysService = new OrganizationApiKeysService();

// Auto-subscribe agli aggiornamenti
orgApiKeysService.subscribeToApiKeyUpdates((update) => {
    console.log('🔄 API key aziendale aggiornata:', update);
    
    // Dispatch evento per aggiornare UI
    window.dispatchEvent(new CustomEvent('orgApiKeyUpdated', { 
        detail: update 
    }));
});

export default orgApiKeysService;

// Esponi globalmente per debug
window.orgApiKeysService = orgApiKeysService;