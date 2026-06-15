// 一键生成 30 个 Agent 头像 SVG 到 public/agents/team/avatars/
// 风格组合：8 背景色 × 4 风格变体
// 输出：agent_01.svg ~ agent_30.svg，256×256 圆形头像
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目根目录：脚本在 scripts/ 下，回到上一级
const PROJECT_ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.resolve(PROJECT_ROOT, 'public/agents/team/avatars');
fs.mkdirSync(OUT_DIR, { recursive: true });

// 8 个背景色
const COLORS = [
  '#6366f1', // 紫罗兰
  '#a855f7', // 紫色
  '#f59e0b', // 琥珀
  '#10b981', // 翡翠
  '#3b82f6', // 蓝色
  '#ef4444', // 红色
  '#ec4899', // 粉色
  '#0ea5e9', // 天蓝
];

// 4 套肤色
const SKIN = ['#f4d2b3', '#e8b894', '#c9956a', '#8b5e3c'];

// 4 套发型颜色
const HAIR = ['#1f2937', '#78350f', '#92400e', '#374151'];

// ============ 4 种风格模板 ============

/**
 * 风格 1：商务西装（西装领带/衬衫）
 */
function styleBusiness(bg, skin, hair) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <clipPath id="c"><circle cx="128" cy="128" r="128"/></clipPath>
  </defs>
  <g clip-path="url(#c)">
    <rect width="256" height="256" fill="${bg}"/>
    <!-- 头 -->
    <circle cx="128" cy="108" r="40" fill="${skin}"/>
    <!-- 头发 -->
    <path d="M88 100 Q88 70 128 68 Q168 70 168 100 Q168 90 158 86 Q148 82 128 82 Q108 82 98 86 Q88 90 88 100 Z" fill="${hair}"/>
    <!-- 西装领 -->
    <path d="M68 256 L68 200 Q98 168 128 168 Q158 168 188 200 L188 256 Z" fill="#1e3a8a"/>
    <!-- 衬衫 V 字领 -->
    <path d="M108 200 L128 232 L148 200 L148 256 L108 256 Z" fill="white"/>
    <!-- 领带 -->
    <path d="M122 218 L134 218 L138 240 L128 256 L118 240 Z" fill="#dc2626"/>
    <!-- 眼睛 -->
    <circle cx="116" cy="112" r="2.5" fill="#1f2937"/>
    <circle cx="140" cy="112" r="2.5" fill="#1f2937"/>
    <!-- 嘴 -->
    <path d="M118 126 Q128 132 138 126" stroke="#7c2d12" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;
}

/**
 * 风格 2：科技感（极简几何，无面部细节）
 */
function styleTech(bg, skin, hair) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <clipPath id="c"><circle cx="128" cy="128" r="128"/></clipPath>
    <linearGradient id="techG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#c)">
    <rect width="256" height="256" fill="url(#techG)"/>
    <!-- 几何装饰 -->
    <circle cx="200" cy="56" r="32" fill="${bg}" opacity="0.3"/>
    <circle cx="50" cy="200" r="20" fill="white" opacity="0.15"/>
    <!-- 头 -->
    <circle cx="128" cy="112" r="38" fill="${skin}"/>
    <!-- 科技感发型（头盔式） -->
    <path d="M88 108 Q88 70 128 68 Q168 70 168 108 L168 96 L160 92 L148 96 L136 92 L128 96 L120 92 L108 96 L96 92 L88 96 Z" fill="${hair}"/>
    <!-- 高光 -->
    <path d="M100 90 Q120 76 140 88" stroke="white" stroke-width="2" fill="none" opacity="0.6"/>
    <!-- 简约眼（无嘴） -->
    <rect x="110" y="108" width="12" height="3" fill="${bg}"/>
    <rect x="134" y="108" width="12" height="3" fill="${bg}"/>
    <!-- 衣领（极简） -->
    <path d="M76 256 L76 200 Q108 176 128 176 Q148 176 180 200 L180 256 Z" fill="#0f172a"/>
    <path d="M108 200 L128 220 L148 200 L148 256 L108 256 Z" fill="#1e293b"/>
  </g>
</svg>`;
}

/**
 * 风格 3：亲和微笑（圆脸，大眼，微笑嘴）
 */
function styleFriendly(bg, skin, hair) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <clipPath id="c"><circle cx="128" cy="128" r="128"/></clipPath>
  </defs>
  <g clip-path="url(#c)">
    <rect width="256" height="256" fill="${bg}"/>
    <!-- 头 -->
    <circle cx="128" cy="110" r="42" fill="${skin}"/>
    <!-- 头发（蓬松） -->
    <path d="M84 102 Q82 68 128 66 Q174 68 172 102 Q168 88 156 82 Q142 76 128 78 Q114 76 100 82 Q88 88 84 102 Z" fill="${hair}"/>
    <!-- 大眼睛 -->
    <circle cx="114" cy="112" r="4" fill="#1f2937"/>
    <circle cx="142" cy="112" r="4" fill="#1f2937"/>
    <circle cx="115" cy="110" r="1.5" fill="white"/>
    <circle cx="143" cy="110" r="1.5" fill="white"/>
    <!-- 微笑嘴 -->
    <path d="M114 128 Q128 138 142 128" stroke="#7c2d12" stroke-width="2.5" fill="#fb7185" stroke-linecap="round"/>
    <!-- 红晕 -->
    <circle cx="106" cy="122" r="5" fill="#fda4af" opacity="0.6"/>
    <circle cx="150" cy="122" r="5" fill="#fda4af" opacity="0.6"/>
    <!-- 衣领（休闲） -->
    <path d="M70 256 L70 198 Q100 170 128 170 Q156 170 186 198 L186 256 Z" fill="#fbcfe8"/>
  </g>
</svg>`;
}

