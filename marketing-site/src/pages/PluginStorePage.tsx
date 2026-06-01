import { useEffect, useState } from 'react';
import {
  getPublishedPlugins,
  parseManifest,
  getPluginRatingSummary,
} from '../lib/pluginService';
import type { IndustryPlugin, PluginRatingSummary, IndustryPluginManifest } from '../types';

interface PluginCard {
  plugin: IndustryPlugin;
  manifest: IndustryPluginManifest | null;
  rating: PluginRatingSummary | null;
}

const INDUSTRY_ICONS: Record<string, string> = {
  retail: '🛍️',
  inventory: '📦',
  virtual_company: '🏢',
  catering: '🍽️',
  beauty: '💇',
  pet: '🐾',
  'cloud-proclaw': '☁️',
};

const INDUSTRY_COLORS: Record<string, string> = {
  retail: '#e74c3c',
  inventory: '#111827',
  virtual_company: '#7c3aed',
  catering: '#e74c3c',
  beauty: '#ec4899',
  pet: '#f59e0b',
  'cloud-proclaw': '#0ea5e9',
};

const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'retail', label: '零售' },
  { id: 'inventory', label: '进销存' },
  { id: 'virtual_company', label: 'ProClaw Light' },
  { id: 'catering', label: '餐饮' },
  { id: 'beauty', label: '美业' },
  { id: 'pet', label: '宠物' },
  { id: 'cloud-proclaw', label: '云服务' },
];

export default function PluginStorePage() {
  const [cards, setCards] = useState<PluginCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<PluginCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'downloads' | 'rating' | 'newest'>('downloads');

  useEffect(() => {
    async function load() {
      const plugins = await getPublishedPlugins();
      const items: PluginCard[] = [];

      for (const plugin of plugins) {
        const manifest = parseManifest(plugin);
        const rating = await getPluginRatingSummary(plugin.id);
        items.push({ plugin, manifest, rating });
      }

      setCards(items);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    let filtered = [...cards];

    // 按分类过滤
    if (category !== 'all') {
      filtered = filtered.filter((c) => c.plugin.id === category);
    }

    // 搜索过滤
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.plugin.name.toLowerCase().includes(q) ||
          c.plugin.id.toLowerCase().includes(q) ||
          (c.plugin.description || '').toLowerCase().includes(q)
      );
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating?.average || 0) - (a.rating?.average || 0);
        case 'newest':
          return new Date(b.plugin.published_at || '').getTime() - new Date(a.plugin.published_at || '').getTime();
        default:
          return (b.plugin.downloads || 0) - (a.plugin.downloads || 0);
      }
    });

    setFilteredCards(filtered);
  }, [cards, category, search, sortBy]);

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return (
      <span className="text-amber-400 text-sm">
        {'★'.repeat(full)}
        {half ? '½' : ''}
        {'☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0)))}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-teal-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold mb-3">行业插件商店</h1>
          <p className="text-gray-300 text-lg max-w-2xl">
            发现适合你业务的行业插件。每个插件都包含专属功能模块、操作面板和 AI 经营团队，即装即用。
          </p>
        </div>
      </div>

      {/* 过滤栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 分类 tabs */}
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    category === cat.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* 搜索框 */}
            <input
              type="text"
              placeholder="搜索插件..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />

            {/* 排序 */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="downloads">按下载量</option>
              <option value="rating">按评分</option>
              <option value="newest">最新发布</option>
            </select>
          </div>
        </div>
      </div>

      {/* 插件网格 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3 animate-pulse">🔌</div>
            <div>加载插件商店...</div>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-lg">暂无匹配的插件</p>
            {search && (
              <p className="text-sm mt-1">
                尝试修改搜索关键词「{search}」
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCards.map((card) => {
              const icon =
                card.plugin.icon ||
                INDUSTRY_ICONS[card.plugin.id] ||
                '🔌';
              const color = INDUSTRY_COLORS[card.plugin.id] || '#6b7280';

              return (
                <div
                  key={card.plugin.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all group"
                >
                  {/* 顶栏 */}
                  <div className="px-5 pt-5 pb-3 flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {card.plugin.name}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {card.plugin.id} · v{card.plugin.version}
                      </p>
                    </div>
                  </div>

                  {/* 描述 */}
                  <div className="px-5 pb-3">
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {card.plugin.description || '暂无描述'}
                    </p>
                  </div>

                  {/* 标签/功能 */}
                  {card.manifest && (
                    <div className="px-5 pb-3">
                      <div className="flex flex-wrap gap-1">
                        {(card.manifest.tags ||
                          card.manifest.features.modules.slice(0, 4)).map(
                          (tag: string) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs"
                            >
                              {tag}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* 底栏 */}
                  <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>⬇️ {card.plugin.downloads}</span>
                      {card.rating && card.rating.count > 0 && (
                        <span className="flex items-center gap-1">
                          {renderStars(card.rating.average)}
                          <span>({card.rating.count})</span>
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                        title={card.manifest?.category || 'builtin'}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
