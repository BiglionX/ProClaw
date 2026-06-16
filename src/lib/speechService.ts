/**
 * 语音服务（任务 #3：语音通话实现）
 *
 * 封装 Web Speech API：
 * - 语音转文字（STT）使用 webkitSpeechRecognition
 * - 文字转语音（TTS）使用 window.speechSynthesis
 *
 * 兼容性：
 * - Chrome/Edge: 完整支持
 * - Safari: 部分支持（webkit 前缀）
 * - Firefox: 不支持 STT，仅支持 TTS
 *
 * @example
 * const result = await SpeechService.startListening();
 * SpeechService.speak('你好，老板');
 */

// ==================== 类型定义 ====================

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface SpeechRecognitionError {
  error: string;
  message: string;
}

type SpeechRecognitionCallback = (result: SpeechRecognitionResult) => void;
type SpeechErrorCallback = (error: SpeechRecognitionError) => void;

// ==================== SpeechRecognition 类型 ====================

interface SpeechRecognitionAPI {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  onstart: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionAPI;
    webkitSpeechRecognition?: new () => SpeechRecognitionAPI;
  }
}

// ==================== 工具函数 ====================

/** 检测浏览器是否支持 STT */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    window.SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

/** 检测浏览器是否支持 TTS */
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** 获取 SpeechRecognition 构造函数（带 webkit 前缀兼容） */
function getSpeechRecognitionCtor(): (new () => SpeechRecognitionAPI) | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/** 获取中文普通话语音 */
function getChineseVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();

  // 优先级匹配
  return (
    voices.find(v => v.lang === 'zh-CN' && v.localService) ||
    voices.find(v => v.lang === 'zh-CN') ||
    voices.find(v => v.lang.startsWith('zh')) ||
    voices.find(v => v.name.toLowerCase().includes('chinese')) ||
    voices.find(v => v.name.toLowerCase().includes('mandarin')) ||
    voices[0] ||
    null
  );
}

// ==================== STT 语音识别 ====================

let currentRecognition: SpeechRecognitionAPI | null = null;
let currentResultCallback: SpeechRecognitionCallback | null = null;
let currentErrorCallback: SpeechErrorCallback | null = null;
let currentEndCallback: (() => void) | null = null;

export const SpeechService = {
  /**
   * 开始监听（语音输入）
   * @param onResult 实时识别结果回调
   * @param onError 错误回调
   * @param onEnd 监听结束回调
   * @param lang 语言代码，默认 'zh-CN'
   */
  startListening(
    onResult: SpeechRecognitionCallback,
    onError?: SpeechErrorCallback,
    onEnd?: () => void,
    lang = 'zh-CN'
  ): boolean {
    if (typeof window === 'undefined') {
      onError?.({ error: 'no-window', message: '当前环境不支持语音识别' });
      return false;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onError?.({
        error: 'not-supported',
        message: '当前浏览器不支持语音识别（推荐使用 Chrome/Edge）',
      });
      return false;
    }

    // 如果已有实例，先停止
    if (currentRecognition) {
      try {
        currentRecognition.abort();
      } catch {
        /* ignore */
      }
    }

    const recognition = new Ctor();
    recognition.continuous = true; // 持续识别
    recognition.interimResults = true; // 返回临时结果
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    currentResultCallback = onResult;
    currentErrorCallback = onError || null;
    currentEndCallback = onEnd || null;
    currentRecognition = recognition;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // 优先返回 final，其次 interim
      const transcript = finalTranscript || interimTranscript;
      if (transcript) {
        currentResultCallback?.({
          transcript,
          confidence: event.results[event.results.length - 1][0].confidence || 0.8,
          isFinal: !!finalTranscript,
        });
      }
    };

    recognition.onerror = (event: any) => {
      currentErrorCallback?.({
        error: event.error || 'unknown',
        message: getErrorMessage(event.error),
      });
      cleanupRecognition();
    };

    recognition.onend = () => {
      currentEndCallback?.();
      cleanupRecognition();
    };

    try {
      recognition.start();
      return true;
    } catch (err) {
      onError?.({
        error: 'start-failed',
        message: err instanceof Error ? err.message : '启动失败',
      });
      cleanupRecognition();
      return false;
    }
  },

  /**
   * 停止监听（保留已识别结果）
   */
  stopListening(): void {
    if (currentRecognition) {
      try {
        currentRecognition.stop();
      } catch {
        /* ignore */
      }
    }
  },

  /**
   * 中止监听（丢弃结果）
   */
  abortListening(): void {
    if (currentRecognition) {
      try {
        currentRecognition.abort();
      } catch {
        /* ignore */
      }
    }
    cleanupRecognition();
  },

  /**
   * 是否正在监听
   */
  isListening(): boolean {
    return currentRecognition !== null;
  },

  // ==================== TTS 语音合成 ====================

  /**
   * 朗读文字
   * @param text 要朗读的文本
   * @param options 配置选项
   * @returns utterance 引用（用于 cancel）
   */
  speak(
    text: string,
    options?: {
      lang?: string;
      rate?: number; // 0.1 - 10，默认 1
      pitch?: number; // 0 - 2，默认 1
      volume?: number; // 0 - 1，默认 1
      onEnd?: () => void;
      onStart?: () => void;
    }
  ): SpeechSynthesisUtterance | null {
    if (!isSpeechSynthesisSupported() || !text) {
      return null;
    }

    // 取消之前的朗读
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options?.lang || 'zh-CN';
    utterance.rate = options?.rate ?? 1;
    utterance.pitch = options?.pitch ?? 1;
    utterance.volume = options?.volume ?? 1;

    const voice = getChineseVoice();
    if (voice) {
      utterance.voice = voice;
    }

    if (options?.onStart) utterance.onstart = options.onStart;
    if (options?.onEnd) utterance.onend = options.onEnd;

    window.speechSynthesis.speak(utterance);
    return utterance;
  },

  /**
   * 停止朗读
   */
  stopSpeaking(): void {
    if (isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  },

  /**
   * 是否正在朗读
   */
  isSpeaking(): boolean {
    return isSpeechSynthesisSupported() && window.speechSynthesis.speaking;
  },

  /**
   * 获取可用语音列表
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!isSpeechSynthesisSupported()) return [];
    return window.speechSynthesis.getVoices();
  },
};

// ==================== 辅助函数 ====================

function cleanupRecognition(): void {
  currentRecognition = null;
  currentResultCallback = null;
  currentErrorCallback = null;
  currentEndCallback = null;
}

function getErrorMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    'no-speech': '未检测到语音，请重试',
    'audio-capture': '无法访问麦克风，请检查权限',
    'not-allowed': '麦克风权限被拒绝，请在浏览器设置中允许',
    'network': '网络错误，请检查连接',
    'aborted': '已中止',
    'service-not-allowed': '语音服务不可用',
  };
  return messages[errorCode] || `语音识别错误: ${errorCode}`;
}

// 预加载语音列表（部分浏览器需要异步加载）
if (typeof window !== 'undefined' && isSpeechSynthesisSupported()) {
  // 某些浏览器需要等待 voiceschanged 事件
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener?.('voiceschanged', () => {
      // 触发重新渲染
    });
  }
}

export default SpeechService;
