interface ImportMetaEnv {
  /** "true" pour proposer le paiement en ligne ; sinon le formulaire reste en démonstration. */
  readonly PUBLIC_PAYMENT_ENABLED?: string;
  /** Adresse de l'API de commande, "/api" par défaut. */
  readonly PUBLIC_API_URL?: string;
  /** "true" sur une version de prévisualisation : aucune page n'est indexée par les moteurs. */
  readonly PUBLIC_NOINDEX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
