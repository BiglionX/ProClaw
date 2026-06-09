/**
 * 同步状态卡片组件
 * 显示单个商品同步状态
 */

import { ProductSPU } from '../lib/productService';

export type SyncItemStatus = 'pending' | 'uploading' | 'success' | 'error';

interface SyncStatusCardProps {
  product: ProductSPU;
  status: SyncItemStatus;
  progress?: number; // 0-100
  onRetry?: () => void;
}

const statusConfig = {
  pending: {
    icon: '○',
    color: '#8892B0',
    bgColor: 'rgba(136, 146, 176, 0.1)',
    label: '等待中',
  },
  uploading: {
    icon: '⟳',
    color: '#00D9FF',
    bgColor: 'rgba(0, 217, 255, 0.1)',
    label: '上传中',
  },
  success: {
    icon: '✓',
    color: '#00FF88',
    bgColor: 'rgba(0, 255, 136, 0.1)',
    label: '已同步',
  },
  error: {
    icon: '✗',
    color: '#FF4757',
    bgColor: 'rgba(255, 71, 87, 0.1)',
    label: '失败',
  },
};

export default function SyncStatusCard({
  product,
  status,
  progress,
  onRetry,
}: SyncStatusCardProps) {
  const config = statusConfig[status];

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border transition-all duration-300"
      style={{
        background: config.bgColor,
        borderColor: `${config.color}30`,
      }}
    >
      {/* 状态图标 */}
      <div
        className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold"
        style={{
          background: `${config.color}20`,
          color: config.color,
        }}
      >
        {status === 'uploading' ? (
          <span
            style={{
              animation: 'spin 1s linear infinite',
              display: 'inline-block',
            }}
          >
            {config.icon}
          </span>
        ) : (
          config.icon
        )}
      </div>

      {/* 商品信息 */}
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-medium truncate"
          style={{ color: '#FFFFFF' }}
        >
          {product.name}
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: '#8892B0' }}>
          <span className={product.is_on_sale ? 'text-green-400' : 'text-gray-500'}>
            {product.is_on_sale ? '上架' : '下架'}
          </span>
          <span>|</span>
          <span>{product.status}</span>
        </div>

        {/* 进度条 */}
        {status === 'uploading' && progress !== undefined && (
          <div
            className="mt-1 h-1 rounded-full overflow-hidden"
            style={{ background: '#1a1f3a' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #00D9FF, #7B2FFF)',
              }}
            />
          </div>
        )}
      </div>

      {/* 状态标签 */}
      <div
        className="px-2 py-0.5 rounded text-xs font-medium"
        style={{
          background: `${config.color}20`,
          color: config.color,
        }}
      >
        {config.label}
        {status === 'uploading' && progress !== undefined && ` ${progress}%`}
      </div>

      {/* 重试按钮 */}
      {status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 rounded text-xs font-medium transition-colors"
          style={{
            background: 'rgba(255, 71, 87, 0.2)',
            color: '#FF4757',
            border: '1px solid #FF475750',
          }}
        >
          重试
        </button>
      )}

      {/* CSS 动画 */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
