import assert from 'assert';

global.window = {};
// Minimal browser-like environment
global.window = {
    events: [],
    dispatchEvent(event) {
        this.events.push(event.type);
    },
    addEventListener() {}
};

global.document = { readyState: 'complete', addEventListener() {} };

global.localStorage = {
    store: {},
    getItem(key) { return this.store[key]; },
    setItem(key, val) { this.store[key] = String(val); },
    removeItem(key) { delete this.store[key]; }
};

// Disable intervals triggered by productSync
global.setInterval = () => 0;

await import('../pages/shipments/shipments-unified-mapping.js');
await import('/core/product-sync.js');

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
function extractProduct(row) {
    const mapped = {};
    for (const [key, value] of Object.entries(row)) {
        const norm = window.ShipmentUnifiedMapping.mapColumn
            ? window.ShipmentUnifiedMapping.mapColumn(key)
            : key.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        mapped[norm] = value;
    }

    const sku = mapped.sku || mapped.product_sku;
    const name = mapped.product_name || mapped.name || mapped.description;
    const quantity = parseFloat(mapped.quantity || mapped.qty || 0) || 0;
    const weight = parseFloat(mapped.weight || 0) || 0;
    const volume = parseFloat(mapped.volume || 0) || 0;
    const value = parseFloat(mapped.value || 0) || 0;

    if (!sku && !name) return null;

    return {
        sku,
        name: name || 'Unnamed Product',
        quantity,
        specifications: { weight, volume, value }
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

const aliasSample = {
    ShipmentNumber: '321',
    'Current Status': 'Loaded',
    CarrierName: 'MSC',
    ShippingLine: 'MSCU',
    'Port Of Loading': 'CNSHA',
    'Port Of Discharge': 'ITGOA',
    'Date Of Departure': '2024-02-20',
    'Date Of Arrival': '2024-03-15'
};

const aliasResult = convert(aliasSample);
assert.strictEqual(aliasResult.shipmentNumber, '321');
assert.strictEqual(aliasResult.status, 'in_transit');
assert.strictEqual(aliasResult.carrier.code, 'MSCU');
assert.strictEqual(aliasResult.carrier.name, 'MSC');
assert.strictEqual(aliasResult.route.origin.port, 'CNSHA');
assert.strictEqual(aliasResult.route.destination.port, 'ITGOA');

const productRow = {
    SKU: 'PROD1',
    Name: 'Widget',
    Quantity: '5',
    Weight: '1.2',
    Volume: '0.3',
    Value: '42'
};

const prod = extractProduct(productRow);
assert.strictEqual(prod.sku, 'PROD1');
assert.strictEqual(prod.quantity, 5);
assert.strictEqual(prod.specifications.weight, 1.2);

window.events = [];
const merged = window.productSync.mergeProducts([prod]);
assert.ok(Array.isArray(merged));
assert.strictEqual(merged.length, 1);
assert.ok(window.events.includes('productsSynced'));

console.log('Shipments mapping tests passed');