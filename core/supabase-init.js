// core/supabase-init.js - Early initialization with Promise system
import { initializeSupabase, checkSession } from './services/supabase-client.js';

// Start initialization immediately
(async () => {
    try {
        console.log('🚀 Starting Supabase initialization from supabase-init.js...');
        await initializeSupabase();
        console.log('✅ Supabase client initialized from supabase-init.js');
        
        // Note: The session checking and supabaseReady Promise resolution
        // is now handled internally in supabase-client.js
        
    } catch (error) {
        console.error('❌ Failed to initialize Supabase from supabase-init.js:', error);
        
        // Redirect to login on error (unless already on login)
        if (!window.location.pathname.includes('login.html')) {
            console.log('🔄 Redirecting to login due to initialization error...');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1000);
        }
    }
})();