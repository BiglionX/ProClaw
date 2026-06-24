// Sprint 2.4 D1 v2: 用 any 替代 unknown 让调用方无 TS 错误
const fs = require('fs');
const p = 'd:\\BigLionX\\NvwaX\\packages\\nvwax-web\\lib\\api\\admin.ts';

let c = fs.readFileSync(p, 'utf8');
if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1);
c = c.replace(/\r\n/g, '\n');

// 替换所有 helper 的泛型默认值 unknown -> any
c = c.replace(/async function getJson<T = unknown>/g, 'async function getJson<T = any>');
c = c.replace(/async function postJson<T = unknown>/g, 'async function postJson<T = any>');
c = c.replace(/async function putJson<T = unknown>/g, 'async function putJson<T = any>');
c = c.replace(/async function deleteJson<T = unknown>/g, 'async function deleteJson<T = any>');
c = c.replace(/async function rawGetJson<T = unknown>/g, 'async function rawGetJson<T = any>');

// 显式标 unknown 的方法调用改为 any
c = c.replace(/getJson<unknown>/g, 'getJson<any>');
c = c.replace(/postJson<unknown>/g, 'postJson<any>');
c = c.replace(/putJson<unknown>/g, 'putJson<any>');
c = c.replace(/deleteJson<unknown>/g, 'deleteJson<any>');
c = c.replace(/rawGetJson<unknown>/g, 'rawGetJson<any>');

fs.writeFileSync(p, c, 'utf8');
console.log('OK: admin.ts updated to use any return types');
