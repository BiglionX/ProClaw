"use strict";
// ProClaw Cloud 托管版 - 多租户管理
// 实现 schema per tenant 模式
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantSchema = getTenantSchema;
exports.isValidSchemaName = isValidSchemaName;
exports.generateTableSQL = generateTableSQL;
exports.generateIndexSQL = generateIndexSQL;
exports.initializeTenantSchema = initializeTenantSchema;
exports.schemaTable = schemaTable;
exports.canAccessSchema = canAccessSchema;
exports.generateTenantSchemaSQL = generateTenantSchemaSQL;
exports.generateTenantSchemaSQLLegacy = generateTenantSchemaSQLLegacy;
var supabase_server_1 = require("./supabase-server");
// ========== Schema 名称管理 ==========
/**
 * 获取当前用户的 tenant schema 名称
 * 格式: tenant_{user_id_hash}
 */
function getTenantSchema(userId) {
    // 取 user_id 的前 8 位作为 schema 名的一部分
    var shortId = userId.replace(/-/g, '').substring(0, 8).toLowerCase();
    return "tenant_".concat(shortId);
}
/**
 * 验证 schema 名称格式
 */
function isValidSchemaName(schemaName) {
    // PostgreSQL 标识符规则：字母或下划线开头，后续字符可以是字母、数字或下划线
    return /^tenant_[a-z][a-z0-9_]{0,62}$/.test(schemaName);
}
/**
 * 标准表结构列表
 */
