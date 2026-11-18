/** Contexte plat et sans danger pour le client, joint à une erreur (nom du champ fautif, par exemple). */
export type ErrorDetails = Record<string, string | number | boolean | null>;

/**
 * Erreur métier. `code` donne la famille (VALIDATION_ERROR, NOT_FOUND…), `reason` le cas précis,
 * stable même si la phrase change : c'est sur lui que le site s'appuie, jamais sur le texte.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly statusCode: number = 500,
    public readonly reason?: string,
    public readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, reason: string, details?: ErrorDetails) {
    super(message, 'VALIDATION_ERROR', 400, reason, details);
  }
}

export class NotFoundError extends AppError {
  constructor(what: string) {
    super(`${what} introuvable`, 'NOT_FOUND', 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, reason: string) {
    super(message, 'FORBIDDEN', 403, reason);
  }
}
