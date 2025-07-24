import dataManager from '/core/services/data-manager.js';
import headerComponent from '/core/header-component.js';
import TableManager from '/core/table-manager.js';

document.addEventListener('DOMContentLoaded', async () => {
    await headerComponent.init();
    await dataManager.init();

    const tableConfig = {
        columns: [
            { key: 'shipment_number', label: 'Numero Tracking', sortable: true },
            { key: 'carrier.name', label: 'Spedizioniere', sortable: true },
            { key: 'total_cost', label: 'Costo Totale', sortable: true, formatter: (value) => `€ ${value?.toFixed(2) || '0.00'}` },
            {
                key: 'actions',
                label: 'Azioni',
                sortable: false,
                formatter: (value, row) => `<a href="/shipment-details.html?id=${row.id}" class="sol-btn sol-btn-primary sol-btn-sm">Dettagli</a>`
            }
        ]
    };

    const tableManager = new TableManager('costs-table-container', tableConfig);
    window.registerTableManager('costs-table-container', tableManager);

    tableManager.loading(true);
    const shipments = await dataManager.getShipments();
    tableManager.setData(shipments);
    tableManager.loading(false);
});