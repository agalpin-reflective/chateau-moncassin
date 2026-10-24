interface ImportMetaEnv {
  readonly PUBLIC_STRIPE_LINK_DECOUVERTE?: string;
  readonly PUBLIC_STRIPE_LINK_DOMAINE?: string;
  /** "true" sur une version de prévisualisation : aucune page n'est indexée par les moteurs. */
  readonly PUBLIC_NOINDEX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