/**
 * 风格 4：活力短发（短碎发，朝气）
 */
function styleActive(bg, skin, hair) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <clipPath id="c"><circle cx="128" cy="128" r="128"/></clipPath>
  </defs>
  <g clip-path="url(#c)">
    <rect width="256" height="256" fill="${bg}"/>
    <!-- 头 -->
    <circle cx="128" cy="110" r="40" fill="${skin}"/>
    <!-- 短碎发 -->
    <path d="M90 96 Q92 70 128 68 Q164 70 166 96 Q160 84 148 80 L138 84 L128 80 L118 84 L108 80 Q96 84 90 96 Z" fill="${hair}"/>
    <!-- 眼睛（活力弯月） -->
    <path d="M110 112 Q116 108 122 112" stroke="#1f2937" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M134 112 Q140 108 146 112" stroke="#1f2937" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- 张嘴笑 -->
    <path d="M118 126 Q128 136 138 126 Q128 132 118 126 Z" fill="#7c2d12"/>
    <path d="M120 128 Q128 132 136 128" stroke="white" stroke-width="1" fill="none"/>
    <!-- 卫衣领 -->
    <path d="M70 256 L70 200 Q100 172 128 172 Q156 172 186 200 L186 256 Z" fill="#0ea5e9"/>
    <path d="M100 196 L128 210 L156 196" stroke="white" stroke-width="2" fill="none"/>
  </g>
</svg>`;
}

// 30 个配置：8 色 × 4 风格，重复一遍以填满 30
const configs = [
  // 第 1 轮：8 色 × 4 风格 = 32（取前 30）
  { style: 1, color: 0, skin: 0, hair: 0, label: '紫罗兰商务' },
  { style: 2, color: 1, skin: 1, hair: 1, label: '紫色科技' },
  { style: 3, color: 2, skin: 0, hair: 0, label: '琥珀亲和' },
  { style: 4, color: 3, skin: 2, hair: 2, label: '翡翠活力' },
  { style: 1, color: 4, skin: 1, hair: 1, label: '蓝色商务' },
  { style: 2, color: 5, skin: 0, hair: 0, label: '红色科技' },
  { style: 3, color: 6, skin: 1, hair: 1, label: '粉色亲和' },
  { style: 4, color: 7, skin: 0, hair: 0, label: '天蓝活力' },
  { style: 1, color: 2, skin: 2, hair: 1, label: '琥珀商务' },
  { style: 2, color: 0, skin: 0, hair: 2, label: '紫罗兰科技' },
  { style: 3, color: 4, skin: 1, hair: 0, label: '蓝色亲和' },
  { style: 4, color: 6, skin: 0, hair: 1, label: '粉色活力' },
  { style: 1, color: 7, skin: 2, hair: 0, label: '天蓝商务' },
  { style: 2, color: 3, skin: 1, hair: 1, label: '翡翠科技' },
  { style: 3, color: 5, skin: 0, hair: 2, label: '红色亲和' },
  { style: 4, color: 1, skin: 2, hair: 0, label: '紫色活力' },
  { style: 1, color: 0, skin: 3, hair: 0, label: '深肤商务' },
  { style: 2, color: 2, skin: 0, hair: 1, label: '琥珀科技' },
  { style: 3, color: 3, skin: 2, hair: 2, label: '翡翠亲和' },
  { style: 4, color: 4, skin: 0, hair: 0, label: '蓝色活力' },
  { style: 1, color: 5, skin: 1, hair: 2, label: '红色商务' },
  { style: 2, color: 6, skin: 0, hair: 0, label: '粉色科技' },
  { style: 3, color: 7, skin: 1, hair: 1, label: '天蓝亲和' },
  { style: 4, color: 0, skin: 2, hair: 2, label: '紫罗兰活力' },
  { style: 1, color: 1, skin: 0, hair: 1, label: '紫色商务' },
  { style: 2, color: 4, skin: 1, hair: 0, label: '蓝色科技' },
  { style: 3, color: 6, skin: 2, hair: 0, label: '粉色亲和' },
  { style: 4, color: 3, skin: 0, hair: 1, label: '翡翠活力' },
  { style: 1, color: 7, skin: 0, hair: 2, label: '天蓝商务' },
  { style: 2, color: 5, skin: 1, hair: 1, label: '红色科技' },
];

const builders = [styleBusiness, styleTech, styleFriendly, styleActive];

configs.forEach((cfg, idx) => {
  const num = String(idx + 1).padStart(2, '0');
  const bg = COLORS[cfg.color];
  const skin = SKIN[cfg.skin];
  const hair = HAIR[cfg.hair];
  const svg = builders[cfg.style - 1](bg, skin, hair);
  const outPath = path.join(OUT_DIR, `agent_${num}.svg`);
  fs.writeFileSync(outPath, svg, 'utf8');
  console.log(`✓ agent_${num}.svg  (${cfg.label})`);
});

console.log(`\n已生成 30 个 SVG 头像到 ${OUT_DIR}`);
