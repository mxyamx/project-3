export enum HttpStatus {
    Ok = 200,
    Created = 201,
    BadRequest = 400,
    Unauthorized = 401,
    Forbidden = 403,
    NotFound = 404,
    InternalServerError = 500,
}

export enum ErrorMessages {
    GeneralError = 'Une erreur inconnue est survenue.',
    BadRequestError = 'La requête est invalide.',
    NotFoundError = 'La ressource demandée est introuvable.',
    InternalServerError = 'Une erreur interne est survenue.',
    DefaultError = 'Une erreur inattendue est survenue',
}
