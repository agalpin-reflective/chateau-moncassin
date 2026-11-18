import { ValidationError } from '../../errors/AppError';
import { FormuleId, isFormuleId } from '../catalogue';

/** Ce que le site envoie pour ouvrir une commande. Aucun prix : le serveur le fixe. */
export interface OrderInput {
  formule: FormuleId;
  firstName: string;
  lastName: string;
  email: string;
  addressLine1: string;
  addressLine2: string | null;
  zipCode: string;
  city: string;
  isGift: boolean;
  /** Nom inscrit sur le certificat. */
  recipientName: string;
  giftMessage: string | null;
  deliveryAddress: string | null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ZIP_FR = /^\d{5}$/;

const text = (body: Record<string, unknown>, field: string, max: number, required = true): string => {
  const raw = body[field];
  const value = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
  if (!value && required) throw new ValidationError(`Champ manquant : ${field}`, 'FIELD_REQUIRED', { field });
  if (value.length > max) throw new ValidationError(`Champ trop long : ${field}`, 'FIELD_TOO_LONG', { field, max });
  return value;
};

export function parseOrderInput(body: unknown): OrderInput {
  if (typeof body !== 'object' || body === null) throw new ValidationError('Corps de requête invalide', 'INVALID_BODY');
  const data = body as Record<string, unknown>;

  if (!isFormuleId(data.formule)) throw new ValidationError('Formule inconnue', 'UNKNOWN_FORMULE', { field: 'formule' });
  if (data.acceptTerms !== true) throw new ValidationError('Les conditions doivent être acceptées', 'TERMS_NOT_ACCEPTED', { field: 'acceptTerms' });

  const firstName = text(data, 'firstName', 60);
  const lastName = text(data, 'lastName', 60);
  const email = text(data, 'email', 254).toLowerCase();
  if (!EMAIL.test(email)) throw new ValidationError('Adresse email invalide', 'INVALID_EMAIL', { field: 'email' });
  const zipCode = text(data, 'zipCode', 5);
  if (!ZIP_FR.test(zipCode)) throw new ValidationError('Code postal invalide', 'INVALID_ZIP', { field: 'zipCode' });

  const isGift = data.isGift === true;
  const recipientName = isGift ? `${text(data, 'recipientFirstName', 60)} ${text(data, 'recipientLastName', 60)}` : `${firstName} ${lastName}`;
  /* L'adresse de livraison libre garde ses retours à la ligne : c'est le château qui la lit. */
  const rawDelivery = isGift && typeof data.deliveryAddress === 'string' ? data.deliveryAddress.trim() : '';
  if (rawDelivery.length > 400) throw new ValidationError('Adresse de livraison trop longue', 'FIELD_TOO_LONG', { field: 'deliveryAddress', max: 400 });

  return {
    formule: data.formule,
    firstName,
    lastName,
    email,
    addressLine1: text(data, 'addressLine1', 100),
    addressLine2: text(data, 'addressLine2', 100, false) || null,
    zipCode,
    city: text(data, 'city', 80),
    isGift,
    recipientName,
    giftMessage: isGift ? text(data, 'giftMessage', 140, false) || null : null,
    deliveryAddress: rawDelivery || null,
  };
}
