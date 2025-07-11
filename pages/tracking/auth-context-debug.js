// Debug completo del contesto di autenticazione
window.debugAuthContext = async function() {
    console.log('🔍 DEBUG AUTH CONTEXT');
    console.log('====================');
    
    try {
        const supabase = window.getSupabase();
        if (!supabase) {
            console.error('❌ Supabase client not available');
            return;
        }

        // 1. Check session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('1. Session:', {
            exists: !!session,
            error: sessionError?.message,
            userId: session?.user?.id,
            email: session?.user?.email,
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A',
            accessTokenStart: session?.access_token?.substring(0, 20) + '...'
        });

        // 2. Check user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('2. User:', {
            exists: !!user,
            error: userError?.message,
            userId: user?.id,
            email: user?.email
        });

        // 3. Test organization query directly
        console.log('3. Testing organization query...');
        
        // Usa auth.uid() come nelle policies
        const { data: directTest, error: directError } = await supabase.rpc('get_user_organizations');
        console.log('   Direct RPC test:', { data: directTest, error: directError?.message });

        // Test membership query
        const { data: membershipTest, error: membershipError } = await supabase
            .from('organization_members')
            .select('organization_id, role')
            .eq('user_id', user?.id);
        
        console.log('   Membership test:', { 
            data: membershipTest, 
            error: membershipError?.message,
            count: membershipTest?.length 
        });

        // 4. Test RLS policy simulation
        console.log('4. Testing RLS policy simulation...');
        
        const { data: rlsTest, error: rlsError } = await supabase
            .from('shipments')
            .select('id, organization_id')
            .eq('organization_id', '3f3c5128-612f-42b1-a4c7-170668df884a')
            .limit(1);
            
        console.log('   RLS SELECT test:', { 
            canRead: !rlsError, 
            error: rlsError?.message,
            dataCount: rlsTest?.length 
        });

        // 5. Test INSERT simulation (with rollback)
        console.log('5. Testing INSERT simulation...');
        
        const testPayload = {
            shipment_number: `DEBUG_TEST_${Date.now()}`,
            organization_id: '3f3c5128-612f-42b1-a4c7-170668df884a',
            type: 'test',
            status: 'test',
            carrier_code: 'DEBUG',
            carrier_name: 'Debug Test',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: insertTest, error: insertError } = await supabase
            .from('shipments')
            .insert([testPayload])
            .select()
            .single();

        console.log('   RLS INSERT test:', { 
            canInsert: !insertError, 
            error: insertError?.message,
            errorCode: insertError?.code 
        });

        // Cleanup test record if successful
        if (insertTest) {
            await supabase.from('shipments').delete().eq('id', insertTest.id);
            console.log('   ✅ Test record cleaned up');
        }

        return {
            hasSession: !!session,
            hasUser: !!user,
            userId: user?.id,
            canReadShipments: !rlsError,
            canInsertShipments: !insertError,
            authError: sessionError || userError,
            rlsError: rlsError || insertError
        };

    } catch (error) {
        console.error('❌ Debug failed:', error);
        return { error: error.message };
    }
};

// Auto-run dopo Supabase ready
if (window.supabaseReady) {
    window.supabaseReady.then(() => {
        setTimeout(() => window.debugAuthContext(), 1000);
    });
}

console.log('🔍 Auth context debug loaded');
console.log('💡 Run window.debugAuthContext() to debug authentication');