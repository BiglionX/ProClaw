"use strict";
// ProClaw Cloud 托管版 - 数据导出 API Route
// 支持预设模板和自定义模板导出 JSON / CSV
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var tenant_1 = require("@/lib/tenant");
var export_1 = require("@/lib/export");
var fieldEncryption_1 = require("@/lib/fieldEncryption");
var encryptedFields_1 = require("@/config/encryptedFields");
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return '服务器内部错误';
}
/**
 * POST /api/export - 导出数据
 * Body: { templateId: string, format: 'json'|'csv', customTables?: object[], customName?: string }
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, body, templateId_1, format, customTables, customName, balanceData, balance, tables, template, exportData, totalRecords, _i, tables_1, table, rawData, decryptedData, result, _loop_1, _a, tables_2, table, output, templateName, csvParts, _b, tables_3, table, tableData, fileName, exportResult, error_1;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 11, , 12]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_d.sent()).data.session;
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    return [4 /*yield*/, request.json()];
                case 3:
                    body = _d.sent();
                    templateId_1 = body.templateId, format = body.format, customTables = body.customTables, customName = body.customName;
                    if (!templateId_1) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少模板 ID' }, { status: 400 })];
                    }
                    if (!format || !['json', 'csv'].includes(format)) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '不支持的导出格式' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .from('token_balances')
                            .select('balance')
                            .eq('user_id', session.user.id)
                            .single()];
                case 4:
                    balanceData = (_d.sent()).data;
                    balance = (balanceData === null || balanceData === void 0 ? void 0 : balanceData.balance) || 0;
                    if (balance < 100) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Token 余额不足，需要 100 PT。请前往用户中心充值。', code: 'INSUFFICIENT_TOKENS' }, { status: 402 })];
                    }
                    tables = void 0;
                    if (templateId_1 === 'custom' && customTables) {
                        // 自定义模板
                        tables = customTables;
                    }
                    else {
                        template = export_1.PRESET_TEMPLATES.find(function (t) { return t.id === templateId_1; });
                        if (!template) {
                            return [2 /*return*/, server_1.NextResponse.json({ error: '模板不存在' }, { status: 404 })];
                        }
                        tables = template.tables;
                    }
                    exportData = {};
                    totalRecords = 0;
                    _i = 0, tables_1 = tables;
                    _d.label = 5;
                case 5:
                    if (!(_i < tables_1.length)) return [3 /*break*/, 8];
                    table = tables_1[_i];
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, table.tableName))
                            .select('*')
                            .order('created_at', { ascending: false })
                            .limit(10000)];
                case 6:
                    rawData = (_d.sent()).data;
                    if (rawData && rawData.length > 0) {
                        decryptedData = rawData;
                        if (table.tableName === 'customers') {
                            decryptedData = (0, fieldEncryption_1.decryptFieldsInArray)(decryptedData, __spreadArray([], (0, encryptedFields_1.getEncryptedFields)('customers'), true));
                        }
                        else if (table.tableName === 'suppliers') {
                            decryptedData = (0, fieldEncryption_1.decryptFieldsInArray)(decryptedData, __spreadArray([], (0, encryptedFields_1.getEncryptedFields)('suppliers'), true));
                        }
                        exportData[table.tableName] = decryptedData;
                        totalRecords += decryptedData.length;
                    }
                    else {
                        exportData[table.tableName] = [];
                    }
                    _d.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    result = {};
                    _loop_1 = function (table) {
                        var tableData = exportData[table.tableName] || [];
                        // 只保留模板中指定的字段
                        var filtered = tableData.map(function (row) {
                            var entry = {};
                            for (var _i = 0, _a = table.fields; _i < _a.length; _i++) {
                                var f = _a[_i];
                                entry[f.label] = row[f.key];
                            }
                            return entry;
                        });
                        result[table.tableName] = filtered;
                    };
                    for (_a = 0, tables_2 = tables; _a < tables_2.length; _a++) {
                        table = tables_2[_a];
                        _loop_1(table);
                    }
                    output = void 0;
                    templateName = customName || ((_c = export_1.PRESET_TEMPLATES.find(function (t) { return t.id === templateId_1; })) === null || _c === void 0 ? void 0 : _c.name) || '数据';
                    if (format === 'csv') {
                        csvParts = [];
                        for (_b = 0, tables_3 = tables; _b < tables_3.length; _b++) {
                            table = tables_3[_b];
                            tableData = exportData[table.tableName] || [];
                            if (tableData.length === 0)
                                continue;
                            csvParts.push("# ".concat(table.tableName, " (").concat(tableData.length, " \u6761)"));
                            csvParts.push((0, export_1.toCsv)(tableData, table.fields));
                        }
                        output = csvParts.join('\n\n');
                    }
                    else {
                        output = JSON.stringify(result, null, 2);
                    }
                    // 扣除 Token
                    return [4 /*yield*/, supabase.rpc('deduct_tokens', {
                            p_user_id: session.user.id,
                            p_tokens: 100,
                        })];
                case 9:
                    // 扣除 Token
                    _d.sent();
                    return [4 /*yield*/, supabase.from('api_usage_logs').insert({
                            user_id: session.user.id,
                            resource_type: 'data_export',
                            tokens_used: 100,
                            endpoint: 'POST /api/export',
                            metadata: {
                                template_id: templateId_1,
                                format: format,
                                total_records: totalRecords,
                                tables: tables.map(function (t) { return t.tableName; }),
                            },
                        })];
                case 10:
                    _d.sent();
                    fileName = (0, export_1.generateExportFileName)(templateName, format);
                    exportResult = {
                        success: true,
                        data: output,
                        fileName: fileName,
                        format: format,
                        totalRecords: totalRecords,
                    };
                    return [2 /*return*/, server_1.NextResponse.json(exportResult)];
                case 11:
                    error_1 = _d.sent();
                    console.error('数据导出失败:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: getErrorMessage(error_1) }, { status: 500 })];
                case 12: return [2 /*return*/];
            }
        });
    });
}
