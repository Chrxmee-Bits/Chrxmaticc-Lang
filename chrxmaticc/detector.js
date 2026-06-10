const path = require('path');
const fs = require('fs');

const ICON = path.resolve(__dirname, 'chrxmaticc.svg');

const VALID = new Set([
    '.chrxm', '.chrxg', '.chrxw', '.chrxi', '.chrxs',
    '.chrxmg', '.chrxmw', '.chrxmi', '.chrxms',
    '.chrxgw', '.chrxgi', '.chrxgs',
    '.chrxwi', '.chrxws',
    '.chrxsi',
    '.chrxmgw', '.chrxmgi', '.chrxmgs', '.chrxmwi', '.chrxmws',
    '.chrxgwi', '.chrxgws', '.chrxgsi',
    '.chrxwsi', '.chrxmsi',
    '.chrxmgwi', '.chrxmgws', '.chrxmgsi', '.chrxgwsi', '.chrxmwsi',
    '.chrxmaticc',
]);

function detect(filepath) {
    const ext = path.extname(filepath).toLowerCase();
    if (VALID.has(ext)) {
        return fs.existsSync(ICON) ? ICON : null;
    }
    return null;
}

module.exports = { detect };