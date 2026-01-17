import { useEffect, useMemo, useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { fetchCredentials, type Credential } from '../../api/credentialsApi';
import { MonacoCodeEditor } from './MonacoCodeEditor';

/**
 * Field types that can be inferred from Zod schemas
 */
type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'object'
  | 'array'
  | 'unknown';

interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  description?: string;
  required?: boolean;
  default?: unknown;
  enumValues?: string[];
  min?: number;
  max?: number;
  placeholder?: string;
}

/**
 * Infer field configurations from a Zod schema
 * This is a simplified parser - it handles common cases
 */
function inferFieldsFromSchema(schema: any): FieldConfig[] {
  if (!schema || !schema._def) return [];

  const fields: FieldConfig[] = [];

  // Handle ZodObject
  if (schema._def.typeName === 'ZodObject') {
    const shape = schema._def.shape();
    for (const [key, fieldSchema] of Object.entries(shape)) {
      const field = parseZodField(key, fieldSchema);
      if (field) fields.push(field);
    }
  }

  return fields;
}

/**
 * Parse a single Zod field to extract its configuration
 */
function parseZodField(name: string, schema: any): FieldConfig | null {
  if (!schema || !schema._def) return null;

  let currentSchema = schema;
  let isOptional = false;
  let defaultValue: unknown = undefined;

  // Unwrap ZodDefault
  while (currentSchema._def.typeName === 'ZodDefault') {
    defaultValue = currentSchema._def.defaultValue();
    currentSchema = currentSchema._def.innerType;
  }

  // Unwrap ZodOptional
  while (currentSchema._def.typeName === 'ZodOptional') {
    isOptional = true;
    currentSchema = currentSchema._def.innerType;
  }

  const typeName = currentSchema._def.typeName;

  // Generate human-readable label from field name
  const label = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

  const baseField: FieldConfig = {
    name,
    label,
    type: 'unknown',
    required: !isOptional,
    default: defaultValue,
  };

  switch (typeName) {
    case 'ZodString':
      return {
        ...baseField,
        type: 'string',
        placeholder: `Enter ${label.toLowerCase()}...`,
      };

    case 'ZodNumber':
      const checks = currentSchema._def.checks || [];
      const minCheck = checks.find((c: any) => c.kind === 'min');
      const maxCheck = checks.find((c: any) => c.kind === 'max');
      return {
        ...baseField,
        type: 'number',
        min: minCheck?.value,
        max: maxCheck?.value,
      };

    case 'ZodBoolean':
      return {
        ...baseField,
        type: 'boolean',
      };

    case 'ZodEnum':
      return {
        ...baseField,
        type: 'enum',
        enumValues: currentSchema._def.values,
      };

    case 'ZodRecord':
    case 'ZodObject':
      return {
        ...baseField,
        type: 'object',
        description: 'Enter as JSON',
      };

    case 'ZodArray':
      return {
        ...baseField,
        type: 'array',
        description: 'Enter as JSON array',
      };

    default:
      return {
        ...baseField,
        type: 'string', // Fallback to string input
      };
  }
}

interface DynamicConfigPanelProps {
  definition: {
    configSchema?: unknown;
    configFields?: Array<{
      name: string;
      type: string;
      required?: boolean;
      default?: unknown;
      enumValues?: string[];
      min?: number;
      max?: number;
    }>;
    credentials?: Array<{ type: string; required?: boolean }>;
  };
  config: Record<string, unknown>;
  onConfigChange: (key: string, value: unknown) => void;
}

/**
 * DynamicConfigPanel - Automatically generates configuration UI
 * based on the node's configSchema (Zod schema) or configFields (serialized).
 *
 * This enables community developers to create nodes without
 * having to write custom React components for the config panel.
 */
export function DynamicConfigPanel({
  definition,
  config,
  onConfigChange,
}: DynamicConfigPanelProps) {
  const fields = useMemo(() => {
    // Prefer pre-parsed configFields (from SerializedNodeDefinition)
    if (definition.configFields && definition.configFields.length > 0) {
      return definition.configFields.map((f) => ({
        name: f.name,
        label: f.name
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .trim(),
        type: f.type as FieldType,
        required: f.required ?? true,
        default: f.default,
        enumValues: f.enumValues,
        min: f.min,
        max: f.max,
      }));
    }
    // Fallback to parsing configSchema (from NodeDefinition)
    if (definition.configSchema) {
      return inferFieldsFromSchema(definition.configSchema);
    }
    return [];
  }, [definition.configFields, definition.configSchema]);

  if (fields.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground opacity-50 text-xs">
        No configuration options available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <FieldRenderer
          key={field.name}
          field={field}
          value={config[field.name]}
          onChange={(value) => onConfigChange(field.name, value)}
          config={config}
        />
      ))}
    </div>
  );
}

