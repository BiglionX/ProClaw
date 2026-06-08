// ProClaw Shop - 商户注册页面
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function TenantRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subdomain: '',
    customSubdomain: false,
  });
  
  // 子域名建议
  const [subdomainSuggestions, setSubdomainSuggestions] = useState<string[]>([]);
  
  // 验证错误
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // 生成子域名建议
  const generateSubdomainSuggestions = (name: string) => {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    const suggestions: string[] = [];
    
    if (base.length >= 2) {
      suggestions.push(base);
    }
    
    for (let i = 1; i <= 4; i++) {
      const s = `${base}${i}`;
      if (s.length >= 2) suggestions.push(s);
    }
    
    const prefixes = ['my', 'shop', 'store'];
    prefixes.forEach(p => {
      if (suggestions.length < 5) {
        suggestions.push(`${p}-${base}`);
      }
    });
    
    setSubdomainSuggestions(suggestions.slice(0, 5));
  };
  
  // 输入处理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    
    if (name === 'name' && value.length > 2) {
      generateSubdomainSuggestions(value);
    }
  };
  
  // 验证表单
  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '请输入商户名称';
    } else if (formData.name.length < 2) {
      newErrors.name = '商户名称至少2个字符';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }
    
    if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = '请输入有效的手机号';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.subdomain) {
      newErrors.subdomain = '请选择子域名';
    } else if (!/^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/.test(formData.subdomain)) {
      newErrors.subdomain = '子域名格式不正确';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // 下一步
  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };
  
  // 提交注册
  const handleSubmit = async () => {
    if (!validateStep2()) return;
    
    setLoading(true);
    
    try {
      const res = await fetch('/api/tenant/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subdomain: formData.subdomain,
        }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        toast.success('注册成功！');
        // 跳转到商户控制台
        router.push(`/tenant/dashboard?welcome=true`);
      } else {
        toast.error(result.error || '注册失败');
        if (result.error?.includes('子域名')) {
          setErrors({ subdomain: result.error });
        }
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">创建 ProClaw Shop</h1>
          <p className="text-gray-500 mt-2">快速开启您的在线商城之旅</p>
        </div>
        
        {/* 步骤指示器 */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
          </div>
        </div>
        
        {/* Step 1: 基本信息 */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                商户名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="例如：某某的店"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                手机号（可选）
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="13800138000"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>
            
            <button
              onClick={handleNext}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              下一步
            </button>
          </div>
        )}
        
        {/* Step 2: 子域名设置 */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择子域名 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  name="subdomain"
                  value={formData.subdomain}
                  onChange={handleInputChange}
                  placeholder="myshop"
                  className={`flex-1 px-4 py-3 rounded-l-lg border ${
                    errors.subdomain ? 'border-red-500' : 'border-gray-300'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                <span className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-500">
                  .proclaw.cc
                </span>
              </div>
              {errors.subdomain && <p className="text-red-500 text-sm mt-1">{errors.subdomain}</p>}
              
              {/* 子域名建议 */}
              {subdomainSuggestions.length > 0 && !formData.subdomain && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {subdomainSuggestions.map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, subdomain: suggestion }));
                        setErrors(prev => ({ ...prev, subdomain: '' }));
                      }}
                      className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">您的商城地址</h4>
              <p className="text-blue-700 font-mono">
                {formData.subdomain || 'xxxxx'}.proclaw.cc
              </p>
            </div>
            
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                💡 <strong>提示：</strong> 注册即表示同意我们的服务条款。您将获得 100 Token 试用额度，有效期 7 天。
              </p>
            </div>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                上一步
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? '创建中...' : '创建商城'}
              </button>
            </div>
          </div>
        )}
        
        {/* 登录链接 */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            已有商城？ <Link href="/tenant/login" className="text-blue-600 hover:underline">立即登录</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
