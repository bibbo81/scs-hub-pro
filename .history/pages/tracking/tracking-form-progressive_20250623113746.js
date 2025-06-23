// Refresh all trackings - MODIFICATA PER USARE bulkTrack E SUPABASE
async function refreshAllTrackings() {
    const activeTrackings = trackings.filter(t => !['delivered', 'exception'].includes(t.status));
    
    if (activeTrackings.length === 0) {
        notificationSystem.info('Nessun tracking attivo da aggiornare');
        return;
    }
    
    if (!window.trackingService || !window.trackingService.hasApiKeys()) {
        notificationSystem.warning('API non configurate. Vai in Settings per configurarle.');
        return;
    }
    
    // Show progress
    const progressModal = window.ModalSystem.progress({
        title: 'Aggiornamento Tracking',
        message: 'Aggiornamento in corso...',
        showPercentage: true
    });
    
    try {
        // Prepara tracking per bulk update
        const trackingRequests = activeTrackings.map(t => ({
            id: t.id,
            tracking_number: t.tracking_number,
            type: t.tracking_type || 'container'
        }));
        
        // Esegui bulk tracking con callback per progresso
        const results = await window.trackingService.bulkTrack(trackingRequests, (progress) => {
            const percentage = Math.round((progress.completed / progress.total) * 100);
            progressModal.update(percentage, `Aggiornati ${progress.completed} di ${progress.total} tracking`);
        });
        
        // Aggiorna trackings con nuovi dati
        let updatedCount = 0;
        const bulkUpdates = [];
        
        results.forEach((result, index) => {
            if (result.success && result.data) {
                const tracking = activeTrackings[index];
                const updatedData = {
                    ...tracking,
                    ...result.data,
                    id: tracking.id,
                    created_at: tracking.created_at,
                    updated_at: new Date().toISOString(),
                    metadata: {
                        ...tracking.metadata,
                        ...result.data.metadata,
                        last_bulk_update: new Date().toISOString()
                    }
                };
                
                bulkUpdates.push({
                    id: tracking.id,
                    data: updatedData
                });
                updatedCount++;
            }
        });
        
        // MODIFICATO: Aggiorna su Supabase se disponibile
        if (window.supabaseTrackingService && bulkUpdates.length > 0) {
            try {
                // Aggiorna ogni tracking su Supabase
                for (const update of bulkUpdates) {
                    await window.supabaseTrackingService.updateTracking(update.id, update.data);
                }
                console.log(`✅ [Tracking] Aggiornati ${updatedCount} tracking su Supabase`);
            } catch (error) {
                console.error('❌ [Tracking] Errore aggiornamento Supabase:', error);
                // Fallback: aggiorna solo localStorage
                bulkUpdates.forEach(update => {
                    const index = trackings.findIndex(t => t.id === update.id);
                    if (index !== -1) {
                        trackings[index] = update.data;
                    }
                });
                localStorage.setItem('trackings', JSON.stringify(trackings));
            }
        } else {
            // Aggiorna solo localStorage
            bulkUpdates.forEach(update => {
                const index = trackings.findIndex(t => t.id === update.id);
                if (index !== -1) {
                    trackings[index] = update.data;
                }
            });
            localStorage.setItem('trackings', JSON.stringify(trackings));
        }
        
        // Ricarica la UI
        await loadTrackings();
        
        progressModal.close();
        notificationSystem.success(`Aggiornati ${updatedCount} tracking su ${activeTrackings.length}`);
        
    } catch (error) {
        console.error('Error in bulk refresh:', error);
        progressModal.close();
        notificationSystem.error('Errore durante l\'aggiornamento multiplo: ' + error.message);
    }
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    let filtered = [...trackings];
    
    if (statusFilter) {
        filtered = filtered.filter(t => t.status === statusFilter);
    }
    
    if (typeFilter) {
        filtered = filtered.filter(t => t.tracking_type === typeFilter);
    }
    
    trackingTable.setData(filtered);
    
    // Update timeline if active
    window.currentTrackings = filtered;
    if (window.timelineView && window.timelineView.isActive()) {
        window.timelineView.refresh();
    }
}

// Export functions - AGGIORNATE PER USARE EXPORT MANAGER
async function exportToPDF() {
    try {
        // Verifica se ci sono tracking
        if (!trackings || trackings.length === 0) {
            window.NotificationSystem?.warning('Nessun tracking da esportare');
            return;
        }
        
        // Usa ExportManager
        if (window.ExportManager) {
            await window.ExportManager.exportToPDF(trackings, 'tracking-export', {
                includeSummary: true
            });
        } else {
            throw new Error('ExportManager non disponibile');
        }
    } catch (error) {
        console.error('[Tracking] Export PDF error:', error);
        window.NotificationSystem?.error('Errore export PDF: ' + error.message);
    }
}

