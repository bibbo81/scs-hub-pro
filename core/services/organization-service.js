import { supabase, initializeSupabase } from '/core/services/supabase-client.js';

class OrganizationService {
    constructor() {
        this.currentOrg = null;
        this.userOrgs = [];
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        await initializeSupabase();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No authenticated user');
            
            // Get user's organizations
            const { data: memberships } = await supabase
                .from('organization_members')
                .select(`
                    organization_id,
                    role,
                    organizations (
                        id,
                        name,
                        slug,
                        settings
                    )
                `)
                .eq('user_id', user.id);
            
            if (memberships && memberships.length > 0) {
                this.userOrgs = memberships;
                
                // Get saved preference or use first org
                const savedOrgId = localStorage.getItem('currentOrganizationId');
                const savedOrg = memberships.find(m => m.organization_id === savedOrgId);
                
                this.currentOrg = savedOrg || memberships[0];
                this.savePreference();
                
                console.log('[OrganizationService] Initialized with org:', this.currentOrg.organizations.name);
            } else {
                console.warn('[OrganizationService] User has no organizations');
            }
            
            this.initialized = true;
            
        } catch (error) {
            console.error('[OrganizationService] Init error:', error);
            // Per development, usa mock
            this.currentOrg = {
                organization_id: 'dev-org',
                role: 'owner',
                organizations: {
                    id: 'dev-org',
                    name: 'Development Org',
                    slug: 'dev'
                }
            };
        }
    }

    getCurrentOrgId() {
        return this.currentOrg?.organization_id;
    }

    getCurrentOrg() {
        return this.currentOrg;
    }

    getUserOrgs() {
        return this.userOrgs;
    }

    async switchOrg(orgId) {
        const org = this.userOrgs.find(m => m.organization_id === orgId);
        if (!org) throw new Error('Organization not found');
        
        this.currentOrg = org;
        this.savePreference();
        
        // Emit event
        window.dispatchEvent(new CustomEvent('organizationChanged', {
            detail: { organization: org }
        }));
        
        // Reload to refresh data
        window.location.reload();
    }

    savePreference() {
        if (this.currentOrg) {
            localStorage.setItem('currentOrganizationId', this.currentOrg.organization_id);
        }
    }

    hasPermission(requiredRole) {
        if (!this.currentOrg) return false;
        
        const roleHierarchy = {
            'owner': 3,
            'admin': 2,
            'member': 1,
            'viewer': 0
        };
        
        const userLevel = roleHierarchy[this.currentOrg.role] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;
        
        return userLevel >= requiredLevel;
    }
}

// Singleton
export const organizationService = new OrganizationService();

export const getActiveOrganizationId = () => organizationService.getCurrentOrgId();

export function ensureOrganizationSelected() {
    const id = typeof getActiveOrganizationId === 'function'
        ? getActiveOrganizationId()
        : window.activeOrganizationId || null;
    if (!id) {
        alert("\u26A0\uFE0F Nessuna organizzazione selezionata! Selezionala dal menu.");
        return false;
    }
    return true;
}

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => organizationService.init(), 1000);
    });
} else {
    setTimeout(() => organizationService.init(), 1000);
}

export default organizationService;
