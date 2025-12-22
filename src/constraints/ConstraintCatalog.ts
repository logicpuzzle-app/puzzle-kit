/**
 * ConstraintCatalog - Registry of all puzzle constraint schemas
 */

import type { ConstraintSchema, ConstraintCatalog as IConstraintCatalog } from './types';
import {
  slitherlinkSchema,
  mashuSchema,
  akariSchema,
  litsSchema,
  cbananaSchema,
  norinoriSchema,
  nurimisakiSchema,
  yajilinSchema,
  nurikabeSchema,
  heyawakeSchema,
  ayeheyaSchema,
  akichiSchema,
  numlinSchema,
  simpleloopSchema,
  simplegakoSchema,
  nanroSchema,
} from './schemas';

/**
 * Implementation of the constraint catalog
 */
class ConstraintCatalogImpl implements IConstraintCatalog {
  schemas: Record<string, ConstraintSchema> = {};

  constructor() {
    // Register built-in schemas
    this.registerSchema(slitherlinkSchema);
    this.registerSchema(mashuSchema);
    this.registerSchema(akariSchema);
    this.registerSchema(litsSchema);
    this.registerSchema(cbananaSchema);
    this.registerSchema(norinoriSchema);
    this.registerSchema(nurimisakiSchema);
    this.registerSchema(yajilinSchema);
    this.registerSchema(nurikabeSchema);
    this.registerSchema(heyawakeSchema);
    this.registerSchema(ayeheyaSchema);
    this.registerSchema(akichiSchema);
    this.registerSchema(numlinSchema);
    this.registerSchema(simpleloopSchema);
    this.registerSchema(simplegakoSchema);
    this.registerSchema(nanroSchema);
  }

  /**
   * Register a new schema
   */
  registerSchema(schema: ConstraintSchema): void {
    this.schemas[schema.pid] = schema;
  }

  /**
   * Get schema by puzzle ID
   */
  getSchema(pid: string): ConstraintSchema | undefined {
    return this.schemas[pid];
  }

  /**
   * Get all available puzzle IDs
   */
  getPuzzleIds(): string[] {
    return Object.keys(this.schemas);
  }

  /**
   * Get all schemas
   */
  getAllSchemas(): ConstraintSchema[] {
    return Object.values(this.schemas);
  }

  /**
   * Get schemas grouped by grid type
   */
  getSchemasByGrid(): Record<string, ConstraintSchema[]> {
    const result: Record<string, ConstraintSchema[]> = {};
    for (const schema of this.getAllSchemas()) {
      if (!result[schema.grid]) {
        result[schema.grid] = [];
      }
      result[schema.grid].push(schema);
    }
    return result;
  }
}

/**
 * Singleton instance of the constraint catalog
 */
export const constraintCatalog = new ConstraintCatalogImpl();

/**
 * Helper to get constraint rules by scope
 */
export function getConstraintsByScope(
  schema: ConstraintSchema,
  scope: 'problem' | 'answer' | 'validation'
) {
  switch (scope) {
    case 'problem':
      return schema.problem;
    case 'answer':
      return schema.answer;
    case 'validation':
      return schema.validation;
  }
}

/**
 * Helper to get all validation rules that are on by default
 */
export function getDefaultValidationRules(schema: ConstraintSchema) {
  return schema.validation.filter((rule) => rule.defaultOn !== false);
}
