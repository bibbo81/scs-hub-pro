#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const replacements = [
    { regex: /\bpol\b/g, replacement: 'origin_port' },
    { regex: /\bpod\b/g, replacement: 'destination_port' },
    { regex: /Origin Port/g, replacement: 'Origin Port' },
    { regex: /Destination Port/g, replacement: 'Destination Port' }
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    replacements.forEach(({ regex, replacement }) => {
        if (regex.test(content)) {
            content = content.replace(regex, replacement);
            updated = true;
        }
    });
    if (updated) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', '.git', '.history', 'scripts'].includes(entry.name)) {
                return;
            }
            walk(p);
        } else if (entry.isFile()) {
            processFile(p);
        }
    });
}

walk(process.argv[2] || '.');
