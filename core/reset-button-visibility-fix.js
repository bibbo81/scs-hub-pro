// FIX IMMEDIATO: Rendi il reset button visibile
// Il button funziona ma è nascosto da CSS

console.log('👁️ Fixing reset button visibility...');

// ===== IMMEDIATE VISIBILITY FIX =====

function makeResetButtonVisible() {
    console.log('🔧 Making reset button visible...');
    
    const resetBtn = document.getElementById('resetLinkedFiltersBtn');
    if (!resetBtn) {
        console.error('❌ Reset button not found');
        return false;
    }
    
    console.log('📍 Current button state:');
    console.log('  - Display:', getComputedStyle(resetBtn).display);
    console.log('  - Visibility:', getComputedStyle(resetBtn).visibility);
    console.log('  - Opacity:', getComputedStyle(resetBtn).opacity);
    console.log('  - Position:', getComputedStyle(resetBtn).position);
    console.log('  - OffsetParent:', resetBtn.offsetParent);
    
    // Force visibility with !important
    resetBtn.style.cssText = `
        display: inline-flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: relative !important;
        z-index: 1000 !important;
        background: #f8f9fa !important;
        border: 1px solid #dee2e6 !important;
        border-radius: 0.375rem !important;
        padding: 0.375rem 0.75rem !important;
        font-size: 0.875rem !important;
        color: #495057 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        transform: none !important;
        margin: 0 !important;
        width: auto !important;
        height: auto !important;
    `;
    
    // Check parent containers
    let parent = resetBtn.parentElement;
    let level = 1;
    while (parent && level <= 5) {
        const parentStyle = getComputedStyle(parent);
        if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') {
            console.log(`⚠️ Parent level ${level} is hidden:`, parent.className, parent.id);
            parent.style.display = 'block';
            parent.style.visibility = 'visible';
        }
        parent = parent.parentElement;
        level++;
    }
    
    // Test visibility
    const isVisible = resetBtn.offsetParent !== null;
    console.log('✅ Button visibility after fix:', isVisible);
    
    if (isVisible) {
        // Add visual feedback for successful fix
        resetBtn.style.boxShadow = '0 0 0 2px rgba(40, 167, 69, 0.5)';
        setTimeout(() => {
            resetBtn.style.boxShadow = '';
        }, 2000);
        
        console.log('🎉 Reset button is now visible!');
        return true;
    } else {
        console.error('❌ Button still not visible after fix');
        return false;
    }
}

// ===== CLEANUP DUPLICATE LISTENERS =====

function cleanupDuplicateListeners() {
    console.log('🧹 Cleaning up duplicate event listeners...');
    
    const resetBtn = document.getElementById('resetLinkedFiltersBtn');
    if (!resetBtn) return;
    
    // Remove all existing listeners by cloning
    const newBtn = resetBtn.cloneNode(true);
    resetBtn.parentNode.replaceChild(newBtn, resetBtn);
    
    // Add single clean listener
    newBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔄 Clean reset button clicked');
        
        if (window.resetLinkedProductsFiltersGlobal) {
            window.resetLinkedProductsFiltersGlobal();
        } else if (window.enhancedApplyLinkedProductsFilters) {
            // Fallback reset
            const filterSelect = document.getElementById('linkedProductsFilter');
            const searchInput = document.getElementById('linkedProductsSearch');
            if (filterSelect) filterSelect.value = 'all';
            if (searchInput) searchInput.value = '';
            window.enhancedApplyLinkedProductsFilters();
        }
    });
    
    // Add hover effects
    newBtn.addEventListener('mouseenter', () => {
        newBtn.style.background = '#e9ecef';
        newBtn.style.borderColor = '#007bff';
    });
    
    newBtn.addEventListener('mouseleave', () => {
        newBtn.style.background = '#f8f9fa';
        newBtn.style.borderColor = '#dee2e6';
    });
    
    console.log('✅ Event listeners cleaned and reattached');
    return newBtn;
}

// ===== FORCE BUTTON VISIBILITY =====

function forceButtonVisibility() {
    console.log('💪 Force button visibility with aggressive CSS...');
    
    const resetBtn = document.getElementById('resetLinkedFiltersBtn');
    if (!resetBtn) return false;
    
    // Create style element to override any CSS
    const styleElement = document.createElement('style');
    styleElement.id = 'reset-button-visibility-fix';
    styleElement.textContent = `
        #resetLinkedFiltersBtn {
            display: inline-flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            z-index: 10000 !important;
            background: #f8f9fa !important;
            border: 1px solid #dee2e6 !important;
            border-radius: 0.375rem !important;
            padding: 0.375rem 0.75rem !important;
            font-size: 0.875rem !important;
            color: #495057 !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            transform: none !important;
            margin-left: auto !important;
            width: auto !important;
            height: auto !important;
            max-width: none !important;
            max-height: none !important;
            overflow: visible !important;
            clip: none !important;
            white-space: nowrap !important;
        }
        
        #resetLinkedFiltersBtn:hover {
            background: #e9ecef !important;
            border-color: #007bff !important;
            transform: scale(1.05) !important;
        }
        
        #resetLinkedFiltersBtn:active {
            transform: scale(0.98) !important;
        }
        
        /* Ensure parent containers are visible */
        #resetLinkedFiltersBtn * {
            display: inherit !important;
            visibility: inherit !important;
        }
    `;
    
    // Remove existing style if present
    const existingStyle = document.getElementById('reset-button-visibility-fix');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    document.head.appendChild(styleElement);
    console.log('✅ Aggressive CSS styles applied');
    
    return true;
}

