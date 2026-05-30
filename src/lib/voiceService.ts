/**
 * ProClaw-Light 语音播报服务
 * 新订单朗读、提醒播报
 */

export type VoiceMessage = string;

const VOICE_URI = 'zh-CN'; // 中文语音

/**
 * 朗读文本
 */
export function speak(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      console.warn('[Voice] SpeechSynthesis not supported');
      reject(new Error('SpeechSynthesis not supported'));
      return;
    }

    // 取消当前正在播报的内容
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = VOICE_URI;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * 新订单语音提醒
 */
export function speakNewOrder(orderNumber: string, customerName?: string, amount?: number): void {
  let text = `您有一个新订单`;
  if (customerName) text += `，来自 ${customerName}`;
  if (amount) text += `，金额 ${amount.toFixed(2)} 元`;
  text += `，订单编号 ${orderNumber}`;

  speak(text).catch(err => {
    console.warn('[Voice] Failed to speak:', err);
  });
}

/**
 * 库存预警语音提醒
 */
export function speakStockWarning(productName: string, currentStock: number): void {
  const text = `注意，${productName} 当前库存仅剩 ${currentStock} 件，请及时补货`;
  speak(text).catch(err => console.warn('[Voice] Failed to speak:', err));
}

/**
 * 检查语音合成是否可用
 */
export function isVoiceSupported(): boolean {
  return 'speechSynthesis' in window;
}

/**
 * 获取可用中文语音列表
 */
export function getChineseVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('zh'));
}
