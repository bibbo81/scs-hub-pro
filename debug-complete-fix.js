// Script di test completo
window.debugCompleteFix = async function() {
    console.log('=== DEBUG COMPLETE FIX ===');
    
    console.log('1. Supabase:', window.getSupabase ? '✅' : '❌');
    console.log('2. Session Ready:', window.supabaseReady ? '✅' : '❌');
    console.log('3. Current User:', window.currentUser?.email || 'Not found');
    
    // Test TrackingService
    console.log('4. TrackingService:');
    console.log('   - Exists:', window.trackingService ? '✅' : '❌');
    console.log('   - Has init:', typeof window.trackingService?.init === 'function' ? '✅' : '❌');
    console.log('   - Initialized:', window.trackingService?.initialized ? '✅' : '❌');
    
    if (window.trackingService?.hasApiKeys) {
        console.log('   - Has API Keys:', window.trackingService.hasApiKeys() ? '✅' : '❌');
    }
    
    // Test Organization
    try {
        const orgData = await window.supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', window.currentUser.id)
            .single();
        console.log('5. Organization Query:', orgData.error ? '❌' : '✅');
        console.log('   - Org ID:', orgData.data?.organization_id || 'Not found');
    } catch (error) {
        console.log('5. Organization Query: ❌', error.message);
    }
    
    console.log('=== END DEBUG ===');
};

// Auto-run dopo 5 secondi
setTimeout(() => {
    if (window.debugCompleteFix) window.debugCompleteFix();
}, 5000);