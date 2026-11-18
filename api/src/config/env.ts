import dotenv from 'dotenv';

dotenv.config({ quiet: true });

/**
 * Configuration lue une seule fois au démarrage, avec arrêt immédiat si une variable manque ou est invalide.
 * Le reste du code importe `env` et ne lit jamais `process.env`.
 */
class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

const readString = (name: string): string | undefined => {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? undefined : raw;
};

const requireString = (name: string): string => {
  const value = readString(name);
  if (!value) throw new EnvValidationError(`Variable d'environnement manquante : ${name}`);
  return value;
};

const readPositiveInt = (name: string, defaultValue: number): number => {
  const raw = readString(name);
  if (raw === undefined) return defaultValue;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new EnvValidationError(`${name} doit être un entier positif (reçu « ${raw} »)`);
  return value;
};

const readUrl = (name: string): string => {
  const value = requireString(name).replace(/\/+$/, '');
  try {
    new URL(value);
  } catch {
    throw new EnvValidationError(`${name} doit être une adresse complète (reçu « ${value} »)`);
  }
  return value;
};

const rawNodeEnv = process.env.NODE_ENV || 'development';
if (!['development', 'production', 'test'].includes(rawNodeEnv)) {
  throw new EnvValidationError(`NODE_ENV doit valoir development, production ou test (reçu « ${rawNodeEnv} »)`);
}
const nodeEnv = rawNodeEnv as 'development' | 'production' | 'test';

/** Clé du compte de démonstration public de la banque : utilisable en test, interdite en production. */
const DEMO_HMAC_KEY = '0123456789ABCDEF'.repeat(8);

const mode = readString('ETRANSACTIONS_MODE') ?? 'test';
if (mode !== 'test' && mode !== 'production') {
  throw new EnvValidationError(`ETRANSACTIONS_MODE doit valoir test ou production (reçu « ${mode} »)`);
}
const hmacKey = requireString('ETRANSACTIONS_HMAC_KEY');
if (!/^[0-9a-fA-F]{128}$/.test(hmacKey)) {
  throw new EnvValidationError('ETRANSACTIONS_HMAC_KEY doit être une clé hexadécimale de 128 caractères');
}
if (mode === 'production' && hmacKey.toUpperCase() === DEMO_HMAC_KEY) {
  throw new EnvValidationError('ETRANSACTIONS_HMAC_KEY est la clé de démonstration : elle ne peut pas servir en production');
}

export const env = {
  node: { env: nodeEnv, isProduction: nodeEnv === 'production', isTest: nodeEnv === 'test' },
  port: readPositiveInt('PORT', 4100),
  siteUrl: readUrl('SITE_URL'),
  publicApiUrl: readUrl('PUBLIC_API_URL'),
  database: { url: nodeEnv === 'test' ? (readString('DATABASE_URL') ?? '') : requireString('DATABASE_URL') },
  etransactions: {
    mode: mode as 'test' | 'production',
    site: requireString('ETRANSACTIONS_SITE'),
    rang: requireString('ETRANSACTIONS_RANG'),
    identifiant: requireString('ETRANSACTIONS_IDENTIFIANT'),
    hmacKey,
    /** Clé publique de la banque, en PEM : contenu direct, ou chemin d'un fichier. */
    publicKey: readString('ETRANSACTIONS_PUBLIC_KEY'),
    publicKeyFile: readString('ETRANSACTIONS_PUBLIC_KEY_FILE'),
  },
  mail: {
    host: readString('SMTP_HOST'),
    port: readPositiveInt('SMTP_PORT', 587),
    user: readString('SMTP_USER'),
    password: readString('SMTP_PASSWORD'),
    from: readString('MAIL_FROM') ?? 'Château Moncassin <parrainage@localhost>',
    ordersTo: readString('ORDERS_EMAIL'),
  },
};

export type Env = typeof env;
