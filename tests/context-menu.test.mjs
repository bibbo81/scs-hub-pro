import assert from 'assert';
import { showContextMenu } from '../core/components/context-menu.mjs';

const document = {
    body: {
        children: [],
        appendChild(el) { this.children.push(el); el.parent = this; },
        removeChild(el) { this.children = this.children.filter(c => c !== el); }
    },
    head: {
        children: [],
        appendChild(el) { this.children.push(el); el.parent = this; }
    },
    createElement(tag) {
        return {
            tagName: tag.toUpperCase(),
            children: [],
            style: {},
            className: '',
            appendChild(child) { this.children.push(child); child.parent = this; },
            remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); },
            classList: { add(cls) { this.className += this.className ? ' ' + cls : cls; } }
        };
    },
    addEventListener() {},
    removeEventListener() {},
    getElementById(id) {
        const all = [...this.body.children, ...this.head.children];
        const stack = [...all];
        while (stack.length) {
            const el = stack.pop();
            if (el.id === id) return el;
            stack.push(...(el.children || []));
        }
        return null;
    }
};

global.document = document;
global.window = {};

let executed = false;
showContextMenu([
    { label: 'Test', handler: () => { executed = true; } }
], { clientX: 5, clientY: 10, preventDefault() {}, stopPropagation() {} });

const menu = document.getElementById('productContextMenu');
assert.ok(menu);
menu.children[0].children[0].onclick();
assert.strictEqual(executed, true);

console.log('Context menu tests passed');