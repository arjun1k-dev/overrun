// ============================================================
// OVERRUN — Unified YAML Parser
// ============================================================
// Single parser for all YAML types with resilient schema validation
// Supports pure YAML files, Markdown frontmatter, and raw pasted content

import * as yaml from 'js-yaml';
import { z } from 'zod';
import {
  SCHEMA_REGISTRY,
  SchemaType,
  validateSchema,
  getSchemaInfo,
  isCopyPasteFriendly,
} from './schema-registry';

// ============================================================
// Parse Result Types
// ============================================================

export interface ParseSuccess<T = any> {
  success: true;
  type: SchemaType;
  data: T;
  source: 'yaml' | 'frontmatter';
  version?: string;
}

export interface ParseError {
  success: false;
  errors: ParseErrorDetail[];
  source: 'yaml' | 'frontmatter';
}

export interface ParseErrorDetail {
  path: string[];
  message: string;
  code: string;
  line?: number;
  column?: number;
}

export type ParseResult<T = any> = ParseSuccess<T> | ParseError;

// ============================================================
// YAML Parser
// ============================================================

export class YamlParser {
  /**
   * Parse YAML content with automatic type detection and validation
   */
  parse<T = any>(content: string): ParseResult<T> {
    try {
      const cleanContent = content.trim();
      if (!cleanContent) {
        return this.createError([{
          path: [],
          message: 'YAML content cannot be empty',
          code: 'EMPTY_CONTENT',
        }], 'yaml');
      }

      // First, try to parse with js-yaml
      const parsed = yaml.load(cleanContent) as any;

      if (!parsed || typeof parsed !== 'object') {
        return this.createError([{
          path: [],
          message: 'Invalid YAML object structure',
          code: 'INVALID_YAML',
        }], 'yaml');
      }

      // Detect type from content
      const detectedType = this.detectType(parsed);

      if (!detectedType) {
        return this.createError([{
          path: [],
          message: 'Could not detect YAML type. Missing or invalid "type" field.',
          code: 'MISSING_TYPE',
        }], 'yaml');
      }

      // Validate against detected schema
      const validation = validateSchema(detectedType, parsed);

      if (!validation.success) {
        return this.createError(
          this.convertZodErrors(validation.errors!),
          'yaml'
        );
      }

      return {
        success: true,
        type: detectedType,
        data: validation.data,
        source: 'yaml',
        version: parsed.version,
      };
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        return this.createError([{
          path: [],
          message: error.message,
          code: 'YAML_SYNTAX_ERROR',
          line: error.mark?.line !== undefined ? error.mark.line + 1 : 1,
          column: error.mark?.column !== undefined ? error.mark.column + 1 : 1,
        }], 'yaml');
      }

      return this.createError([{
        path: [],
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        code: 'PARSE_ERROR',
      }], 'yaml');
    }
  }

  /**
   * Parse Markdown file and extract YAML frontmatter
   */
  parseFrontmatter<T = any>(markdownContent: string): ParseResult<T> {
    const frontmatterMatch = markdownContent.match(/^---\r?\n([\s\S]+?)\r?\n---/);

    if (!frontmatterMatch) {
      return this.createError([{
        path: [],
        message: 'No YAML frontmatter found enclosed in --- delimiters.',
        code: 'NO_FRONTMATTER',
      }], 'frontmatter');
    }

    const yamlContent = frontmatterMatch[1];
    return this.parse<T>(yamlContent);
  }

  /**
   * Parse content and automatically detect if it's pure YAML or Markdown with frontmatter
   */
  parseAuto<T = any>(content: string): ParseResult<T> {
    const trimmed = content.trim();

    if (!trimmed) {
      return this.createError([{
        path: [],
        message: 'Content is empty',
        code: 'EMPTY_CONTENT',
      }], 'yaml');
    }

    // If it starts with ---, try parsing as frontmatter first
    if (trimmed.startsWith('---')) {
      const secondDashIndex = trimmed.indexOf('---', 3);
      if (secondDashIndex !== -1) {
        const frontmatterYaml = trimmed.slice(3, secondDashIndex).trim();
        const fmResult = this.parse<T>(frontmatterYaml);
        if (fmResult.success) {
          return { ...fmResult, source: 'frontmatter' };
        }
      }

      // Fallback: strip leading and trailing --- delimiters and parse as pure YAML
      const strippedYaml = trimmed.replace(/^---\s*/, '').replace(/\s*---$/, '').trim();
      const yamlResult = this.parse<T>(strippedYaml);
      if (yamlResult.success) {
        return yamlResult;
      }
    }

    return this.parse<T>(trimmed);
  }

  /**
   * Detect YAML type from content
   */
  private detectType(parsed: any): SchemaType | null {
    if (!parsed || !parsed.type) return null;

    const type = String(parsed.type).toLowerCase() as SchemaType;

    // Validate that this is a known type
    if (!(type in SCHEMA_REGISTRY)) {
      return null;
    }

    return type;
  }

  /**
   * Convert Zod errors to clear error details
   */
  private convertZodErrors(zodError: z.ZodError): ParseErrorDetail[] {
    return zodError.issues.map((error) => ({
      path: error.path.map(String),
      message: error.message,
      code: error.code,
    }));
  }

  /**
   * Create error result
   */
  private createError(errors: ParseErrorDetail[], source: 'yaml' | 'frontmatter'): ParseError {
    return { success: false, errors, source };
  }

  /**
   * Serialize data to YAML
   */
  serialize(data: any, type?: SchemaType): string {
    let content = data;

    if (type && !content.version) {
      content = { version: '1.0.0', ...content };
    }

    return yaml.dump(content, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
  }

  /**
   * Serialize data to Markdown with YAML frontmatter
   */
  serializeToMarkdown(data: any, bodyContent?: string, type?: SchemaType): string {
    const yamlContent = this.serialize(data, type);
    const lines = yamlContent.split('\n').map(line => line || '');

    const frontmatter = ['---', ...lines, '---'].join('\n');
    const body = bodyContent || '';

    return [frontmatter, body].join('\n\n');
  }

  /**
   * Validate content without throwing
   */
  validate(content: string): { valid: boolean; type?: SchemaType; errors?: string[] } {
    const result = this.parseAuto(content);

    if (result.success) {
      return {
        valid: true,
        type: result.type,
      };
    } else {
      return {
        valid: false,
        errors: result.errors.map(e => `${e.path.join('.') || 'root'}: ${e.message}`),
      };
    }
  }

  getSchemaInfo(type: SchemaType) {
    return getSchemaInfo(type);
  }

  isCopyPasteFriendly(type: SchemaType): boolean {
    return isCopyPasteFriendly(type);
  }

  getCopyPasteFriendlyTypes(): SchemaType[] {
    return Object.entries(SCHEMA_REGISTRY)
      .filter(([_, info]) => info.copyPasteFriendly)
      .map(([type]) => type as SchemaType);
  }
}

export const yamlParser = new YamlParser();

export function parseYaml<T = any>(content: string): ParseResult<T> {
  return yamlParser.parseAuto<T>(content);
}

export function parseMarkdownFrontmatter<T = any>(content: string): ParseResult<T> {
  return yamlParser.parseFrontmatter<T>(content);
}

export function serializeYaml(data: any, type?: SchemaType): string {
  return yamlParser.serialize(data, type);
}

export function serializeToMarkdown(data: any, body?: string, type?: SchemaType): string {
  return yamlParser.serializeToMarkdown(data, body, type);
}

export function validateYaml(content: string): { valid: boolean; type?: SchemaType; errors?: string[] } {
  return yamlParser.validate(content);
}