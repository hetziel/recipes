// src/utils/firestore-utils.ts

import { FieldValue } from 'firebase/firestore'

/**
 * Recursively cleans an object by removing properties with `undefined` values.
 * This is useful before sending data to Firestore, as Firestore does not store `undefined`.
 * It also handles nested objects and arrays.
 *
 * @param obj The object to sanitize.
 * @returns A new object with `undefined` properties removed, or the original value if not an object.
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) return undefined as unknown as T // Explicitly return undefined for undefined input
  if (obj === null) return null as unknown as T // Explicitly return null for null input

  if (Array.isArray(obj)) {
    // Filter out undefined values from arrays and sanitize objects within arrays
    return obj
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined) as unknown as T
  }

  if (typeof obj === 'object' && obj !== null && !(obj instanceof Date) && !('toDate' in obj && typeof obj.toDate === 'function')) {
    const sanitized: { [key: string]: any } = {}
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        const value = (obj as any)[k]
        // Firestore FieldValue objects (like deleteField) should be preserved
        if (value === undefined && !(value instanceof FieldValue)) {
          continue // Skip undefined values
        }
        const sanitizedValue = sanitizeForFirestore(value)
        // Ensure that if the sanitizedValue is undefined, we still skip it
        if (sanitizedValue !== undefined && !(sanitizedValue instanceof FieldValue)) {
            sanitized[k] = sanitizedValue
        } else if (sanitizedValue instanceof FieldValue) {
            sanitized[k] = sanitizedValue // Preserve FieldValue objects
        }
      }
    }
    return sanitized as T
  }

  return obj
}

/**
 * Returns a new object with only the properties that are different between two objects.
 * Useful for creating partial updates for Firestore to avoid overwriting unchanged fields.
 *
 * @param original The original object.
 * @param updated The updated object.
 * @returns A partial object containing only the changed fields.
 */
export function getChangedFields<T extends object>(original: T, updated: T): Partial<T> {
  const changes: Partial<T> = {};

  for (const key in updated) {
    if (Object.prototype.hasOwnProperty.call(updated, key)) {
      const originalValue = (original as any)[key];
      const updatedValue = updated[key];

      if (originalValue !== updatedValue) {
        changes[key] = updatedValue;
      }
    }
  }
  return changes;
}