async function exportToExcel() {
    try {
        // Verifica se ci sono tracking
        if (!trackings || trackings.length === 0) {
            window.NotificationSystem?.warning('Nessun tracking da esportare');
            return;
        }
        
        // Usa ExportManager
        if (window.ExportManager) {
            await window.ExportManager.exportToExcel(trackings, 'tracking-export', {
                includeSummary: true,
                includeTimeline: true
            });
        } else {
            throw new Error('ExportManager non disponibile');
        }
    } catch (error) {
        console.error('[Tracking] Export Excel error:', error);
        window.NotificationSystem?.error('Errore export Excel: ' + error.message);
    }
}

// Export con filtri applicati - NUOVA FUNZIONE
async function exportFilteredTrackings() {
    try {
        const statusFilter = document.getElementById('statusFilter')?.value;
        const typeFilter = document.getElementById('typeFilter')?.value;
        
        // Usa i dati filtrati dalla tabella
        const filteredData = trackingTable.filteredData || trackings;
        
        if (filteredData.length === 0) {
            window.NotificationSystem?.warning('Nessun tracking da esportare con i filtri attuali');
            return;
        }
        
        const filters = {
            status: statusFilter || null,
            type: typeFilter || null
        };
        
        if (window.ExportManager) {
            // Chiedi formato
            const format = await window.ModalSystem?.confirm({
                title: 'Export Filtrati',
                message: `Esportare ${filteredData.length} tracking filtrati?`,
                confirmText: 'Excel',
                cancelText: 'PDF',
                type: 'info'
            });
            
            if (format === true) {
                await window.ExportManager.exportFiltered(
                    trackings,
                    filters,
                    'excel'
                );
            } else if (format === false) {
                await window.ExportManager.exportFiltered(
                    trackings,
                    filters,
                    'pdf'
                );
            }
        }
        
    } catch (error) {
        console.error('[Tracking] Export filtered error:', error);
        window.NotificationSystem?.error('Errore export: ' + error.message);
    }
}

// Format helpers
function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Stats order management
function saveStatsOrder() {
    const cards = document.querySelectorAll('.sol-stat-card');
    const order = Array.from(cards).map(card => card.dataset.id);
    localStorage.setItem('trackingStatsOrder', JSON.stringify(order));
}

function restoreStatsOrder() {
    const savedOrder = localStorage.getItem('trackingStatsOrder');
    if (!savedOrder) return;
    
    try {
        const order = JSON.parse(savedOrder);
        const statsGrid = document.getElementById('statsGrid');
        const cards = Array.from(statsGrid.querySelectorAll('.sol-stat-card'));
        
        cards.sort((a, b) => {
            const aIndex = order.indexOf(a.dataset.id);
            const bIndex = order.indexOf(b.dataset.id);
            return aIndex - bIndex;
        });
        
        cards.forEach(card => statsGrid.appendChild(card));
    } catch (e) {
        console.error('Error restoring stats order:', e);
    }
}

// Auto refresh
function startAutoRefresh() {
    // Refresh every 5 minutes
    setInterval(() => {
        loadTrackings();
    }, 5 * 60 * 1000);
}

// ====================
// HELPER FUNCTIONS MANCANTI
// ====================

// Create progress modal helper
function createProgressModal() {
    const modal = document.createElement('div');
    modal.id = 'progressModal';
    modal.innerHTML = `
        <div class="sol-modal-overlay">
            <div class="sol-modal sol-modal-medium">
                <div class="sol-modal-header">
                    <h3 class="sol-modal-title">Aggiornamento Tracking</h3>
                </div>
                <div class="sol-modal-body">
                    <div class="sol-progress">
                        <div id="progressBar" class="sol-progress-bar" style="width: 0%"></div>
                    </div>
                    <p id="progressText" class="sol-progress-text">Inizializzazione...</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

// Update progress modal helper
function updateProgressModal(progress) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar && progressText) {
        const percentage = Math.round((progress.completed / progress.total) * 100);
        progressBar.style.width = percentage + '%';
        progressText.textContent = `Aggiornati ${progress.completed} di ${progress.total} tracking`;
    }
}

// Make loadTrackings globally available for import
window.loadTrackings = loadTrackings;
window.refreshTrackingList = loadTrackings; // Alias per compatibilità
window.trackings = trackings; // Make trackings array available for debugging
// Esponi anche la funzione per i filtri
window.exportFilteredTrackings = exportFilteredTrackings;