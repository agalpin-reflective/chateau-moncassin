import { logo } from '../../data/logo';
import { vine } from '../../data/vine';
import { certificate as copy } from '../../data/content';

/**
 * Le certificat de parrainage, décrit une seule fois comme une liste de tracés et de textes
 * sur une page A4 paysage (unités : points PDF, origine en haut à gauche).
 * Deux rendus lisent cette liste : svg.ts pour l'aperçu et l'impression, pdf.ts pour le fichier téléchargé.
 * Ce module ne touche ni au DOM ni au réseau : il tourne aussi sous Node (tools/render-certificate.mjs).
 */
export const PAGE = { width: 842, height: 595 } as const;

/** display : Vidaloka 400. text : Manrope 400. label : Manrope 600. */
export type FontKey = 'display' | 'text' | 'label';
export type ColorKey = 'ink' | 'muted' | 'wine' | 'gold';

export interface TextPrim {
  kind: 'text';
  /** Point d'ancrage : x selon l'alignement, y sur la ligne de base. */
  x: number;
  y: number;
  text: string;
  font: FontKey;
  size: number;
  color: ColorKey;
  align: 'start' | 'middle' | 'end';
  /** Interlettrage en points. */
  tracking?: number;
}

export interface PathPrim {
  kind: 'path';
  d: string;
  /** Origine du tracé sur la page, puis rotation (degrés, sens horaire) et échelle. */
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
  fill?: ColorKey;
  stroke?: ColorKey;
  /** Épaisseur du trait dans les unités du tracé (elle suit l'échelle). */
  width?: number;
}

export type Prim = TextPrim | PathPrim;

export interface CertificateData {
  /** Nom du parrain, tel qu'il doit figurer sur le certificat. */
  recipient: string;
  /** Renseigné quand le parrainage est offert. */
  giver?: string;
  message?: string;
  formule: { label: string; summary: string };
  /** Date de souscription : le parrainage court douze mois à partir de ce jour. */
  start: Date;
  reference?: string;
}

/** Ce que le rendu sait de ses polices : largeur d'un texte, et caractères disponibles. */
export interface TextEnv {
  measure(text: string, font: FontKey, size: number): number;
  supports(text: string, font: FontKey): boolean;
}

const formatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
/** « 1er novembre 2026 », « 12 novembre 2026 ». */
export const formatDate = (date: Date) => formatter.format(date).replace(/^1 /, '1er ');

export function endDate(start: Date, months: number): Date {
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return end;
}

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');

/** Tous les textes qui peuvent finir sur la page : le rendu PDF s'en sert pour choisir les jeux de caractères à charger. */
export function certificateText(data: CertificateData): string {
  return [data.recipient, data.giver, data.message, data.formule.label, data.formule.summary, data.reference, JSON.stringify(copy)]
    .filter(Boolean)
    .join(' ');
}

function wrap(text: string, font: FontKey, size: number, maxWidth: number, maxLines: number, env: TextEnv, balance = false): string[] {
  /* Texte centré : on resserre la largeur pour obtenir des lignes de longueur voisine plutôt qu'un mot orphelin. */
  if (balance) {
    const full = env.measure(text, font, size);
    const count = Math.min(maxLines, Math.ceil(full / maxWidth));
    if (count > 1) maxWidth = Math.min(maxWidth, (full / count) * 1.12);
  }
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (!line || env.measure(next, font, size) <= maxWidth) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && env.measure(`${last}…`, font, size) > maxWidth) last = last.slice(0, -1).trimEnd();
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

/** Le plus grand corps, entre max et min, qui fait tenir le texte dans la largeur. */
function fit(text: string, font: FontKey, max: number, min: number, maxWidth: number, env: TextEnv): number {
  const width = env.measure(text, font, max);
  return width <= maxWidth ? max : Math.max(min, (max * maxWidth) / width);
}

