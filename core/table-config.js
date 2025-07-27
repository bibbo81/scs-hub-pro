// table-config.js - shared table columns and formatters
export function formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('it-IT'); // "22/09/2024"
}

export function formatDateOnly(dateStr) {
    if (!dateStr || dateStr === '-') return '-';
    if (typeof dateStr === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        return dateStr;
    }
    if (typeof dateStr === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{1,2}/.test(dateStr)) {
        return dateStr.split(' ')[0];
    }
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('it-IT');
        }
    } catch {}
    return dateStr;
}

export function formatCurrency(amount, currency = 'EUR') {
    if (!amount) return '€0';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(amount);
}

export function getShipmentStatusClass(status) {
    const map = {
        planned: 'secondary',
        departed: 'info',
        in_transit: 'primary',
        arrived: 'warning',
        delivered: 'success',
        cancelled: 'danger'
    };
    return map[status] || 'secondary';
}

export function formatTrackingStatus(value) {
    // Utilizza la mappatura unificata se disponibile, altrimenti usa un fallback
    if (window.TrackingUnifiedMapping && window.TrackingUnifiedMapping.STATUS_DISPLAY_CONFIG) {
        const statusKey = window.TrackingUnifiedMapping.mapStatus(value || 'registered');
        const cfg = window.TrackingUnifiedMapping.STATUS_DISPLAY_CONFIG[statusKey] || window.TrackingUnifiedMapping.STATUS_DISPLAY_CONFIG['default'];
        return `<span class="badge badge-${cfg.class}"><i class="fas ${cfg.icon} mr-1"></i>${cfg.label}</span>`;
    }
    // Fallback per ambienti dove la mappatura unificata non è caricata
    const cfg = { label: value || 'Sconosciuto', class: 'secondary', icon: 'fa-question' };
    return `<span class="badge badge-${cfg.class}"><i class="fas ${cfg.icon} mr-1"></i>${cfg.label}</span>`;
}

export const shipmentsColumns = [
    { key: 'checkbox', label: '', sortable: false },
    { key: 'shipmentNumber', label: 'Rif. Spedizione', sortable: true },
    { key: 'type', label: 'Tipo', sortable: true },
    { key: 'status', label: 'Stato', sortable: true },
    { key: 'carrier', label: 'Vettore', sortable: true },
    { key: 'origin', label: 'Origine', sortable: true },
    { key: 'destination', label: 'Destinazione', sortable: true },
    { key: 'etd', label: 'ETD', sortable: true },
    { key: 'eta', label: 'ETA', sortable: true },
    { key: 'products', label: 'Prodotti', sortable: false },
    { key: 'documents', label: 'Docs', sortable: false },
    { key: 'commercial', label: 'PO/PI/CI', sortable: false },
    { key: 'totalCost', label: 'Costo Tot.', sortable: true },
    { key: 'actions', label: 'Azioni', sortable: false }
];

export const trackingsColumns = [
    {
        key: 'tracking_number',
        label: 'TRACKING NUMBER',
        sortable: true,
        formatter: (value, row) => {
            const typeIcon = row.tracking_type === 'awb' || row.tracking_type === 'air_waybill' ? 'fa-plane' : 'fa-ship';
            const typeColor = row.tracking_type === 'awb' || row.tracking_type === 'air_waybill' ? 'text-info' : 'text-primary';
            return `<i class="fas ${typeIcon} ${typeColor} mr-1"></i> <strong>${value}</strong>`;
        }
    },
    {
        key: 'tracking_type',
        label: 'TIPO',
        sortable: true,
        formatter: (value) => {
            const types = {
                container: { icon: 'fa-cube', text: 'MARE', color: 'primary' },
                bl: { icon: 'fa-file-alt', text: 'B/L', color: 'info' },
                awb: { icon: 'fa-plane', text: 'AEREO', color: 'warning' },
                air_waybill: { icon: 'fa-plane', text: 'AEREO', color: 'warning' },
                parcel: { icon: 'fa-box', text: 'PARCEL', color: 'success' }
            };
            const cfg = types[value] || { icon: 'fa-question', text: value || 'N/A', color: 'secondary' };
            return `<span class="badge badge-${cfg.color}"><i class="fas ${cfg.icon}"></i> ${cfg.text}</span>`;
        }
    },
    {
        key: 'current_status',
        label: 'STATO',
        sortable: true,
        formatter: (value, row) => {
            const status = value || row.current_status || row.status || 'pending';
            return formatTrackingStatus(status);
        }
    },
    { key: 'carrier_name', label: 'CARRIER', sortable: true },
    { key: 'origin_port', label: 'ORIGINE', sortable: true },
    { key: 'destination_port', label: 'DESTINAZIONE', sortable: true },
    {
        key: 'date_of_departure',
        label: 'PARTENZA',
        sortable: true,
        formatter: (value) => formatDateOnly(value)
    },
    {
        key: 'eta',
        label: 'ETA',
        sortable: true,
        formatter: (value) => formatDateOnly(value)
    },
    { key: 'last_update', label: 'ULTIMO AGGIORNAMENTO', sortable: true, formatter: formatDate },
    { key: 'reference_number', label: 'RIFERIMENTO', sortable: true },
    { key: 'booking', label: 'BOOKING', sortable: true },
    { key: 'transit_time', label: 'TRANSITO', sortable: true },
    { key: 'co2_emission', label: 'CO₂', sortable: true },
    { key: 'container_count', label: 'N°', sortable: true },
    { key: 'tags', label: 'TAGS', sortable: true },
    {
        key: 'actions',
        label: 'AZIONI',
        sortable: false,
        formatter: (value, row) => `
            <div class="btn-group btn-group-sm">
                <button class="btn btn-primary btn-sm" onclick="refreshTracking('${row.id}')" title="Aggiorna">
                    <i class="fas fa-sync"></i>
                </button>
                <button class="btn btn-info btn-sm" onclick="viewDetails('${row.id}')" title="Dettagli">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteTracking('${row.id}')" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `
    }
];
