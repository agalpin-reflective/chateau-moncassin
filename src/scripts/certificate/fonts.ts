import type { FontKey } from './layout';

/**
 * Jeux de caractères des polices auto-hébergées (fichiers Fontsource découpés par plage Unicode).
 * Les plages viennent des fichiers unicode.json des paquets et sont fournies par l'appelant,
 * pour que ce module reste utilisable sous Node comme dans le navigateur.
 */
export type SubsetRanges = Record<string, string>;
export type FontRanges = Record<'display' | 'text', SubsetRanges>;

export const familyOf = (font: FontKey): 'display' | 'text' => (font === 'display' ? 'display' : 'text');

type Range = [number, number];
const parsed = new Map<string, Range[]>();
function parse(spec: string): Range[] {
  let ranges = parsed.get(spec);
  if (!ranges) {
    ranges = spec.split(',').map((part): Range => {
      const [from, to] = part.trim().replace(/^U\+/i, '').split('-');
      return [parseInt(from, 16), parseInt(to ?? from, 16)];
    });
    parsed.set(spec, ranges);
  }
  return ranges;
}
const includes = (spec: string, code: number) => parse(spec).some(([from, to]) => code >= from && code <= to);

/** Le latin de base d'abord : c'est le seul jeu toujours chargé. */
const ordered = (subsets: SubsetRanges) => Object.keys(subsets).sort((x, y) => Number(y === 'latin') - Number(x === 'latin'));

/** Le jeu de caractères qui contient ce caractère, ou null si la police ne l'a pas. */
export function subsetOf(char: string, subsets: SubsetRanges): string | null {
  const code = char.codePointAt(0) ?? 0;
  return ordered(subsets).find((name) => includes(subsets[name], code)) ?? null;
}

export const supports = (text: string, subsets: SubsetRanges) => Array.from(text).every((char) => subsetOf(char, subsets) !== null);

/** Découpe un texte en segments d'un même jeu de caractères. Un caractère absent de la police devient « ? ». */
export function runs(text: string, subsets: SubsetRanges): { subset: string; text: string }[] {
  const out: { subset: string; text: string }[] = [];
  for (const char of Array.from(text)) {
    const subset = subsetOf(char, subsets);
    const piece = subset ? char : '?';
    const name = subset ?? 'latin';
    const last = out[out.length - 1];
    if (last && last.subset === name) last.text += piece;
    else out.push({ subset: name, text: piece });
  }
  return out;
}

/** Les jeux à charger pour afficher ce texte (toujours le latin de base). */
export function subsetsFor(text: string, subsets: SubsetRanges): string[] {
  const needed = new Set(['latin']);
  for (const char of Array.from(text)) {
    const subset = subsetOf(char, subsets);
    if (subset) needed.add(subset);
  }
  return [...needed];
}