const circle = (r: number) => `M${-r} 0a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

/** Le pied de vigne à maturité, centré sur (cx, cy) à l'échelle k. */
function vinePrims(cx: number, cy: number, k: number): PathPrim[] {
  const ox = cx - (vine.box.x + vine.box.width / 2) * k;
  const oy = cy - (vine.box.y + vine.box.height / 2) * k;
  const at = (x: number, y: number) => ({ x: ox + x * k, y: oy + y * k });
  const whole = (d: string, stroke: ColorKey, width: number): PathPrim => ({ kind: 'path', d, x: ox, y: oy, scale: k, stroke, width });
  return [
    whole(vine.ground, 'muted', 1),
    whole(vine.trunk, 'ink', 1.6),
    whole(vine.arm, 'ink', 2.4),
    ...vine.shoots.map((d) => whole(d, 'ink', 1.6)),
    ...vine.leaves.map((l): PathPrim => ({ kind: 'path', d: vine.leaf, ...at(l.x, l.y), rotate: l.r, scale: k * l.s, stroke: 'ink', width: 1.3 })),
    ...vine.clusters.flatMap((x): PathPrim[] => [
      { kind: 'path', d: vine.stem, ...at(x, vine.clusterY), scale: k, stroke: 'ink', width: 1.4 },
      ...vine.berries.map((b): PathPrim => ({ kind: 'path', d: circle(vine.berryRadius), ...at(x + b.x, vine.clusterY + b.y), scale: k, fill: 'wine' })),
    ]),
  ];
}

export function buildCertificate(data: CertificateData, env: TextEnv): Prim[] {
  const { width: W, height: H } = PAGE;
  const cx = W / 2;
  const prims: Prim[] = [];
  const text = (t: Omit<TextPrim, 'kind'>) => prims.push({ kind: 'text', ...t });
  const gift = Boolean(data.giver);
  /* Sans dédicace, le texte central descend un peu pour équilibrer la page. */
  const dy = gift ? 0 : 18;

  // Cadre : un filet doré, puis un filet d'encre aux angles rentrants.
  const a = 28;
  const b = 37;
  const r = 9;
  prims.push({ kind: 'path', d: `M${a} ${a}H${W - a}V${H - a}H${a}Z`, x: 0, y: 0, stroke: 'gold', width: 1.2 });
  prims.push({
    kind: 'path',
    d: `M${b + r} ${b}H${W - b - r}a${r} ${r} 0 0 0 ${r} ${r}V${H - b - r}a${r} ${r} 0 0 0 ${-r} ${r}H${b + r}a${r} ${r} 0 0 0 ${-r} ${-r}V${b + r}a${r} ${r} 0 0 0 ${r} ${-r}Z`,
    x: 0,
    y: 0,
    stroke: 'ink',
    width: 0.5,
  });

  // En tête : le logo du château, le cercle, le titre.
  const logoWidth = 96;
  const logoScale = logoWidth / logo.width;
  prims.push({ kind: 'path', d: logo.path, x: cx - logoWidth / 2, y: 60, scale: logoScale, fill: 'ink', stroke: 'ink', width: 1.2 });
  text({ x: cx, y: 148, text: copy.club.toUpperCase(), font: 'label', size: 7.5, color: 'muted', align: 'middle', tracking: 2.6 });
  text({ x: cx, y: 190, text: copy.title, font: 'display', size: 34, color: 'ink', align: 'middle' });
  prims.push({ kind: 'path', d: 'M-28 0H28', x: cx, y: 207, stroke: 'gold', width: 1 });

  // Le texte du certificat.
  text({ x: cx, y: 236 + dy, text: copy.certifies, font: 'text', size: 11, color: 'muted', align: 'middle' });
  const nameFont: FontKey = env.supports(data.recipient, 'display') ? 'display' : 'text';
  const nameSize = fit(data.recipient, nameFont, nameFont === 'display' ? 44 : 38, 20, 620, env);
  text({ x: cx, y: 288 + dy, text: data.recipient, font: nameFont, size: nameSize, color: 'wine', align: 'middle' });
  text({ x: cx, y: 322 + dy, text: copy.statement, font: 'text', size: 12, color: 'ink', align: 'middle' });
  const period = fill(copy.period, { start: formatDate(data.start), end: formatDate(endDate(data.start, copy.months)) });
  text({ x: cx, y: 341 + dy, text: period, font: 'text', size: 12, color: 'ink', align: 'middle' });

  // La dédicace, quand le parrainage est offert.
  if (data.giver) {
    text({ x: cx, y: 372, text: fill(copy.giftFrom, { giver: data.giver }).toUpperCase(), font: 'label', size: 7.5, color: 'wine', align: 'middle', tracking: 2.2 });
    if (data.message) {
      wrap(`« ${data.message} »`, 'text', 10.5, 430, 2, env, true).forEach((line, i) =>
        text({ x: cx, y: 390 + i * 15, text: line, font: 'text', size: 10.5, color: 'muted', align: 'middle' }),
      );
    }
  }

  // Bas de page : la formule à gauche, le pied de vigne au centre, la date à droite.
  const baseY = 452;
  const left = 92;
  const right = W - 92;
  text({ x: left, y: baseY, text: copy.formuleLabel.toUpperCase(), font: 'label', size: 7, color: 'muted', align: 'start', tracking: 2.2 });
  text({ x: left, y: baseY + 22, text: data.formule.label, font: 'display', size: 17, color: 'ink', align: 'start' });
  wrap(data.formule.summary, 'text', 8.5, 200, 4, env).forEach((line, i) =>
    text({ x: left, y: baseY + 39 + i * 12, text: line, font: 'text', size: 8.5, color: 'muted', align: 'start' }),
  );

  prims.push({ kind: 'path', d: circle(47), x: cx, y: 476, stroke: 'gold', width: 1 });
  prims.push({ kind: 'path', d: circle(51.5), x: cx, y: 476, stroke: 'gold', width: 0.4 });
  prims.push(...vinePrims(cx, 478, 0.36));

  text({ x: right, y: baseY, text: copy.dateLabel.toUpperCase(), font: 'label', size: 7, color: 'muted', align: 'end', tracking: 2.2 });
  text({ x: right, y: baseY + 22, text: fill(copy.dated, { date: formatDate(data.start) }), font: 'display', size: 17, color: 'ink', align: 'end' });
  text({ x: right, y: baseY + 39, text: copy.house, font: 'text', size: 8.5, color: 'muted', align: 'end' });
  if (data.reference) {
    text({ x: right, y: baseY + 51, text: fill(copy.reference, { reference: data.reference }), font: 'text', size: 8.5, color: 'muted', align: 'end' });
  }

  text({ x: cx, y: H - 47, text: copy.legal, font: 'text', size: 6.2, color: 'muted', align: 'middle' });
  return prims;
}
