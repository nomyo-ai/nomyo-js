/**
 * Error classes matching OpenAI's error structure
 */

export class APIError extends Error {
    statusCode?: number;
    errorDetails?: object;

    constructor(message: string, statusCode?: number, errorDetails?: object) {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
        this.errorDetails = errorDetails;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export class AuthenticationError extends APIError {
    constructor(message: string, statusCode?: number, errorDetails?: object) {
        super(message, statusCode, errorDetails);
        this.name = 'AuthenticationError';
    }
}

export class InvalidRequestError extends APIError {
    constructor(message: string, statusCode?: number, errorDetails?: object) {
        super(message, statusCode, errorDetails);
        this.name = 'InvalidRequestError';
    }
}

export class RateLimitError extends APIError {
    constructor(message: string, statusCode?: number, errorDetails?: object) {
        super(message, statusCode, errorDetails);
        this.name = 'RateLimitError';
    }
}

export class ServerError extends APIError {
    constructor(message: string, statusCode?: number, errorDetails?: object) {
        super(message, statusCode, errorDetails);
        this.name = 'ServerError';
    }
}

export class APIConnectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'APIConnectionError';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export class SecurityError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SecurityError';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
