/**
 * ProClaw-Light 条码扫描服务
 * 通过监听键盘事件，兼容 USB 扫码枪输入
 */

export type BarcodeCallback = (barcode: string) => void;

interface BarcodeScannerOptions {
  /** 扫码枪输入超时时间（毫秒），两个字符之间的间隔超过此值视为新扫码 */
  timeout?: number;
  /** 最小条码长度 */
  minLength?: number;
  /** 扫码结束符（通常为 Enter 键） */
  endKey?: 'Enter' | 'Tab';
}

const DEFAULT_OPTIONS: Required<BarcodeScannerOptions> = {
  timeout: 100,
  minLength: 4,
  endKey: 'Enter',
};

export class BarcodeScanner {
  private buffer: string = '';
  private lastKeyTime: number = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private callback: BarcodeCallback | null = null;
  private options: Required<BarcodeScannerOptions>;
  private handler: ((e: KeyboardEvent) => void) | null = null;
  private isListening: boolean = false;

  constructor(options?: BarcodeScannerOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 开始监听扫码枪输入
   */
  startListening(callback: BarcodeCallback): void {
    if (this.isListening) return;
    this.callback = callback;
    this.isListening = true;

    this.handler = (e: KeyboardEvent) => {
      if (!this.isListening) return;

      const now = Date.now();

      // 如果距离上次按键时间超过超时时间，清空缓冲区
      if (this.buffer.length > 0 && now - this.lastKeyTime > this.options.timeout) {
        this.buffer = '';
      }

      this.lastKeyTime = now;

      // 处理结束符
      if (e.key === this.options.endKey) {
        e.preventDefault();
        if (this.buffer.length >= this.options.minLength) {
          this.callback?.(this.buffer);
        }
        this.buffer = '';
        return;
      }

      // 忽略功能键（Ctrl, Shift, Alt 等）
      if (e.key.length === 1) {
        this.buffer += e.key;
      }
    };

    document.addEventListener('keydown', this.handler);
  }

  /**
   * 停止监听
   */
  stopListening(): void {
    this.isListening = false;
    if (this.handler) {
      document.removeEventListener('keydown', this.handler);
      this.handler = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.buffer = '';
  }

  /**
   * 是否正在监听
   */
  get isActive(): boolean {
    return this.isListening;
  }
}

// 单例
let scannerInstance: BarcodeScanner | null = null;

/**
 * 获取扫码枪扫描器实例
 */
export function getBarcodeScanner(options?: BarcodeScannerOptions): BarcodeScanner {
  if (!scannerInstance) {
    scannerInstance = new BarcodeScanner(options);
  }
  return scannerInstance;
}
