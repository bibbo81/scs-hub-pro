// core/supabase-init.js - Early initialization with event system
import { initializeSupabase, checkSession } from './services/supabase-client.js';

// Start initialization immediately
(async () => {
    try {
        console.log('🚀 Starting Supabase initialization from supabase-init.js...');
        await initializeSupabase();
        console.log('✅ Supabase initialized successfully from supabase-init.js');
        
        // Check session if not on login page
        if (!window.location.pathname.includes('login.html')) {
            console.log('🔐 Checking user session...');
            const session = await checkSession();
            
            if (!session) {
                console.warn('⚠️ No valid session found, redirecting to login...');
                window.location.href = '/login.html';
                return; // Don't emit ready event
            }
            
            console.log('✅ Valid session found for user:', session.user.email);
        }
        
        // Emit custom event to signal that Supabase is ready
        window.dispatchEvent(new CustomEvent('supabase-ready', {
            detail: { 
                supabase: window.supabase,
                timestamp: new Date().toISOString()
            }
        }));
        console.log('📡 supabase-ready event dispatched');
        
    } catch (error) {
        console.error('❌ Failed to initialize Supabase from supabase-init.js:', error);
        
        // Emit error event
        window.dispatchEvent(new CustomEvent('supabase-error', {
            detail: { 
                error: error.message,
                timestamp: new Date().toISOString()
            }
        }));
        
        // Redirect to login on error (unless already on login)
        if (!window.location.pathname.includes('login.html')) {
            console.log('🔄 Redirecting to login due to initialization error...');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1000);
        }
    }
})();