// ===== DIAGNOSTIC FUNCTION =====

function diagnosticCheck() {
    console.log('🔍 Running diagnostic check...');
    
    const resetBtn = document.getElementById('resetLinkedFiltersBtn');
    if (!resetBtn) {
        console.error('❌ Button not found');
        return;
    }
    
    console.log('📊 Button Diagnostics:');
    console.log('  - Element:', resetBtn);
    console.log('  - TagName:', resetBtn.tagName);
    console.log('  - ID:', resetBtn.id);
    console.log('  - Classes:', resetBtn.className);
    console.log('  - InnerHTML:', resetBtn.innerHTML);
    console.log('  - Style:', resetBtn.style.cssText);
    console.log('  - Computed Display:', getComputedStyle(resetBtn).display);
    console.log('  - Computed Visibility:', getComputedStyle(resetBtn).visibility);
    console.log('  - Computed Opacity:', getComputedStyle(resetBtn).opacity);
    console.log('  - OffsetParent:', resetBtn.offsetParent);
    console.log('  - OffsetWidth:', resetBtn.offsetWidth);
    console.log('  - OffsetHeight:', resetBtn.offsetHeight);
    console.log('  - ClientWidth:', resetBtn.clientWidth);
    console.log('  - ClientHeight:', resetBtn.clientHeight);
    
    // Check parent chain
    console.log('🏗️ Parent Chain:');
    let parent = resetBtn.parentElement;
    let level = 1;
    while (parent && level <= 10) {
        const style = getComputedStyle(parent);
        console.log(`  Level ${level}:`, {
            element: parent.tagName,
            id: parent.id,
            classes: parent.className,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity
        });
        parent = parent.parentElement;
        level++;
    }
}

// ===== MAIN FIX FUNCTION =====

function executeVisibilityFix() {
    console.log('🚀 Executing complete visibility fix...');
    
    try {
        // Step 1: Diagnostic
        diagnosticCheck();
        
        // Step 2: Force visibility with CSS
        forceButtonVisibility();
        
        // Step 3: Direct style manipulation
        const visible = makeResetButtonVisible();
        
        // Step 4: Clean up listeners
        const cleanBtn = cleanupDuplicateListeners();
        
        // Step 5: Final check
        setTimeout(() => {
            const finalBtn = document.getElementById('resetLinkedFiltersBtn');
            const isVisible = finalBtn && finalBtn.offsetParent !== null;
            console.log('🎯 Final visibility check:', isVisible);
            
            if (isVisible) {
                console.log('🎉 SUCCESS: Reset button is now visible and functional!');
                
                // Visual confirmation
                if (finalBtn) {
                    finalBtn.style.background = '#d4edda';
                    finalBtn.style.borderColor = '#c3e6cb';
                    finalBtn.style.color = '#155724';
                    setTimeout(() => {
                        finalBtn.style.background = '#f8f9fa';
                        finalBtn.style.borderColor = '#dee2e6';
                        finalBtn.style.color = '#495057';
                    }, 3000);
                }
            } else {
                console.error('❌ FAILED: Button still not visible');
                // Create emergency button
                createEmergencyResetButton();
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Error in visibility fix:', error);
        createEmergencyResetButton();
    }
}

// ===== EMERGENCY BUTTON CREATION =====

function createEmergencyResetButton() {
    console.log('🚨 Creating emergency reset button...');
    
    // Remove any existing emergency button
    const existingEmergency = document.getElementById('emergency-reset-btn');
    if (existingEmergency) {
        existingEmergency.remove();
    }
    
    // Find container for the reset button
    const originalContainer = document.getElementById('resetLinkedFiltersBtn')?.parentElement;
    const container = originalContainer || document.querySelector('.sol-card-actions') || document.body;
    
    // Create emergency button
    const emergencyBtn = document.createElement('button');
    emergencyBtn.id = 'emergency-reset-btn';
    emergencyBtn.className = 'sol-btn sol-btn-sm sol-btn-primary';
    emergencyBtn.innerHTML = '<i class="fas fa-undo"></i> Reset (Emergency)';
    emergencyBtn.style.cssText = `
        margin-left: 8px !important;
        background: #dc3545 !important;
        border-color: #dc3545 !important;
        z-index: 10000 !important;
    `;
    
    emergencyBtn.addEventListener('click', () => {
        console.log('🚨 Emergency reset clicked');
        if (window.resetLinkedProductsFiltersGlobal) {
            window.resetLinkedProductsFiltersGlobal();
        }
    });
    
    container.appendChild(emergencyBtn);
    console.log('✅ Emergency reset button created');
}

// ===== GLOBAL FUNCTIONS =====

window.fixResetButtonVisibility = executeVisibilityFix;
window.diagnosticResetButton = diagnosticCheck;
window.createEmergencyReset = createEmergencyResetButton;

// ===== AUTO-EXECUTE =====

// Execute fix immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeVisibilityFix);
} else {
    setTimeout(executeVisibilityFix, 100);
}

console.log('👁️ Reset Button Visibility Fix loaded');
console.log('🔧 Manual fix: window.fixResetButtonVisibility()');
console.log('🔍 Diagnostic: window.diagnosticResetButton()');
console.log('🚨 Emergency: window.createEmergencyReset()');
