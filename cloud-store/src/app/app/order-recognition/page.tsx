// ProClaw Cloud 托管版 - AI 订单识别页面
// 支持拍照/上传图片识别订单

'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
  notes?: string;
}

interface HistoryItem {
  id: string;
  image_url: string | null;
  type: string;
  result: string;
  created_at: string;
}

interface OcrResult {
  success: boolean;
  items: OrderItem[];
  total: number;
  customerName?: string;
  orderDate?: string;
  notes?: string;
  rawText?: string;
}

type OrderType = 'purchase' | 'sales';

export default function OrderRecognitionPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 状态
  const [orderType, setOrderType] = useState<OrderType>('sales');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 处理文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // 检查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setOcrResult(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // 上传图片
  const uploadImage = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (result.success && result.data) {
        return result.data.url;
      } else {
        toast.error(result.error || '图片上传失败');
        return null;
      }
    } catch {
      toast.error('图片上传失败');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // 执行识别
  const handleRecognize = async () => {
    if (!selectedImage) {
      toast.error('请先选择图片');
      return;
    }

    setRecognizing(true);
    try {
      // 先上传图片
      const imageUrl = await uploadImage();
      if (!imageUrl) {
        setRecognizing(false);
        return;
      }

      // 调用 OCR API
      const res = await fetch('/api/ai/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, type: orderType }),
      });
      const result = await res.json();

      if (result.success) {
        setOcrResult(result.data);
        toast.success(`识别完成，消耗 ${result.tokensUsed} Token`);
      } else {
        toast.error(result.error || '识别失败');
      }
    } catch {
      toast.error('识别失败，请重试');
    } finally {
      setRecognizing(false);
    }
  };

  // 创建订单
  const handleCreateOrder = () => {
    if (!ocrResult || ocrResult.items.length === 0) {
      toast.error('没有可创建订单的商品');
      return;
    }

    // 将识别结果存储到 sessionStorage（临时方案）
    sessionStorage.setItem('ocr_order_items', JSON.stringify(ocrResult.items));
    sessionStorage.setItem('ocr_order_type', orderType);

    // 跳转到对应的订单创建页面
    if (orderType === 'purchase') {
      router.push('/app/purchase?from=ocr');
    } else {
      router.push('/app/sales?from=ocr');
    }
  };

  // 加载历史记录
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/ai/ocr');
      const result = await res.json();
      if (result.data) {
        setHistory(result.data);
      }
    } catch {
      toast.error('加载历史记录失败');
    } finally {
      setLoadingHistory(false);
    }
  };

  // 切换历史记录显示
  const toggleHistory = async () => {
    if (!showHistory) {
      await loadHistory();
    }
    setShowHistory(!showHistory);
  };

  // 重新选择图片
  const handleReselect = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setOcrResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 订单识别</h1>
          <p className="text-sm text-gray-500 mt-1">拍照或上传订单图片，AI 自动识别商品信息</p>
        </div>
        <button
          onClick={toggleHistory}
          className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {showHistory ? '收起历史' : '查看历史'}
        </button>
      </div>

      {/* 历史记录面板 */}
      {showHistory && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-medium text-gray-900 mb-3">识别历史</h3>
          {loadingHistory ? (
            <div className="text-center py-8 text-gray-400">加载中...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-400">暂无历史记录</div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {history.map((item: HistoryItem) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {item.image_url && (
                      <Image
                        src={item.image_url}
                        alt="订单图片"
                        width={48}
                        height={48}
                        className="rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.type === 'purchase' ? '采购订单' : '销售订单'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {JSON.parse(item.result || '{}').items?.length || 0} 件商品
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：图片上传 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {/* 订单类型切换 */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOrderType('sales')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                orderType === 'sales'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              销售订单
            </button>
            <button
              onClick={() => setOrderType('purchase')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                orderType === 'purchase'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              采购订单
            </button>
          </div>

          {/* 图片预览区 */}
          <div
            className={`relative border-2 border-dashed rounded-xl ${
              selectedImage ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
            }`}
            style={{ minHeight: '300px' }}
          >
            {selectedImage ? (
              <div className="relative w-full h-full">
                <Image
                  src={selectedImage}
                  alt="选择的图片"
                  fill
                  className="object-contain rounded-xl"
                />
                <button
                  onClick={handleReselect}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm mb-4">点击下方按钮选择图片</p>
                <p className="text-xs">支持 JPG、PNG、GIF 格式，最大 10MB</p>
              </div>
            )}
          </div>

          {/* 上传按钮 */}
          <div className="flex gap-3 mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || recognizing}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              选择图片
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading || recognizing}
              className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              拍照
            </button>
          </div>

          {/* 识别按钮 */}
          <button
            onClick={handleRecognize}
            disabled={!selectedImage || uploading || recognizing}
            className="w-full mt-3 py-3 px-4 bg-linear-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {recognizing ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                AI 识别中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                开始 AI 识别
              </>
            )}
          </button>

          {/* Token 消耗提示 */}
          <p className="text-xs text-gray-400 text-center mt-3">
            每次识别消耗 5 Token（图片上传另计）
          </p>
        </div>

        {/* 右侧：识别结果 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-medium text-gray-900 mb-4">
            识别结果 {orderType === 'sales' ? '（销售订单）' : '（采购订单）'}
          </h3>

          {!ocrResult ? (
            <div className="flex flex-col items-center justify-center h-80 text-gray-400">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm">上传图片后自动显示识别结果</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 订单信息 */}
              {(ocrResult.customerName || ocrResult.orderDate) && (
                <div className="bg-gray-50 rounded-lg p-3">
                  {ocrResult.customerName && (
                    <div className="text-sm">
                      <span className="text-gray-500">客户：</span>
                      <span className="font-medium text-gray-900">{ocrResult.customerName}</span>
                    </div>
                  )}
                  {ocrResult.orderDate && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-500">日期：</span>
                      <span className="text-gray-900">{ocrResult.orderDate}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 商品列表 */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">商品</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">数量</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">单价</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">小计</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ocrResult.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{item.productName}</div>
                          {item.sku && (
                            <div className="text-xs text-gray-400">{item.sku}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-700">¥{item.unitPrice}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          ¥{item.totalPrice}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right font-medium text-gray-600">
                        合计
                      </td>
                      <td className="px-3 py-2 text-right text-lg font-bold text-blue-600">
                        ¥{ocrResult.total}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 备注 */}
              {ocrResult.notes && (
                <div className="text-sm text-gray-600 bg-yellow-50 rounded-lg p-3">
                  <span className="font-medium text-yellow-700">备注：</span>
                  {ocrResult.notes}
                </div>
              )}

              {/* 原始文本 */}
              {ocrResult.rawText && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-600">
                    查看原始识别文本
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-gray-600 whitespace-pre-wrap">
                    {ocrResult.rawText}
                  </pre>
                </details>
              )}

              {/* 创建订单按钮 */}
              <button
                onClick={handleCreateOrder}
                disabled={ocrResult.items.length === 0}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                创建 {orderType === 'sales' ? '销售' : '采购'} 订单
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 使用提示 */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4">
        <h4 className="font-medium text-blue-900 mb-2">识别技巧</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>1. 确保图片清晰，光线充足，避免反光</li>
          <li>2. 尽量包含完整的订单信息（商品名称、数量、价格）</li>
          <li>3. 支持手写订单、打印订单、截图等多种格式</li>
          <li>4. 识别结果可编辑，创建订单前请核对商品信息</li>
        </ul>
      </div>
    </div>
  );
}
