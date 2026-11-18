import { randomBytes, timingSafeEqual } from 'node:crypto';

import { OrderEntity } from '../../dataSource/entities/Order.entity';
import { NotFoundError } from '../../errors/AppError';
import { logger } from '../../utils/logger';
import { CURRENCY, PRICE_CENTS } from '../catalogue';
import { OrderRepository } from '../repositories/OrderRepository';
import { OrderInput } from '../validation/order';

import { buildPaymentRequest, ETransactionsConfig, isAccepted, parseNotification, PaymentRequest, verifySignature } from './ETransactionsService';
import { Mailer } from './MailService';

export interface OrderServiceConfig {
  siteUrl: string;
  publicApiUrl: string;
  etransactions: ETransactionsConfig;
  /** Clé publique de la banque. Sans elle, aucune notification n'est acceptée. */
  bankPublicKey: string | null;
}

/** Alphabet sans caractères ambigus (ni 0/O, ni 1/I/L) : la référence est imprimée et peut être dictée au téléphone. */
const REFERENCE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const newReference = () => 'P' + Array.from(randomBytes(9), (byte) => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length]).join('');
const newToken = () => randomBytes(24).toString('base64url');

const sameToken = (expected: string, received: string) => {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
};

export type NotificationOutcome = 'paid' | 'already_paid' | 'refused' | 'rejected';

export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly mailer: Mailer,
    private readonly config: OrderServiceConfig,
  ) {}

  /** Ouvre une commande en attente et prépare le formulaire signé à envoyer à la banque. */
  async createOrder(input: OrderInput): Promise<{ order: OrderEntity; payment: PaymentRequest }> {
    const order = await this.orders.create({
      reference: newReference(),
      accessToken: newToken(),
      formule: input.formule,
      amountCents: PRICE_CENTS,
      currency: CURRENCY,
      buyerFirstName: input.firstName,
      buyerLastName: input.lastName,
      buyerEmail: input.email,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      zipCode: input.zipCode,
      city: input.city,
      country: 'FR',
      isGift: input.isGift,
      recipientName: input.recipientName,
      giftMessage: input.giftMessage,
      deliveryAddress: input.deliveryAddress,
    });
    const site = this.config.siteUrl;
    const reference = encodeURIComponent(order.reference);
    const payment = buildPaymentRequest(
      this.config.etransactions,
      {
        reference: order.reference,
        amountCents: order.amountCents,
        email: order.buyerEmail,
        firstName: order.buyerFirstName,
        lastName: order.buyerLastName,
        addressLine1: order.addressLine1,
        addressLine2: order.addressLine2,
        zipCode: order.zipCode,
        city: order.city,
      },
      {
        success: `${site}/merci?ref=${reference}&t=${order.accessToken}`,
        refused: `${site}/souscrire?paiement=refuse`,
        cancelled: `${site}/souscrire?paiement=annule`,
        notification: `${this.config.publicApiUrl}/v1/payments/etransactions/notification`,
      },
    );
    return { order, payment };
  }

  /** La commande, pour qui détient son jeton (le lien du certificat). Une mauvaise référence et un mauvais jeton donnent la même réponse. */
  async getOrder(reference: string, token: string): Promise<OrderEntity> {
    const order = await this.orders.findByReference(reference);
    if (!order || !token || !sameToken(order.accessToken, token)) throw new NotFoundError('Commande');
    return order;
  }

  /**
   * Notification de la banque, appelée à chaque tentative de paiement. Rien n'est cru avant vérification
   * de la signature ; ensuite la commande ne passe à « payée » que si le code est 00000 et que le montant
   * est exactement celui attendu. L'opération est idempotente : la banque peut rappeler plusieurs fois.
   */
  async handleNotification(rawQuery: string, sourceIp: string | null): Promise<NotificationOutcome> {
    const notification = parseNotification(rawQuery);
    const signatureValid = this.config.bankPublicKey ? verifySignature(notification, this.config.bankPublicKey) : false;
    await this.orders.logNotification({ reference: notification.reference, rawQuery, signatureValid, errorCode: notification.errorCode, sourceIp });

    if (!signatureValid) {
      logger.warn(`Notification de paiement rejetée (signature invalide${this.config.bankPublicKey ? '' : ', clé publique de la banque absente'})`, { reference: notification.reference, sourceIp });
      return 'rejected';
    }
    const order = notification.reference ? await this.orders.findByReference(notification.reference) : null;
    if (!order) {
      logger.warn('Notification de paiement pour une commande inconnue', { reference: notification.reference });
      return 'rejected';
    }
    if (!isAccepted(notification)) {
      if (notification.errorCode) await this.orders.recordError(order.reference, notification.errorCode);
      return 'refused';
    }
    if (notification.amountCents !== order.amountCents) {
      logger.error('Notification de paiement avec un montant inattendu', { reference: order.reference, expected: order.amountCents, received: notification.amountCents });
      return 'rejected';
    }
    const justPaid = await this.orders.markPaid(order.reference, { transaction: notification.transaction, authorization: notification.authorization });
    if (!justPaid) return 'already_paid';

    logger.info('Commande payée', { reference: order.reference });
    /* Les emails partent après l'enregistrement du paiement : un échec d'envoi ne doit jamais faire échouer la notification. */
    try {
      const paid = await this.orders.findByReference(order.reference);
      if (paid) {
        /* Seul un envoi réel est marqué : une commande payée sans date d'envoi signale des emails à renvoyer. */
        if (await this.mailer.sendOrderEmails(paid)) await this.orders.markEmailsSent(paid.reference);
      }
    } catch (error) {
      logger.error('Emails de commande non envoyés', { reference: order.reference, error: error instanceof Error ? error.message : String(error) });
    }
    return 'paid';
  }
}
