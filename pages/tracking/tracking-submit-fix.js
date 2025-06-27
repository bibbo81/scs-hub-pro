// tracking-submit-fix.js - Fix per mostrare il workflow quando si invia il form
(function() {
    'use strict';
    
    console.log('🔧 TRACKING SUBMIT FIX: Initializing...');
    
    // Funzione per intercettare il submit del form
    function interceptFormSubmit() {
        // Cerca il form
        const form = document.getElementById('enhancedSingleForm');
        
        if (!form) {
            console.log('⏳ Form not found, retrying...');
            setTimeout(interceptFormSubmit, 500);
            return;
        }
        
        console.log('✅ Form found, intercepting submit');
        
        // Salva il vecchio handler se esiste
        const oldSubmitHandler = form.onsubmit;
        
        // Intercetta il submit
        form.addEventListener('submit', function(e) {
            console.log('🚀 Form submit intercepted!');
            
            // Se showWorkflowModal non esiste o non è stata chiamata, forza la sua visualizzazione
            if (window.showWorkflowModal && !window._workflowVisible) {
                console.log('📊 Showing workflow before processing...');
                
                // Previeni il submit normale
                e.preventDefault();
                e.stopPropagation();
                
                // Mostra il workflow
                window.showWorkflowModal();
                window._workflowVisible = true;
                
                // Continua con il submit dopo un breve delay
                setTimeout(() => {
                    console.log('📤 Continuing with form submission...');
                    
                    // Chiama il handler originale se esiste
                    if (window.handleEnhancedSubmit) {
                        window.handleEnhancedSubmit(e);
                    } else if (oldSubmitHandler) {
                        oldSubmitHandler.call(form, e);
                    } else {
                        // Fallback: invia il form normalmente
                        form.submit();
                    }
                }, 100);
                
                return false;
            }
        }, true); // Use capture phase to intercept before other handlers
        
        // Intercetta anche il bottone di submit
        const submitBtn = document.getElementById('enhSubmitBtn');
        if (submitBtn) {
            const oldClickHandler = submitBtn.onclick;
            
            submitBtn.addEventListener('click', function(e) {
                console.log('🔘 Submit button clicked');
                
                // Se il workflow non è visibile, mostralo
                if (window.showWorkflowModal && !window._workflowVisible) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    window.showWorkflowModal();
                    window._workflowVisible = true;
                    
                    // Continua dopo un delay
                    setTimeout(() => {
                        if (oldClickHandler) {
                            oldClickHandler.call(submitBtn, e);
                        } else {
                            form.dispatchEvent(new Event('submit'));
                        }
                    }, 100);
                }
            }, true);
        }
    }
    
    // Reset workflow visibility when modal closes
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('custom-modal-close') || 
            e.target.classList.contains('workflow-close')) {
            window._workflowVisible = false;
        }
    });
    
    // Start intercepting when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', interceptFormSubmit);
    } else {
        setTimeout(interceptFormSubmit, 1000);
    }
    
    // Debug helper
    window.debugSubmitFix = function() {
        console.log('📋 Submit Fix Debug:');
        console.log('- Form found:', !!document.getElementById('enhancedSingleForm'));
        console.log('- Submit button found:', !!document.getElementById('enhSubmitBtn'));
        console.log('- Workflow visible:', window._workflowVisible);
        console.log('- showWorkflowModal exists:', typeof window.showWorkflowModal);
        console.log('- handleEnhancedSubmit exists:', typeof window.handleEnhancedSubmit);
    };
    
    console.log('✅ TRACKING SUBMIT FIX: Applied');
    
})();