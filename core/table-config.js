// table-config.js - shared table columns and formatters
export function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    return date.toLocaleDateString('it-IT');
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

