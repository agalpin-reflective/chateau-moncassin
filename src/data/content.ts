/**
 * Contenus éditoriaux de la page d'accueil.
 * Règle de rédaction du site : pas de trait d'union dans les textes affichés
 * (on écrit « tee shirt », et les questions évitent l'inversion du sujet).
 */

export type FormuleId = 'decouverte' | 'domaine';

export interface Formule {
  id: FormuleId;
  label: string;
  title: string;
  kicker: string;
  bottles: number;
  bottlesLabel: string;
  items: { icon: string; text: string }[];
  summary: string;
  short: string;
}

export const formules: Formule[] = [
  {
    id: 'decouverte',
    label: 'Découverte',
    title: 'La formule découverte',
    kicker: 'Pour les amateurs de vin',
    bottles: 6,
    bottlesLabel: 'bouteilles de découverte',
    items: [
      { icon: 'scissors-linear', text: '1 journée de vendanges' },
      { icon: 'chef-hat-minimalistic-linear', text: '1 repas pour une personne' },
      { icon: 'delivery-linear', text: 'Livraison incluse' },
    ],
    summary: '6 bouteilles de découverte, 1 journée de vendanges, 1 repas pour une personne',
    short: '6 bouteilles de découverte',
  },
  {
    id: 'domaine',
    label: 'Domaine',
    title: 'La formule domaine',
    kicker: "Pour vivre l'esprit Moncassin",
    bottles: 3,
    bottlesLabel: 'bouteilles du domaine',
    items: [
      { icon: 't-shirt-linear', text: '1 tee shirt Château Moncassin' },
      { icon: 'scissors-linear', text: '1 journée de vendanges' },
      { icon: 'chef-hat-minimalistic-linear', text: '1 repas pour une personne' },
      { icon: 'delivery-linear', text: 'Livraison incluse' },
    ],
    summary: '3 bouteilles du domaine, 1 tee shirt Château Moncassin, 1 journée de vendanges, 1 repas pour une personne',
    short: '3 bouteilles et le tee shirt',
  },
];

/**
 * L'année de la vigne suit le cycle du vignoble : elle commence en novembre, après les vendanges,
 * et s'achève en octobre. Les mois sont comptés depuis novembre (0 = début novembre, 12 = fin octobre).
 */
export const vineMonths = [
  { initial: 'N', short: 'Nov', name: 'novembre' },
  { initial: 'D', short: 'Déc', name: 'décembre' },
  { initial: 'J', short: 'Janv', name: 'janvier' },
  { initial: 'F', short: 'Févr', name: 'février' },
  { initial: 'M', short: 'Mars', name: 'mars' },
  { initial: 'A', short: 'Avril', name: 'avril' },
  { initial: 'M', short: 'Mai', name: 'mai' },
  { initial: 'J', short: 'Juin', name: 'juin' },
  { initial: 'J', short: 'Juil', name: 'juillet' },
  { initial: 'A', short: 'Août', name: 'août' },
  { initial: 'S', short: 'Sept', name: 'septembre' },
  { initial: 'O', short: 'Oct', name: 'octobre' },
];

export interface Stage {
  from: number;
  to: number;
  when: string;
  title: string;
  text: string;
  /** Travaux du vignoble pendant la période. */
  works: string[];
  harvest?: boolean;
}

export const stages: Stage[] = [
  {
    from: 0, to: 3, when: 'Novembre à janvier', title: 'Le repos hivernal',
    text: "Les feuilles tombent et la vigne s'endort. Il ne reste que le bois de l'année, que le vigneron prépare pour l'hiver.",
    works: ['Buttage', 'Retrait des agrafes', 'Démontage', 'Sarmentage'],
  },
  {
    from: 3, to: 4, when: 'Février', title: 'La taille',
    text: "Chaque pied est taillé à la main. Le vigneron choisit les bourgeons qui porteront les raisins de l'année.",
    works: ['Taille', 'Réparation du palissage'],
  },
  {
    from: 4, to: 6, when: 'Mars et avril', title: 'Les pleurs et le débourrement',
    text: 'La sève remonte et perle au bout des bois taillés : la vigne pleure. Puis les bourgeons éclosent et les premiers rameaux poussent.',
    works: ['Repiquage', 'Débuttage', 'Attachage', 'Épandage'],
  },
  {
    from: 6, to: 8, when: 'Mai et juin', title: 'La floraison',
    text: 'Les rameaux grandissent, les feuilles se déploient, puis la vigne fleurit. Chaque fleur deviendra un grain de raisin.',
    works: ['Ébourgeonnage', 'Désherbage', 'Relevage', 'Labourage', 'Accolage'],
  },
  {
    from: 8, to: 10, when: 'Juillet et août', title: 'La véraison',
    text: 'Les grappes grossissent sous le soleil et changent de couleur. Le raisin noir prend sa teinte et se gorge de sucre.',
    works: ['Vendanges vertes', 'Traitements', 'Rognages'],
  },
  {
    from: 10, to: 12, when: 'Septembre et octobre', title: 'La maturité et les vendanges', harvest: true,
    text: 'Le raisin est mûr. Vous rejoignez le domaine pour vivre la récolte, approcher le travail de la vigne et partager un repas.',
    works: ['Vendanges', 'Repiquage'],
  },
];

