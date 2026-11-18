import { createHmac, createVerify } from 'node:crypto';

import { CURRENCY_NUMERIC } from '../catalogue';

/**
 * Up2pay e-Transactions (Crédit Agricole, plateforme Paybox), intégration par page de paiement hébergée.
 * Référence : « Manuel d'intégration Up2pay e-Transactions » (signature HMAC au chapitre 3.3,
 * notification de paiement au chapitre 5, vérification de signature au chapitre 6).
 * Fonctions pures : aucune ne lit la configuration ni la base, pour pouvoir être testées seules.
 */
export interface ETransactionsConfig {
  mode: 'test' | 'production';
  site: string;
  rang: string;
  identifiant: string;
  /** Clé secrète HMAC, en hexadécimal (128 caractères). */
  hmacKey: string;
}

export interface PaymentOrder {
  reference: string;
  amountCents: number;
  email: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string | null;
  zipCode: string;
  city: string;
}

export interface PaymentUrls {
  /** Pages du site où la banque renvoie l'acheteur (150 caractères au plus chacune). */
  success: string;
  refused: string;
  cancelled: string;
  /** Adresse de cette API appelée par la banque, de serveur à serveur, à chaque tentative. */
  notification: string;
}

export interface PaymentRequest {
  url: string;
  /** Champs du formulaire à envoyer à la banque, dans l'ordre exact de la signature. */
  fields: { name: string; value: string }[];
}

const PAYMENT_URL = {
  test: 'https://preprod-tpeweb.e-transactions.fr/php/',
  production: 'https://tpeweb.e-transactions.fr/php/',
} as const;

/**
 * Ce que la banque renvoie, sur les pages de retour comme dans la notification.
 * La signature (K) doit rester la dernière : elle couvre tout ce qui la précède.
 */
export const RETURN_VARIABLES = 'montant:M;reference:R;autorisation:A;transaction:S;erreur:E;signature:K';

/** Code pays ISO 3166 1 numérique de la France, seul pays livré. */
const FRANCE_NUMERIC = '250';
const MAX_URL_LENGTH = 150;

