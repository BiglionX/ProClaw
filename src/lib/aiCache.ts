/**
 * AI分析结果缓存层
 * 提供内存缓存、TTL自动失效、命中率监控等功能
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class AICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
  };

  /**
   * 从缓存获取数据
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取或设置（带工厂函数）
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * 清理过期条目
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 预热缓存（批量加载常用数据）
   */
  async warmup(tasks: Array<{ key: string; factory: () => Promise<any>; ttl?: number }>): Promise<void> {
    console.log(`Warming up cache with ${tasks.length} entries...`);
    
    const promises = tasks.map(task => 
      this.getOrSet(task.key, task.factory, task.ttl || 300)
    );
    
    await Promise.all(promises);
    console.log('Cache warmup completed');
  }
}

// 单例实例
let aiCache: AICache | null = null;

/**
 * 获取AI缓存单例
 */
export function getAICache(): AICache {
  if (!aiCache) {
    aiCache = new AICache();
    
    // 每5分钟自动清理过期条目
    setInterval(() => {
      const cleaned = aiCache!.cleanup();
      if (cleaned > 0) {
        console.log(`Cleaned ${cleaned} expired cache entries`);
      }
    }, 5 * 60 * 1000);
  }
  return aiCache;
}

/**
 * 生成缓存键的工具函数
 */
export class CacheKeyGenerator {
  static salesForecast(period: string): string {
    return `sales_forecast:${period}`;
  }

  static inventoryOptimization(): string {
    return `inventory_optimization:v1`;
  }

  static anomalyDetection(): string {
    return `anomaly_detection:v1`;
  }

  static purchaseSuggestions(): string {
    return `purchase_suggestions:v1`;
  }

  static businessInsight(query: string): string {
    return `business_insight:${this.hash(query)}`;
  }

  private static hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