var STANDARD_TABLES = [
    {
        name: 'products_spu',
        columns: [
            'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            'spu_code TEXT NOT NULL UNIQUE',
            'name TEXT NOT NULL',
            'subtitle TEXT',
            'description TEXT',
            'category_id TEXT',
            'brand_id TEXT',
            'unit TEXT DEFAULT \'件\'',
            'weight NUMERIC',
            'is_on_sale BOOLEAN DEFAULT true',
            'is_featured BOOLEAN DEFAULT false',
            'sort_order INTEGER DEFAULT 0',
            'status TEXT DEFAULT \'on_sale\'',
            'images JSONB DEFAULT \'[]\'',
            'created_at TIMESTAMPTZ DEFAULT NOW()',
            'updated_at TIMESTAMPTZ DEFAULT NOW()',
        ],
        primaryKey: 'id',
        indexes: ['status'],
    },
    {
        name: 'products_sku',
        columns: [
            'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            'spu_id UUID REFERENCES products_spu(id) ON DELETE CASCADE',
            'sku_code TEXT NOT NULL',
            'specifications JSONB DEFAULT \'{}\' ',
            'spec_text TEXT',
            'cost_price NUMERIC DEFAULT 0',
            'sell_price NUMERIC DEFAULT 0',
            'market_price NUMERIC',
            'current_stock INTEGER DEFAULT 0',
            'min_stock INTEGER DEFAULT 0',
            'max_stock INTEGER DEFAULT 999999',
            'barcode TEXT',
            'is_default BOOLEAN DEFAULT false',
            'status TEXT DEFAULT \'active\'',
            'created_at TIMESTAMPTZ DEFAULT NOW()',
            'updated_at TIMESTAMPTZ DEFAULT NOW()',
        ],
        primaryKey: 'id',
        foreignKeys: [{ column: 'spu_id', references: 'products_spu(id)' }],
        indexes: ['spu_id'],
    },
    {
        name: 'suppliers',
        columns: [
            'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            'code TEXT NOT NULL UNIQUE',
            'name TEXT NOT NULL',
            'contact_person TEXT',
            'phone TEXT',
            'email TEXT',
            'address TEXT',
            'payment_terms TEXT',
            'is_active BOOLEAN DEFAULT true',
            'notes TEXT',
            'created_at TIMESTAMPTZ DEFAULT NOW()',
            'updated_at TIMESTAMPTZ DEFAULT NOW()',
        ],
        primaryKey: 'id',
    },
    {
        name: 'customers',
        columns: [
            'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            'code TEXT NOT NULL UNIQUE',
            'name TEXT NOT NULL',
            'contact_person TEXT',
            'phone TEXT',
            'email TEXT',
            'address TEXT',
            'customer_type TEXT DEFAULT \'individual\'',
            'credit_limit NUMERIC DEFAULT 0',
            'is_active BOOLEAN DEFAULT true',
            'notes TEXT',
            'created_at TIMESTAMPTZ DEFAULT NOW()',
            'updated_at TIMESTAMPTZ DEFAULT NOW()',
        ],
        primaryKey: 'id',
    },
    {
        name: 'purchase_orders',
        columns: [
            'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            'po_number TEXT NOT NULL UNIQUE',
            'supplier_id UUID REFERENCES suppliers(id)',
            'order_date DATE DEFAULT CURRENT_DATE',
            'expected_delivery_date DATE',
            'status TEXT DEFAULT \'draft\'',
            'total_amount NUMERIC DEFAULT 0',
            'paid_amount NUMERIC DEFAULT 0',
            'payment_status TEXT DEFAULT \'unpaid\'',
            'notes TEXT',
            'created_at TIMESTAMPTZ DEFAULT NOW()',
            'updated_at TIMESTAMPTZ DEFAULT NOW()',
        ],
        primaryKey: 'id',
        indexes: ['status'],
    },
    {
        name: 'purchase_order_items',
        columns: [
            'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            'order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE',
            'product_id UUID REFERENCES products_spu(id)',
            'quantity INTEGER NOT NULL',
            'unit_price NUMERIC NOT NULL',
            'total_price NUMERIC',
            'received_quantity INTEGER DEFAULT 0',
            'notes TEXT',
        ],
        primaryKey: 'id',
        foreignKeys: [
            { column: 'order_id', references: 'purchase_orders(id)' },
            { column: 'product_id', references: 'products_spu(id)' },
        ],
    },
    {
        name: 'sales_orders',
        columns: [
            'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            'so_number TEXT NOT NULL UNIQUE',
            'customer_id UUID REFERENCES customers(id)',
            'order_date DATE DEFAULT CURRENT_DATE',
            'expected_delivery_date DATE',
            'status TEXT DEFAULT \'draft\'',
            'total_amount NUMERIC DEFAULT 0',
            'paid_amount NUMERIC DEFAULT 0',
            'payment_status TEXT DEFAULT \'unpaid\'',
            'shipping_address TEXT',
            'notes TEXT',
            'created_at TIMESTAMPTZ DEFAULT NOW()',
            'updated_at TIMESTAMPTZ DEFAULT NOW()',
        ],
        primaryKey: 'id',
        indexes: ['status'],
    },
    {
        name: 'sales_order_items',
        columns: [
            'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            'order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE',
            'product_id UUID REFERENCES products_spu(id)',
            'quantity INTEGER NOT NULL',
            'unit_price NUMERIC NOT NULL',
            'total_price NUMERIC',
            'shipped_quantity INTEGER DEFAULT 0',
            'notes TEXT',
        ],
        primaryKey: 'id',
        foreignKeys: [
            { column: 'order_id', references: 'sales_orders(id)' },
            { column: 'product_id', references: 'products_spu(id)' },
        ],
    },
    {
        name: 'inventory_transactions',
        columns: [
            'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            'product_id UUID REFERENCES products_spu(id)',
            'sku_id UUID REFERENCES products_sku(id)',
            'transaction_type TEXT NOT NULL',
            'quantity INTEGER NOT NULL',
            'reference_no TEXT',
            'reason TEXT',
            'notes TEXT',
            'created_at TIMESTAMPTZ DEFAULT NOW()',
        ],
        primaryKey: 'id',
        foreignKeys: [
            { column: 'product_id', references: 'products_spu(id)' },
            { column: 'sku_id', references: 'products_sku(id)' },
        ],
        indexes: ['transaction_type'],
    },
    {
        name: 'contacts',
        columns: [
            'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            'name TEXT NOT NULL',
            'phone TEXT',
            'email TEXT',
            'avatar_url TEXT',
            'notes TEXT',
            'created_at TIMESTAMPTZ DEFAULT NOW()',
            'updated_at TIMESTAMPTZ DEFAULT NOW()',
        ],
        primaryKey: 'id',
    },
    {
        name: 'messages',
        columns: [
            'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            'contact_id UUID REFERENCES contacts(id)',
            'direction TEXT NOT NULL',
            'content TEXT NOT NULL',
            'content_type TEXT DEFAULT \'text\'',
            'file_url TEXT',
            'is_read BOOLEAN DEFAULT false',
            'created_at TIMESTAMPTZ DEFAULT NOW()',
        ],
        primaryKey: 'id',
        foreignKeys: [{ column: 'contact_id', references: 'contacts(id)' }],
        indexes: ['contact_id', 'created_at DESC'],
    },
    {
        name: 'files',
        columns: [
            'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            'user_id TEXT NOT NULL',
            'file_name TEXT NOT NULL',
            'file_path TEXT NOT NULL',
            'file_size INTEGER DEFAULT 0',
            'mime_type TEXT',
            'public_url TEXT',
            'created_at TIMESTAMPTZ DEFAULT NOW()',
        ],
        primaryKey: 'id',
    },
    {
        name: 'order_recognition_log',
        columns: [
            'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            'image_url TEXT',
            'type TEXT NOT NULL',
            'result JSONB',
            'status TEXT DEFAULT \'completed\'',
            'created_at TIMESTAMPTZ DEFAULT NOW()',
        ],
        primaryKey: 'id',
    },
];
/**
 * 生成单个表的建表 SQL
 */
