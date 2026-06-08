//! 命令执行统计模块
//!
//! 提供命令执行统计和监控功能

use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

/// 命令执行统计信息
#[derive(Debug, Clone)]
pub struct CommandStats {
    pub name: String,
    pub total_calls: u64,
    pub total_duration_ms: u64,
    pub errors: u64,
}

impl CommandStats {
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            total_calls: 0,
            total_duration_ms: 0,
            errors: 0,
        }
    }

    pub fn avg_duration_ms(&self) -> u64 {
        if self.total_calls == 0 {
            0
        } else {
            self.total_duration_ms / self.total_calls
        }
    }
}

/// 命令执行统计器
pub struct CommandStatsCollector {
    stats: RwLock<HashMap<String, Arc<CommandStatsInner>>>,
}

struct CommandStatsInner {
    total_calls: AtomicU64,
    total_duration_ms: AtomicU64,
    errors: AtomicU64,
    name: String,
}

impl CommandStatsCollector {
    pub fn new() -> Self {
        Self {
            stats: RwLock::new(HashMap::new()),
        }
    }

    /// 记录命令执行
    pub fn record(&self, name: &str, duration: Duration, error: bool) {
        let stats = self.get_or_create(name);
        stats.total_calls.fetch_add(1, Ordering::Relaxed);
        stats
            .total_duration_ms
            .fetch_add(duration.as_millis() as u64, Ordering::Relaxed);
        if error {
            stats.errors.fetch_add(1, Ordering::Relaxed);
        }
    }

    /// 获取单个命令的统计
    pub fn get_stats(&self, name: &str) -> Option<CommandStats> {
        let stats = self.stats.read();
        stats.get(name).map(|inner| CommandStats {
            name: inner.name.clone(),
            total_calls: inner.total_calls.load(Ordering::Relaxed),
            total_duration_ms: inner.total_duration_ms.load(Ordering::Relaxed),
            errors: inner.errors.load(Ordering::Relaxed),
        })
    }

    /// 获取所有命令的统计
    pub fn get_all_stats(&self) -> Vec<CommandStats> {
        let stats = self.stats.read();
        stats
            .values()
            .map(|inner| CommandStats {
                name: inner.name.clone(),
                total_calls: inner.total_calls.load(Ordering::Relaxed),
                total_duration_ms: inner.total_duration_ms.load(Ordering::Relaxed),
                errors: inner.errors.load(Ordering::Relaxed),
            })
            .collect()
    }

    /// 获取 Top N 最慢的命令
    pub fn get_slowest_commands(&self, n: usize) -> Vec<(String, u64)> {
        let all_stats = self.get_all_stats();
        let mut stats: Vec<_> = all_stats
            .into_iter()
            .map(|s| (s.name.clone(), s.avg_duration_ms()))
            .collect();
        stats.sort_by(|a, b| b.1.cmp(&a.1));
        stats.into_iter().take(n).collect()
    }

    /// 获取调用次数最多的命令
    pub fn get_most_called_commands(&self, n: usize) -> Vec<(String, u64)> {
        let all_stats = self.get_all_stats();
        let mut stats: Vec<_> = all_stats
            .into_iter()
            .map(|s| (s.name.clone(), s.total_calls))
            .collect();
        stats.sort_by(|a, b| b.1.cmp(&a.1));
        stats.into_iter().take(n).collect()
    }

    /// 获取错误率最高的命令
    pub fn get_error_prone_commands(&self, n: usize) -> Vec<(String, f64)> {
        let all_stats = self.get_all_stats();
        let mut stats: Vec<_> = all_stats
            .into_iter()
            .filter(|s| s.total_calls > 0)
            .map(|s| {
                let error_rate = s.errors as f64 / s.total_calls as f64 * 100.0;
                (s.name.clone(), error_rate)
            })
            .collect();
        stats.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        stats.into_iter().take(n).collect()
    }

    /// 重置统计
    pub fn reset(&self) {
        let mut stats = self.stats.write();
        stats.clear();
    }

    fn get_or_create(&self, name: &str) -> Arc<CommandStatsInner> {
        // 先尝试读取
        {
            let stats = self.stats.read();
            if let Some(stat) = stats.get(name) {
                return Arc::clone(stat);
            }
        }

        // 创建新的
        let inner: Arc<CommandStatsInner> = Arc::new(CommandStatsInner {
            total_calls: AtomicU64::new(0),
            total_duration_ms: AtomicU64::new(0),
            errors: AtomicU64::new(0),
            name: name.to_string(),
        });

        // 尝试插入
        let mut stats = self.stats.write();
        if let Some(stat) = stats.get(name) {
            return Arc::clone(stat);
        }
        stats.insert(name.to_string(), Arc::clone(&inner));
        inner
    }
}

impl Default for CommandStatsCollector {
    fn default() -> Self {
        Self::new()
    }
}

/// 命令执行上下文
pub struct CommandContext {
    start_time: Instant,
    name: String,
}

impl CommandContext {
    pub fn new(name: &str) -> Self {
        Self {
            start_time: Instant::now(),
            name: name.to_string(),
        }
    }

    pub fn finish(self, collector: &CommandStatsCollector, error: bool) {
        collector.record(&self.name, self.start_time.elapsed(), error);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_command_stats() {
        let collector = CommandStatsCollector::new();

        // 模拟命令执行
        collector.record("test_cmd", Duration::from_millis(100), false);
        collector.record("test_cmd", Duration::from_millis(200), false);
        collector.record("test_cmd", Duration::from_millis(150), true);

        let stats = collector.get_stats("test_cmd").unwrap();
        assert_eq!(stats.total_calls, 3);
        assert_eq!(stats.total_duration_ms, 450);
        assert_eq!(stats.errors, 1);
        assert_eq!(stats.avg_duration_ms(), 150);
    }

    #[test]
    fn test_most_called() {
        let collector = CommandStatsCollector::new();

        collector.record("cmd1", Duration::from_millis(10), false);
        collector.record("cmd2", Duration::from_millis(10), false);
        collector.record("cmd2", Duration::from_millis(10), false);
        collector.record("cmd3", Duration::from_millis(10), false);

        let most_called = collector.get_most_called_commands(2);
        assert_eq!(most_called[0].0, "cmd2");
        assert_eq!(most_called[0].1, 2);
    }
}