const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Prénom et nom : lettres, chiffres, espaces, / - ' (30 caractères), comme l'exige le protocole 3D Secure. */
const personName = (value: string) => value.normalize('NFC').replace(/[^\p{L}\p{N} /'-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 30);
const addressPart = (value: string, max: number) => value.normalize('NFC').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** Date ISO 8601 avec décalage explicite, sans millisecondes (format du manuel). */
const isoTime = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, '+00:00');

export function billingXml(order: PaymentOrder): string {
  const address2 = order.addressLine2 ? `<Address2>${xml(addressPart(order.addressLine2, 50))}</Address2>` : '';
  return (
    '<?xml version="1.0" encoding="utf-8"?><Billing><Address>' +
    `<FirstName>${xml(personName(order.firstName))}</FirstName>` +
    `<LastName>${xml(personName(order.lastName))}</LastName>` +
    `<Address1>${xml(addressPart(order.addressLine1, 50))}</Address1>` +
    address2 +
    `<ZipCode>${xml(addressPart(order.zipCode, 16))}</ZipCode>` +
    `<City>${xml(addressPart(order.city, 50))}</City>` +
    `<CountryCode>${FRANCE_NUMERIC}</CountryCode>` +
    '</Address></Billing>'
  );
}

/** Empreinte HMAC SHA 512 des champs, concaténés sous la forme NOM=VALEUR&… sans encodage, dans l'ordre d'envoi. */
export function signFields(fields: { name: string; value: string }[], hmacKeyHex: string): string {
  const message = fields.map((field) => `${field.name}=${field.value}`).join('&');
  return createHmac('sha512', Buffer.from(hmacKeyHex, 'hex')).update(message, 'utf8').digest('hex').toUpperCase();
}

export function buildPaymentRequest(config: ETransactionsConfig, order: PaymentOrder, urls: PaymentUrls, now = new Date()): PaymentRequest {
  for (const [name, url] of Object.entries(urls)) {
    if (url.length > MAX_URL_LENGTH) throw new Error(`Adresse « ${name} » trop longue pour la banque (${url.length} caractères, 150 au plus)`);
  }
  const fields = [
    { name: 'PBX_SITE', value: config.site },
    { name: 'PBX_RANG', value: config.rang },
    { name: 'PBX_IDENTIFIANT', value: config.identifiant },
    { name: 'PBX_TOTAL', value: String(order.amountCents) },
    { name: 'PBX_DEVISE', value: CURRENCY_NUMERIC },
    { name: 'PBX_CMD', value: order.reference },
    { name: 'PBX_PORTEUR', value: order.email },
    { name: 'PBX_RETOUR', value: RETURN_VARIABLES },
    { name: 'PBX_EFFECTUE', value: urls.success },
    { name: 'PBX_REFUSE', value: urls.refused },
    { name: 'PBX_ANNULE', value: urls.cancelled },
    { name: 'PBX_REPONDRE_A', value: urls.notification },
    // Obligatoires pour l'authentification 3D Secure v2 : un seul article, et l'adresse du payeur.
    { name: 'PBX_SHOPPINGCART', value: '<?xml version="1.0" encoding="utf-8"?><shoppingcart><total><totalQuantity>1</totalQuantity></total></shoppingcart>' },
    { name: 'PBX_BILLING', value: billingXml(order) },
    { name: 'PBX_LANGUE', value: 'FRA' },
    { name: 'PBX_SOURCE', value: 'RWD' },
    { name: 'PBX_HASH', value: 'SHA512' },
    { name: 'PBX_TIME', value: isoTime(now) },
  ];
  return { url: PAYMENT_URL[config.mode], fields: [...fields, { name: 'PBX_HMAC', value: signFields(fields, config.hmacKey) }] };
}

export interface BankNotification {
  /** Données signées, telles que reçues (encore encodées) : c'est sur elles que porte la signature. */
  signedData: string;
  signature: Buffer | null;
  reference: string | null;
  amountCents: number | null;
  authorization: string | null;
  transaction: string | null;
  errorCode: string | null;
}

/**
 * Découpe la chaîne de paramètres reçue de la banque. La signature est détachée du reste,
 * décodée (URL puis Base64) ; les autres données restent telles quelles pour la vérification.
 */
export function parseNotification(rawQuery: string): BankNotification {
  const marker = rawQuery.lastIndexOf('&signature=');
  const signedData = marker === -1 ? rawQuery : rawQuery.slice(0, marker);
  let signature: Buffer | null = null;
  if (marker !== -1) {
    try {
      signature = Buffer.from(decodeURIComponent(rawQuery.slice(marker + '&signature='.length)), 'base64');
    } catch {
      signature = null;
    }
  }
  const params = new URLSearchParams(signedData);
  const amount = Number(params.get('montant'));
  return {
    signedData,
    signature: signature && signature.length > 0 ? signature : null,
    reference: params.get('reference'),
    amountCents: Number.isInteger(amount) && amount > 0 ? amount : null,
    authorization: params.get('autorisation'),
    transaction: params.get('transaction'),
    errorCode: params.get('erreur'),
  };
}

/** Vérifie la signature RSA SHA 1 de la banque avec sa clé publique. Seul un message vérifié peut changer une commande. */
export function verifySignature(notification: BankNotification, publicKeyPem: string): boolean {
  if (!notification.signature) return false;
  try {
    return createVerify('RSA-SHA1').update(notification.signedData, 'utf8').verify(publicKeyPem, notification.signature);
  } catch {
    return false;
  }
}

/** « 00000 » : paiement accepté. Tout autre code est un refus ou une erreur. */
export const isAccepted = (notification: BankNotification) => notification.errorCode === '00000' && Boolean(notification.authorization);
