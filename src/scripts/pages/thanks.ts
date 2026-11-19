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

/** Ce que l'API renvoie d'une commande au porteur de son lien (voir src/v1/routes/orders.ts du dépôt chateau-moncassin-api). */
interface ServerOrder {
  reference: string;
  status: 'PENDING' | 'PAID';
  formule: { id: string };
  recipient: string;
  gift: boolean;
  buyerFirstName: string;
  message: string | null;
  startsAt: string;
}

/** La banque prévient l'API quelques secondes après le paiement : on réessaie pendant une trentaine de secondes. */
const POLL_DELAY = 2000;
const POLL_TRIES = 15;

/**
 * Page du certificat, après la souscription. Elle affiche le certificat en direct, laisse régler la dédicace,
 * puis le propose en PDF (fichier généré dans le navigateur) et à l'impression.
 * Trois situations :
 * - paiement activé et lien de commande (?ref=…&t=…) : la commande vient de l'API, le certificat n'est délivré
 *   qu'une fois le paiement confirmé par la banque, et le nom, la formule et la date ne sont pas modifiables ;
 * - paiement activé sans lien : aucun certificat, la page explique d'où vient le lien ;
 * - mode démonstration : la souscription est relue dans le navigateur et tout reste modifiable.
 */
export function initThanks(): void {
  const root = $('#certificat');
  const sheet = $('#cert-sheet');
  const form = $<HTMLFormElement>('#cert-form');
  if (!root || !sheet || !form) return;

  const formules = JSON.parse(root.dataset.formules ?? '{}') as Record<string, FormuleInfo>;
  const copy = JSON.parse(root.dataset.copy ?? '{}') as Record<string, string>;
  const api = root.dataset.api ?? '';
  const params = new URLSearchParams(location.search);
  const reference = params.get('ref') ?? '';
  const accessToken = params.get('t') ?? '';
  const serverMode = Boolean(api && reference && accessToken);
  /* Sans API (démonstration), le certificat est libre. Avec, il attend la confirmation du paiement. */
  let confirmed = !api;
  let notice = '';

  const stored = api ? null : loadOrder();
  const order: Order = stored ?? { buyer: '', gift: false, recipient: '', message: '', formule: '', date: new Date().toISOString(), reference: '' };
  if (!formules[order.formule]) order.formule = Object.keys(formules)[0];

  const name = $<HTMLInputElement>('#c-name', form)!;
  const nameHint = $('#c-name-hint', form);
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
  const ready = () => confirmed && Boolean(order.recipient.trim()) && (!order.gift || Boolean(order.buyer.trim()));

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
    /* Tant que la banque n'a pas confirmé, le titre ne promet rien. */
    const heading = api && !confirmed ? copy.titlePending : order.gift ? copy.titleGift : copy.titleSelf;
    if (title) title.textContent = heading + (first && (confirmed || !api) ? `, ${first}` : '');
    say(notice || (ready() ? '' : copy.missing));
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
    /* Sur une commande payée, le nom inscrit vient du serveur : seule la dédicace se règle ici. */
    if (!serverMode) order.recipient = name.value;
    if (order.gift) order.buyer = giver.value;
    else if (!serverMode) order.buyer = name.value;
    order.message = message.value;
    if (!api) saveOrder(order);
    render();
  };
  [name, giver, message].forEach((field) => field.addEventListener('input', update));
  form.addEventListener('submit', (e) => e.preventDefault());

  const lock = (all: boolean) => {
    name.readOnly = true;
    /* Le verrou doit se voir : sans cela le champ a l'air modifiable et ne réagit pas. */
    if (!all && nameHint) {
      nameHint.textContent = copy.nameLocked;
      nameHint.hidden = false;
    }
    $$<HTMLInputElement>('input[name="pour"], input[name="formule"]', form).forEach((radio) => {
      radio.disabled = true;
    });
    if (all) [giver, message].forEach((field) => (field.disabled = true));
  };

  const applyServerOrder = (data: ServerOrder) => {
    order.recipient = data.recipient;
    order.gift = data.gift;
    order.buyer = data.buyerFirstName;
    order.message = data.message ?? '';
    order.formule = formules[data.formule.id] ? data.formule.id : order.formule;
    order.date = data.startsAt;
    order.reference = data.reference;
    name.value = order.recipient;
    giver.value = order.gift ? order.buyer : '';
    message.value = order.message;
    $$<HTMLInputElement>('input[name="pour"]', form).forEach((radio) => (radio.checked = (radio.value === 'cadeau') === order.gift));
    $$<HTMLInputElement>('input[name="formule"]', form).forEach((radio) => (radio.checked = radio.value === order.formule));
  };

  /** Relit la commande auprès de l'API jusqu'à ce que la banque ait confirmé le paiement. */
  const loadServerOrder = async (attempt = 0): Promise<void> => {
    let response: Response;
    try {
      response = await fetch(`${api}/v1/orders/${encodeURIComponent(reference)}?t=${encodeURIComponent(accessToken)}`, { headers: { Accept: 'application/json' } });
    } catch {
      notice = copy.unreachable;
      render();
      return;
    }
    if (!response.ok) {
      notice = response.status === 404 ? copy.invalidLink : copy.unreachable;
      render();
      return;
    }
    const data = (await response.json()) as ServerOrder;
    applyServerOrder(data);
    if (data.status === 'PAID') {
      confirmed = true;
      notice = '';
      const eyebrow = $('#merci-eyebrow');
      if (eyebrow) eyebrow.textContent = copy.eyebrowPaid;
      render();
      return;
    }
    notice = attempt >= POLL_TRIES ? copy.pendingTimeout : copy.pending;
    render();
    if (attempt < POLL_TRIES) window.setTimeout(() => loadServerOrder(attempt + 1), POLL_DELAY);
  };

  if (serverMode) {
    lock(false);
    notice = copy.pending;
  } else if (api) {
    lock(true);
    notice = copy.locked;
  }

  render();
  /* Les mesures dépendent des polices : on redessine quand elles sont chargées. */
  document.fonts?.ready.then(render);
  if (serverMode) loadServerOrder();

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
