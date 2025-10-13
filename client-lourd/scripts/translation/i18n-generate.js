const fs = require('fs');
const p = require('path');
const inDir = 'src/assets/i18n';
const baseLang = 'fr';
const repo = process.cwd();
const outRoot = p.join(repo, 'scripts', 'translation', 'out');

const ensure = (d) => fs.mkdirSync(d, { recursive: true });

const flat = (o, pre = '', out = {}) => {
    for (const [k, v] of Object.entries(o)) {
        const key = pre ? pre + '.' + k : k;
        if (typeof v === 'string') out[key] = v;
        else if (v && typeof v === 'object') flat(v, key, out);
    }
    return out;
};

const k = (s) => {
    let t = s.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_');
    if (/^[0-9]/.test(t)) t = 'k_' + t;
    return t.toLowerCase();
};

const applyParams = (s) => {
    const params = [];
    const text = s.replace(/{{\s*([^}]+)\s*}}/g, (_, name) => {
        let idx = params.indexOf(name);
        if (idx === -1) {
            params.push(name);
            idx = params.length - 1;
        }
        return `%${idx + 1}$s`;
    });
    return text;
};

const esc = (s) =>
    s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/%(?!\d+\$s)/g, '%%');

const gen = (lang) => {
    const file = p.join(repo, inDir, lang + '.json');
    if (!fs.existsSync(file)) return;

    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    const f = flat(json);

    const lines = Object.entries(f)
        .map(([jk, v]) => {
            const val = esc(applyParams(v));
            return `    <string name="${k(jk)}">${val}</string>`;
        })
        .join('\n');

    const xml = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${lines}\n</resources>\n`;
    const dir = p.join(outRoot, lang === baseLang ? 'values' : 'values-' + lang);
    ensure(dir);
    fs.writeFileSync(p.join(dir, 'strings.xml'), xml, 'utf8');
    console.log('ok', lang);
};

ensure(outRoot);
['en', 'fr'].forEach(gen);
