/**
 * Validation Middleware
 *
 * Provides utilities for validating API requests using Zod schemas.
 * Includes consistent error formatting and logging.
 */

import { NextResponse } from "next/server";
import { z, ZodError, ZodSchema } from "zod";
import { logger } from "@/lib/utils/logger";

/**
 * Validation error response format
 */
export interface ValidationErrorResponse {
  error: {
    message: string;
    code: "VALIDATION_ERROR";
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

/**
 * Format Zod errors into a user-friendly response
 * Note: Zod v4 uses .issues instead of .errors
 */
export function formatZodErrors(error: ZodError): ValidationErrorResponse {
  const details = error.issues.map((issue) => ({
    field: issue.path.join(".") || "unknown",
    message: issue.message,
  }));

  return {
    error: {
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      details,
    },
  };
}

/**
 * Validate request body against a Zod schema
 * Returns validated data or NextResponse with error
 */
export async function validateBody<T extends ZodSchema>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data };
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Request validation failed", {
        issues: error.issues,
        path: request.url,
      });
      return {
        error: NextResponse.json(formatZodErrors(error), { status: 400 }),
      };
    }

    if (error instanceof SyntaxError) {
      logger.warn("Invalid JSON in request body", { path: request.url });
      return {
        error: NextResponse.json(
          {
            error: {
              message: "Invalid JSON in request body",
              code: "VALIDATION_ERROR",
            },
          },
          { status: 400 }
        ),
      };
    }

    throw error;
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T extends ZodSchema>(
  request: Request,
  schema: T
): { data: z.infer<T>; error?: never } | { data?: never; error: NextResponse } {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const data = schema.parse(params);
    return { data };
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Query parameter validation failed", {
        issues: error.issues,
        path: request.url,
      });
      return {
        error: NextResponse.json(formatZodErrors(error), { status: 400 }),
      };
    }
    throw error;
  }
}

/**
 * Validate route parameters against a Zod schema
 */
export function validateParams<T extends ZodSchema>(
  params: Record<string, string>,
  schema: T
): { data: z.infer<T>; error?: never } | { data?: never; error: NextResponse } {
  try {
    const data = schema.parse(params);
    return { data };
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Route parameter validation failed", {
        issues: error.issues,
        params,
      });
      return {
        error: NextResponse.json(formatZodErrors(error), { status: 400 }),
      };
    }
    throw error;
  }
}

/**
 * Validate FormData against a Zod schema
 * Handles both string fields and file extraction
 */
export async function validateFormData<T extends ZodSchema>(
  request: Request,
  schema: T,
  fileFields?: string[]
): Promise<
  | { data: z.infer<T>; files: Map<string, File>; error?: never }
  | { data?: never; files?: never; error: NextResponse }
> {
  try {
    const formData = await request.formData();
    const files = new Map<string, File>();
    const fields: Record<string, unknown> = {};

    for (const [key, value] of formData.entries()) {
      if (fileFields?.includes(key) && value instanceof File) {
        files.set(key, value);
        // Add file metadata for validation
        fields[key] = {
          name: value.name,
          size: value.size,
          type: value.type,
        };
      } else if (typeof value === "string") {
        fields[key] = value;
      }
    }

    const data = schema.parse(fields);
    return { data, files };
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("FormData validation failed", {
        issues: error.issues,
        path: request.url,
      });
      return {
        error: NextResponse.json(formatZodErrors(error), { status: 400 }),
      };
    }
    throw error;
  }
}

/**
 * Create a validation response helper with CORS headers (for widget APIs)
 */
export function createCorsValidationError(
  error: ZodError,
  corsHeaders: Record<string, string>
): NextResponse {
  return NextResponse.json(formatZodErrors(error), {
    status: 400,
    headers: corsHeaders,
  });
}

/**
 * Validate and parse with custom error message
 */
export function parseOrThrow<T extends ZodSchema>(
  schema: T,
  data: unknown,
  errorPrefix?: string
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => issue.message).join(", ");
      throw new Error(errorPrefix ? `${errorPrefix}: ${messages}` : messages);
    }
    throw error;
  }
}
