import { ErrorRequestHandler } from 'express';

import { AppError } from '../errors/AppError';

import { logger } from './logger';

/** Réponse d'erreur uniforme. Une erreur imprévue est journalisée et ne laisse rien fuiter vers le client. */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: { code: error.code, reason: error.reason ?? null, message: error.message, details: error.details ?? null } });
    return;
  }
  if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', reason: 'INVALID_BODY', message: 'Corps de requête invalide', details: null } });
    return;
  }
  logger.error('Erreur inattendue', { method: req.method, path: req.path, error: error instanceof Error ? (error.stack ?? error.message) : String(error) });
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', reason: null, message: 'Erreur interne', details: null } });
};
