import { storage } from './storage';

/**
 * La souscription telle qu'elle est saisie sur /souscrire. Le site est statique : elle reste dans le navigateur
 * (aucun envoi), le temps d'aller payer et de revenir sur la page du certificat.
 */
export interface Order {
  /** Nom de l'acheteur. */
  buyer: string;
  /** Vrai quand le parrainage est offert : le certificat est alors au nom de `recipient`. */
  gift: boolean;
  recipient: string;
  message: string;
  formule: string;
  /** Date de souscription, au format ISO. */
  date: string;
  reference: string;
}

const KEY = 'moncassin-cercle-parrainage';

/** Référence courte reprise sur le certificat et dans le paiement, pour rapprocher les deux. */
export const newReference = () => Date.now().toString(36).toUpperCase();

export function saveOrder(order: Order): void {
  storage.set(KEY, JSON.stringify(order));
}

export function loadOrder(): Order | null {
  try {
    const raw = storage.get(KEY);
    const order = raw ? (JSON.parse(raw) as Partial<Order>) : null;
    if (!order || typeof order.recipient !== 'string' || typeof order.date !== 'string') return null;
    return {
      buyer: String(order.buyer ?? ''),
      gift: Boolean(order.gift),
      recipient: order.recipient,
      message: String(order.message ?? ''),
      formule: String(order.formule ?? ''),
      date: order.date,
      reference: String(order.reference ?? ''),
    };
  } catch {
    return null;
  }
}
