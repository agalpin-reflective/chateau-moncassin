/**
 * Envoie une demande de paiement signée à la plateforme de test de la banque et affiche sa réponse.
 * Sert à vérifier, sans navigateur, que les champs et la signature HMAC sont acceptés.
 * Usage : npx ts-node scripts/checkPaymentRequest.ts [site] [rang] [identifiant] [clé HMAC]
 * Sans argument, c'est le compte de démonstration public de la banque qui est utilisé. Aucun paiement n'est effectué.
 */
import { buildPaymentRequest } from '../src/v1/services/ETransactionsService';

const [site = '1999887', rang = '32', identifiant = '215', hmacKey = '0123456789ABCDEF'.repeat(8)] = process.argv.slice(2);

const request = buildPaymentRequest(
  { mode: 'test', site, rang, identifiant, hmacKey },
  {
    reference: `PTEST${Date.now().toString(36).toUpperCase()}`,
    amountCents: 15000,
    email: 'test@exemple.fr',
    firstName: 'Camille',
    lastName: 'Martin',
    addressLine1: '12 rue des Vignes',
    addressLine2: null,
    zipCode: '47700',
    city: 'Casteljaloux',
  },
  {
    success: 'https://parrains.chateaumoncassin.com/merci?ref=PTEST&t=jeton',
    refused: 'https://parrains.chateaumoncassin.com/souscrire?paiement=refuse',
    cancelled: 'https://parrains.chateaumoncassin.com/souscrire?paiement=annule',
    notification: 'https://parrains.chateaumoncassin.com/api/v1/payments/etransactions/notification',
  },
);

(async () => {
  const body = new URLSearchParams(request.fields.map((field) => [field.name, field.value] as [string, string]));
  const response = await fetch(request.url, { method: 'POST', body, redirect: 'manual' });
  const text = await response.text();
  const plain = text
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  console.log(`site ${site}, rang ${rang}, identifiant ${identifiant} → HTTP ${response.status}, redirection : ${response.headers.get('location') ?? 'aucune'}`);
  console.log(plain.slice(0, 500));
})();
