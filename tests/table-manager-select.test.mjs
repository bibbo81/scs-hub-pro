import assert from 'assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal DOM mocks
const container = {
    id: 'tbl',
    innerHTML: '',
    addEventListener() {},
    querySelector() { return null; }
};

global.document = {
    getElementById(id) { return container; }
};

global.window = {};

global.localStorage = {
    getItem() { return null; },
    setItem() {}
};

// Load module via data URL to force ESM interpretation
const code = readFileSync(join(__dirname, '../core/table-manager.js'), 'utf8');
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const { TableManager } = await import(moduleUrl);

// Disable rendering and events for the test
TableManager.prototype.render = function() {};
TableManager.prototype.attachEventListeners = function() {};
TableManager.prototype.enableColumnDrag = function() {};
TableManager.prototype.initAdvancedSearch = function() {};
TableManager.prototype.loadColumnOrder = function() {};

const tm = new TableManager('tbl', { selectable: true });

tm.setData([
    { id: 'a1b2', name: 'One' },
    { id: 'c3d4', name: 'Two' }
]);

tm.selectRow('a1b2', true);
assert.deepStrictEqual(tm.getSelectedRows().map(r => r.id), ['a1b2']);

tm.selectRow('c3d4', true);
assert.ok(tm.renderSelectAllHeader().includes('checked'));

console.log('TableManager UUID select test passed');
