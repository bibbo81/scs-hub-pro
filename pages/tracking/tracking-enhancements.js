// /pages/tracking/tracking-enhancements.js
// Consolidated fixes and enhancements for the tracking page.
// This file replaces multiple individual fix scripts to improve performance and reliability.
    'use strict';
    console.log('🚀 TRACKING ENHANCEMENTS: Initializing consolidated module...');

    /**
     * ===================================================================
     * SECTION 1: CHECKBOX FIX (from tracking-checkbox-fix.js)
     * Fixes checkbox selection for rows with UUIDs in TableManager.
     * ===================================================================
     */
    function applyCheckboxFixes() {
        console.log('🔧 ENH: Applying Checkbox Fixes...');

        function waitForTableManager(callback) {
            const containerId = 'trackingTableContainer';
            let attempts = 0;
            const interval = setInterval(() => {
                const tableManager = window.getTableManager ? window.getTableManager(containerId) : window.tableManager;
                if (tableManager) {
                    clearInterval(interval);
                    callback(tableManager);
                } else if (attempts > 20) {
                    clearInterval(interval);
                    console.error(`❌ TableManager not found for ${containerId} after 10 seconds.`);
                }
                attempts++;
            }, 500);
        }

        waitForTableManager(tableManager => {
            // OVERRIDE selectRow to handle UUID strings
            tableManager.selectRow = function(rowId, selected) {
                const id = String(rowId); // No parseInt!
                if (selected) {
                    this.selectedRows.add(id);
                } else {
                    this.selectedRows.delete(id);
                }
                this.onSelectionChange(this.getSelectedRows());
                const row = this.container.querySelector(`tr[data-row-id="${id}"]`);
                if (row) row.classList.toggle('selected', selected);
            };

            // OVERRIDE getSelectedRows to ensure it works with string IDs
            tableManager.getSelectedRows = function() {
                return this.data.filter(row => {
                    const id = String(row.id || this.data.indexOf(row));
                    return this.selectedRows.has(id);
                });
            };

            console.log('✅ Checkbox selection logic fixed for UUIDs.');
        });

        // Improved event delegation for checkboxes
        const container = document.getElementById('trackingTableContainer');
        if (container && !container.dataset.checkboxListener) {
            container.dataset.checkboxListener = 'true';
            container.addEventListener('click', function(e) {
                const checkbox = e.target.closest('input[type="checkbox"].select-row');
                if (!checkbox) return;
                e.stopPropagation();
                const rowId = checkbox.value;
                if (window.tableManager) {
                    window.tableManager.selectRow(rowId, checkbox.checked);
                }
            });
            console.log('✅ Improved checkbox event delegation set up.');
        }
    }

    /**
     * ===================================================================
     * SECTION 2: DETECTION & MAPPING FIXES (from various fix scripts)
     * Enhances form detection and data mapping for Ocean V2.
     * ===================================================================
     */
    function applyDetectionAndMappingFixes() {
        console.log('🔧 ENH: Applying Detection & Mapping Fixes...');

        // --- Logic from ocean-v2-autodetection-fix.js ---
        if (window.processEnhancedTracking) {
            const originalProcessTracking = window.processEnhancedTracking;
            window.processEnhancedTracking = async function(formData) {
                if (formData.useOceanV2) {
                    console.log('🌊 Intercepted for Ocean V2 processing...');
                    formData.shipsgoId = window.detectedOceanId;
                }
                return originalProcessTracking.call(this, formData);
            };
            console.log('✅ processEnhancedTracking intercepted for Ocean V2.');
        }

        // --- Logic from ocean-v2-mapping-fix.js ---
        function mapOceanV2Fields(tracking) {
            if (!tracking || tracking.metadata?.source !== 'shipsgo_v2_ocean') return;
            const raw = tracking.metadata?.raw?.shipment || {};
            if (!tracking.carrier_name || tracking.carrier_name === '-') {
                tracking.carrier_name = raw.carrier?.name || 'Unknown';
            }
            if (!tracking.vessel_name || tracking.vessel_name === '-') {
                const lastMovement = raw.containers?.[0]?.movements?.slice(-1)[0];
                tracking.vessel_name = lastMovement?.vessel?.name || '-';
                tracking.voyage_number = lastMovement?.voyage || '-';
            }
        }

        if (window.loadTrackings) {
            const originalLoadTrackings = window.loadTrackings;
            window.loadTrackings = async function() {
                await originalLoadTrackings.apply(this, arguments);
                const trackings = window.trackings || [];
                let processedCount = 0;
                trackings.forEach(t => {
                    if (t.metadata?.source === 'shipsgo_v2_ocean') {
                        mapOceanV2Fields(t);
                        processedCount++;
                    }
                });
                if (processedCount > 0) {
                    console.log(`✅ Mapped ${processedCount} Ocean V2 trackings.`);
                    if (window.tableManager) window.tableManager.render();
                }
            };
            console.log('✅ loadTrackings intercepted for Ocean V2 mapping.');
        }
    }

    /**
     * ===================================================================
     * SECTION 3: WORKFLOW & SUBMIT FIX (from tracking-fixes.js & tracking-submit-fix.js)
     * Ensures the workflow modal is displayed correctly upon form submission.
     * ===================================================================
     */
    function applyWorkflowAndSubmitFixes() {
        console.log('🔧 ENH: Applying Workflow & Submit Fixes...');

        // Create a robust showWorkflowModal if it doesn't exist
        if (typeof window.showWorkflowModal !== 'function') {
            window.showWorkflowModal = function() {
                console.log('🚀 Fallback showWorkflowModal called.');
                // This can be expanded to show a simple loading indicator
            };
        }

        // Intercept form submission
        const observer = new MutationObserver((mutations) => {
            const form = document.getElementById('enhancedSingleForm');
            if (form && !form.dataset.submitIntercepted) {
                form.dataset.submitIntercepted = 'true';
                form.addEventListener('submit', (e) => {
                    console.log('🚀 Form submit intercepted!');
                    if (window.showWorkflowModal) {
                        window.showWorkflowModal();
                    }
                }, true); // Use capture to run first
                console.log('✅ Form submission intercepted.');
                observer.disconnect();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * Main initialization function that runs all fixes in order.
     */
    function init() {
        console.log('⚙️ Applying all enhancements in order...');
        try {
            applyCheckboxFixes();
            applyDetectionAndMappingFixes();
            applyWorkflowAndSubmitFixes();
            console.log('✅ All tracking page enhancements have been applied.');
        } catch (error) {
            console.error('❌ Error applying enhancements:', error);
        }
    }

    // Expose the initializer on the window object so index.js can call it
    window.TrackingEnhancements = {
        init: init
    };
    console.log('✅ Tracking Enhancements module loaded and ready to be initialized.');