function generateTableSQL(schema, table) {
    var tableName = "\"".concat(schema, "\".\"").concat(table.name, "\"");
    var columnsSQL = table.columns.join(',\n      ');
    var sql = "CREATE TABLE IF NOT EXISTS ".concat(tableName, " (\n      ").concat(columnsSQL, "\n    )");
    return sql;
}
/**
 * 生成单个表的索引 SQL
 */
function generateIndexSQL(schema, table) {
    if (!table.indexes || table.indexes.length === 0) {
        return '';
    }
    var tableName = "\"".concat(schema, "\".\"").concat(table.name, "\"");
    return table.indexes
        .map(function (indexCol) { return "CREATE INDEX IF NOT EXISTS idx_".concat(schema, "_").concat(table.name, "_").concat(indexCol, " ON ").concat(tableName, "(").concat(indexCol, ")"); })
        .join(';\n');
}
/**
 * 创建新用户的 tenant schema 和业务表
 */
function initializeTenantSchema(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var supabase, schema, error, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, supabase_server_1.createServerSupabaseClient)()];
                case 1:
                    supabase = _a.sent();
                    schema = getTenantSchema(userId);
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 6]);
                    return [4 /*yield*/, supabase.rpc('exec_sql', {
                            sql: generateTenantSchemaSQL(schema),
                        })];
                case 3:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('初始化 tenant schema 失败:', error);
                        return [2 /*return*/, false];
                    }
                    // 记录租户创建
                    return [4 /*yield*/, supabase.from('tenant_registry').upsert({
                            user_id: userId,
                            schema_name: schema,
                            created_at: new Date().toISOString(),
                            status: 'active',
                        }, { onConflict: 'user_id' })];
                case 4:
                    // 记录租户创建
                    _a.sent();
                    return [2 /*return*/, true];
                case 5:
                    error_1 = _a.sent();
                    console.error('初始化 tenant schema 失败:', error_1);
                    return [2 /*return*/, false];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * 获取带 schema 前缀的表名
 */
function schemaTable(schema, table) {
    return "\"".concat(schema, "\".\"").concat(table, "\"");
}
/**
 * 验证用户是否拥有指定 schema 的访问权限
 */
function canAccessSchema(userId, schemaName) {
    var expectedSchema = getTenantSchema(userId);
    return schemaName === expectedSchema;
}
/**
 * 生成 tenant schema 的完整建表 SQL（使用可测试的表定义）
 */
function generateTenantSchemaSQL(schema) {
    // 生成建表语句
    var createTablesSQL = STANDARD_TABLES
        .map(function (table) { return generateTableSQL(schema, table); })
        .join(';\n');
    // 生成索引语句
    var createIndexesSQL = STANDARD_TABLES
        .map(function (table) { return generateIndexSQL(schema, table); })
        .filter(function (sql) { return sql.length > 0; })
        .join(';\n');
    return [
        "CREATE SCHEMA IF NOT EXISTS \"".concat(schema, "\";"),
        createTablesSQL,
        createIndexesSQL,
    ].filter(function (sql) { return sql.length > 0; }).join(';\n');
}
/**
 * 生成 tenant schema 的完整建表 SQL（原始版本，保持向后兼容）
 * @deprecated 使用 generateTenantSchemaSQL 替代
 */
