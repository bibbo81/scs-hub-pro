// pages/tracking/table-columns-legacy.js

// Status display mapping
const STATUS_DISPLAY = {
    'in_transit': { label: 'In Transito', class: 'primary', icon: 'fa-truck' },
    'delivered': { label: 'Consegnato', class: 'success', icon: 'fa-check-circle' },
    'registered': { label: 'Registrato', class: 'info', icon: 'fa-clipboard-check' },
    'customs_cleared': { label: 'Sdoganato', class: 'success', icon: 'fa-stamp' },
    'out_for_delivery': { label: 'In Consegna', class: 'warning', icon: 'fa-truck' },
    'arrived': { label: 'Arrivato', class: 'primary', icon: 'fa-anchor' },
    'delayed': { label: 'In Ritardo', class: 'danger', icon: 'fa-exclamation-triangle' },
    'exception': { label: 'Eccezione', class: 'warning', icon: 'fa-exclamation' },
    'pending': { label: 'In attesa', class: 'warning', icon: 'fa-clock' }
};

const TABLE_COLUMNS = [
    { 
        key: 'tracking_number', 
        label: 'TRACKING NUMBER', 
        sortable: true,
        formatter: (value, row) => {
            const typeIcon = row.tracking_type === 'awb' || row.tracking_type === 'air_waybill' 
                ? 'fa-plane' : 'fa-ship';
            const typeColor = row.tracking_type === 'awb' || row.tracking_type === 'air_waybill'
                ? 'text-info' : 'text-primary';
            return `<i class="fas ${typeIcon} ${typeColor} mr-1"></i> <strong>${value}</strong>`;
        }
    },
    { 
        key: 'tracking_type', 
        label: 'TIPO', 
        sortable: true,
        formatter: (value) => {
            const types = {
                'container': { icon: 'fa-cube', text: 'MARE', color: 'primary' },
                'bl': { icon: 'fa-file-alt', text: 'B/L', color: 'info' },
                'awb': { icon: 'fa-plane', text: 'AEREO', color: 'warning' },
                'air_waybill': { icon: 'fa-plane', text: 'AEREO', color: 'warning' },
                'parcel': { icon: 'fa-box', text: 'PARCEL', color: 'success' }
            };
            const config = types[value] || { icon: 'fa-question', text: value || 'N/A', color: 'secondary' };
            return `<span class="badge badge-${config.color}">
                <i class="fas ${config.icon}"></i> ${config.text}
            </span>`;
        }
    },
    { 
        key: 'current_status', 
        label: 'STATO', 
        sortable: true, 
        formatter: (value, row) => {
            // Prova current_status o status
            const status = value || row.current_status || row.status || 'pending';
            return formatStatus(status);
        }
    },
    { 
        key: 'carrier_name', 
        label: 'CARRIER', 
        sortable: true,
        formatter: (value, row) => {
            // CERCA IN TUTTI I CAMPI POSSIBILI
            const carrier = value || 
                row.carrier_name || 
                row.metadata?.mapped?.carrier_name ||
                row.mapped?.carrier_name ||
                row.carrier || 
                row.carrier_code || 
                '-';
            
            // Per AWB usa airline se disponibile
            if ((row.tracking_type === 'awb' || row.tracking_type === 'air_waybill') && row.airline) {
                return row.airline;
            }
            
            return carrier;
        }
    },
    { 
        key: 'origin_port', 
        label: 'ORIGINE', 
        sortable: true,
        formatter: (value, row) => {
            if (row.tracking_type === 'awb' || row.tracking_type === 'air_waybill') {
                return row.origin_name ||
                    row.metadata?.origin_name ||
                    row.metadata?.['Origin Name'] ||
                    row.origin_port ||
                    value || '-';
            }
            // Per SEA: usa Port Of Loading
            return row.port_of_loading ||
                row.metadata?.port_of_loading ||
                row.metadata?.['Port Of Loading'] ||
                row.origin_port ||
                value || '-';
        }
    },
    { 
        key: 'destination_port', 
        label: 'DESTINAZIONE', 
        sortable: true,
        formatter: (value, row) => {
            if (row.tracking_type === 'awb' || row.tracking_type === 'air_waybill') {
                return row.destination_name ||
                    row.metadata?.destination_name ||
                    row.metadata?.['Destination Name'] ||
                    row.destination_port ||
                    value || '-';
            }
            // Per SEA: usa Port Of Discharge
            return row.port_of_discharge ||
                row.metadata?.port_of_discharge ||
                row.metadata?.['Port Of Discharge'] ||
                row.destination_port ||
                value || '-';
        }
    },
    { 
        key: 'date_of_departure', 
        label: 'PARTENZA', 
        sortable: true,
        formatter: (value, row) => {
            let date;
            // UNIFICATO: Per SEA usa Date Of Loading, per AIR usa Date Of Departure
            if (row.tracking_type === 'container' || row.tracking_type === 'bl') {
                date = row.date_of_loading || 
                    row.metadata?.date_of_loading ||
                    row.metadata?.['Date Of Loading'] ||
                    row.departure ||
                    value;
            } else {
                date = row.date_of_departure || 
                    row.metadata?.date_of_departure ||
                    row.metadata?.['Date Of Departure'] ||
                    row.departure ||
                    value;
            }
            return formatDateOnly(date);
        }
    },
    { 
        key: 'eta', 
        label: 'ETA', 
        sortable: true,
        formatter: (value, row) => {
            let date;
            if (row.tracking_type === 'awb' || row.tracking_type === 'air_waybill') {
                date = row.date_of_arrival || 
                    row.metadata?.date_of_arrival ||
                    row.metadata?.['Date Of Arrival'] ||
                    row.eta ||
                    value;
            } else {
                date = row.date_of_discharge || 
                    row.metadata?.date_of_discharge ||
                    row.metadata?.['Date Of Discharge'] ||
                    row.eta ||
                    value;
            }
            if (!date) return '-';
            const formattedDate = formatDateOnly(date);
            try {
                const etaDate = new Date(date);
                const today = new Date();
                const diffDays = Math.ceil((etaDate - today) / (1000 * 60 * 60 * 24));
                if (diffDays > 0 && diffDays < 30) {
                    return `${formattedDate} <small class="text-muted">(${diffDays}g)</small>`;
                }
            } catch (e) {}
            return formattedDate;
        }
    },
    { 
        key: 'last_update', 
        label: 'ULTIMO AGGIORNAMENTO', 
        sortable: true, 
        formatter: formatDate 
    },
    { 
        key: 'reference_number', 
        label: 'RIFERIMENTO', 
        sortable: true,
        formatter: (value) => value || '-'
    },
    { 
        key: 'booking', 
        label: 'BOOKING', 
        sortable: true,
        formatter: (value, row) => {
            if (row.tracking_type === 'awb' || row.tracking_type === 'air_waybill') return '-';
            return value || '-';
        }
    },
    { 
        key: 'transit_time', 
        label: 'TRANSITO', 
        sortable: true,
        formatter: (value) => {
            if (!value) return '-';
            return `<span class="badge badge-secondary">${value}</span>`;
        }
    },
    { 
        key: 'co2_emission', 
        label: 'CO₂', 
        sortable: true,
        formatter: (value) => {
            if (!value) return '-';
            const num = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
            if (isNaN(num)) return value;
            const color = num > 2 ? 'danger' : num > 1 ? 'warning' : 'success';
            return `<span class="text-${color}"><i class="fas fa-leaf"></i> ${num.toFixed(2)}t</span>`;
        }
    },
    { 
        key: 'container_count', 
        label: 'N°', 
        sortable: true,
        formatter: (value, row) => {
            if (row.tracking_type === 'awb' || row.tracking_type === 'air_waybill') return '-';
            return value || '1';
        }
    },
    { 
        key: 'tags', 
        label: 'TAGS', 
        sortable: true,
        formatter: (value) => {
            if (!value || value === '-') return '-';
            return value.split(',').map(tag => 
                `<span class="badge badge-secondary mr-1">${tag.trim()}</span>`
            ).join('');
        }
    },
    { 
        key: 'actions', 
        label: 'AZIONI', 
        sortable: false,
        formatter: (value, row) => 
            `<div class="btn-group btn-group-sm">
                <button class="btn btn-primary btn-sm" onclick="refreshTracking('${row.id}')" title="Aggiorna">
                    <i class="fas fa-sync"></i>
                </button>
                <button class="btn btn-info btn-sm" onclick="viewDetails('${row.id}')" title="Dettagli">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteTracking('${row.id}')" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </div>`
    }
];

// Formatters
function formatStatus(value) {
    const status = STATUS_DISPLAY[value] || { label: value || 'Sconosciuto', class: 'secondary', icon: 'fa-question' };
    return `<span class="badge badge-${status.class}">
        <i class="fas ${status.icon} mr-1"></i>${status.label}
    </span>`;
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    const formattedDate = date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    if (diffDays > 0 && diffDays < 30) {
        return `${formattedDate} <small class="text-muted">(${diffDays}g)</small>`;
    }
    return formattedDate;
}

function formatDateOnly(dateStr) {
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
    } catch (e) {}
    return dateStr;
}

// Esporta la configurazione per uso in altri file
export { TABLE_COLUMNS, formatStatus, formatDate, formatDateOnly };
