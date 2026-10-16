// Core domain: validation schemas (Joi / Zod / Yup).

export type SchemaFramework = "joi" | "zod" | "yup";

export interface SchemaProperty {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
  enumValues?: Array<string | number | boolean | null>;
  constraints?: string[];
  formats?: string[];
}

export interface SchemaDefinition {
  name: string;
  framework: SchemaFramework;
  properties: SchemaProperty[];
  filePath: string;
}

export interface SchemaFile {
  framework: SchemaFramework;
  filePath: string;
  schemas: SchemaDefinition[];
}
