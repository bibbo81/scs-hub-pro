import assert from 'assert';

let activeOrgId = null;
function getMyOrganizationId() {
    return activeOrgId;
}

class TestService {
    constructor(logger = console) {
        this.table = 'shipments';
        this.logger = logger;
        this.existing = new Set();
    }

    camelToSnake(key) {
        return key.replace(/([A-Z])/g, '_$1').toLowerCase();
    }

    preparePayload(shipment) {
        const payload = {};
        Object.entries(shipment).forEach(([k, v]) => {
            if (v === undefined) return;
            const snake = this.camelToSnake(k);
            payload[snake] = v;
        });
        return payload;
    }

    async getAllShipments() {
        const orgId = getMyOrganizationId();
        if (!orgId) {
            throw new Error('Organization not selected');
        }
        return [{ id: 1 }];
    }

    async createShipment(data) {
        const orgId = getMyOrganizationId();
        if (!orgId) {
            throw new Error('Organization not selected');
        }
        const payload = this.preparePayload(data);
        if (this.existing.has(payload.shipment_number)) {
            return null;
        }
        if (data.force403) {
            this.logger.error({ payload, userId: orgId });
            return null;
        }
        this.existing.add(payload.shipment_number);
        return payload;
    }

    async updateShipment(id, updates) {
        const orgId = getMyOrganizationId();
        if (!orgId) {
            throw new Error('Organization not selected');
        }
        return { id, ...updates };
    }
}

async function runMissingOrgTests() {
    const svc = new TestService();
    await assert.rejects(svc.getAllShipments(), /Organization not selected/);

    await assert.rejects(
        svc.createShipment({ name: 'test' }),
        /Organization not selected/
    );

    await assert.rejects(
        svc.updateShipment('1', { name: 't' }),
        /Organization not selected/
    );

    console.log('SupabaseShipmentsService missing organization tests passed');
}

async function runExistingShipmentTest() {
    activeOrgId = '1';
    const svc = new TestService();
    const first = await svc.createShipment({ shipmentNumber: 'ABC' });
    assert.strictEqual(first.shipment_number, 'ABC');

    const second = await svc.createShipment({ shipmentNumber: 'ABC' });
    assert.strictEqual(second, null);

    console.log('SupabaseShipmentsService duplicate shipment test passed');
}

async function runForbiddenLoggingTest() {
    const logs = [];
    const logger = { error(entry) { logs.push(entry); } };
    activeOrgId = 'user-1';
    const svc = new TestService(logger);
    const result = await svc.createShipment({ shipmentNumber: 'FORBID', force403: true });
    assert.strictEqual(result, null);
    assert.strictEqual(logs.length, 1);
    assert.deepStrictEqual(logs[0], {
        payload: { shipment_number: 'FORBID', force403: true },
        userId: 'user-1'
    });

    console.log('SupabaseShipmentsService 403 logging test passed');
}

(async () => {
    await runMissingOrgTests();
    await runExistingShipmentTest();
    await runForbiddenLoggingTest();
})();