interface FieldRendererProps {
  field: FieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  config: Record<string, unknown>;
}

function FieldRenderer({ field, value, onChange, config }: FieldRendererProps) {
  // Special handling for code field - use Monaco Editor
  if (field.name === 'code') {
    const language = (config.language as string) || 'javascript';
    return (
      <MonacoCodeEditor
        value={(value as string) || ''}
        onChange={onChange}
        language={language}
        label={field.label}
        required={field.required}
        description="Available: $input, inputs, outputs, memory, workflowMemory"
        height="400px"
      />
    );
  }

  if (field.name === 'credentialId') {
    return (
      <CredentialPicker
        value={(value as string) || ''}
        onChange={onChange}
        required={field.required}
      />
    );
  }

  switch (field.type) {
    case 'string':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="bg-background border-border"
          />
          {field.description && (
            <p className="text-[10px] text-muted-foreground">
              {field.description}
            </p>
          )}
        </div>
      );

    case 'number':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Input
            type="number"
            value={(value as number) ?? field.default ?? ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            min={field.min}
            max={field.max}
            className="bg-background border-border font-mono text-xs"
          />
          {(field.min !== undefined || field.max !== undefined) && (
            <p className="text-[10px] text-muted-foreground">
              {field.min !== undefined && `Min: ${field.min}`}
              {field.min !== undefined && field.max !== undefined && ' | '}
              {field.max !== undefined && `Max: ${field.max}`}
            </p>
          )}
        </div>
      );

    case 'boolean':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Select
            value={String(value ?? field.default ?? false)}
            onValueChange={(v) => onChange(v === 'true')}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-border">
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

    case 'enum':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Select
            value={
              (value as string) ||
              (field.default as string) ||
              field.enumValues?.[0] ||
              ''
            }
            onValueChange={onChange}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue
                placeholder={`Select ${field.label.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-border">
              {field.enumValues?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'object':
    case 'array':
      const jsonValue = value ? JSON.stringify(value, null, 2) : '';
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <textarea
            value={jsonValue}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                // Keep raw string for now, validation happens on blur
              }
            }}
            onBlur={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                // Invalid JSON - could show error
              }
            }}
            placeholder={field.type === 'array' ? '[\n  \n]' : '{\n  \n}'}
            className="w-full h-24 bg-background border border-border rounded-md p-2 font-mono text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring outline-none focus:border-ring transition-all"
          />
          {field.description && (
            <p className="text-[10px] text-muted-foreground">
              {field.description}
            </p>
          )}
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Input
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className="bg-background border-border"
          />
        </div>
      );
  }
}

interface CredentialPickerProps {
  value: string;
  onChange: (value: unknown) => void;
  required?: boolean;
}

function CredentialPicker({
  value,
  onChange,
  required,
}: CredentialPickerProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCredentials()
      .then(setCredentials)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-2">
      <Label>
        Credential
        {required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      <Select value={value || ''} onValueChange={(v) => onChange(v)}>
        <SelectTrigger className="bg-background border-border">
          <SelectValue
            placeholder={loading ? 'Loading...' : 'Select credential'}
          />
        </SelectTrigger>
        <SelectContent className="bg-sidebar border-border">
          {credentials.length === 0 && !loading && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground opacity-60">
              No credentials found. Add one in Settings.
            </div>
          )}
          {credentials.map((cred) => (
            <SelectItem key={cred.id} value={cred.id}>
              <span className="flex items-center gap-2">
                <span>{cred.name}</span>
                <span className="text-xs text-muted-foreground opacity-50">({cred.type})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[10px] text-muted-foreground">
        Manage credentials in Settings → Credentials
      </p>
    </div>
  );
}

export function hasCustomConfigPanel(nodeType: string): boolean {
  const customPanelTypes = ['httpRequest', 'ifElse', 'trigger'];
  return customPanelTypes.includes(nodeType);
}
