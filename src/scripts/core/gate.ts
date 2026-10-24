import { $, $$ } from '../lib/dom';
import { gsap, motion } from '../lib/motion';
import { ease } from '../lib/ease';
import { storage } from '../lib/storage';
import { lockScroll } from './smooth-scroll';

const KEY = 'moncassin-cercle-age';

export const gateNeeded = (): boolean => Boolean($('#gate')) && storage.get(KEY) !== '1';

function setInert(on: boolean): void {
  ['#site-header', '#contenu', '.footer', '.skip'].forEach((sel) => {
    const el = $(sel);
    if (el) el.inert = on;
  });
}

/**
 * Porte d'entrée du club et vérification de l'âge légal.
 * La réponse est mémorisée dans le navigateur ; `onEnter` est appelé dès que la page est ouverte.
 */
export function initGate(onEnter: () => void): void {
  const gate = $('#gate');
  if (!gate || !gateNeeded()) {
    onEnter();
    return;
  }

  gate.hidden = false;
  setInert(true);
  lockScroll('gate', true);
  const yes = $<HTMLButtonElement>('#gate-yes');
  const no = $<HTMLButtonElement>('#gate-no');
  requestAnimationFrame(() => yes?.focus());

  const close = () => {
    const done = () => {
      gate.hidden = true;
      setInert(false);
      lockScroll('gate', false);
      $('#contenu')?.focus({ preventScroll: true });
      onEnter();
    };
    if (motion) {
      gsap.to('.gate-card', { y: -24, filter: 'blur(8px)', duration: 0.8, ease });
      gsap.to(gate, { autoAlpha: 0, duration: 0.9, ease, onComplete: done });
    } else {
      done();
    }
  };

  yes?.addEventListener('click', () => {
    storage.set(KEY, '1');
    close();
  });
  no?.addEventListener('click', () => {
    const refused = $('#gate-refused');
    if (refused) refused.hidden = false;
  });
  gate.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const buttons = $$<HTMLButtonElement>('button', gate).filter((b) => b.offsetParent !== null);
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}
