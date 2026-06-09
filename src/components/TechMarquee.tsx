/**
 * 科技感走马灯组件
 * 打字效果 + 淡入淡出 + 闪烁光标
 */

import { useState, useEffect } from 'react';

export type MarqueeStatus = 'pending' | 'processing' | 'success' | 'error';

export interface MarqueeItem {
  id: string;
  prefix: string;
  content: string;
  status?: MarqueeStatus;
  progress?: number; // 0-100
}

interface TechMarqueeProps {
  messages: MarqueeItem[];
  theme?: 'cyan' | 'purple' | 'mixed';
  showCursor?: boolean;
  showParticles?: boolean;
  autoPlay?: boolean;
  speed?: number; // 打字速度 ms/字符
  className?: string;
}

const themeColors = {
  cyan: {
    prefix: '#00D9FF',
    success: '#00FF88',
    error: '#FF4757',
    processing: '#00D9FF',
    text: '#FFFFFF',
  },
  purple: {
    prefix: '#7B2FFF',
    success: '#00FF88',
    error: '#FF4757',
    processing: '#7B2FFF',
    text: '#FFFFFF',
  },
  mixed: {
    prefix: '#00D9FF',
    success: '#00FF88',
    error: '#FF4757',
    processing: '#7B2FFF',
    text: '#FFFFFF',
  },
};

export default function TechMarquee({
  messages,
  theme = 'mixed',
  showCursor = true,
  speed = 30,
  className = '',
}: TechMarqueeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  const colors = themeColors[theme];

  // 光标闪烁
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // 打字效果
  useEffect(() => {
    if (messages.length === 0) return;

    const currentMessage = messages[currentIndex];
    if (!currentMessage) return;

    setIsTyping(true);
    setDisplayedText('');
    setIsFading(false);

    let charIndex = 0;
    const text = currentMessage.content;

    const typeInterval = setInterval(() => {
      if (charIndex <= text.length) {
        setDisplayedText(text.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);

        // 如果有进度，等待进度完成
        if (currentMessage.progress !== undefined && currentMessage.progress < 100) {
          // 进度动画单独处理
        } else {
          // 打字完成后等待，然后淡出
          setTimeout(() => {
            setIsFading(true);
            setTimeout(() => {
              if (currentIndex < messages.length - 1) {
                setCurrentIndex((prev) => prev + 1);
              } else {
                setIsComplete(true);
              }
            }, 500);
          }, 1000);
        }
      }
    }, speed);

    return () => clearInterval(typeInterval);
  }, [currentIndex, messages, speed]);

  // 进度动画
  useEffect(() => {
    const currentMessage = messages[currentIndex];
    if (!currentMessage || currentMessage.progress === undefined) return;

    if (currentMessage.progress >= 100) {
      setIsFading(true);
      setTimeout(() => {
        if (currentIndex < messages.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setIsComplete(true);
        }
      }, 500);
    }
  }, [messages, currentIndex]);

  const getStatusIcon = (status?: MarqueeStatus) => {
    switch (status) {
      case 'success':
        return <span style={{ color: colors.success }}>✓</span>;
      case 'error':
        return <span style={{ color: colors.error }}>✗</span>;
      case 'processing':
        return <span style={{ color: colors.processing }}>⟳</span>;
      default:
        return <span style={{ color: colors.prefix }}>▸</span>;
    }
  };

  const getProgressBar = (progress?: number) => {
    if (progress === undefined) return null;

    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #00D9FF, #7B2FFF)',
              boxShadow: '0 0 10px #00D9FF80',
            }}
          />
        </div>
        <span className="text-xs font-mono" style={{ color: colors.prefix }}>
          {progress}%
        </span>
      </div>
    );
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      className={`font-mono text-sm ${className}`}
      style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}
    >
      <div className="space-y-1">
        {/* 显示已完成的项 */}
        {messages.slice(0, currentIndex).map((msg) => (
          <div
            key={msg.id}
            className="flex items-start gap-2 opacity-60"
            style={{ animation: 'fadeIn 0.3s ease-out' }}
          >
            <span style={{ color: colors.prefix }}>{getStatusIcon('success')} </span>
            <span style={{ color: colors.prefix }}>[{msg.prefix}]</span>
            <span style={{ color: colors.text }}>{msg.content}</span>
          </div>
        ))}

        {/* 当前正在显示的项 */}
        {!isComplete && messages[currentIndex] && (
          <div
            className={`flex flex-col ${isFading ? 'opacity-0' : 'opacity-100'}`}
            style={{ transition: 'opacity 0.5s ease-out' }}
          >
            <div className="flex items-start gap-2">
              <span style={{ color: colors.processing }}>
                {isTyping ? getStatusIcon('processing') : getStatusIcon(messages[currentIndex].status)}
              </span>
              <span style={{ color: colors.prefix }}>[{messages[currentIndex].prefix}]</span>
              <span style={{ color: colors.text }}>
                {displayedText}
                {showCursor && (
                  <span
                    style={{
                      color: colors.prefix,
                      opacity: cursorVisible ? 1 : 0,
                      animation: 'blink 1s infinite',
                    }}
                  >
                    ▊
                  </span>
                )}
              </span>
            </div>
            {getProgressBar(messages[currentIndex].progress)}
          </div>
        )}

        {/* 完成状态 */}
        {isComplete && (
          <div className="flex items-center gap-2" style={{ color: colors.success }}>
            <span>✓</span>
            <span>[完成]</span>
            <span>所有任务已处理完毕</span>
          </div>
        )}
      </div>

      {/* CSS 动画 */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 0.6; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
