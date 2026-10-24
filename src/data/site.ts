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

export const payment = {
  decouverte: import.meta.env.PUBLIC_STRIPE_LINK_DECOUVERTE ?? '',
  domaine: import.meta.env.PUBLIC_STRIPE_LINK_DOMAINE ?? '',
};

export const paymentEnabled = Boolean(payment.decouverte && payment.domaine);

export const formatPrice = (value: number) => `${value} € TTC`;
