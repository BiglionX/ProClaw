/**
 * 浏览器端 polyfill：@anthropic-ai/sdk/lib/transform-json-schema
 *
 * 背景：@langchain/anthropic 间接引用了 @anthropic-ai/sdk 的内部模块
 * transform-json-schema，但该 SDK 整体是 Node.js SDK（依赖 ws、env、log 等 Node 模块），
 * 在 Tauri WebView 浏览器环境中无法使用。
 *
 * 修复方案：在 vite.config.ts 中通过 resolve.alias 把
 *   '@anthropic-ai/sdk/lib/transform-json-schema'
 * 重定向到本文件。本文件复制了原 mjs 的纯 JS 实现（无任何 Node.js 依赖），
 * 让 Vite 把它正常打包进 bundle。
 *
 * 源文件：node_modules/@anthropic-ai/sdk/lib/transform-json-schema.mjs (111 行)
 * 关联：@langchain/anthropic/dist/chat_models.js 中的 import 语句
 */

// Supported string formats
const SUPPORTED_STRING_FORMATS = new Set([
  'date-time',
  'time',
  'date',
  'duration',
  'email',
  'hostname',
  'uri',
  'ipv4',
  'ipv6',
  'uuid',
]);

/**
 * 从对象中删除 key 并返回其值（来自 @anthropic-ai/sdk/internal/utils/values.mjs）
 */
function pop<T extends Record<string, unknown>, K extends keyof T>(obj: T, key: K): T[K] | undefined {
  const value = obj[key];
  delete obj[key];
  return value;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function transformJSONSchema(jsonSchema: any): any {
  const workingCopy = deepClone(jsonSchema);
  return _transformJSONSchema(workingCopy);
}

function _transformJSONSchema(jsonSchema: any): any {
  const strictSchema: Record<string, any> = {};
  const ref = pop(jsonSchema, '$ref');
  if (ref !== undefined) {
    strictSchema['$ref'] = ref;
    return strictSchema;
  }
  const defs = pop(jsonSchema, '$defs');
  if (defs !== undefined) {
    const strictDefs: Record<string, any> = {};
    strictSchema['$defs'] = strictDefs;
    for (const [name, defSchema] of Object.entries(defs)) {
      strictDefs[name] = _transformJSONSchema(defSchema);
    }
  }
  const type = pop(jsonSchema, 'type');
  const anyOf = pop(jsonSchema, 'anyOf');
  const oneOf = pop(jsonSchema, 'oneOf');
  const allOf = pop(jsonSchema, 'allOf');
  if (Array.isArray(anyOf)) {
    strictSchema['anyOf'] = anyOf.map((variant: any) => _transformJSONSchema(variant));
  } else if (Array.isArray(oneOf)) {
    strictSchema['anyOf'] = oneOf.map((variant: any) => _transformJSONSchema(variant));
  } else if (Array.isArray(allOf)) {
    strictSchema['allOf'] = allOf.map((entry: any) => _transformJSONSchema(entry));
  } else {
    if (type === undefined) {
      throw new Error('JSON schema must have a type defined if anyOf/oneOf/allOf are not used');
    }
    strictSchema['type'] = type;
  }
  const description = pop(jsonSchema, 'description');
  if (description !== undefined) {
    strictSchema['description'] = description;
  }
  const title = pop(jsonSchema, 'title');
  if (title !== undefined) {
    strictSchema['title'] = title;
  }
  if (type === 'object') {
    const properties = pop(jsonSchema, 'properties') || {};
    strictSchema['properties'] = Object.fromEntries(
      Object.entries(properties).map(([key, propSchema]) => [
        key,
        _transformJSONSchema(propSchema as any),
      ]),
    );
    pop(jsonSchema, 'additionalProperties');
    strictSchema['additionalProperties'] = false;
    const required = pop(jsonSchema, 'required');
    if (required !== undefined) {
      strictSchema['required'] = required;
    }
  } else if (type === 'string') {
    const format = pop(jsonSchema, 'format');
    if (format !== undefined && SUPPORTED_STRING_FORMATS.has(format)) {
      strictSchema['format'] = format;
    } else if (format !== undefined) {
      jsonSchema['format'] = format;
    }
  } else if (type === 'array') {
    const items = pop(jsonSchema, 'items');
    if (items !== undefined) {
      strictSchema['items'] = _transformJSONSchema(items);
    }
    const minItems = pop(jsonSchema, 'minItems');
    if (minItems !== undefined && (minItems === 0 || minItems === 1)) {
      strictSchema['minItems'] = minItems;
    } else if (minItems !== undefined) {
      jsonSchema['minItems'] = minItems;
    }
  }
  if (Object.keys(jsonSchema).length > 0) {
    const existingDescription = strictSchema['description'];
    strictSchema['description'] =
      (existingDescription ? existingDescription + '\n\n' : '') +
      '{' +
      Object.entries(jsonSchema)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ') +
      '}';
  }
  return strictSchema;
}
