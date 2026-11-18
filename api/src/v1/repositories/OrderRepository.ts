import { DataSource } from 'typeorm';

import { OrderEntity } from '../../dataSource/entities/Order.entity';
import { PaymentNotificationEntity } from '../../dataSource/entities/PaymentNotification.entity';

export type NewOrder = Pick<
  OrderEntity,
  | 'reference' | 'accessToken' | 'formule' | 'amountCents' | 'currency' | 'buyerFirstName' | 'buyerLastName' | 'buyerEmail'
  | 'addressLine1' | 'addressLine2' | 'zipCode' | 'city' | 'country' | 'isGift' | 'recipientName' | 'giftMessage' | 'deliveryAddress'
>;

export type NewNotification = Pick<PaymentNotificationEntity, 'reference' | 'rawQuery' | 'signatureValid' | 'errorCode' | 'sourceIp'>;

/** Accès aux commandes. Une interface, pour que les tests tournent avec un dépôt en mémoire, sans Postgres. */
export interface OrderRepository {
  create(order: NewOrder): Promise<OrderEntity>;
  findByReference(reference: string): Promise<OrderEntity | null>;
  /** Passe la commande à « payée » si elle ne l'est pas déjà. Renvoie vrai quand c'est cet appel qui l'a fait. */
  markPaid(reference: string, payment: { transaction: string | null; authorization: string | null }): Promise<boolean>;
  recordError(reference: string, errorCode: string): Promise<void>;
  markEmailsSent(reference: string): Promise<void>;
  logNotification(notification: NewNotification): Promise<void>;
}

export class TypeOrmOrderRepository implements OrderRepository {
  constructor(private readonly dataSource: DataSource) {}

  private get orders() {
    return this.dataSource.getRepository(OrderEntity);
  }

  create(order: NewOrder): Promise<OrderEntity> {
    return this.orders.save(this.orders.create(order));
  }

  findByReference(reference: string): Promise<OrderEntity | null> {
    return this.orders.findOne({ where: { reference } });
  }

  /* La condition sur le statut est dans la requête : deux notifications simultanées ne peuvent pas « payer » deux fois. */
  async markPaid(reference: string, payment: { transaction: string | null; authorization: string | null }): Promise<boolean> {
    const result = await this.orders
      .createQueryBuilder()
      .update()
      .set({ status: 'PAID', paidAt: () => 'now()', bankTransaction: payment.transaction, bankAuthorization: payment.authorization, lastErrorCode: null })
      .where('reference = :reference AND status = :status', { reference, status: 'PENDING' })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async recordError(reference: string, errorCode: string): Promise<void> {
    await this.orders.update({ reference, status: 'PENDING' }, { lastErrorCode: errorCode });
  }

  async markEmailsSent(reference: string): Promise<void> {
    await this.orders.update({ reference }, { emailsSentAt: () => 'now()' });
  }

  async logNotification(notification: NewNotification): Promise<void> {
    await this.dataSource.getRepository(PaymentNotificationEntity).insert(notification);
  }
}
