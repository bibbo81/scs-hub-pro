// test-tracking-service.js - Script per testare il nuovo tracking service
// Da eseguire nella console browser per verificare l'integrazione

console.log('🧪 TESTING NUOVO TRACKING SERVICE');

// Test 1: Verifica caricamento modulo
async function testServiceLoad() {
    console.log('\n📦 Test 1: Caricamento Tracking Service...');
    
    try {
        // Verifica se il servizio è disponibile
        if (window.trackingService) {
            console.log('✅ Tracking Service disponibile:', typeof window.trackingService);
            
            // Verifica metodi principali
            const methods = ['initialize', 'track', 'refresh', 'setMockMode', 'hasApiKeys'];
            methods.forEach(method => {
                if (typeof window.trackingService[method] === 'function') {
                    console.log(`✅ Metodo ${method}: disponibile`);
                } else {
                    console.log(`❌ Metodo ${method}: mancante`);
                }
            });
            
            return true;
        } else {
            console.log('❌ Tracking Service non disponibile');
            return false;
        }
    } catch (error) {
        console.error('❌ Errore caricamento:', error);
        return false;
    }
}

// Test 2: Inizializzazione
async function testServiceInit() {
    console.log('\n🔧 Test 2: Inizializzazione Service...');
    
    try {
        const result = await window.trackingService.initialize();
        console.log('✅ Inizializzazione completata:', result);
        
        // Verifica stato mock
        console.log('📊 Modalità mock:', window.trackingService.mockMode);
        console.log('🔑 API Keys configurate:', window.trackingService.hasApiKeys());
        
        return result;
    } catch (error) {
        console.error('❌ Errore inizializzazione:', error);
        return false;
    }
}

// Test 3: Auto-detection
function testAutoDetection() {
    console.log('\n🔍 Test 3: Auto-detection Tracking Types...');
    
    const testCases = [
        { number: 'MSKU1234567', expected: 'container' },
        { number: 'MSCU7654321', expected: 'container' },
        { number: '176-12345678', expected: 'awb' },
        { number: 'COSU6789012', expected: 'container' },
        { number: '235-87654321', expected: 'awb' },
        { number: 'DHL1234567890', expected: 'parcel' }
    ];
    
    testCases.forEach(test => {
        const detected = window.trackingService.detectTrackingType(test.number);
        const carrierDetected = window.trackingService.detectCarrier(test.number);
        
        if (detected === test.expected) {
            console.log(`✅ ${test.number}: ${detected} (carrier: ${carrierDetected})`);
        } else {
            console.log(`❌ ${test.number}: expected ${test.expected}, got ${detected}`);
        }
    });
}

