// node --import jif/register app.js  -- teaches Node the `jif` keyword.
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { jif, transform } from './index.js';

globalThis.__jif = jif;

registerHooks({
  load(url, context, nextLoad) {
    const r = nextLoad(url, context);
    if (!url.startsWith('file:') || url.includes('/node_modules/') || !['module', 'commonjs'].includes(r.format)) return r;
    const src = String(r.source ?? readFileSync(fileURLToPath(url)));
    return /\bjif\s*\(/.test(src) ? { ...r, source: transform(src) } : r;
  },
});
