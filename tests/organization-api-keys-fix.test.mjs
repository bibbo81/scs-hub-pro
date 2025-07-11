// Test for organizationApiKeysService fix
// tests/organization-api-keys-fix.test.mjs

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock browser environment
global.window = {
    organizationApiKeysService: null,
    addEventListener: () => {},
    dispatchEvent: () => {},
    console: console,
    document: {
        readyState: 'complete',
        addEventListener: () => {}
    },
    setTimeout: setTimeout,
    supabase: {
        auth: {
            getUser: async () => ({ data: { user: { id: 'test-user' } } })
        },
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({ data: { organization_id: 'test-org' } })
                })
            })
        })
    }
};

global.console = console;
global.document = global.window.document;
global.setTimeout = setTimeout;

// Test the fix
console.log('Testing organizationApiKeysService fix...');

try {
    // Read the fix file
    const fixPath = join(__dirname, '..', 'pages', 'tracking', 'organizationApiKeysService-fix.js');
    const fixCode = readFileSync(fixPath, 'utf8');
    
    // Execute the entire fix file in our mock environment
    eval(fixCode);
    
    // Test that required functions are created
    if (typeof global.window.recoverOrganizationApiKeysService === 'function') {
        console.log('✓ Recovery function exists');
        
        if (typeof global.window.checkOrganizationApiKeysService === 'function') {
            console.log('✓ Check function exists');
            
            // Test the check function
            const status = global.window.checkOrganizationApiKeysService();
            console.log('✓ Check function executed successfully');
            
            console.log('✓ OrganizationApiKeysService fix test passed');
        } else {
            throw new Error('Check function not found');
        }
    } else {
        throw new Error('Recovery function not found');
    }
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
}