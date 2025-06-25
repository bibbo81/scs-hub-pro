// cleanup-production.js
// Script per pulire tutti i residui di mock data prima del deployment

(function cleanupProduction() {
    console.log('🧹 Starting production cleanup...');
    
    // Lista di chiavi localStorage da rimuovere
    const keysToRemove = [
        'mockTrackings',
        'FORCE_MOCK_API',
        'mockMode',
        'useMockData',
        'testMode',
        'demoMode'
    ];
    
    // Rimuovi chiavi specifiche
    keysToRemove.forEach(key => {
        if (localStorage.getItem(key) !== null) {
            localStorage.removeItem(key);
            console.log(`✅ Removed: ${key}`);
        }
    });
    
    // Verifica e pulisci configurazioni
    const trackingConfig = localStorage.getItem('trackingServiceConfig');
    if (trackingConfig) {
        try {
            const config = JSON.parse(trackingConfig);
            if (config.mockMode || config.forceMock) {
                config.mockMode = false;
                config.forceMock = false;
                localStorage.setItem('trackingServiceConfig', JSON.stringify(config));
                console.log('✅ Fixed tracking service config');
            }
        } catch (e) {
            console.error('Error parsing tracking config:', e);
        }
    }
    
    // Verifica window globals
    if (typeof window !== 'undefined') {
        window.FORCE_MOCK_API = false;
        window.USE_MOCK_DATA = false;
        console.log('✅ Window globals cleaned');
    }
    
    console.log('🎉 Production cleanup completed!');
    
    // Report finale
    console.log('\n📊 Final check:');
    console.log('- FORCE_MOCK_API:', window.FORCE_MOCK_API || 'undefined');
    console.log('- mockTrackings in localStorage:', localStorage.getItem('mockTrackings') ? 'PRESENT ⚠️' : 'CLEAN ✅');
    console.log('- Mock mode in config:', (() => {
        try {
            const cfg = JSON.parse(localStorage.getItem('trackingServiceConfig') || '{}');
            return cfg.mockMode ? 'ENABLED ⚠️' : 'DISABLED ✅';
        } catch {
            return 'NO CONFIG ✅';
        }
    })());
})();

// Esporta per uso manuale
window.cleanupProduction = cleanupProduction;