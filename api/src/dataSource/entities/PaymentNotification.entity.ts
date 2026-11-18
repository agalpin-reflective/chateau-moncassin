import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Trace de chaque appel reçu de la banque, valide ou non : c'est le journal d'audit des paiements. */
@Entity({ name: 'payment_notifications' })
export class PaymentNotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  reference: string | null;

  /** Paramètres reçus, tels quels (aucune donnée de carte n'y figure). */
  @Column({ name: 'raw_query', type: 'text' })
  rawQuery: string;

  @Column({ name: 'signature_valid', type: 'boolean' })
  signatureValid: boolean;

  @Column({ name: 'error_code', type: 'text', nullable: true })
  errorCode: string | null;

  @Column({ name: 'source_ip', type: 'text', nullable: true })
  sourceIp: string | null;

  @CreateDateColumn({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;
}