export const experiences = [
  {
    icon: 'scissors-linear',
    title: 'Une journée au cœur des vendanges',
    text: "Découvrez l'ambiance de la récolte, approchez le travail de la vigne et profitez d'une journée au domaine, accompagnée d'un repas pour une personne.",
    tagIcon: 'chef-hat-minimalistic-linear',
    tag: 'Repas pour une personne inclus',
  },
  {
    icon: 'wineglass-linear',
    title: 'Les vins du château, chez vous',
    text: 'Recevez une sélection de nos vins et prenez le temps de découvrir les cuvées du domaine, leurs caractères et leur histoire.',
    tagIcon: 'delivery-linear',
    tag: 'Livraison incluse',
  },
  {
    icon: 'key-linear',
    title: 'Douze mois de privilèges au domaine',
    text: "Pendant un an, bénéficiez de réductions sur les chambres d'hôtes, les gîtes, la boutique de vins et la privatisation des espaces du château.",
    tagIcon: 'user-linear',
    tag: 'Avantages nominatifs',
  },
];

export const perks = [
  { icon: 'bed-linear', value: 10, scope: "Sur les chambres d'hôtes et les gîtes" },
  { icon: 'shop-2-linear', value: 10, scope: 'Sur les vins en boutique, en ligne et au domaine' },
  { icon: 'key-linear', value: 5, scope: 'Sur la privatisation des salles ou du domaine' },
];

/** Le tee shirt de la formule domaine (section d'aperçu de l'accueil). */
export const tee = {
  eyebrow: 'Formule domaine',
  title: 'Le tee shirt du parrain',
  text: "Sur le cœur, le château. Au dos, l'année de votre inscription au cercle et le pied de vigne que vous parrainez.",
  points: [
    { icon: 't-shirt-linear', text: 'Devant : le logo du Château Moncassin' },
    { icon: 'calendar-linear', text: "Au dos : votre année d'inscription" },
    { icon: 'leaf-linear', text: 'Au dos : le pied de vigne à maturité' },
  ],
  note: 'Compris dans la formule domaine. Aperçu non contractuel : le modèle définitif peut différer.',
  backTop: 'Le Cercle des parrains',
  backBottom: "Parrain d'un pied de vigne",
};

/** Autour du château : ce que l'on trouve à Casteljaloux. Liste fournie par le château, sans distance ni nom d'établissement. */
export const nearbyIntro = {
  eyebrow: 'Autour du château',
  title: 'Casteljaloux, à proximité du domaine',
  text: 'Votre journée de vendanges peut devenir un séjour. À proximité du château, Casteljaloux a de quoi remplir un week end entier.',
};

export const nearby = [
  { icon: 'golf-linear', title: 'Le golf', text: 'Pour une partie avant ou après votre journée au domaine.' },
  { icon: 'bath-linear', title: 'Le centre thermal', text: 'Pour un moment de détente après les vendanges.' },
  { icon: 'home-smile-linear', title: 'Center Parcs', text: 'Pour prolonger le séjour en famille.' },
  { icon: 'route-linear', title: 'Le centre équestre', text: 'Pour une balade à cheval.' },
  { icon: 'water-linear', title: 'Le lac', text: "Pour une promenade au bord de l'eau." },
  { icon: 'chef-hat-linear', title: 'Les restaurants', text: 'Une multitude de tables pour prolonger la dégustation.' },
];

export const steps = [
  { title: 'Choisissez votre formule', text: "Sélectionnez votre coffret de découverte au moment de l'achat." },
  { title: 'Recevez vos cadeaux', text: "Vos bouteilles et, selon la formule, votre tee shirt sont expédiés, frais d'envoi inclus." },
  { title: 'Vivez votre journée au domaine', text: 'Réservez votre journée de vendanges auprès du Château Moncassin.' },
  { title: 'Profitez de vos privilèges', text: 'Utilisez vos réductions nominatives pendant les douze mois suivant votre achat.' },
];

