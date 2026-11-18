import { $, $$ } from '../lib/dom';
import { gsap, ScrollTrigger, finePointer, motion } from '../lib/motion';
import { ease } from '../lib/ease';
import { newReference, saveOrder } from '../lib/order';

type Key = 'prenom' | 'nom' | 'adresse' | 'cp' | 'ville' | 'bprenom' | 'bnom' | 'email' | 'age';
interface FormuleInfo {
  label: string;
  summary: string;
}

const MESSAGES = {
  prenom: 'Indiquez votre prénom.',
  nom: 'Indiquez votre nom.',
  adresse: 'Indiquez votre adresse.',
  cpEmpty: 'Indiquez votre code postal.',
  cpBad: 'Le code postal compte cinq chiffres.',
  ville: 'Indiquez votre ville.',
  bprenom: 'Indiquez le prénom de la personne.',
  bnom: 'Indiquez le nom de la personne.',
  emailEmpty: 'Indiquez votre adresse email.',
  emailBad: 'Cette adresse semble incomplète. Exemple : prenom.nom@exemple.fr',
  age: 'Cochez cette case pour confirmer votre majorité et accepter les conditions.',
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ZIP = /^\d{5}$/;

/** Messages affichés au retour de la page de paiement, ou quand la commande n'a pas pu être ouverte. */
const ALERTS = {
  refuse: "Le paiement a été refusé par la banque. Aucun montant n'a été débité : vous pouvez réessayer, avec une autre carte si besoin.",
  annule: "Le paiement a été annulé. Aucun montant n'a été débité : votre demande reste à valider ci dessous.",
  network: "La commande n'a pas pu être envoyée. Vérifiez votre connexion et réessayez.",
  server: "La commande n'a pas pu être ouverte. Réessayez dans un instant.",
};
/** Champ du formulaire correspondant à chaque champ refusé par l'API. */
const API_FIELDS: Record<string, Key> = {
  firstName: 'prenom', lastName: 'nom', email: 'email', addressLine1: 'adresse', zipCode: 'cp', city: 'ville',
  recipientFirstName: 'bprenom', recipientLastName: 'bnom', acceptTerms: 'age',
};

/**
 * Formulaire de souscription et récapitulatif nominatif (page /souscrire).
 * La formule peut arriver par l'adresse (?formule=domaine) depuis les cartes de l'accueil.
 * Quand le paiement est activé, la validation ouvre une commande auprès de l'API (dossier api/), qui renvoie
 * un formulaire signé : le navigateur l'envoie tel quel à la page de paiement du Crédit Agricole.
 * Sinon le formulaire reste en mode démonstration et rien ne quitte le navigateur.
 */
export function initSubscription(): void {
  const form = $<HTMLFormElement>('#form');
  if (!form) return;

  const formules = JSON.parse(form.dataset.formules ?? '{}') as Record<string, FormuleInfo>;
  const api = form.dataset.api ?? '';
  const fields = {
    prenom: $<HTMLInputElement>('#f-prenom', form)!,
    nom: $<HTMLInputElement>('#f-nom', form)!,
    adresse: $<HTMLInputElement>('#f-adresse', form)!,
    cp: $<HTMLInputElement>('#f-cp', form)!,
    ville: $<HTMLInputElement>('#f-ville', form)!,
    bprenom: $<HTMLInputElement>('#f-bprenom', form)!,
    bnom: $<HTMLInputElement>('#f-bnom', form)!,
    email: $<HTMLInputElement>('#f-email', form)!,
    age: $<HTMLInputElement>('#f-age', form)!,
  };
  const keys = Object.keys(fields) as Key[];
  const dangerIcon = $<HTMLTemplateElement>('#icon-danger')?.innerHTML ?? '';
  const ticketName = $('#t-name');
  const ticketFormule = $('#t-formule');
  const ticketContent = $('#t-content');
  const ticketGiver = $('#t-giver');
  const ticketGiverRow = $('#t-giver-row');
  const giftFields = $('#gift-fields', form);
  const messageField = $<HTMLTextAreaElement>('#f-message', form);
  const complement = $<HTMLInputElement>('#f-complement', form);
  const delivery = $<HTMLTextAreaElement>('#f-livraison', form);
  const alertBox = $('#form-alert', form);
  const submitButton = $<HTMLButtonElement>('#f-submit', form)!;
  const submitLabel = $('.btn-label', submitButton)!;
  const idleLabel = submitLabel.textContent ?? '';
  const done = $('#form-done');
  let submitted = false;

  const selected = () => $<HTMLInputElement>('input[name="formule"]:checked', form)?.value ?? 'decouverte';

  const isGift = () => $<HTMLInputElement>('input[name="pour"]:checked', form)?.value === 'cadeau';
  const fullName = (first: HTMLInputElement, last: HTMLInputElement) => `${first.value.trim()} ${last.value.trim()}`.trim();

  const errorFor = (key: Key): string => {
    if (key === 'age') return fields.age.checked ? '' : MESSAGES.age;
    if ((key === 'bprenom' || key === 'bnom') && !isGift()) return '';
    const value = fields[key].value.trim();
    if (key === 'email') {
      if (!value) return MESSAGES.emailEmpty;
      return EMAIL.test(value) ? '' : MESSAGES.emailBad;
    }
    if (key === 'cp') {
      if (!value) return MESSAGES.cpEmpty;
      return ZIP.test(value) ? '' : MESSAGES.cpBad;
    }
    return value ? '' : MESSAGES[key];
  };

  const showError = (key: Key, message: string) => {
    const el = $(`#e-${key}`);
    if (!el) return;
    if (message) {
      el.innerHTML = dangerIcon;
      const text = document.createElement('span');
      text.textContent = message;
      el.appendChild(text);
      el.hidden = false;
      fields[key].setAttribute('aria-invalid', 'true');
    } else {
      el.hidden = true;
      el.textContent = '';
      fields[key].removeAttribute('aria-invalid');
    }
  };

  /* Le ticket porte le nom qui figurera sur le certificat : l'acheteur, ou la personne à qui il offre le parrainage. */
  const updateName = () => {
    const gift = isGift();
    const buyer = fullName(fields.prenom, fields.nom);
    const name = gift ? fullName(fields.bprenom, fields.bnom) : buyer;
    if (ticketName) {
      ticketName.textContent = name || (gift ? 'Son nom' : 'Votre nom');
      ticketName.classList.toggle('is-empty', !name);
    }
    if (ticketGiverRow) ticketGiverRow.hidden = !gift;
    if (ticketGiver) ticketGiver.textContent = buyer || 'Votre nom';
  };

  const setGift = (gift: boolean) => {
    const radio = $<HTMLInputElement>(gift ? '#f-pour-cadeau' : '#f-pour-moi', form);
    if (radio && !radio.checked) radio.checked = true;
    if (giftFields) giftFields.hidden = !gift;
    if (!gift) (['bprenom', 'bnom'] as Key[]).forEach((key) => showError(key, ''));
    updateName();
    if (motion) ScrollTrigger.refresh();
  };

  const setFormule = (id: string, animate = true) => {
    const info = formules[id];
    if (!info) return;
    const radio = $<HTMLInputElement>(`#f-${id}`, form);
    if (radio && !radio.checked) radio.checked = true;
    if (ticketFormule) ticketFormule.textContent = info.label;
    if (ticketContent) ticketContent.textContent = info.summary;
    if (motion && animate) gsap.fromTo([ticketFormule, ticketContent], { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6, ease, stagger: 0.06 });
  };

  /* La validation au départ du champ n'intervient qu'après une première tentative d'envoi :
     un message qui apparaît pendant le clic décalerait le bouton sous le pointeur. */
  keys.forEach((key) => {
    const field = fields[key];
    field.addEventListener(key === 'age' ? 'change' : 'blur', () => {
      if (submitted || key === 'age') showError(key, errorFor(key));
    });
    field.addEventListener('input', () => {
      if (submitted) showError(key, errorFor(key));
    });
  });
  [fields.prenom, fields.nom, fields.bprenom, fields.bnom].forEach((field) => field.addEventListener('input', updateName));
  $$<HTMLInputElement>('input[name="pour"]', form).forEach((radio) => radio.addEventListener('change', () => setGift(radio.value === 'cadeau')));
  $$<HTMLInputElement>('input[name="formule"]', form).forEach((radio) => radio.addEventListener('change', () => setFormule(radio.value)));
  /* Formule choisie sur l'accueil, ou conservée par le navigateur au retour sur la page. */
  const params = new URLSearchParams(location.search);
  setFormule(params.get('formule') ?? selected(), false);
  setGift(params.get('pour') === 'cadeau' || isGift());

  const setBusy = (busy: boolean, label = idleLabel) => {
    submitButton.disabled = busy;
    if (busy) submitButton.setAttribute('aria-busy', 'true');
    else submitButton.removeAttribute('aria-busy');
    submitLabel.textContent = label;
  };

  const showAlert = (text: string) => {
    if (!alertBox) return;
    alertBox.textContent = text;
    alertBox.hidden = !text;
    if (text) alertBox.focus();
  };

  /**
   * Ouvre la commande auprès de l'API, puis envoie à la banque le formulaire signé qu'elle renvoie.
   * Le montant et la signature viennent du serveur : rien de ce que le navigateur envoie ne peut changer le prix.
   */
  const openPayment = async (body: Record<string, unknown>) => {
    let response: Response;
    try {
      response = await fetch(`${api}/v1/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch {
      setBusy(false);
      showAlert(ALERTS.network);
      return;
    }
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.payment) {
      setBusy(false);
      const field = API_FIELDS[String(data?.error?.details?.field ?? '')];
      if (response.status === 400 && field) {
        showError(field, errorFor(field) || data.error.message);
        fields[field].focus();
      } else {
        showAlert(ALERTS.server);
      }
      return;
    }
    const payment = data.payment as { url: string; fields: { name: string; value: string }[] };
    const bankForm = document.createElement('form');
    bankForm.method = 'POST';
    bankForm.action = payment.url;
    bankForm.acceptCharset = 'UTF-8';
    bankForm.hidden = true;
    payment.fields.forEach(({ name, value }) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      bankForm.appendChild(input);
    });
    document.body.appendChild(bankForm);
    bankForm.submit();
  };

  const returned = params.get('paiement');
  if (returned === 'refuse' || returned === 'annule') showAlert(ALERTS[returned]);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitted = true;
    let firstInvalid: HTMLInputElement | null = null;
    keys.forEach((key) => {
      const message = errorFor(key);
      showError(key, message);
      if (message && !firstInvalid) firstInvalid = fields[key];
    });
    if (firstInvalid) {
      (firstInvalid as HTMLInputElement).focus();
      return;
    }

    const formule = selected();
    const gift = isGift();
    const buyer = fullName(fields.prenom, fields.nom);
    showAlert('');

    if (api) {
      setBusy(true, 'Ouverture du paiement sécurisé');
      openPayment({
        formule,
        firstName: fields.prenom.value.trim(),
        lastName: fields.nom.value.trim(),
        email: fields.email.value.trim(),
        addressLine1: fields.adresse.value.trim(),
        addressLine2: complement?.value.trim() ?? '',
        zipCode: fields.cp.value.trim(),
        city: fields.ville.value.trim(),
        isGift: gift,
        recipientFirstName: fields.bprenom.value.trim(),
        recipientLastName: fields.bnom.value.trim(),
        giftMessage: messageField?.value.trim() ?? '',
        deliveryAddress: delivery?.value.trim() ?? '',
        acceptTerms: fields.age.checked,
      });
      return;
    }

    /* Mode démonstration : la souscription reste dans le navigateur, où la page du certificat la relit. */
    saveOrder({
      buyer,
      gift,
      recipient: gift ? fullName(fields.bprenom, fields.bnom) : buyer,
      message: gift ? (messageField?.value.trim() ?? '') : '',
      formule,
      date: new Date().toISOString(),
      reference: newReference(),
    });

    const skeleton = $('#form-skel');
    setBusy(true, 'Préparation du récapitulatif');
    if (skeleton) skeleton.hidden = false;
    window.setTimeout(() => {
      if (skeleton) skeleton.hidden = true;
      setBusy(false);
      form.hidden = true;
      if (!done) return;
      const title = $('#done-title', done);
      if (title) title.textContent = `Votre récapitulatif est prêt, ${fields.prenom.value.trim()}`;
      done.hidden = false;
      done.focus();
      if (motion) {
        gsap.fromTo(done, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease });
        ScrollTrigger.refresh();
      }
    }, 900);
  });

  /* Retour depuis la page de paiement avec le bouton Précédent : le bouton redevient actif. */
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) setBusy(false);
  });

  $('#form-edit')?.addEventListener('click', () => {
    if (done) done.hidden = true;
    form.hidden = false;
    fields.prenom.focus();
    if (motion) ScrollTrigger.refresh();
  });

  /* Le récapitulatif s'incline légèrement sous le pointeur, comme un carton d'invitation. */
  const wrap = $('.ticket-wrap');
  const ticket = $('#ticket');
  if (motion && finePointer && wrap && ticket) {
    const rx = gsap.quickTo(ticket, 'rotationX', { duration: 0.9, ease });
    const ry = gsap.quickTo(ticket, 'rotationY', { duration: 0.9, ease });
    wrap.addEventListener('pointermove', (e) => {
      const r = wrap.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 10);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
    });
    const reset = () => {
      rx(0);
      ry(0);
    };
    wrap.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
  }
}
