// Script di test per verificare l'inizializzazione
window.debugInitTest = async function() {
    console.log('=== INITIALIZATION DEBUG TEST ===');
    
    // Test 1: Verifica Supabase
    console.log('1. Supabase:', window.supabase ? '✅' : '❌');
    
    // Test 2: Verifica Auth
    console.log('2. Auth Ready:', window.supabaseReady ? '✅' : '❌');
    
    // Test 3: Verifica TrackingService
    console.log('3. TrackingService:', window.trackingService ? '✅' : '❌');
    console.log('   - Initialized:', window.trackingService?.initialized ? '✅' : '❌');
    console.log('   - Has API Keys:', window.trackingService?.hasApiKeys() ? '✅' : '❌');
    
    // Test 4: Verifica ApiClient
    console.log('4. ApiClient:', window.apiClient ? '✅' : '❌');
    
    // Test 5: Test chiamata API
    try {
        if (window.trackingService?.hasApiKeys) {
            const result = window.trackingService.hasApiKeys();
            console.log('5. API Keys Test:', result ? '✅' : '❌');
        }
    } catch (error) {
        console.log('5. API Keys Test: ❌', error.message);
    }
    
    console.log('=== END DEBUG TEST ===');
};

// Auto-run dopo 3 secondi
setTimeout(() => {
    if (window.debugInitTest) window.debugInitTest();
}, 3000);