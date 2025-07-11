// core/services/organization-service.js
import { getSupabase } from '/core/services/supabase-client.js';

// Cache organization ID to avoid repeated queries + miglioramenti
let organizationCache = null;
let isLoading = false;

export async function getMyOrganizationId(supabaseClient = null, retries = 3) {
    // Usa cache se disponibile
    if (organizationCache) {
        return organizationCache;
    }

    // Evita chiamate multiple simultanee
    if (isLoading) {
        return new Promise((resolve, reject) => {
            const checkCache = () => {
                if (organizationCache) {
                    resolve(organizationCache);
                } else if (!isLoading) {
                    reject(new Error('Organization loading failed'));
                } else {
                    setTimeout(checkCache, 100);
                }
            };
            checkCache();
        });
    }

    isLoading = true;

    try {
        // Get Supabase client se non fornito
        let supabase = supabaseClient;
        if (!supabase) {
            try {
                supabase = getSupabase();
            } catch (error) {
                console.warn('Supabase client not initialized yet:', error.message);
                throw new Error('Supabase client not initialized');
            }
        }

        if (!supabase) {
            console.warn('Supabase client not available, organization ID will be null');
            throw new Error('Supabase client not available');
        }

        // Verifica sessione utente
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            throw new Error('No valid session found');
        }

        // Ottieni dati utente con organizzazione
        const { data: userData, error: userError } = await supabase
            .from('user_organizations')
            .select(`
                organization_id,
                organizations!inner(
                    id,
                    name,
                    status
                )
            `)
            .eq('user_id', session.user.id)
            .eq('organizations.status', 'active')
            .single();

        if (userError) {
            if (retries > 0) {
                console.warn(`[OrganizationService] Retry attempt ${4 - retries}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return getMyOrganizationId(supabase, retries - 1);
            }
            throw new Error(`Organization query failed: ${userError.message}`);
        }

        if (!userData?.organization_id) {
            throw new Error('No organization found for user');
        }

        // Cache il risultato
        organizationCache = userData.organization_id;
        console.log(`[OrganizationService] Organization cached: ${organizationCache}`);

        // Ottieni dettagli organizzazione per logging (opzionale)
        try {
            const { data: org } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', organizationCache)
                .single();

            if (org) {
                console.log('Organization name:', org.name);
            }
        } catch (e) {
            // Non-critical error
        }

        return organizationCache;

    } catch (error) {
        console.error('[OrganizationService] Error:', error);
        throw error;
    } finally {
        isLoading = false;
    }
}

// Funzione per pulire la cache (utile per logout)
export function clearOrganizationCache() {
    organizationCache = null;
    isLoading = false;
    console.log('Organization cache cleared');
}

// (OPZIONALE) Clear cache su evento di logout globale lato client
if (typeof window !== 'undefined') {
    window.getMyOrganizationId = getMyOrganizationId;
    window.clearOrganizationCache = clearOrganizationCache;

    window.addEventListener('auth-state-changed', (event) => {
        if (event.detail === 'SIGNED_OUT') {
            clearOrganizationCache();
        }
    });
}

export default { getMyOrganizationId };