// Test 4: Mock Tracking
async function testMockTracking() {
    console.log('\n📋 Test 4: Mock Tracking...');
    
    const testTrackings = [
        { number: 'MSKU1234567', type: 'container' },
        { number: '176-12345678', type: 'awb' },
        { number: 'DHL1234567890', type: 'parcel' }
    ];
    
    for (const test of testTrackings) {
        try {
            console.log(`\n🔄 Testing ${test.number} (${test.type})...`);
            
            const result = await window.trackingService.track(test.number, test.type);
            
            if (result && result.success) {
                console.log('✅ Tracking riuscito:');
                console.log(`   - Status: ${result.status}`);
                console.log(`   - Carrier: ${result.carrier?.name || 'N/A'}`);
                console.log(`   - Eventi: ${result.events?.length || 0}`);
                console.log(`   - Mock: ${result.mockData ? 'Sì' : 'No'}`);
            } else {
                console.log('❌ Tracking fallito:', result);
            }
        } catch (error) {
            console.error('❌ Errore tracking:', error);
        }
        
        // Piccolo delay tra test
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// Test 5: Status Mapping
function testStatusMapping() {
    console.log('\n🎯 Test 5: Status Mapping...');
    
    const statusTests = [
        'Sailing',
        'Discharged', 
        'Consegnata.',
        'On FedEx vehicle for delivery',
        'La spedizione è in transito',
        'RCS',
        'DEP',
        'DLV'
    ];
    
    statusTests.forEach(status => {
        const normalized = window.trackingService.normalizeStatus(status);
        console.log(`${status} → ${normalized}`);
    });
}

// Test 6: API Configuration
function testApiConfig() {
    console.log('\n⚙️ Test 6: Configurazione API...');
    
    // Controlla localStorage per API settings
    const userProfile = localStorage.getItem('userProfile');
    const appSettings = localStorage.getItem('appSettings');
    
    console.log('👤 User Profile:', userProfile ? 'Presente' : 'Assente');
    console.log('⚙️ App Settings:', appSettings ? 'Presente' : 'Assente');
    
    if (userProfile) {
        try {
            const profile = JSON.parse(userProfile);
            console.log('   - API Settings:', profile.api_settings ? 'Configurate' : 'Non configurate');
        } catch (e) {
            console.log('   - Errore parsing profile');
        }
    }
    
    // Test connessione se disponibile
    if (window.trackingService.hasApiKeys()) {
        console.log('🔑 API Keys trovate - Test connessione disponibile');
        
        // Non eseguiamo test connessione automaticamente per evitare rate limiting
        console.log('   💡 Puoi testare manualmente con: trackingService.testConnection()');
    } else {
        console.log('🔑 Nessuna API Key configurata - modalità mock attiva');
    }
}

// Test 7: Integration con UI esistente
function testUIIntegration() {
    console.log('\n🖥️ Test 7: Integrazione UI...');
    
    // Verifica se le funzioni del tracking esistente sono disponibili
    const uiFunctions = [
        'showAddTrackingForm',
        'handleAddTracking', 
        'refreshAllTrackings',
        'loadTrackings'
    ];
    
    uiFunctions.forEach(func => {
        if (typeof window[func] === 'function') {
            console.log(`✅ UI Function ${func}: disponibile`);
        } else {
            console.log(`⚠️ UI Function ${func}: non disponibile`);
        }
    });
    
    // Verifica elementi DOM
    const elements = [
        'trackingTableContainer',
        'addTrackingBtn', 
        'refreshAllBtn'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ Elemento ${id}: presente`);
        } else {
            console.log(`⚠️ Elemento ${id}: mancante`);
        }
    });
}

// Esegui tutti i test
async function runAllTests() {
    console.log('🚀 AVVIO TEST SUITE COMPLETA\n');
    console.log('=' .repeat(50));
    
    try {
        // Test sequenziali
        const serviceLoaded = await testServiceLoad();
        if (!serviceLoaded) {
            console.log('\n❌ Service non caricato - interrompo test');
            return;
        }
        
        const initialized = await testServiceInit();
        if (!initialized) {
            console.log('\n❌ Inizializzazione fallita - continuo con test limitati');
        }
        
        testAutoDetection();
        await testMockTracking();
        testStatusMapping();
        testApiConfig();
        testUIIntegration();
        
        console.log('\n' + '=' .repeat(50));
        console.log('✅ TEST SUITE COMPLETATA');
        console.log('\n💡 PROSSIMI PASSI:');
        console.log('1. Se tutti i test passano → Procedi con integrazione');
        console.log('2. Se ci sono errori → Fix e riprova');
        console.log('3. Configura API keys nelle impostazioni');
        console.log('4. Testa con dati reali ShipsGo');
        
    } catch (error) {
        console.error('\n❌ ERRORE CRITICO NEI TEST:', error);
    }
}

// Helper: Test singolo tracking specifico
async function testSingleTracking(trackingNumber, trackingType = 'auto') {
    console.log(`\n🎯 Test Singolo: ${trackingNumber}`);
    
    try {
        const result = await window.trackingService.track(trackingNumber, trackingType);
        console.log('Risultato completo:', result);
        return result;
    } catch (error) {
        console.error('Errore:', error);
        return null;
    }
}

// Helper: Test connessione API (se configurate)
async function testApiConnections() {
    console.log('\n🌐 Test Connessioni API...');
    
    if (!window.trackingService.hasApiKeys()) {
        console.log('⚠️ Nessuna API configurata');
        return;
    }
    
    try {
        const results = await window.trackingService.testConnection();
        console.log('Risultati connessione:', results);
        return results;
    } catch (error) {
        console.error('Errore test connessione:', error);
        return null;
    }
}

// Esponi funzioni per uso manuale
window.testTrackingService = {
    runAll: runAllTests,
    single: testSingleTracking,
    apiConnections: testApiConnections,
    autoDetection: testAutoDetection,
    statusMapping: testStatusMapping
};

// Auto-run se richiesto
if (window.location.search.includes('autotest=true')) {
    runAllTests();
} else {
    console.log('\n💡 Per eseguire i test:');
    console.log('• Tutti i test: testTrackingService.runAll()');
    console.log('• Test singolo: testTrackingService.single("MSKU1234567")');
    console.log('• Test API: testTrackingService.apiConnections()');
}