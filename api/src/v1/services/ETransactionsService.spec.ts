import { createSign, generateKeyPairSync } from 'node:crypto';

import { billingXml, buildPaymentRequest, isAccepted, parseNotification, signFields, verifySignature } from './ETransactionsService';

const DEMO_KEY = '0123456789ABCDEF'.repeat(8);
const config = { mode: 'test' as const, site: '1999887', rang: '32', identifiant: '215', hmacKey: DEMO_KEY };
const order = {
  reference: 'PABCDEFGHJ',
  amountCents: 15000,
  email: 'camille@exemple.fr',
  firstName: 'Camille',
  lastName: 'Martin',
  addressLine1: '12 rue des Vignes',
  addressLine2: null,
  zipCode: '47700',
  city: 'Casteljaloux',
};
const urls = {
  success: 'https://parrains.exemple.test/merci?ref=PABCDEFGHJ&t=jeton',
  refused: 'https://parrains.exemple.test/souscrire?paiement=refuse',
  cancelled: 'https://parrains.exemple.test/souscrire?paiement=annule',
  notification: 'https://parrains.exemple.test/api/v1/payments/etransactions/notification',
};

describe('signature HMAC', () => {
  it('reproduit une empreinte calculée avec openssl', () => {
    const fields = [
      { name: 'PBX_SITE', value: '1999887' },
      { name: 'PBX_RANG', value: '32' },
      { name: 'PBX_IDENTIFIANT', value: '215' },
      { name: 'PBX_TOTAL', value: '15000' },
    ];
    expect(signFields(fields, DEMO_KEY)).toBe('F679264935574AA7141270F0D7F7BAF8280632B16F131480CC4AC5B4B4A5AED506D753B0B6CFD70A354B2AD58668A48DD0B41E451851128F3C35ABC84D148E29');
  });

  it('place PBX_HMAC en dernier et signe tous les champs qui le précèdent, dans l\'ordre', () => {
    const request = buildPaymentRequest(config, order, urls, new Date('2026-11-18T15:00:00Z'));
    const names = request.fields.map((field) => field.name);
    expect(names[names.length - 1]).toBe('PBX_HMAC');
    expect(names).toEqual(expect.arrayContaining(['PBX_SITE', 'PBX_TOTAL', 'PBX_CMD', 'PBX_RETOUR', 'PBX_REPONDRE_A', 'PBX_SHOPPINGCART', 'PBX_BILLING', 'PBX_HASH', 'PBX_TIME']));
    expect(request.fields[request.fields.length - 1].value).toBe(signFields(request.fields.slice(0, -1), DEMO_KEY));
    expect(request.url).toBe('https://preprod-tpeweb.e-transactions.fr/php/');
  });

  it('envoie le montant en centimes, en euros, avec la référence de la commande', () => {
    const fields = Object.fromEntries(buildPaymentRequest(config, order, urls).fields.map((field) => [field.name, field.value]));
    expect(fields.PBX_TOTAL).toBe('15000');
    expect(fields.PBX_DEVISE).toBe('978');
    expect(fields.PBX_CMD).toBe('PABCDEFGHJ');
    expect(fields.PBX_RETOUR.endsWith('signature:K')).toBe(true);
    expect(fields.PBX_TIME).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/);
  });

  it('utilise la plateforme de production en mode production', () => {
    expect(buildPaymentRequest({ ...config, mode: 'production' }, order, urls).url).toBe('https://tpeweb.e-transactions.fr/php/');
  });

  it('refuse une adresse de retour de plus de 150 caractères', () => {
    expect(() => buildPaymentRequest(config, order, { ...urls, success: `https://parrains.exemple.test/merci?${'x'.repeat(150)}` })).toThrow(/trop longue/);
  });
});

describe('adresse de facturation (3D Secure v2)', () => {
  it('échappe le XML et nettoie les noms', () => {
    const value = billingXml({ ...order, firstName: 'Jean <b>', lastName: "O'Brien & Fils", addressLine1: '3 allée A&B', addressLine2: 'Bât. <2>' });
    expect(value).toContain('<FirstName>Jean b</FirstName>');
    expect(value).toContain("<LastName>O'Brien Fils</LastName>");
    expect(value).toContain('<Address1>3 allée A&amp;B</Address1>');
    expect(value).toContain('<Address2>Bât. &lt;2&gt;</Address2>');
    expect(value).toContain('<CountryCode>250</CountryCode>');
  });

  it('tronque les noms à 30 caractères', () => {
    expect(billingXml({ ...order, lastName: 'A'.repeat(60) })).toContain(`<LastName>${'A'.repeat(30)}</LastName>`);
  });
});

describe('notification de la banque', () => {
  /* La vraie clé privée de la banque est inconnue : on signe avec une paire de test, comme le suggère le manuel. */
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 1024 });
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const sign = (data: string) => `${data}&signature=${encodeURIComponent(createSign('RSA-SHA1').update(data).sign(privateKey, 'base64'))}`;

  it('accepte un message signé et en lit les valeurs', () => {
    const notification = parseNotification(sign('montant=15000&reference=PABCDEFGHJ&autorisation=XXXXXX&transaction=123456&erreur=00000'));
    expect(verifySignature(notification, publicPem)).toBe(true);
    expect(notification).toMatchObject({ reference: 'PABCDEFGHJ', amountCents: 15000, authorization: 'XXXXXX', transaction: '123456', errorCode: '00000' });
    expect(isAccepted(notification)).toBe(true);
  });

  it('rejette un message dont le montant a été modifié après signature', () => {
    const raw = sign('montant=15000&reference=PABCDEFGHJ&autorisation=XXXXXX&transaction=123456&erreur=00000').replace('montant=15000', 'montant=100');
    expect(verifySignature(parseNotification(raw), publicPem)).toBe(false);
  });

  it('rejette un message sans signature ou à la signature illisible', () => {
    expect(verifySignature(parseNotification('montant=15000&reference=PABCDEFGHJ&erreur=00000'), publicPem)).toBe(false);
    expect(verifySignature(parseNotification('montant=15000&erreur=00000&signature=%%%'), publicPem)).toBe(false);
  });

  it('ne tient pas un refus pour un paiement', () => {
    expect(isAccepted(parseNotification(sign('montant=15000&reference=PABCDEFGHJ&transaction=1&erreur=00151')))).toBe(false);
  });
});
