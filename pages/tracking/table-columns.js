
// /pages/tracking/table-columns.js

// Helper per formattare le date in modo consistente
function formatDate(value) {
    if (!value) return '-';
    try {
        return new Date(value).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return value; // Ritorna il valore originale se la data non è valida
    }
}

// Helper per formattare data e ora
function formatDateTime(value) {
    if (!value) return '-';
    try {
        return new Date(value).toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return value;
    }
}

// Helper per visualizzare lo stato con un badge
function formatStatus(status, allStatusStyles) {
    if (!status) return '';
    const style = allStatusStyles[status] || { label: status, class: 'secondary', icon: 'fa-question-circle' };
    return `<span class="badge badge-${style.class}"><i class="fas ${style.icon} mr-1"></i>${style.label}</span>`;
}

// Helper per il numero di tracking con icona del tipo
function formatTrackingNumber(value, row) {
    const isAir = row.tracking_type === 'air_waybill';
    const icon = isAir ? 'fa-plane' : 'fa-ship';
    const color = isAir ? 'text-info' : 'text-primary';
    return `<i class="fas ${icon} ${color} mr-2"></i><strong>${value}</strong>`;
}

// Definizione delle colonne della tabella
// Questa configurazione è "pulita": si aspetta che i dati siano già normalizzati.
export const TABLE_COLUMNS = [
    {
        key: 'tracking_number',
        label: 'Tracking Number',
        sortable: true,
        formatter: formatTrackingNumber
    },
    {
        key: 'current_status',
        label: 'Stato',
        sortable: true,
        // Il formattatore riceve i dati della riga e la configurazione degli stili
        formatter: (value, row, config) => formatStatus(value, config.statusDisplay)
    },
    {
        key: 'carrier_name',
        label: 'Carrier',
        sortable: true,
    },
    {
        key: 'origin', // Campo normalizzato
        label: 'Origine',
        sortable: true,
    },
    {
        key: 'destination', // Campo normalizzato
        label: 'Destinazione',
        sortable: true,
    },
    {
        key: 'eta',
        label: 'ETA',
        sortable: true,
        formatter: formatDate
    },
    {
        key: 'updated_at',
        label: 'Ultimo Aggiornamento',
        sortable: true,
        formatter: formatDateTime
    },
    {
        key: 'actions',
        label: 'Azioni',
        sortable: false,
        formatter: (value, row) => `
            <div class="btn-group btn-group-sm">
                <button class="btn btn-primary" onclick="window.trackingDebug.refreshById('${row.id}')" title="Aggiorna">
                    <i class="fas fa-sync"></i>
                </button>
                <button class="btn btn-info" onclick="window.trackingDebug.viewDetailsById('${row.id}')" title="Dettagli">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-danger" onclick="window.trackingDebug.deleteById('${row.id}')" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `
    }
];