function generateTenantSchemaSQLLegacy(schema) {
    return "\n    CREATE SCHEMA IF NOT EXISTS \"".concat(schema, "\";\n\n    -- \u5546\u54C1 SPU \u8868\n    CREATE TABLE IF NOT EXISTS \"").concat(schema, "\".products_spu (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      spu_code TEXT NOT NULL UNIQUE,\n      name TEXT NOT NULL,\n      subtitle TEXT,\n      description TEXT,\n      category_id TEXT,\n      brand_id TEXT,\n      unit TEXT DEFAULT '\u4EF6',\n      weight NUMERIC,\n      is_on_sale BOOLEAN DEFAULT true,\n      is_featured BOOLEAN DEFAULT false,\n      sort_order INTEGER DEFAULT 0,\n      status TEXT DEFAULT 'on_sale',\n      images JSONB DEFAULT '[]',\n      created_at TIMESTAMPTZ DEFAULT NOW(),\n      updated_at TIMESTAMPTZ DEFAULT NOW()\n    );\n\n    -- \u5546\u54C1 SKU \u8868\n    CREATE TABLE IF NOT EXISTS \"").concat(schema, "\".products_sku (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      spu_id UUID REFERENCES \"").concat(schema, "\".products_spu(id) ON DELETE CASCADE,\n      sku_code TEXT NOT NULL,\n      specifications JSONB DEFAULT '{}',\n      spec_text TEXT,\n      cost_price NUMERIC DEFAULT 0,\n      sell_price NUMERIC DEFAULT 0,\n      market_price NUMERIC,\n      current_stock INTEGER DEFAULT 0,\n      min_stock INTEGER DEFAULT 0,\n      max_stock INTEGER DEFAULT 999999,\n      barcode TEXT,\n      is_default BOOLEAN DEFAULT false,\n      status TEXT DEFAULT 'active',\n      created_at TIMESTAMPTZ DEFAULT NOW(),\n      updated_at TIMESTAMPTZ DEFAULT NOW()\n    );\n\n    -- \u4F9B\u5E94\u5546\u8868\n    CREATE TABLE IF NOT EXISTS \"").concat(schema, "\".suppliers (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      code TEXT NOT NULL UNIQUE,\n      name TEXT NOT NULL,\n      contact_person TEXT,\n      phone TEXT,\n      email TEXT,\n      address TEXT,\n      payment_terms TEXT,\n      is_active BOOLEAN DEFAULT true,\n      notes TEXT,\n      created_at TIMESTAMPTZ DEFAULT NOW(),\n      updated_at TIMESTAMPTZ DEFAULT NOW()\n    );\n\n    -- \u5BA2\u6237\u8868\n    CREATE TABLE IF NOT EXISTS \"").concat(schema, "\".customers (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      code TEXT NOT NULL UNIQUE,\n      name TEXT NOT NULL,\n      contact_person TEXT,\n      phone TEXT,\n      email TEXT,\n      address TEXT,\n      customer_type TEXT DEFAULT 'individual',\n      credit_limit NUMERIC DEFAULT 0,\n      is_active BOOLEAN DEFAULT true,\n      notes TEXT,\n      created_at TIMESTAMPTZ DEFAULT NOW(),\n      updated_at TIMESTAMPTZ DEFAULT NOW()\n    );\n\n    -- \u91C7\u8D2D\u8BA2\u5355\u8868\n    CREATE TABLE IF NOT EXISTS \"").concat(schema, "\".purchase_orders (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      po_number TEXT NOT NULL UNIQUE,\n      supplier_id UUID REFERENCES \"").concat(schema, "\".suppliers(id),\n      order_date DATE DEFAULT CURRENT_DATE,\n      expected_delivery_date DATE,\n      status TEXT DEFAULT 'draft',\n      total_amount NUMERIC DEFAULT 0,\n      paid_amount NUMERIC DEFAULT 0,\n      payment_status TEXT DEFAULT 'unpaid',\n      notes TEXT,\n      created_at TIMESTAMPTZ DEFAULT NOW(),\n      updated_at TIMESTAMPTZ DEFAULT NOW()\n    );\n\n    -- \u91C7\u8D2D\u8BA2\u5355\u660E\u7EC6\u8868\n    CREATE TABLE IF NOT EXISTS \"").concat(schema, "\".purchase_order_items (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      order_id UUID REFERENCES \"").concat(schema, "\".purchase_orders(id) ON DELETE CASCADE,\n      product_id UUID REFERENCES \"").concat(schema, "\".products_spu(id),\n      quantity INTEGER NOT NULL,\n      unit_price NUMERIC NOT NULL,\n      total_price NUMERIC,\n      received_quantity INTEGER DEFAULT 0,\n      notes TEXT\n    );\n\n    -- \u9500\u552E\u8BA2\u5355\u8868\n    CREATE TABLE IF NOT EXISTS \"").concat(schema, "\".sales_orders (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      so_number TEXT NOT NULL UNIQUE,\n      customer_id UUID REFERENCES \"").concat(schema, "\".customers(id),\n      order_date DATE DEFAULT CURRENT_DATE,\n      expected_delivery_date DATE,\n      status TEXT DEFAULT 'draft',\n      total_amount NUMERIC DEFAULT 0,\n      paid_amount NUMERIC DEFAULT 0,\n      payment_status TEXT DEFAULT 'unpaid',\n      shipping_address TEXT,\n      notes TEXT,\n      created_at TIMESTAMPTZ DEFAULT NOW(),\n      updated_at TIMESTAMPTZ DEFAULT NOW()\n    );\n\n    -- \u9500\u552E\u8BA2\u5355\u660E\u7EC6\u8868\n    CREATE TABLE IF NOT EXISTS \"").concat(schema, "\".sales_order_items (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      order_id UUID REFERENCES \"").concat(schema, "\".sales_orders(id) ON DELETE CASCADE,\n      product_id UUID REFERENCES \"").concat(schema, "\".products_spu(id),\n      quantity INTEGER NOT NULL,\n      unit_price NUMERIC NOT NULL,\n      total_price NUMERIC,\n      shipped_quantity INTEGER DEFAULT 0,\n      notes TEXT\n    );\n\n    -- \u5E93\u5B58\u4EA4\u6613\u8868\n    CREATE TABLE IF NOT EXISTS \"").concat(schema, "\".inventory_transactions (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      product_id UUID REFERENCES \"").concat(schema, "\".products_spu(id),\n      sku_id UUID REFERENCES \"").concat(schema, "\".products_sku(id),\n      transaction_type TEXT NOT NULL,\n      quantity INTEGER NOT NULL,\n      reference_no TEXT,\n      reason TEXT,\n      notes TEXT,\n      created_at TIMESTAMPTZ DEFAULT NOW()\n    );\n\n    -- \u8054\u7CFB\u4EBA\u8868\uFF08\u804A\u5929\u7528\uFF09\n    CREATE TABLE IF NOT EXISTS \"").concat(schema, "\".contacts (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      name TEXT NOT NULL,\n      phone TEXT,\n      email TEXT,\n      avatar_url TEXT,\n      notes TEXT,\n      created_at TIMESTAMPTZ DEFAULT NOW(),\n      updated_at TIMESTAMPTZ DEFAULT NOW()\n    );\n\n    -- \u804A\u5929\u6D88\u606F\u8868\n    CREATE TABLE IF NOT EXISTS \"").concat(schema, "\".messages (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      contact_id UUID REFERENCES \"").concat(schema, "\".contacts(id),\n      direction TEXT NOT NULL,\n      content TEXT NOT NULL,\n      content_type TEXT DEFAULT 'text',\n      file_url TEXT,\n      is_read BOOLEAN DEFAULT false,\n      created_at TIMESTAMPTZ DEFAULT NOW()\n    );\n\n    -- \u6587\u4EF6\u8BB0\u5F55\u8868\n    CREATE TABLE IF NOT EXISTS \"").concat(schema, "\".files (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      user_id TEXT NOT NULL,\n      file_name TEXT NOT NULL,\n      file_path TEXT NOT NULL,\n      file_size INTEGER DEFAULT 0,\n      mime_type TEXT,\n      public_url TEXT,\n      created_at TIMESTAMPTZ DEFAULT NOW()\n    );\n\n    -- \u8BA2\u5355\u8BC6\u522B\u8BB0\u5F55\u8868\n    CREATE TABLE IF NOT EXISTS \"").concat(schema, "\".order_recognition_log (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      image_url TEXT,\n      type TEXT NOT NULL,\n      result JSONB,\n      status TEXT DEFAULT 'completed',\n      created_at TIMESTAMPTZ DEFAULT NOW()\n    );\n\n    -- \u521B\u5EFA\u7D22\u5F15\n    CREATE INDEX IF NOT EXISTS idx_").concat(schema, "_products_spu_status ON \"").concat(schema, "\".products_spu(status);\n    CREATE INDEX IF NOT EXISTS idx_").concat(schema, "_products_sku_spu ON \"").concat(schema, "\".products_sku(spu_id);\n    CREATE INDEX IF NOT EXISTS idx_").concat(schema, "_purchase_orders_status ON \"").concat(schema, "\".purchase_orders(status);\n    CREATE INDEX IF NOT EXISTS idx_").concat(schema, "_sales_orders_status ON \"").concat(schema, "\".sales_orders(status);\n    CREATE INDEX IF NOT EXISTS idx_").concat(schema, "_inventory_type ON \"").concat(schema, "\".inventory_transactions(transaction_type);\n    CREATE INDEX IF NOT EXISTS idx_").concat(schema, "_messages_contact ON \"").concat(schema, "\".messages(contact_id, created_at DESC);\n  ");
}
