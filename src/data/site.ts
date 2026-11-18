/**
 * Informations du château et de l'offre.
 * Les champs à `null` sont à compléter par le Château Moncassin : ils s'affichent
 * comme « À compléter » sur les pages légales tant qu'ils ne sont pas renseignés.
 */
export const site = {
  name: 'Château Moncassin',
  club: 'Le Cercle des parrains',
  company: 'SAS CMEV',
  photoCredit: 'tripadvisor.pt',

  offer: {
    priceTTC: 150,
    months: 12,
    autoRenewal: false,
  },

  legal: {
    legalForm: 'Société par actions simplifiée',
    capital: null as string | null,
    address: null as string | null,
    rcs: null as string | null,
    siret: null as string | null,
    vat: null as string | null,
    publicationDirector: null as string | null,
    email: null as string | null,
    phone: null as string | null,
    host: {
      name: null as string | null,
      address: null as string | null,
    },
  },
} as const;

/**
 * Paiement en ligne (Up2pay e-Transactions, Crédit Agricole). Il passe par l'API du dépôt chateau-moncassin-api,
 * qui signe la demande et reçoit la confirmation de la banque. Sans PUBLIC_PAYMENT_ENABLED=true,
 * le formulaire reste en mode démonstration : rien n'est envoyé.
 */
export const paymentEnabled = import.meta.env.PUBLIC_PAYMENT_ENABLED === 'true';

/** Adresse de l'API : par défaut sur le même domaine que le site, sous /api. */
export const apiUrl = (import.meta.env.PUBLIC_API_URL || '/api').replace(/\/$/, '');

/** Version de prévisualisation : le site reste accessible par lien mais n'est pas indexé. */
export const noindexAll = import.meta.env.PUBLIC_NOINDEX === 'true';

export const formatPrice = (value: number) => `${value} € TTC`;
