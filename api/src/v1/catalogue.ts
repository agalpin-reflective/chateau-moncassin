/**
 * Ce que le serveur vend, et à quel prix. C'est lui qui fait foi pour le montant envoyé à la banque :
 * le site n'envoie que l'identifiant de la formule, jamais un prix.
 * À garder aligné avec src/data/content.ts (formules) et src/data/site.ts (tarif) du site.
 */
export type FormuleId = 'decouverte' | 'domaine';

export interface Formule {
  id: FormuleId;
  label: string;
  summary: string;
}

export const PRICE_CENTS = 15000;
export const CURRENCY = 'EUR';
/** Code ISO 4217 numérique de l'euro, attendu par la banque. */
export const CURRENCY_NUMERIC = '978';
export const DURATION_MONTHS = 12;

export const formules: Record<FormuleId, Formule> = {
  decouverte: {
    id: 'decouverte',
    label: 'Découverte',
    summary: '6 bouteilles de découverte, 1 journée de vendanges, 1 repas pour une personne',
  },
  domaine: {
    id: 'domaine',
    label: 'Domaine',
    summary: '3 bouteilles du domaine, 1 tee shirt Château Moncassin, 1 journée de vendanges, 1 repas pour une personne',
  },
};

export const isFormuleId = (value: unknown): value is FormuleId => value === 'decouverte' || value === 'domaine';
