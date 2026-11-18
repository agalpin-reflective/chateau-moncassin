import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type OrderStatus = 'PENDING' | 'PAID';

/** Une souscription de parrainage. Les montants sont des entiers, en centimes. */
@Entity({ name: 'orders' })
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Référence transmise à la banque (PBX_CMD) et imprimée sur le certificat. */
  @Column({ type: 'text', unique: true })
  reference: string;

  /** Jeton d'accès au certificat, porté par le lien remis à l'acheteur. */
  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Column({ type: 'text', default: 'PENDING' })
  status: OrderStatus;

  @Column({ type: 'text' })
  formule: string;

  @Column({ name: 'amount_cents', type: 'integer' })
  amountCents: number;

  @Column({ type: 'text', default: 'EUR' })
  currency: string;

  @Column({ name: 'buyer_first_name', type: 'text' })
  buyerFirstName: string;

  @Column({ name: 'buyer_last_name', type: 'text' })
  buyerLastName: string;

  @Column({ name: 'buyer_email', type: 'text' })
  buyerEmail: string;

  @Column({ name: 'address_line1', type: 'text' })
  addressLine1: string;

  @Column({ name: 'address_line2', type: 'text', nullable: true })
  addressLine2: string | null;

  @Column({ name: 'zip_code', type: 'text' })
  zipCode: string;

  @Column({ type: 'text' })
  city: string;

  /** Code pays ISO 3166 1 alpha 2. */
  @Column({ type: 'text', default: 'FR' })
  country: string;

  @Column({ name: 'is_gift', type: 'boolean', default: false })
  isGift: boolean;

  /** Nom inscrit sur le certificat : l'acheteur, ou la personne à qui le parrainage est offert. */
  @Column({ name: 'recipient_name', type: 'text' })
  recipientName: string;

  @Column({ name: 'gift_message', type: 'text', nullable: true })
  giftMessage: string | null;

  /** Adresse de livraison quand elle diffère de celle de l'acheteur (cadeau), sur plusieurs lignes. */
  @Column({ name: 'delivery_address', type: 'text', nullable: true })
  deliveryAddress: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  /** Numéro de transaction et numéro d'autorisation renvoyés par la banque. */
  @Column({ name: 'bank_transaction', type: 'text', nullable: true })
  bankTransaction: string | null;

  @Column({ name: 'bank_authorization', type: 'text', nullable: true })
  bankAuthorization: string | null;

  /** Dernier code d'erreur renvoyé par la banque pour une tentative refusée. */
  @Column({ name: 'last_error_code', type: 'text', nullable: true })
  lastErrorCode: string | null;

  @Column({ name: 'emails_sent_at', type: 'timestamptz', nullable: true })
  emailsSentAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
