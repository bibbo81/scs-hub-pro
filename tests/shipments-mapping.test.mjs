import assert from 'assert';

global.window = {};
await import('../pages/shipments/shipments-unified-mapping.js');

function convert(row) {
    const mapped = {};
    for (const [key, value] of Object.entries(row)) {
        const norm = window.ShipmentUnifiedMapping.mapColumn(key);
        mapped[norm] = value;
    }
    const get = (name, def = null) =>
        mapped[name] !== undefined && mapped[name] !== null && mapped[name] !== ''
            ? mapped[name]
            : def;

    return {
        shipmentNumber: get('shipment_number'),
        type: (get('type', 'container') || 'container').toLowerCase(),
        status: window.ShipmentUnifiedMapping.mapStatus(get('status', 'planned')),
        carrier: {
            code: get('carrier_code'),
            name: get('carrier_name'),
            service: get('service')
        },
        route: {
            origin: {
                port: get('origin_port'),
                name: get('origin_name')
            },
            destination: {
                port: get('destination_port'),
                name: get('destination_name')
            },
            via: get('via') ? get('via').split(',').map(s => s.trim()) : [],
            estimatedTransit: parseInt(get('transit_days')) || 0
        },
        schedule: {
            etd: get('etd'),
            eta: get('eta')
        },
        costs: {
            oceanFreight: parseFloat(get('ocean_freight')) || 0,
            bunkerSurcharge: parseFloat(get('bunker_surcharge')) || 0,
            portCharges: parseFloat(get('port_charges')) || 0,
            customs: parseFloat(get('customs')) || 0,
            insurance: parseFloat(get('insurance')) || 0,
            total: parseFloat(get('total_cost')) || 0,
            currency: get('currency') || 'EUR'
        }
    };
}

const sample = {
    'Numero Spedizione': '123',
    'Tipo': 'Container',
    'Stato': 'Partita',
    'Codice Vettore': 'MSK',
    'Nome Vettore': 'Maersk',
    'Servizio': 'AE7',
    'Porto Origine': 'CNSHA',
    'Origin Name': 'Shanghai',
    'Porto Destinazione': 'ITGOA',
    'Destination Name': 'Genova',
    'Scali': 'SGSIN,NLRTM',
    'Giorni Transito': '28',
    'Partenza Stimata': '2024-02-15',
    'Arrivo Stimato': '2024-03-10',
    'Nolo Marittimo': '2850',
    'Bunker': '425',
    'Spese Portuali': '180',
    'Dogana': '120',
    'Assicurazione': '95',
    'Costo Totale': '3670',
    'Valuta': 'EUR'
};

const result = convert(sample);
assert.strictEqual(result.shipmentNumber, '123');
assert.strictEqual(result.status, 'departed');
assert.strictEqual(result.carrier.code, 'MSK');
assert.strictEqual(result.route.origin.port, 'CNSHA');
assert.strictEqual(result.route.via.length, 2);

console.log('Shipments mapping tests passed');