/**
 * Génère le QR code du site, en SVG (vectoriel, pour l'imprimeur) et en PNG (2048 px).
 * Usage : node tools/make-qr.mjs <adresse> [dossier de sortie]
 * Encre du site sur fond blanc, marge de quatre modules et correction d'erreur Q (25 %) :
 * le code reste lisible sur une étiquette, même un peu abîmé. Ne pas le recolorer en doré ni l'inverser.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import QRCode from 'qrcode';

const [url, out = '.'] = process.argv.slice(2);
if (!url || !/^https:\/\//.test(url)) {
  console.error('Usage : node tools/make-qr.mjs https://adresse-du-site [dossier de sortie]');
  process.exit(1);
}

const options = { errorCorrectionLevel: 'Q', margin: 4, color: { dark: '#131209', light: '#ffffff' } };
const name = `qr-${new URL(url).hostname.replace(/[^a-z0-9]+/gi, '-')}`;
await mkdir(out, { recursive: true });
await writeFile(join(out, `${name}.svg`), await QRCode.toString(url, { ...options, type: 'svg' }));
await QRCode.toFile(join(out, `${name}.png`), url, { ...options, width: 2048 });
console.log(`${join(out, name)}.svg et .png → ${url}`);
