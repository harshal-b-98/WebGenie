// Custom error classes for the application

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND_ERROR");
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, 429, "RATE_LIMIT_ERROR");
  }
}

export class AIError extends AppError {
  constructor(
    message: string,
    public provider?: string
  ) {
    super(message, 500, "AI_ERROR");
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500, "DATABASE_ERROR");
  }
}

// Error response formatter
export function formatErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        ...(error instanceof ValidationError && { errors: error.errors }),
      },
    };
  }

  // Unknown errors - don't leak details to client
  console.error("Unexpected error:", error);
  return {
    error: {
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
      statusCode: 500,
    },
  };
}
