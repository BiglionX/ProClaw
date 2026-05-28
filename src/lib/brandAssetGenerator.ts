/**
 * AI 品牌素材生成器 —— Canvas 渲染 Logo 和 Banner
 * 小老板没素材？一键 AI 生成，基于店铺名 + 主题色
 */

export interface BrandGenerationOptions {
  storeName: string;
  tagline?: string;
  primaryColor: string;
  secondaryColor: string;
}

/**
 * 生成 Logo（文字型 Logo，Canvas PNG）
 * 风格：极简圆形/text-mark，带主色调
 */
export function generateLogo(options: BrandGenerationOptions): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const size = 200;
    canvas.width = size;
    canvas.height = 60;
    const ctx = canvas.getContext('2d')!;

    const { storeName, primaryColor } = options;

    // 背景透明
    ctx.clearRect(0, 0, size, 60);

    // 绘制圆形图标（品牌首字）
    const iconR = 20;
    const iconX = iconR + 8;
    const iconY = 30;
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconR, 0, Math.PI * 2);
    ctx.fillStyle = primaryColor;
    ctx.fill();

    // 图标中的首字
    const firstChar = storeName.charAt(0);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${iconR + 2}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(firstChar, iconX, iconY + 1);

    // 店铺名称文字
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `bold 18px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textX = iconX + iconR + 12;
    ctx.fillText(storeName, textX, 30);

    resolve(canvas.toDataURL('image/png'));
  });
}

/**
 * 生成轮播图（渐变背景 + 店铺信息）
 * 尺寸 960x300（2x retina 的 1920x600）
 */
export function generateBanner(options: BrandGenerationOptions): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;

    const { storeName, tagline, primaryColor, secondaryColor } = options;

    // 渐变背景
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, primaryColor);
    gradient.addColorStop(0.6, lightenColor(primaryColor, 0.3));
    gradient.addColorStop(1, secondaryColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 装饰圆
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 80, 120, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(80, canvas.height - 60, 80, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    ctx.globalAlpha = 0.08;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 - 20, 200, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();

    // 居中文字
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 店铺名
    ctx.fillStyle = '#fff';
    ctx.font = `bold 42px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 8;
    ctx.fillText(storeName, canvas.width / 2, canvas.height / 2 - 15);
    ctx.shadowBlur = 0;

    // 标语
    if (tagline) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `18px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.fillText(tagline, canvas.width / 2, canvas.height / 2 + 30);
    }

    // 底部装饰线
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 60, canvas.height - 40);
    ctx.lineTo(canvas.width / 2 + 60, canvas.height - 40);
    ctx.stroke();

    resolve(canvas.toDataURL('image/jpeg', 0.9));
  });
}

/** 颜色变亮 */
function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0x0000ff) + Math.round(255 * amount));
  return `rgb(${r},${g},${b})`;
}

/** data URL 转 Blob */
export function dataURLtoBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)![1];
  const bytes = atob(parts[1]);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}
