/**
 * ProClaw-Light 小票打印服务
 * 基于 escpos 库，通过 Tauri 调用系统打印
 */

export interface PrintOptions {
  title?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  orderNumber?: string;
  date?: string;
}

/**
 * 打印小票
 * 浏览器模式：使用 window.print()
 * Tauri 模式：使用 escpos 库或系统打印
 */
export async function printReceipt(options: PrintOptions): Promise<boolean> {
  try {
    // 构建打印内容
    const receiptHTML = buildReceiptHTML(options);

    // 使用 iframe 打印（兼容浏览器和 Tauri）
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(receiptHTML);
        doc.close();
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
        return true;
      }
      document.body.removeChild(iframe);
      return false;
    } catch {
      // 降级到 window.open print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
        printWindow.print();
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error('[Printer] Failed to print receipt:', error);
    return false;
  }
}

function buildReceiptHTML(options: PrintOptions): string {
  const date = options.date || new Date().toLocaleString('zh-CN');
  const itemsHTML = options.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td align="center">x${item.quantity}</td>
      <td align="right">¥${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>小票打印</title>
  <style>
    body { font-family: 'Courier New', monospace; width: 80mm; margin: 0; padding: 10px; font-size: 12px; }
    h2 { text-align: center; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .total { text-align: right; font-weight: bold; font-size: 14px; margin: 8px 0; }
  </style>
</head>
<body>
  <h2>${options.title || '销售小票'}</h2>
  <p>订单号: ${options.orderNumber || '-'}</p>
  <p>日期: ${date}</p>
  <div class="divider"></div>
  <table>
    <thead><tr><th>商品</th><th>数量</th><th align="right">金额</th></tr></thead>
    <tbody>${itemsHTML}</tbody>
  </table>
  <div class="divider"></div>
  <p class="total">合计: ¥${options.total.toFixed(2)}</p>
  <p style="text-align:center;margin-top:20px;">--- 感谢惠顾 ---</p>
</body>
</html>`;
}
