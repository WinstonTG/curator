/**
 * Express Middleware for Item Validation
 *
 * Validates incoming item payloads against Zod schemas.
 * Returns 400 Bad Request with detailed errors on validation failure.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { validateItem, validateCreateItem, validateUpdateItem } from './item';

/**
 * Validation error response format
 */
interface ValidationErrorResponse {
  error: 'Validation Error';
  message: string;
  issues: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Format Zod errors for API response
 */
function formatZodError(error: ZodError): ValidationErrorResponse {
  return {
    error: 'Validation Error',
    message: 'Item validation failed',
    issues: error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}

/**
 * Middleware to validate full item payloads
 * Use for GET responses or complete item updates
 */
export function validateItemMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = validateItem(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(formatZodError(error));
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred during validation',
        });
      }
    }
  };
}

/**
 * Middleware to validate item creation payloads
 * Use for POST /items endpoints
 */
export function validateCreateItemMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = validateCreateItem(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(formatZodError(error));
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred during validation',
        });
      }
    }
  };
}

/**
 * Middleware to validate item update payloads
 * Use for PATCH /items/:id endpoints
 */
export function validateUpdateItemMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = validateUpdateItem(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(formatZodError(error));
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred during validation',
        });
      }
    }
  };
}

/**
 * Generic validation middleware factory
 * Allows custom Zod schemas
 */
export function createValidationMiddleware<T>(
  validator: (data: unknown) => T,
  target: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req[target] = validator(req[target]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(formatZodError(error));
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred during validation',
        });
      }
    }
  };
}