export const faq = [
  {
    q: "Le pied de vigne m'appartient ?",
    a: "Non. Le parrainage est symbolique : il ne confère aucun droit de propriété sur un pied de vigne. Il vous ouvre l'univers du domaine pendant douze mois.",
  },
  {
    q: 'Quelle différence entre les deux formules ?',
    a: 'La formule découverte comprend six bouteilles de découverte. La formule domaine comprend trois bouteilles du domaine et un tee shirt Château Moncassin. Les deux incluent une journée de vendanges, un repas pour une personne et la livraison, au même tarif de 150 € TTC.',
  },
  {
    q: 'Combien coûte le parrainage ?',
    a: "150 € TTC pour douze mois de parrainage, quelle que soit la formule choisie. L'expédition est incluse.",
  },
  {
    q: 'Le parrainage se renouvelle automatiquement ?',
    a: "Non. Il s'agit d'une souscription annuelle de douze mois, nominative, sans renouvellement automatique.",
  },
  {
    q: 'Comment se passe la journée de vendanges ?',
    a: "Vous découvrez l'ambiance de la récolte, approchez le travail de la vigne et profitez d'une journée au domaine, accompagnée d'un repas pour une personne. Vous réservez votre journée directement auprès du Château Moncassin.",
  },
  {
    q: 'Les frais de livraison sont compris ?',
    a: "Oui. Vos bouteilles et, selon la formule, votre tee shirt sont expédiés frais d'envoi inclus.",
  },
  {
    q: "Quelles réductions pendant l'année ?",
    a: '10 % sur les chambres d\'hôtes et les gîtes, 10 % sur les vins en boutique, en ligne et au domaine, et 5 % sur la privatisation des salles ou du domaine.',
  },
  {
    q: 'Mes avantages sont valables combien de temps ?',
    a: 'Ils sont nominatifs et valables pendant les douze mois suivant votre achat, selon les conditions de réservation et de vente du château.',
  },
];

/** Textes du certificat de parrainage (aperçu, impression et PDF). Les accolades sont remplacées à la génération. */
export const certificate = {
  club: 'Le Cercle des parrains',
  title: 'Certificat de parrainage',
  certifies: 'Le Château Moncassin certifie que',
  statement: 'parraine symboliquement un pied de vigne du domaine',
  period: 'pour douze mois, du {start} au {end}.',
  months: 12,
  giftFrom: 'Un cadeau de {giver}',
  formuleLabel: 'Formule',
  dateLabel: 'Fait au château',
  dated: 'le {date}',
  house: 'Château Moncassin',
  reference: 'Référence {reference}',
  legal: "Parrainage symbolique : il ne confère aucun droit de propriété sur un pied de vigne. L'abus d'alcool est dangereux pour la santé. À consommer avec modération.",
};

/** Page du certificat, affichée après la souscription (/merci). */
export const thanks = {
  eyebrow: 'Paiement confirmé',
  eyebrowDemo: 'Version de démonstration',
  intro: "Merci pour votre parrainage. Votre année au rythme de la vigne commence aujourd'hui, et votre certificat est prêt : vérifiez le nom, puis téléchargez ou imprimez la page.",
  formTitle: 'Personnalisez votre certificat',
  caption: 'Aperçu du certificat. Le PDF est une page A4 en paysage, prête à imprimer.',
  noscript: "L'aperçu et le téléchargement du certificat ont besoin de JavaScript.",
  /** Textes utilisés par le script de la page. */
  copy: {
    titleSelf: 'Bienvenue dans le cercle',
    titleGift: 'Votre cadeau est prêt',
    placeholder: 'Nom du parrain',
    giverPlaceholder: 'votre prénom',
    alt: 'Certificat de parrainage au nom de',
    missing: 'Indiquez le nom à inscrire pour télécharger le certificat.',
    preparing: 'Préparation du PDF',
    done: 'Le certificat a été téléchargé.',
    missingGlyphs: "Certains caractères n'existent pas dans les polices du PDF et ont été remplacés. Pour les conserver, utilisez Imprimer puis « Enregistrer au format PDF ».",
    failed: "Le PDF n'a pas pu être préparé sur cet appareil. Utilisez Imprimer puis « Enregistrer au format PDF ».",
  },
  tips: [
    { icon: 'gift-linear', gift: true, text: "Pour l'offrir : imprimez le certificat et glissez la page dans une enveloppe, ou envoyez le PDF par message." },
    { icon: 'printer-minimalistic-linear', gift: false, text: 'Impression : format A4, orientation paysage, sans marges si votre imprimante le permet.' },
    { icon: 'shield-check-linear', gift: false, text: 'Le certificat est créé dans votre navigateur : les noms saisis ici ne sont envoyés nulle part.' },
  ],
  nextTitle: 'Et maintenant',
  next: [
    { title: 'Vos cadeaux sont préparés', text: "Les bouteilles et, selon la formule, le tee shirt sont expédiés à l'adresse indiquée au paiement, frais d'envoi inclus." },
    { title: 'Réservez la journée de vendanges', text: 'Contactez le {house} pour choisir la journée au domaine, repas compris.' },
    { title: 'Profitez des privilèges', text: "Les réductions sont nominatives : elles sont au nom inscrit sur le certificat, pendant les douze mois qui suivent l'achat." },
  ],
};
