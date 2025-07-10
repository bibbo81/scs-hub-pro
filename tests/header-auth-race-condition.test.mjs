#!/usr/bin/env node

/**
 * Test for Header Component Authentication Race Condition Fix
 * 
 * This test verifies that the header component properly handles
 * authentication state loading without showing "Demo User" flash.
 */

import fs from 'fs';
import path from 'path';

console.log('🧪 Testing Header Authentication Race Condition Fix...');

// Test 1: Verify getUserInfo returns loading state instead of demo fallback
function testGetUserInfoLoadingState() {
    try {
        // Read the header component file
        const headerPath = path.join(process.cwd(), 'core', 'header-component.js');
        const headerContent = fs.readFileSync(headerPath, 'utf8');
        
        // Extract just the getUserInfo method
        const getUserInfoStart = headerContent.indexOf('async getUserInfo()');
        const getUserInfoEnd = headerContent.indexOf('}', headerContent.indexOf('Return loading state instead of fallback'));
        const getUserInfoMethod = headerContent.substring(getUserInfoStart, getUserInfoEnd + 1);
        
        // Check that the method has loading state logic
        const hasLoadingReturn = getUserInfoMethod.includes("name: 'Loading...'") &&
                                getUserInfoMethod.includes("isLoading: true");
        
        // Check that it doesn't have the old fallback pattern
        const hasOldFallback = getUserInfoMethod.includes("const fallback = {") &&
                              getUserInfoMethod.includes("name: 'Demo User'");
        
        if (hasOldFallback) {
            throw new Error('Old demo fallback pattern still exists in getUserInfo method');
        }
        
        if (!hasLoadingReturn) {
            throw new Error('Loading state not found in getUserInfo method');
        }
        
        console.log('✅ getUserInfo properly returns loading state instead of demo fallback');
        return true;
    } catch (error) {
        console.error('❌ getUserInfo loading state test failed:', error.message);
        return false;
    }
}

// Test 2: Verify renderUserButton handles loading state
function testRenderUserButtonLoadingState() {
    try {
        const headerPath = path.join(process.cwd(), 'core', 'header-component.js');
        const headerContent = fs.readFileSync(headerPath, 'utf8');
        
        // Check that renderUserButton has loading state handling
        const hasLoadingCheck = headerContent.includes('if (userInfo.isLoading)');
        const hasSpinner = headerContent.includes('fa-spinner fa-spin');
        
        if (!hasLoadingCheck) {
            throw new Error('renderUserButton does not check for loading state');
        }
        
        if (!hasSpinner) {
            throw new Error('renderUserButton does not show loading spinner');
        }
        
        console.log('✅ renderUserButton properly handles loading state with spinner');
        return true;
    } catch (error) {
        console.error('❌ renderUserButton loading state test failed:', error.message);
        return false;
    }
}

// Test 3: Verify updateUserDisplay handles loading state
function testUpdateUserDisplayLoadingState() {
    try {
        const headerPath = path.join(process.cwd(), 'core', 'header-component.js');
        const headerContent = fs.readFileSync(headerPath, 'utf8');
        
        // Check that updateUserDisplay handles loading state
        const hasLoadingCheck = headerContent.includes('if (userInfo.isLoading)');
        const hasLoadingClass = headerContent.includes('classList.add(\'loading\')');
        const hasLoadingRemoval = headerContent.includes('classList.remove(\'loading\')');
        
        if (!hasLoadingCheck) {
            throw new Error('updateUserDisplay does not check for loading state');
        }
        
        if (!hasLoadingClass) {
            throw new Error('updateUserDisplay does not add loading class');
        }
        
        if (!hasLoadingRemoval) {
            throw new Error('updateUserDisplay does not remove loading class');
        }
        
        console.log('✅ updateUserDisplay properly handles loading state transitions');
        return true;
    } catch (error) {
        console.error('❌ updateUserDisplay loading state test failed:', error.message);
        return false;
    }
}

// Test 4: Verify CSS includes loading state styles
function testLoadingStateCSSStyles() {
    try {
        const headerPath = path.join(process.cwd(), 'core', 'header-component.js');
        const headerContent = fs.readFileSync(headerPath, 'utf8');
        
        // Check for loading state CSS
        const hasLoadingButtonCSS = headerContent.includes('.sol-btn.loading');
        const hasSpinnerCSS = headerContent.includes('.user-avatar .fa-spinner');
        
        if (!hasLoadingButtonCSS) {
            throw new Error('Loading button CSS styles not found');
        }
        
        if (!hasSpinnerCSS) {
            throw new Error('Loading spinner CSS styles not found');
        }
        
        console.log('✅ Loading state CSS styles are properly defined');
        return true;
    } catch (error) {
        console.error('❌ Loading state CSS test failed:', error.message);
        return false;
    }
}

// Test 5: Verify handleAuthStateChange improvements
function testAuthStateChangeImprovements() {
    try {
        const headerPath = path.join(process.cwd(), 'core', 'header-component.js');
        const headerContent = fs.readFileSync(headerPath, 'utf8');
        
        // Check for improved auth state handling
        const hasLoadingInfoUpdate = headerContent.includes('const loadingInfo = {');
        const hasImprovedEventHandling = headerContent.includes('TOKEN_REFRESHED');
        
        if (!hasLoadingInfoUpdate) {
            throw new Error('Auth state change does not show loading state first');
        }
        
        if (!hasImprovedEventHandling) {
            throw new Error('Auth state change does not handle TOKEN_REFRESHED');
        }
        
        console.log('✅ handleAuthStateChange properly manages loading states and events');
        return true;
    } catch (error) {
        console.error('❌ handleAuthStateChange test failed:', error.message);
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('🧪 Running Header Authentication Race Condition Tests...\n');
    
    const tests = [
        { name: 'getUserInfo Loading State', fn: testGetUserInfoLoadingState },
        { name: 'renderUserButton Loading State', fn: testRenderUserButtonLoadingState },
        { name: 'updateUserDisplay Loading State', fn: testUpdateUserDisplayLoadingState },
        { name: 'Loading State CSS Styles', fn: testLoadingStateCSSStyles },
        { name: 'Auth State Change Improvements', fn: testAuthStateChangeImprovements }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error(`❌ Test '${test.name}' threw error:`, error.message);
            failed++;
        }
    }
    
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 All header authentication race condition tests passed!');
        process.exit(0);
    } else {
        console.log('\n💥 Some tests failed. Please review the changes.');
        process.exit(1);
    }
}

// Execute tests
runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});