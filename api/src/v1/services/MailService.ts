import nodemailer, { Transporter } from 'nodemailer';

import { Env } from '../../config/env';
import { OrderEntity } from '../../dataSource/entities/Order.entity';
import { logger } from '../../utils/logger';
import { DURATION_MONTHS, formules, FormuleId } from '../catalogue';

export interface Mailer {
  /** Renvoie vrai quand les emails sont réellement partis. */
  sendOrderEmails(order: OrderEntity): Promise<boolean>;
}

const euros = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',').replace(',00', '')} €`;

/** Lien personnel vers la page du certificat. */
export const certificateUrl = (siteUrl: string, order: Pick<OrderEntity, 'reference' | 'accessToken'>) =>
  `${siteUrl}/merci?ref=${encodeURIComponent(order.reference)}&t=${encodeURIComponent(order.accessToken)}`;

/**
 * Emails d'une commande payée : le détail pour le château, la confirmation pour l'acheteur.
 * Sans serveur SMTP configuré, rien n'est envoyé : le contenu est seulement journalisé (développement).
 */
export class SmtpMailer implements Mailer {
  private readonly transporter: Transporter | null;

  constructor(private readonly config: Env['mail'], private readonly siteUrl: string) {
    this.transporter = config.host
      ? nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.port === 465,
          auth: config.user ? { user: config.user, pass: config.password } : undefined,
        })
      : null;
  }

  async sendOrderEmails(order: OrderEntity): Promise<boolean> {
    const formule = formules[order.formule as FormuleId];
    const buyer = `${order.buyerFirstName} ${order.buyerLastName}`;
    const address = [order.addressLine1, order.addressLine2, `${order.zipCode} ${order.city}`].filter(Boolean).join('\n');
    const link = certificateUrl(this.siteUrl, order);

    const forChateau = [
      `Nouveau parrainage payé : ${euros(order.amountCents)}`,
      '',
      `Référence : ${order.reference}`,
      `Formule : ${formule?.label ?? order.formule} (${formule?.summary ?? ''})`,
      `Parrain inscrit sur le certificat : ${order.recipientName}`,
      order.isGift ? `Offert par : ${buyer}` : null,
      order.isGift && order.giftMessage ? `Message : ${order.giftMessage}` : null,
      '',
      `Acheteur : ${buyer}`,
      `Email : ${order.buyerEmail}`,
      `Adresse de l'acheteur :\n${address}`,
      order.deliveryAddress ? `\nAdresse de livraison du cadeau :\n${order.deliveryAddress}` : '\nLivraison à l\'adresse de l\'acheteur.',
      '',
      `Numéro de transaction bancaire : ${order.bankTransaction ?? 'non communiqué'}`,
      `Certificat : ${link}`,
    ].filter((line) => line !== null).join('\n');

    const forBuyer = [
      `Bonjour ${order.buyerFirstName},`,
      '',
      order.isGift
        ? `Merci pour votre commande : le parrainage d'un pied de vigne offert à ${order.recipientName} est confirmé.`
        : "Merci pour votre commande : votre parrainage d'un pied de vigne est confirmé.",
      `Il court pendant ${DURATION_MONTHS} mois à partir d'aujourd'hui.`,
      '',
      `Formule ${formule?.label ?? order.formule} : ${formule?.summary ?? ''}.`,
      `Montant réglé : ${euros(order.amountCents)}. Référence : ${order.reference}.`,
      '',
      'Votre certificat de parrainage, à télécharger ou à imprimer :',
      link,
      '',
      'Vos bouteilles sont expédiées sous 7 jours ouvrés. Pour réserver votre journée de vendanges, répondez simplement à cet email.',
      '',
      'Le Château Moncassin',
      "L'abus d'alcool est dangereux pour la santé. À consommer avec modération.",
    ].join('\n');

    const messages = [
      this.config.ordersTo ? { to: this.config.ordersTo, replyTo: order.buyerEmail, subject: `Parrainage payé · ${formule?.label ?? order.formule} · ${order.recipientName}`, text: forChateau } : null,
      { to: order.buyerEmail, replyTo: this.config.ordersTo, subject: 'Votre parrainage au Château Moncassin est confirmé', text: forBuyer },
    ].filter((message) => message !== null);

    if (!this.transporter) {
      logger.warn(`SMTP non configuré : ${messages.length} email(s) non envoyé(s) pour la commande ${order.reference}`);
      return false;
    }
    for (const message of messages) {
      await this.transporter.sendMail({ from: this.config.from, ...message });
    }
    return true;
  }
}
