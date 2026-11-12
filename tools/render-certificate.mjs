/**
 * Génère un certificat d'exemple en PDF, avec le même code que la page « merci », pour contrôler la mise en page hors navigateur.
 * Usage : node tools/render-certificate.mjs [sortie.pdf] [cadeau]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';

/* Les modules du site s'importent sans extension (résolution de Vite) : on ajoute « .ts » pour Node. */
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith('.') && !/\.\w+$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
      throw error;
    }
  },
});

const root = new URL('..', import.meta.url);
const json = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const { renderPdf } = await import('../src/scripts/certificate/pdf.ts');
const { formules } = await import('../src/data/content.ts');

const out = process.argv[2] ?? 'certificat-exemple.pdf';
const gift = process.argv[3] === 'cadeau';
const files = { display: 'vidaloka/files/vidaloka', text: 'manrope/files/manrope', label: 'manrope/files/manrope' };
const weights = { display: 400, text: 400, label: 600 };

const bytes = await renderPdf(
  {
    recipient: gift ? 'Éléonore de Saint Exupéry' : 'Camille Martin',
    giver: gift ? 'Antoine et Zoë' : undefined,
    message: gift ? 'Pour tes quarante ans, une année au rythme de la vigne et une journée de vendanges à partager.' : undefined,
    formule: formules[1],
    start: new Date(2026, 10, 12),
    reference: 'MHX4K2A9',
  },
  {
    ranges: {
      display: await json('node_modules/@fontsource/vidaloka/unicode.json'),
      text: await json('node_modules/@fontsource/manrope/unicode.json'),
    },
    loadFont: (font, subset) => readFile(new URL(`node_modules/@fontsource/${files[font]}-${subset}-${weights[font]}-normal.woff`, root)),
    palette: { ink: [0.075, 0.071, 0.035], muted: [0.341, 0.318, 0.29], wine: [0.478, 0.086, 0.161], gold: [0.796, 0.647, 0.42] },
  },
);
await writeFile(out, bytes);
console.log(`${out} : ${bytes.length} octets`);
