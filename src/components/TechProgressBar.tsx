/**
 * 科技感流光进度条组件
 * 带渐变 + 流光动画效果
 */

import { useEffect, useState } from 'react';

interface TechProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  animated?: boolean;
  height?: number;
  className?: string;
}

export default function TechProgressBar({
  progress,
  label,
  showPercentage = true,
  animated = true,
  height = 8,
  className = '',
}: TechProgressBarProps) {
  const [lightPosition, setLightPosition] = useState(0);

  // 流光动画
  useEffect(() => {
    if (!animated) return;

    const animate = () => {
      setLightPosition((prev) => {
        if (prev >= 100) return -20;
        return prev + 2;
      });
    };

    const interval = setInterval(animate, 50);
    return () => clearInterval(interval);
  }, [animated]);

  // 限制进度范围
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {/* 标签行 */}
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span
              className="text-sm"
              style={{
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                color: '#8892B0',
              }}
            >
              {label}
            </span>
          )}
          {showPercentage && (
            <span
              className="text-sm font-bold"
              style={{
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                color: '#00D9FF',
              }}
            >
              {clampedProgress}%
            </span>
          )}
        </div>
      )}

      {/* 进度条容器 */}
      <div
        className="relative rounded-full overflow-hidden"
        style={{
          height: `${height}px`,
          background: '#1a1f3a',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* 进度填充 */}
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${clampedProgress}%`,
            background: 'linear-gradient(90deg, #00D9FF 0%, #7B2FFF 50%, #00D9FF 100%)',
            backgroundSize: '200% 100%',
            transition: 'width 0.3s ease-out',
          }}
        />

        {/* 流光效果 */}
        {animated && clampedProgress < 100 && (
          <div
            className="absolute top-0 h-full rounded-full"
            style={{
              left: `${lightPosition}%`,
              width: '40px',
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
              filter: 'blur(2px)',
            }}
          />
        )}

        {/* 进度点效果 */}
        {animated && clampedProgress > 0 && clampedProgress < 100 && (
          <div
            className="absolute top-0 h-full w-1 bg-white rounded-full"
            style={{
              left: `${clampedProgress}%`,
              marginLeft: '-2px',
              boxShadow: '0 0 10px #00D9FF, 0 0 20px #00D9FF',
            }}
          />
        )}
      </div>

      {/* 刻度线 */}
      <div className="flex justify-between mt-1">
        {[0, 25, 50, 75, 100].map((tick) => (
          <div
            key={tick}
            className="relative"
            style={{ width: `${tick}%` }}
          >
            <div
              className="absolute right-0 h-1 w-px"
              style={{
                background: tick <= clampedProgress ? '#00D9FF' : '#333',
                opacity: tick === 0 || tick === 100 ? 0 : 0.5,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
