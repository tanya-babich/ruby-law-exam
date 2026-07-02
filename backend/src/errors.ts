import { HTTP_STATUS, ERROR_CODES } from './constants';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class HttpError extends AppError {}

export class ContractProcessingError extends AppError {
  constructor(message: string) {
    super(HTTP_STATUS.UNPROCESSABLE_ENTITY, ERROR_CODES.UNPROCESSABLE, message);
  }
}

export class AIUnavailableError extends AppError {
  constructor(message = 'The AI service is temporarily unavailable. Please try again in a moment.') {
    super(HTTP_STATUS.SERVICE_UNAVAILABLE, ERROR_CODES.AI_UNAVAILABLE, message);
  }
}
