import { createSign, generateKeyPairSync } from 'node:crypto';

import request from 'supertest';

import { createApp } from './app';
import { OrderEntity } from './dataSource/entities/Order.entity';
import { NewNotification, NewOrder, OrderRepository } from './v1/repositories/OrderRepository';
import { OrderService } from './v1/services/OrderService';

/** Dépôt en mémoire : les tests de routes n'ont pas besoin de Postgres. */
class MemoryOrders implements OrderRepository {
  orders = new Map<string, OrderEntity>();
  notifications: NewNotification[] = [];

  async create(order: NewOrder) {
    const entity = Object.assign(new OrderEntity(), order, {
      id: String(this.orders.size + 1), status: 'PENDING', paidAt: null, bankTransaction: null, bankAuthorization: null,
      lastErrorCode: null, emailsSentAt: null, createdAt: new Date('2026-11-18T10:00:00Z'), updatedAt: new Date('2026-11-18T10:00:00Z'),
    });
    this.orders.set(entity.reference, entity);
    return entity;
  }
  async findByReference(reference: string) {
    return this.orders.get(reference) ?? null;
  }
  async markPaid(reference: string, payment: { transaction: string | null; authorization: string | null }) {
    const order = this.orders.get(reference);
    if (!order || order.status !== 'PENDING') return false;
    Object.assign(order, { status: 'PAID', paidAt: new Date('2026-11-18T10:05:00Z'), bankTransaction: payment.transaction, bankAuthorization: payment.authorization });
    return true;
  }
  async recordError(reference: string, errorCode: string) {
    const order = this.orders.get(reference);
    if (order && order.status === 'PENDING') order.lastErrorCode = errorCode;
  }
  async markEmailsSent(reference: string) {
    const order = this.orders.get(reference);
    if (order) order.emailsSentAt = new Date();
  }
  async logNotification(notification: NewNotification) {
    this.notifications.push(notification);
  }
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 1024 });
const bankPublicKey = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const signed = (data: string) => `${data}&signature=${encodeURIComponent(createSign('RSA-SHA1').update(data).sign(privateKey, 'base64'))}`;

const validBody = {
  formule: 'domaine',
  firstName: 'Antoine',
  lastName: 'Test',
  email: 'Antoine@Exemple.fr',
  addressLine1: '12 rue des Vignes',
  zipCode: '47700',
  city: 'Casteljaloux',
  isGift: true,
  recipientFirstName: 'Éléonore',
  recipientLastName: 'de Saint Exupéry',
  giftMessage: 'Pour tes quarante ans.',
  acceptTerms: true,
};

function setup(publicKeyPem: string | null = bankPublicKey) {
  const orders = new MemoryOrders();
  const sendOrderEmails = jest.fn().mockResolvedValue(true);
  const service = new OrderService(orders, { sendOrderEmails }, {
    siteUrl: 'https://parrains.exemple.test',
    publicApiUrl: 'https://parrains.exemple.test/api',
    etransactions: { mode: 'test', site: '1999887', rang: '32', identifiant: '215', hmacKey: '0123456789ABCDEF'.repeat(8) },
    bankPublicKey: publicKeyPem,
  });
  return { orders, sendOrderEmails, app: createApp({ orderService: service, isReady: async () => true }) };
}

const IPN = '/v1/payments/etransactions/notification';

