/**
 * 云商城开通引导向导 - 简化版
 */

import { useState } from 'react';
import { createCloudStore } from '../../lib/cloudStoreService';

interface CloudStoreSetupWizardProps {
  open: boolean;
  subdomain: string;
  storeName: string;
  onComplete: (store: any) => void;
  onCancel: () => void;
}

export default function CloudStoreSetupWizard({
  open,
  subdomain,
  storeName: _storeName, // TODO: 后续可用于传递店铺名称到后端
  onComplete,
  onCancel,
}: CloudStoreSetupWizardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  console.log('[StoreSetupWizard] Rendering, open:', open);
  
  if (!open) return null;

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      console.log('[StoreSetupWizard] Creating cloud store with subdomain:', subdomain);
      const newStore = await createCloudStore('free', subdomain);
      console.log('[StoreSetupWizard] Store created successfully:', newStore);
      onComplete(newStore);
    } catch (err) {
      console.error('[StoreSetupWizard] Failed to create store:', err);
      setError(err instanceof Error ? err.message : '创建失败，请重试');
      setIsCreating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: '#0A0E27',
        borderRadius: '16px',
        padding: '40px',
        minWidth: '500px',
        textAlign: 'center',
        border: '1px solid rgba(0, 217, 255, 0.3)',
        boxShadow: '0 0 60px rgba(0, 217, 255, 0.2)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚀</div>
        <h2 style={{ color: '#FFFFFF', margin: '0 0 10px 0' }}>开通云商城</h2>
        <p style={{ color: '#8892B0', margin: '0 0 30px 0' }}>
          subdomain: <span style={{ color: '#00D9FF' }}>{subdomain}</span>
        </p>
        
        {/* 步骤指示器 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '30px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00D9FF, #7B2FFF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              color: '#fff',
              fontWeight: 'bold',
            }}>1</div>
            <span style={{ color: '#00D9FF', fontSize: '12px' }}>创建云商品库</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(136, 146, 176, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              color: '#8892B0',
            }}>2</div>
            <span style={{ color: '#8892B0', fontSize: '12px' }}>上传商品资料</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(136, 146, 176, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              color: '#8892B0',
            }}>3</div>
            <span style={{ color: '#8892B0', fontSize: '12px' }}>完成</span>
          </div>
        </div>

        {/* 走马灯区域 */}
        <div style={{
          backgroundColor: 'rgba(0, 217, 255, 0.05)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '30px',
          textAlign: 'left',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '13px',
        }}>
          <div style={{ color: '#00D9FF' }}>[系统] 正在连接云端服务器... ▊</div>
          <div style={{ color: '#00FF88', marginTop: '8px' }}>[完成] 安全连接已建立 ✓</div>
          <div style={{ color: '#00D9FF', marginTop: '8px' }}>[创建] 初始化云端存储空间...</div>
        </div>

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              backgroundColor: 'transparent',
              color: '#8892B0',
              border: '1px solid #8892B0',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
            disabled={isCreating}
          >
            跳过
          </button>
          <button
            onClick={handleCreate}
            style={{
              padding: '12px 32px',
              fontSize: '14px',
              background: 'linear-gradient(135deg, #00D9FF 0%, #7B2FFF 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              opacity: isCreating ? 0.7 : 1,
            }}
            disabled={isCreating}
          >
            {isCreating ? '创建中...' : '开始创建 →'}
          </button>
        </div>
        {error && (
          <div style={{ color: '#FF4444', marginTop: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
