/**
 * Validation Library Index
 *
 * Central export point for all validation schemas and utilities.
 * Import from '@/lib/validation' for easy access.
 */

// Common schemas
export * from "./common";

// Middleware and utilities
export * from "./middleware";

// Domain-specific schemas
export * from "./site";
export * from "./document";
export * from "./ai";
export * from "./widget";

// Re-export workspace schemas (existing) - explicitly to avoid conflicts
export {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
} from "./workspace";
