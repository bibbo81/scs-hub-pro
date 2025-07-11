// core/services/organization-service.js - Fixed to handle initialization properly
import { getSupabase } from '/core/services/supabase-client.js';

// Cache organization ID to avoid repeated queries
let cachedOrgId = null;

export async function getMyOrganizationId(supabaseClient = null) {
    try {
        // Return cached value if available
        if (cachedOrgId) {
            return cachedOrgId;
        }
        
        // Get Supabase client
        let supabase = supabaseClient;
        if (!supabase) {
            try {
                supabase = getSupabase();
            } catch (error) {
                console.warn('Supabase client not initialized yet:', error.message);
                return null;
            }
        }
        
        if (!supabase) {
            console.warn('Supabase client not available, organization ID will be null');
            return null;
        }
        
        // Check if we have a valid session first
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            console.warn('No valid session available for organization lookup');
            return null;
        }
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
            console.error('Error getting user:', userError);
            return null;
        }
        
        if (!user) {
            console.warn('No authenticated user');
            return null;
        }
        
        console.log('Current user:', user.email);
        
        // Get organization membership
        const { data: memberships, error: memberError } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .limit(1);
            
        if (memberError) {
            console.error('Error fetching organization membership:', memberError);
            return null;
        }
        
        if (!memberships || memberships.length === 0) {
            console.warn('User has no organization membership');
            return null;
        }
        
        const orgId = memberships[0].organization_id;
        console.log('Found organization ID:', orgId);
        
        // Cache the result
        cachedOrgId = orgId;
        
        // Get organization details for logging
        try {
            const { data: org } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', orgId)
                .single();
            
            if (org) {
                console.log('Organization name:', org.name);
            }
        } catch (e) {
            // Non-critical error
        }
        
        return orgId;
        
    } catch (error) {
        console.error('Error in getMyOrganizationId:', error);
        return null;
    }
}

// Clear cache on auth state change
if (typeof window !== 'undefined') {
    window.getMyOrganizationId = getMyOrganizationId;
    window.clearOrganizationCache = () => {
        cachedOrgId = null;
        console.log('Organization cache cleared');
    };
    
    // Clear cache on logout
    window.addEventListener('auth-state-changed', (event) => {
        if (event.detail === 'SIGNED_OUT') {
            cachedOrgId = null;
        }
    });
}

export default { getMyOrganizationId };