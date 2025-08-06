class AutoUpdateScheduler {
    constructor() {
        this.isRunning = false;
        this.nextUpdateTime = null;
        this.updateIntervals = [
            { hour: 9, minute: 0 },   // 09:00
            { hour: 15, minute: 0 }   // 15:00
        ];
        this.checkInterval = null;
        this.statusElement = null;
    }

    init() {
        console.log('🤖 Initializing Auto Update Scheduler...');
        this.createStatusIndicator();
        this.scheduleNextUpdate();
        this.startPeriodicCheck();
        
        // Bind to window for manual access
        window.autoUpdateScheduler = this;
    }

    createStatusIndicator() {
    // Prova a integrare nell'header esistente
    const header = document.querySelector('.sol-header .container-fluid');
    const searchSection = document.querySelector('.header-search');
    
    if (header && searchSection) {
        // Crea l'indicatore nell'header
        const indicator = document.createElement('div');
        indicator.id = 'auto-update-status';
        indicator.className = 'auto-update-indicator';
        indicator.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 6px 12px;
            font-size: 12px;
            color: white;
            margin-left: 15px;
            white-space: nowrap;
        `;
        
        // Inserisci dopo la search section
        searchSection.parentNode.insertBefore(indicator, searchSection.nextSibling);
        
        this.statusElement = indicator;
        console.log('🤖 Auto-update indicator added to header');
    } else {
        // Fallback: Crea un indicatore minimale in basso a destra
        this.createMinimalIndicator();
    }
    
    this.updateStatusDisplay();
}

createMinimalIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'auto-update-status';
    indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #343a40;
        color: white;
        border-radius: 25px;
        padding: 8px 16px;
        font-size: 11px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
    `;
    
    // Click per espandere/ridurre
    indicator.addEventListener('click', () => {
        const isExpanded = indicator.dataset.expanded === 'true';
        indicator.dataset.expanded = !isExpanded;
        this.updateStatusDisplay();
    });
    
    document.body.appendChild(indicator);
    this.statusElement = indicator;
    console.log('🤖 Minimal auto-update indicator created');
}

updateStatusDisplay() {
    if (!this.statusElement) return;

    const now = new Date();
    const nextUpdateStr = this.nextUpdateTime ? 
        this.nextUpdateTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 
        'Non programmato';

    const isExpanded = this.statusElement.dataset?.expanded === 'true';
    const isInHeader = this.statusElement.parentNode?.classList?.contains('container-fluid');

    if (isInHeader) {
        // Versione per header - sempre compatta
        this.statusElement.innerHTML = `
            <i class="fas fa-robot" style="color: ${this.isRunning ? '#28a745' : '#6c757d'}"></i>
            <span>Auto: ${nextUpdateStr}</span>
        `;
    } else {
        // Versione floating - espandibile
        if (isExpanded) {
            this.statusElement.innerHTML = `
                <i class="fas fa-robot" style="color: ${this.isRunning ? '#28a745' : '#6c757d'}"></i>
                <div>
                    <div style="font-weight: 600;">Auto-Update</div>
                    <div style="font-size: 10px; opacity: 0.8;">Prossimo: ${nextUpdateStr}</div>
                    <div style="font-size: 10px; opacity: 0.8;">
                        ${this.isRunning ? 'In corso...' : 'Inattivo'}
                    </div>
                </div>
            `;
        } else {
            this.statusElement.innerHTML = `
                <i class="fas fa-robot" style="color: ${this.isRunning ? '#28a745' : '#6c757d'}"></i>
                <span>${nextUpdateStr}</span>
            `;
        }
    }
}

    updateStatusDisplay() {
        if (!this.statusElement) return;

        const now = new Date();
        const nextUpdateStr = this.nextUpdateTime ? 
            this.nextUpdateTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 
            'Non programmato';

        this.statusElement.innerHTML = `
            <i class="fas fa-robot" style="color: ${this.isRunning ? '#28a745' : '#6c757d'}"></i>
            <span>Prossimo aggiornamento: ${nextUpdateStr}</span>
        `;
    }

    scheduleNextUpdate() {
        const now = new Date();
        let nextUpdate = null;

        // Trova il prossimo orario di aggiornamento
        for (const timeSlot of this.updateIntervals) {
            const candidateTime = new Date(now);
            candidateTime.setHours(timeSlot.hour, timeSlot.minute, 0, 0);

            // Se l'orario è già passato oggi, prova domani
            if (candidateTime <= now) {
                candidateTime.setDate(candidateTime.getDate() + 1);
            }

            if (!nextUpdate || candidateTime < nextUpdate) {
                nextUpdate = candidateTime;
            }
        }

        this.nextUpdateTime = nextUpdate;
        this.updateStatusDisplay();

        console.log(`🤖 Next auto-update scheduled for: ${nextUpdate.toLocaleString('it-IT')}`);
    }

    startPeriodicCheck() {
        // Controlla ogni minuto se è ora di aggiornare
        this.checkInterval = setInterval(() => {
            this.checkIfUpdateTime();
        }, 60000); // Ogni minuto

        console.log('🤖 Periodic check started (every minute)');
    }

    async checkIfUpdateTime() {
        const now = new Date();
        
        if (this.nextUpdateTime && now >= this.nextUpdateTime) {
            console.log('🤖 Starting scheduled auto-update...');
            await this.runAutoUpdate();
            this.scheduleNextUpdate(); // Programma il prossimo aggiornamento
        }

        this.updateStatusDisplay();
    }

    async runAutoUpdate() {
        if (this.isRunning) {
            console.log('🤖 Auto-update already running, skipping...');
            return;
        }

        this.isRunning = true;
        this.updateStatusDisplay();

        try {
            // Mostra notifica di inizio
            if (window.notificationSystem) {
                window.notificationSystem.info('🤖 Aggiornamento automatico tracking iniziato...', { 
                    duration: 3000 
                });
            }

            // Recupera tutti i tracking attivi
            const trackings = await window.dataManager.getTrackings({
                // status: ['in_transit', 'at_port', 'sailing'] // Solo quelli non completati
            });

            const containerTrackings = trackings.filter(t => 
                t.tracking_type === 'container' && 
                !['delivered', 'completed', 'cancelled'].includes(t.status?.toLowerCase())
            );

            console.log(`🤖 Found ${containerTrackings.length} containers to update`);

            let successCount = 0;
            let errorCount = 0;

            for (const tracking of containerTrackings) {
                try {
                    await this.updateSingleTracking(tracking);
                    successCount++;
                    
                    // Pausa tra le richieste per non sovraccaricare l'API
                    await this.sleep(2000); // 2 secondi tra le richieste
                    
                } catch (error) {
                    console.error(`🤖 Failed to update ${tracking.tracking_number}:`, error);
                    errorCount++;
                }
            }

            // Mostra risultati
            const message = `🤖 Aggiornamento completato: ${successCount} successi, ${errorCount} errori`;
            
            if (window.notificationSystem) {
                if (errorCount === 0) {
                    window.notificationSystem.success(message);
                } else {
                    window.notificationSystem.warning(message);
                }
            }

            // Ricarica la tabella se visibile
            if (window.loadTrackings) {
                window.loadTrackings();
            }

            console.log(`🤖 Auto-update completed: ${successCount}/${containerTrackings.length} updated`);

        } catch (error) {
            console.error('🤖 Auto-update failed:', error);
            
            if (window.notificationSystem) {
                window.notificationSystem.error('🤖 Errore durante aggiornamento automatico');
            }
        } finally {
            this.isRunning = false;
            this.updateStatusDisplay();
        }
    }

    async updateSingleTracking(tracking) {
        if (!window.trackingService) {
            throw new Error('TrackingService not available');
        }

        // Usa il tracking service per recuperare dati aggiornati
        const result = await window.trackingService.track(
            tracking.tracking_number,
            'container',
            {
                operation: 'get',
                carrier: tracking.carrier_code,
                carrier_name: tracking.carrier_name
            }
        );

        if (!result || !result.success) {
            throw new Error(result?.apiError || 'Failed to get tracking data');
        }

        // Aggiungi marker per identificare aggiornamento automatico
        const updateData = {
            ...result,
            last_auto_update: new Date().toISOString(),
            updated_by_robot: true
        };
        delete updateData.success;

        // Aggiorna nel database
        const updateResult = await window.dataManager.updateExistingTracking(tracking.id, updateData);
        
        console.log(`🤖 Updated ${tracking.tracking_number}: ${updateResult.tracking.status}`);
        return updateResult;
    }

    async runManualUpdate(trackingId) {
        try {
            // Trova il tracking
            const trackings = await window.dataManager.getTrackings();
            const tracking = trackings.find(t => t.id === trackingId);
            
            if (!tracking) {
                throw new Error('Tracking not found');
            }

            console.log(`🔄 Manual update for ${tracking.tracking_number}`);
            
            // Mostra indicatore di loading
            const button = document.querySelector(`[data-tracking-id="${trackingId}"] .btn-update`);
            if (button) {
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                button.disabled = true;
            }

            await this.updateSingleTracking(tracking);

            // Mostra successo
            if (window.notificationSystem) {
                window.notificationSystem.success(`📦 ${tracking.tracking_number} aggiornato!`);
            }

            // Ricarica la riga nella tabella
            if (window.loadTrackings) {
                window.loadTrackings();
            }

        } catch (error) {
            console.error('Manual update failed:', error);
            
            if (window.notificationSystem) {
                window.notificationSystem.error(`Errore aggiornamento: ${error.message}`);
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Metodi per controllo manuale
    start() {
        if (!this.checkInterval) {
            this.startPeriodicCheck();
        }
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        this.updateStatusDisplay();
    }

    // Test manuale
    async testUpdate() {
        console.log('🧪 Running test auto-update...');
        await this.runAutoUpdate();
    }
}

// Auto-inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    const scheduler = new AutoUpdateScheduler();
    scheduler.init();
});

export default AutoUpdateScheduler;