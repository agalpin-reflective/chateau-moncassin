import vidalokaRanges from '@fontsource/vidaloka/unicode.json';
import manropeRanges from '@fontsource/manrope/unicode.json';
import { $, $$ } from '../lib/dom';
import { gsap, finePointer, motion } from '../lib/motion';
import { ease } from '../lib/ease';
import { loadOrder, saveOrder } from '../lib/order';
import type { Order } from '../lib/order';
import { buildCertificate } from '../certificate/layout';
import type { CertificateData, ColorKey, FontKey, TextEnv } from '../certificate/layout';
import { familyOf, supports } from '../certificate/fonts';
import type { FontRanges } from '../certificate/fonts';
import { renderSvg } from '../certificate/svg';

interface FormuleInfo {
  label: string;
  summary: string;
}

const ranges: FontRanges = { display: vidalokaRanges, text: manropeRanges };
/* Fichiers de police du site (WOFF), repris tels quels dans le PDF : un par jeu de caractères et par graisse. */
const fontFiles = {
  ...import.meta.glob<string>('/node_modules/@fontsource/vidaloka/files/vidaloka-*-400-normal.woff', { query: '?url', import: 'default', eager: true }),
  ...import.meta.glob<string>('/node_modules/@fontsource/manrope/files/manrope-*-{400,600}-normal.woff', { query: '?url', import: 'default', eager: true }),
};
const FONT_FILE: Record<FontKey, (subset: string) => string> = {
  display: (subset) => `vidaloka-${subset}-400-normal.woff`,
  text: (subset) => `manrope-${subset}-400-normal.woff`,
  label: (subset) => `manrope-${subset}-600-normal.woff`,
};
const TOKENS: Record<ColorKey, string> = { ink: '--stone-ink', muted: '--stone-muted', wine: '--stone-wine', gold: '--gold' };

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const hexToRgb = (hex: string): [number, number, number] => {
  const value = parseInt(hex.replace('#', ''), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};
const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Page du certificat, après la souscription. Elle relit la souscription mémorisée par /souscrire,
 * laisse corriger le nom, le mode (pour soi ou en cadeau) et la dédicace, affiche le certificat en direct,
 * puis le propose en PDF (fichier généré dans le navigateur) et à l'impression.
 */
export function initThanks(): void {
  const root = $('#certificat');
  const sheet = $('#cert-sheet');
  const form = $<HTMLFormElement>('#cert-form');
  if (!root || !sheet || !form) return;

  const formules = JSON.parse(root.dataset.formules ?? '{}') as Record<string, FormuleInfo>;
  const copy = JSON.parse(root.dataset.copy ?? '{}') as Record<string, string>;
  const stored = loadOrder();
  const order: Order = stored ?? { buyer: '', gift: false, recipient: '', message: '', formule: '', date: new Date().toISOString(), reference: '' };
  if (!formules[order.formule]) order.formule = Object.keys(formules)[0];

  const name = $<HTMLInputElement>('#c-name', form)!;
  const giver = $<HTMLInputElement>('#c-giver', form)!;
  const message = $<HTMLTextAreaElement>('#c-message', form)!;
  const count = $('#c-count', form);
  const giftFields = $('#cert-gift', form);
  const download = $<HTMLButtonElement>('#cert-download', form)!;
  const print = $<HTMLButtonElement>('#cert-print', form)!;
  const status = $('#cert-status', form);
  const downloadLabel = $('.btn-label', download)!;
  const idleLabel = downloadLabel.textContent ?? '';

  /* Mesure du texte avec les polices de la page, pour ajuster le corps du nom et couper la dédicace. */
  const context = document.createElement('canvas').getContext('2d');
  const families = { display: token('--font-display'), text: token('--font') };
  const weight: Record<FontKey, number> = { display: 400, text: 400, label: 600 };
  const env: TextEnv = {
    measure(text, font, size) {
      if (!context) return text.length * size * 0.5;
      context.font = `${weight[font]} ${size}px ${families[familyOf(font)]}`;
      return context.measureText(text).width;
    },
    supports: (text, font) => supports(text, ranges[familyOf(font)]),
  };

  const data = (): CertificateData => ({
    recipient: order.recipient.trim() || copy.placeholder,
    giver: order.gift ? order.buyer.trim() || copy.giverPlaceholder : undefined,
    message: order.gift ? order.message.trim() || undefined : undefined,
    formule: formules[order.formule],
    start: new Date(order.date),
    reference: order.reference || undefined,
  });
  const ready = () => Boolean(order.recipient.trim()) && (!order.gift || Boolean(order.buyer.trim()));

  const say = (text: string) => {
    if (status) status.textContent = text;
  };

  const render = () => {
    const current = data();
    sheet.replaceChildren(renderSvg(buildCertificate(current, env), `${copy.alt} ${current.recipient}`));
    sheet.classList.toggle('is-draft', !ready());
    download.disabled = !ready();
    print.disabled = !ready();
    if (giftFields) giftFields.hidden = !order.gift;
    if (count) count.textContent = `${message.value.length} / ${message.maxLength}`;
    root.dataset.mode = order.gift ? 'cadeau' : 'moi';
    const first = order.buyer.trim().split(/\s+/)[0];
    const title = $('#merci-title');
    if (title) title.textContent = (order.gift ? copy.titleGift : copy.titleSelf) + (first ? `, ${first}` : '');
    say(ready() ? '' : copy.missing);
  };

  /* Champs : le nom inscrit sur le certificat est celui du parrain ; en cadeau, l'acheteur signe la dédicace. */
  name.value = order.recipient;
  giver.value = order.gift ? order.buyer : '';
  message.value = order.message;
  $$<HTMLInputElement>('input[name="pour"]', form).forEach((radio) => {
    radio.checked = (radio.value === 'cadeau') === order.gift;
    radio.addEventListener('change', () => {
      const gift = radio.value === 'cadeau';
      if (gift === order.gift) return;
      /* En passant de « pour moi » à « pour offrir », le nom déjà saisi devient celui de la personne qui offre. */
      if (gift && !giver.value.trim()) giver.value = order.buyer || name.value;
      order.gift = gift;
      order.buyer = gift ? giver.value : name.value;
      update();
    });
  });
  $$<HTMLInputElement>('input[name="formule"]', form).forEach((radio) => {
    radio.checked = radio.value === order.formule;
    radio.addEventListener('change', () => {
      order.formule = radio.value;
      update();
    });
  });
  const update = () => {
    order.recipient = name.value;
    if (order.gift) order.buyer = giver.value;
    else order.buyer = name.value;
    order.message = message.value;
    saveOrder(order);
    render();
  };
  [name, giver, message].forEach((field) => field.addEventListener('input', update));
  form.addEventListener('submit', (e) => e.preventDefault());

  render();
  /* Les mesures dépendent des polices : on redessine quand elles sont chargées. */
  document.fonts?.ready.then(render);

  print.addEventListener('click', () => window.print());

  download.addEventListener('click', async () => {
    if (!ready()) return;
    const current = data();
    download.disabled = true;
    download.setAttribute('aria-busy', 'true');
    downloadLabel.textContent = copy.preparing;
    say('');
    try {
      const { renderPdf } = await import('../certificate/pdf');
      const palette = Object.fromEntries((Object.keys(TOKENS) as ColorKey[]).map((key) => [key, hexToRgb(token(TOKENS[key]))])) as Record<ColorKey, [number, number, number]>;
      const bytes = await renderPdf(current, {
        ranges,
        palette,
        async loadFont(font, subset) {
          const file = FONT_FILE[font](subset);
          const url = Object.entries(fontFiles).find(([path]) => path.endsWith(`/${file}`))?.[1];
          if (!url) throw new Error(`Police introuvable : ${file}`);
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Police indisponible : ${file}`);
          return response.arrayBuffer();
        },
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      link.download = `certificat-parrainage-${slug(current.recipient) || 'moncassin'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
      say(supports(`${current.recipient} ${current.giver ?? ''} ${current.message ?? ''}`, ranges.text) ? copy.done : copy.missingGlyphs);
    } catch {
      say(copy.failed);
    } finally {
      download.disabled = !ready();
      download.removeAttribute('aria-busy');
      downloadLabel.textContent = idleLabel;
    }
  });

  if (!motion) return;
  gsap.fromTo(sheet, { y: 48, opacity: 0, rotationX: 12 }, { y: 0, opacity: 1, rotationX: 0, duration: 1.4, ease, delay: 0.15, clearProps: 'transform,opacity' });

  /* Le certificat s'incline légèrement sous le pointeur, comme une feuille tenue en main. */
  const stage = $('.cert-stage', root);
  const tilt = $('.cert-tilt', root);
  if (finePointer && stage && tilt) {
    const rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.9, ease });
    const ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.9, ease });
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 6);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 5);
    });
    const reset = () => {
      rx(0);
      ry(0);
    };
    stage.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('beforeprint', reset);
  }
}
