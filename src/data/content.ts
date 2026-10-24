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

/** L'année de la vigne, en mois de début et de fin (0 = janvier, 12 = fin décembre). */
export const stages = [
  {
    from: 0, to: 3, icon: 'scissors-linear', when: 'Janvier à mars', title: 'La taille',
    text: "La vigne dort. Le vigneron taille chaque pied pour choisir les bourgeons qui porteront les raisins de l'année.",
  },
  {
    from: 3, to: 6, icon: 'leaf-linear', when: 'Avril à juin', title: 'Le réveil',
    text: 'Les bourgeons éclosent, les premières feuilles se déploient, puis la vigne fleurit et les petites grappes se forment.',
  },
  {
    from: 6, to: 8, icon: 'sun-2-linear', when: 'Juillet et août', title: 'La véraison',
    text: 'Les grappes grossissent sous le soleil et changent de couleur. Le raisin noir prend sa teinte et se gorge de sucre.',
  },
  {
    from: 8, to: 10, icon: 'wineglass-linear', when: 'Septembre et octobre', title: 'Les vendanges', harvest: true,
    text: 'Le raisin est mûr. Vous rejoignez le domaine pour vivre la récolte, approcher le travail de la vigne et partager un repas.',
  },
  {
    from: 10, to: 12, icon: 'history-linear', when: 'Novembre et décembre', title: 'Le chai',
    text: "La vigne se met au repos. Au chai, les vins de l'année prennent forme, et le cycle recommence.",
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
