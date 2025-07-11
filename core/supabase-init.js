// core/supabase-init.js - Early initialization
import { initializeSupabase } from './services/supabase-client.js';

// Start initialization immediately
(async () => {
    try {
        console.log('🚀 Starting Supabase initialization from supabase-init.js...');
        await initializeSupabase();
        console.log('✅ Supabase initialized successfully from supabase-init.js');
    } catch (error) {
        console.error('❌ Failed to initialize Supabase from supabase-init.js:', error);
    }
})();