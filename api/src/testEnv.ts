/** Variables d'environnement des tests, posées avant tout import de la configuration. */
process.env.NODE_ENV = 'test';
process.env.SITE_URL = 'https://parrains.exemple.test';
process.env.PUBLIC_API_URL = 'https://parrains.exemple.test/api';
process.env.ETRANSACTIONS_MODE = 'test';
process.env.ETRANSACTIONS_SITE = '1999887';
process.env.ETRANSACTIONS_RANG = '32';
process.env.ETRANSACTIONS_IDENTIFIANT = '215';
process.env.ETRANSACTIONS_HMAC_KEY = '0123456789ABCDEF'.repeat(8);
process.env.SMTP_HOST = '';