describe('POST /v1/orders', () => {
  it('ouvre une commande et renvoie le formulaire signé pour la banque', async () => {
    const { app, orders } = setup();
    const response = await request(app).post('/v1/orders').send(validBody).expect(201);
    const fields = Object.fromEntries(response.body.payment.fields.map((f: { name: string; value: string }) => [f.name, f.value]));
    const order = orders.orders.get(response.body.reference)!;

    expect(response.body.payment.url).toBe('https://preprod-tpeweb.e-transactions.fr/php/');
    expect(fields.PBX_TOTAL).toBe('15000');
    expect(fields.PBX_CMD).toBe(order.reference);
    expect(fields.PBX_PORTEUR).toBe('antoine@exemple.fr');
    expect(fields.PBX_EFFECTUE).toBe(`https://parrains.exemple.test/merci?ref=${order.reference}&t=${order.accessToken}`);
    expect(fields.PBX_REPONDRE_A).toBe('https://parrains.exemple.test/api/v1/payments/etransactions/notification');
    expect(order).toMatchObject({ status: 'PENDING', amountCents: 15000, isGift: true, recipientName: 'Éléonore de Saint Exupéry', giftMessage: 'Pour tes quarante ans.' });
  });

  it('inscrit le nom de l\'acheteur sur le certificat quand ce n\'est pas un cadeau', async () => {
    const { app, orders } = setup();
    const response = await request(app).post('/v1/orders').send({ ...validBody, isGift: false, giftMessage: 'ignoré' }).expect(201);
    expect(orders.orders.get(response.body.reference)).toMatchObject({ recipientName: 'Antoine Test', giftMessage: null, isGift: false });
  });

  it('ignore tout prix envoyé par le client', async () => {
    const { app, orders } = setup();
    const response = await request(app).post('/v1/orders').send({ ...validBody, amountCents: 1, price: 1 }).expect(201);
    expect(orders.orders.get(response.body.reference)!.amountCents).toBe(15000);
  });

  it.each([
    ['formule inconnue', { formule: 'premium' }, 'UNKNOWN_FORMULE'],
    ['conditions non acceptées', { acceptTerms: false }, 'TERMS_NOT_ACCEPTED'],
    ['email invalide', { email: 'pas-un-email' }, 'INVALID_EMAIL'],
    ['code postal invalide', { zipCode: '4770' }, 'INVALID_ZIP'],
    ['prénom manquant', { firstName: '  ' }, 'FIELD_REQUIRED'],
    ['bénéficiaire manquant pour un cadeau', { recipientLastName: '' }, 'FIELD_REQUIRED'],
    ['message trop long', { giftMessage: 'x'.repeat(141) }, 'FIELD_TOO_LONG'],
  ])('refuse une commande avec %s', async (_label, patch, reason) => {
    const { app, orders } = setup();
    const response = await request(app).post('/v1/orders').send({ ...validBody, ...patch }).expect(400);
    expect(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR', reason });
    expect(orders.orders.size).toBe(0);
  });

  it('répond 400 à un JSON invalide', async () => {
    const { app } = setup();
    await request(app).post('/v1/orders').set('Content-Type', 'application/json').send('{"formule":').expect(400);
  });
});

describe('GET /v1/orders/:reference', () => {
  it('donne les données du certificat au porteur du jeton, sans adresse ni email', async () => {
    const { app, orders } = setup();
    const { body } = await request(app).post('/v1/orders').send(validBody);
    const order = orders.orders.get(body.reference)!;
    const response = await request(app).get(`/v1/orders/${order.reference}`).query({ t: order.accessToken }).expect(200);
    expect(response.body).toMatchObject({ reference: order.reference, status: 'PENDING', recipient: 'Éléonore de Saint Exupéry', gift: true, giver: 'Antoine', months: 12 });
    expect(JSON.stringify(response.body)).not.toMatch(/exemple\.fr|rue des Vignes|47700/);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('répond 404 sans le bon jeton, comme pour une référence inconnue', async () => {
    const { app, orders } = setup();
    const { body } = await request(app).post('/v1/orders').send(validBody);
    const order = orders.orders.get(body.reference)!;
    await request(app).get(`/v1/orders/${order.reference}`).query({ t: 'mauvais' }).expect(404);
    await request(app).get(`/v1/orders/${order.reference}`).expect(404);
    await request(app).get('/v1/orders/PINCONNUE').query({ t: order.accessToken }).expect(404);
  });
});

describe('notification de paiement de la banque', () => {
  const open = async () => {
    const context = setup();
    const { body } = await request(context.app).post('/v1/orders').send(validBody);
    return { ...context, order: context.orders.orders.get(body.reference)! };
  };
  const accepted = (reference: string, amount = 15000) => signed(`montant=${amount}&reference=${reference}&autorisation=XXXXXX&transaction=987654&erreur=00000`);

  it('passe la commande à « payée » sur un message signé et accepté, et envoie les emails une seule fois', async () => {
    const { app, order, sendOrderEmails, orders } = await open();
    const response = await request(app).get(`${IPN}?${accepted(order.reference)}`).expect(200);
    expect(response.text).toBe('');
    expect(order).toMatchObject({ status: 'PAID', bankTransaction: '987654', bankAuthorization: 'XXXXXX' });
    expect(sendOrderEmails).toHaveBeenCalledTimes(1);
    expect(order.emailsSentAt).not.toBeNull();

    await request(app).get(`${IPN}?${accepted(order.reference)}`).expect(200);
    expect(sendOrderEmails).toHaveBeenCalledTimes(1);
    expect(orders.notifications).toHaveLength(2);
  });

  it('accepte aussi la notification en POST', async () => {
    const { app, order } = await open();
    await request(app).post(IPN).set('Content-Type', 'application/x-www-form-urlencoded').send(accepted(order.reference)).expect(200);
    expect(order.status).toBe('PAID');
  });

  it('rejette un message non signé ou falsifié, et le journalise', async () => {
    const { app, order, orders, sendOrderEmails } = await open();
    await request(app).get(`${IPN}?montant=15000&reference=${order.reference}&autorisation=XXXXXX&transaction=1&erreur=00000`).expect(403);
    await request(app).get(`${IPN}?${accepted(order.reference).replace('transaction=987654', 'transaction=1')}`).expect(403);
    expect(order.status).toBe('PENDING');
    expect(sendOrderEmails).not.toHaveBeenCalled();
    expect(orders.notifications.map((n) => n.signatureValid)).toEqual([false, false]);
  });

  it('rejette un montant qui n\'est pas celui de la commande, même signé', async () => {
    const { app, order } = await open();
    await request(app).get(`${IPN}?${accepted(order.reference, 100)}`).expect(403);
    expect(order.status).toBe('PENDING');
  });

  it('garde la commande en attente après un refus de la banque, puis accepte une nouvelle tentative', async () => {
    const { app, order } = await open();
    await request(app).get(`${IPN}?${signed(`montant=15000&reference=${order.reference}&transaction=1&erreur=00151`)}`).expect(200);
    expect(order).toMatchObject({ status: 'PENDING', lastErrorCode: '00151' });
    await request(app).get(`${IPN}?${accepted(order.reference)}`).expect(200);
    expect(order.status).toBe('PAID');
  });

  it('rejette tout tant que la clé publique de la banque n\'est pas configurée', async () => {
    const context = setup(null);
    const { body } = await request(context.app).post('/v1/orders').send(validBody);
    await request(context.app).get(`${IPN}?${accepted(body.reference)}`).expect(403);
    expect(context.orders.orders.get(body.reference)!.status).toBe('PENDING');
  });

  it('enregistre le paiement même si l\'envoi des emails échoue', async () => {
    const { app, order, sendOrderEmails } = await open();
    sendOrderEmails.mockRejectedValueOnce(new Error('SMTP indisponible'));
    await request(app).get(`${IPN}?${accepted(order.reference)}`).expect(200);
    expect(order.status).toBe('PAID');
    expect(order.emailsSentAt).toBeNull();
  });
});

describe('routes annexes', () => {
  it('répond au contrôle de santé', async () => {
    await request(setup().app).get('/healthcheck').expect(200, { status: 'ok' });
  });

  it('répond 404 en JSON à une route inconnue', async () => {
    const response = await request(setup().app).get('/v1/inconnue').expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
