import winston from 'winston';

import { env } from '../config/env';

/** Journal de l'application : JSON en production (lisible par Coolify), texte coloré en développement. Jamais de donnée de carte ni de clé. */
export const logger = winston.createLogger({
  level: env.node.isTest ? 'error' : 'info',
  format: env.node.isProduction
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(winston.format.colorize(), winston.format.simple()),
  transports: [new winston.transports.Console()],
});
