import { $, $$ } from '../lib/dom';
import { gsap, ScrollTrigger, finePointer, motion } from '../lib/motion';
import { ease } from '../lib/ease';
import { FORMULE_EVENT } from '../core/nav';

type Key = 'prenom' | 'nom' | 'email' | 'age';
interface FormuleInfo {
  label: string;
  summary: string;
}

const MESSAGES = {
  prenom: 'Indiquez votre prénom.',
  nom: 'Indiquez votre nom.',
  emailEmpty: 'Indiquez votre adresse email.',
  emailBad: 'Cette adresse semble incomplète. Exemple : prenom.nom@exemple.fr',
  age: 'Cochez cette case pour confirmer votre majorité et accepter les conditions.',
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Formulaire de souscription et récapitulatif nominatif.
 * Si les liens de paiement Stripe sont configurés, la validation redirige vers le paiement
 * avec l'email prérempli ; sinon le formulaire reste en mode démonstration.
 */
export function initSubscription(): void {
  const form = $<HTMLFormElement>('#form');
  if (!form) return;

  const formules = JSON.parse(form.dataset.formules ?? '{}') as Record<string, FormuleInfo>;
  const links: Record<string, string | undefined> = {
    decouverte: form.dataset.linkDecouverte,
    domaine: form.dataset.linkDomaine,
  };
  const fields = {
    prenom: $<HTMLInputElement>('#f-prenom', form)!,
    nom: $<HTMLInputElement>('#f-nom', form)!,
    email: $<HTMLInputElement>('#f-email', form)!,
    age: $<HTMLInputElement>('#f-age', form)!,
  };
  const keys = Object.keys(fields) as Key[];
  const dangerIcon = $<HTMLTemplateElement>('#icon-danger')?.innerHTML ?? '';
  const ticketName = $('#t-name');
  const ticketFormule = $('#t-formule');
  const ticketContent = $('#t-content');
  const submitButton = $<HTMLButtonElement>('#f-submit', form)!;
  const submitLabel = $('.btn-label', submitButton)!;
  const idleLabel = submitLabel.textContent ?? '';
  const done = $('#form-done');
  let submitted = false;

  const selected = () => $<HTMLInputElement>('input[name="formule"]:checked', form)?.value ?? 'decouverte';

  const errorFor = (key: Key): string => {
    if (key === 'age') return fields.age.checked ? '' : MESSAGES.age;
    const value = fields[key].value.trim();
    if (key === 'email') {
      if (!value) return MESSAGES.emailEmpty;
      return EMAIL.test(value) ? '' : MESSAGES.emailBad;
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

  const updateName = () => {
    if (!ticketName) return;
    const name = `${fields.prenom.value.trim()} ${fields.nom.value.trim()}`.trim();
    ticketName.textContent = name || 'Votre nom';
    ticketName.classList.toggle('is-empty', !name);
  };

  const setFormule = (id: string) => {
    const info = formules[id];
    if (!info) return;
    const radio = $<HTMLInputElement>(`#f-${id}`, form);
    if (radio && !radio.checked) radio.checked = true;
    if (ticketFormule) ticketFormule.textContent = info.label;
    if (ticketContent) ticketContent.textContent = info.summary;
    $$('.card').forEach((card) => card.classList.toggle('is-selected', card.dataset.formule === id));
    if (motion) gsap.fromTo([ticketFormule, ticketContent], { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6, ease, stagger: 0.06 });
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
  fields.prenom.addEventListener('input', updateName);
  fields.nom.addEventListener('input', updateName);
  $$<HTMLInputElement>('input[name="formule"]', form).forEach((radio) => radio.addEventListener('change', () => setFormule(radio.value)));
  document.addEventListener(FORMULE_EVENT, (e) => setFormule(String((e as CustomEvent<string>).detail)));

  const setBusy = (busy: boolean, label = idleLabel) => {
    submitButton.disabled = busy;
    if (busy) submitButton.setAttribute('aria-busy', 'true');
    else submitButton.removeAttribute('aria-busy');
    submitLabel.textContent = label;
  };

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
    const link = links[formule];
    if (link) {
      const url = new URL(link);
      url.searchParams.set('prefilled_email', fields.email.value.trim());
      url.searchParams.set('client_reference_id', `${formule}_${Date.now()}`);
      url.searchParams.set('locale', 'fr');
      setBusy(true, 'Redirection vers le paiement sécurisé');
      window.location.assign(url.toString());
      return;
    }

    /* Mode démonstration : aucun envoi, on montre le récapitulatif. */
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
