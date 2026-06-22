// ProClaw Shop - 动态商城首页
// 根据子域名自动加载对应商户的商城

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCurrentTenantSubdomain } from '@/lib/tenant-router';
import { storePath } from '@/lib/utils';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ store: string }>;
}

export default async function StoreHomePage({ params }: PageProps) {
  const { store: storeParam } = await params;
  const subdomain = storeParam || await getCurrentTenantSubdomain();
  
  if (!subdomain) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">商城未找到</h1>
          <p className="text-gray-500">请检查网址是否正确</p>
        </div>
      </div>
    );
  }
  
  // 获取租户信息（使用 tenants 表）
  const supabase = await createServerSupabaseClient();
  
  console.log('[DEBUG] subdomain:', subdomain);
  console.log('[DEBUG] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: tenant, error } = await (supabase as any)
    .from('tenants')
    .select('id, name, subdomain, status, theme_config, logo_url, banner_url, contact_info')
    .eq('subdomain', subdomain)
    .single();
  
  console.log('[DEBUG] tenant query result:', { tenant, error });
  
  if (!tenant || tenant.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">商城暂时不可用</h1>
          <p className="text-gray-500">该商城可能已被关闭或不存在</p>
          <p className="text-gray-400 text-sm mt-4">subdomain: {subdomain}</p>
        </div>
      </div>
    );
  }
  
  // 计算 schema 名称（带长度限制）
  const schemaName = `tenant_${subdomain.replace(/[^a-z0-9]/g, '_').substring(0, 53)}`;

  // 获取商品列表（从租户 schema 查询）
  let products: any[] = [];
  try {
    const { data } = await (supabase as any)
      .from(`${schemaName}.products`)
      .select('*')
      .eq('is_on_sale', true)
      .order('updated_at', { ascending: false })
      .limit(20);
    products = data || [];
  } catch (error) {
    console.warn(`Schema ${schemaName} 不存在或无权限访问，商品列表为空:`, error);
  }
  
  // 解析主题配置
  const theme = tenant.theme_config || {
    primary_color: '#3B82F6',
    secondary_color: '#60A5FA',
    layout: 'grid',
  };
  
  // 分类统计
  const categories: string[] = products 
    ? [...new Set(products.map((p: any) => p.category as string).filter(Boolean) as string[])]
    : [];
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              {tenant.logo_url ? (
                <Image src={tenant.logo_url} alt={tenant.name} width={40} height={40} className="h-10 w-auto" />
              ) : (
                <span className="text-xl font-bold" style={{ color: theme.primary_color }}>
                  {tenant.name}
                </span>
              )}
            </div>
            
            {/* 导航 */}
            <nav className="hidden md:flex space-x-8">
              <a href={storePath(subdomain)} className="text-gray-900 font-medium hover:text-blue-600">
                首页
              </a>
              <a href={storePath(subdomain, 'products')} className="text-gray-500 hover:text-blue-600">
                商品
              </a>
              <a href={storePath(subdomain, 'cart')} className="text-gray-500 hover:text-blue-600">
                购物车
              </a>
            </nav>
            
            {/* 操作 */}
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-500 hover:text-blue-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Banner */}
      {tenant.banner_url && (
        <div className="w-full h-64 md:h-80 bg-cover bg-center" style={{ backgroundImage: `url(${tenant.banner_url})` }}>
          <div className="w-full h-full bg-black bg-opacity-30 flex items-center justify-center">
            <h2 className="text-white text-3xl font-bold">欢迎来到 {tenant.name}</h2>
          </div>
        </div>
      )}
      
      {/* 分类导航 */}
      {categories.length > 0 && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 py-4 overflow-x-auto">
              <a href={storePath(subdomain, 'products')} className="text-gray-700 hover:text-blue-600 whitespace-nowrap">
                全部商品
              </a>
              {categories.map((cat: string) => (
                <a 
                  key={cat} 
                  href={`${storePath(subdomain, 'products')}?category=${encodeURIComponent(cat)}`}
                  className="text-gray-700 hover:text-blue-600 whitespace-nowrap"
                >
                  {cat}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* 商品列表 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">热门商品</h3>
          <a href={storePath(subdomain, 'products')} className="text-blue-600 hover:underline">
            查看全部 &rarr;
          </a>
        </div>
        
        {products && products.length > 0 ? (
          <div className={`grid gap-6 ${
            theme.layout === 'list' 
              ? 'grid-cols-1' 
              : theme.layout === 'card'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
          }`}>
            {products.map((product: any) => (
              <a 
                key={product.id} 
                href={storePath(subdomain, 'product', product.id)}
                className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* 商品图片 */}
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <Image
                      src={product.images[0]} 
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-medium">已售罄</span>
                    </div>
                  )}
                </div>
                
                {/* 商品信息 */}
                <div className="p-4">
                  <h4 className="text-gray-900 font-medium line-clamp-2 mb-2">
                    {product.name}
                  </h4>
                  {product.category && (
                    <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold" style={{ color: theme.primary_color }}>
                      ¥{product.price}
                    </span>
                    {product.stock > 0 && (
                      <span className="text-sm text-green-600">有货</span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无商品</h3>
            <p className="mt-1 text-sm text-gray-500">该商城暂未上架任何商品</p>
          </div>
        )}
      </main>
      
      {/* 页脚 */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <span className="text-xl font-bold">{tenant.name}</span>
              <p className="text-gray-400 text-sm mt-1">由 ProClaw Shop 提供支持</p>
            </div>
            <div className="flex space-x-6 text-gray-400">
              {tenant.contact_info?.phone && <span>电话: {tenant.contact_info.phone}</span>}
              {tenant.contact_info?.wechat && <span>微信: {tenant.contact_info.wechat}</span>}
              {tenant.contact_info?.email && <span>邮箱: {tenant.contact_info.email}</span>}
              <a 
                href={`https://proclaw.cc/customer-service?store=${encodeURIComponent(subdomain || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300"
              >
                联系客服
              </a>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} {tenant.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
