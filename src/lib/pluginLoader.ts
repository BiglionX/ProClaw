/**
 * 前端插件加载器 - Plugin Loader
 *
 * 管理行业插件的下载、验证、安装、激活全生命周期。
 * 通过 Tauri命令与 Rust 侧 plugin_manager 交互。
 *
 * 使用方式：
 *   import { pluginLoader } from '../lib/pluginLoader';
 *   await pluginLoader.downloadAndInstall('retail', '1.0.0', 'https://...');
 *   await pluginLoader.switchIndustry('retail');
 */
import { safeInvoke } from './tauri';
import { PluginManager, IndustryPluginManifest } from '../config/appMode';

export interface PluginLoadProgress {
  phase: 'downloading' | 'verifying' | 'installing' | 'activating' | 'done' | 'error';
  percent: number;
  message: string;
  error?: string;
}

type ProgressCallback = (progress: PluginLoadProgress) => void;

/**
 * 插件加载器单例
 */
class PluginLoader {
  private static instance: PluginLoader;
  private progressCallback: ProgressCallback | null = null;
  private abortController: AbortController | null = null;

  static getInstance(): PluginLoader {
    if (!PluginLoader.instance) {
      PluginLoader.instance = new PluginLoader();
    }
    return PluginLoader.instance;
  }

  /** 注册进度回调 */
  onProgress(cb: ProgressCallback): void {
    this.progressCallback = cb;
  }

  /** 取消当前操作 */
  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  /** 触发进度更新 */
  private emitProgress(p: PluginLoadProgress): void {
    this.progressCallback?.(p);
  }

  /**
   * 下载并安装插件
   * @param pluginId 插件ID
   * @param version 版本号
   * @param downloadUrl 下载地址
   * @param expectedHash SHA256 哈希（可选，用于完整性校验）
   * @param signatureHex Ed25519 签名（可选，用于签名校验）
   * @param publicKeyHex Ed25519 公钥（可选，用于签名校验）
   */
  async downloadAndInstall(
    pluginId: string,
    version: string,
    downloadUrl: string,
    expectedHash?: string,
    signatureHex?: string,
    publicKeyHex?: string
  ): Promise<boolean> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      // 1. 下载插件包
      this.emitProgress({
        phase: 'downloading',
        percent: 10,
        message: `正在下载 ${pluginId}@${version} ...`,
      });

      const downloadPath = await safeInvoke<string>('download_plugin', {
        pluginId,
        version,
        url: downloadUrl,
      });
      if (!downloadPath) {
        throw new Error('下载插件失败：Tauri 命令不可用');
      }
      if (signal.aborted) throw new Error('已取消');

      this.emitProgress({
        phase: 'downloading',
        percent: 40,
        message: '下载完成',
      });

      // 2. 校验 SHA256 完整性
      if (expectedHash) {
        this.emitProgress({
          phase: 'verifying',
          percent: 45,
          message: '正在校验文件完整性（SHA256）...',
        });

        const valid = await safeInvoke<boolean>('verify_plugin_package', {
          packagePath: downloadPath,
          expectedHash,
        });
        if (!valid) {
          throw new Error('SHA256 校验失败，文件可能已损坏');
        }

        this.emitProgress({
          phase: 'verifying',
          percent: 60,
          message: 'SHA256 校验通过',
        });
      }

      // 3. 校验 Ed25519 签名
      if (signatureHex && publicKeyHex) {
        this.emitProgress({
          phase: 'verifying',
          percent: 65,
          message: '正在验证数字签名（Ed25519）...',
        });

        const sigValid = await safeInvoke<boolean>('verify_plugin_signature', {
          packagePath: downloadPath,
          signatureHex,
          publicKeyHex,
        });
        if (!sigValid) {
          throw new Error('数字签名验证失败，插件包来源不可信');
        }

        this.emitProgress({
          phase: 'verifying',
          percent: 80,
          message: '数字签名验证通过',
        });
      }

      if (signal.aborted) throw new Error('已取消');

      // 4. 安装插件（解压到插件目录）
      this.emitProgress({
        phase: 'installing',
        percent: 85,
        message: '正在安装插件...',
      });

      const installPath = await safeInvoke<string>('install_plugin', {
        packagePath: downloadPath,
        pluginId,
      });
      if (!installPath) {
        throw new Error('安装插件失败');
      }

      this.emitProgress({
        phase: 'installing',
        percent: 95,
        message: '插件安装完成',
      });

      return true;
    } catch (error: any) {
      this.emitProgress({
        phase: 'error',
        percent: 0,
        message: '插件操作失败',
        error: error.message || '未知错误',
      });
      return false;
    }
  }

  /**
   * 切换行业插件
   * 完整流程：下载→验证→安装→激活→刷新路由
   *
   * @param pluginId 插件ID
   * @param manifest 插件 manifest（可选，如果已加载则直接激活）
   */
  async switchIndustry(pluginId: string, manifest?: IndustryPluginManifest): Promise<boolean> {
    try {
      if (manifest) {
        // 直接激活已安装的插件
        this.emitProgress({
          phase: 'activating',
          percent: 90,
          message: `正在激活 ${manifest.name} ...`,
        });

        const pm = PluginManager.getInstance();
        await pm.setPlugin(manifest);
        await pm.setIndustry(manifest.id as any);

        this.emitProgress({
          phase: 'done',
          percent: 100,
          message: `已切换到 ${manifest.name}`,
        });
        return true;
      }

      // 从已安装列表查找
      const installed = await safeInvoke<any[]>('list_installed_plugins');
      const plugin = installed?.find((p: any) => p.plugin_id === pluginId);

      if (plugin) {
        this.emitProgress({
          phase: 'activating',
          percent: 90,
          message: `正在激活 ${plugin.name} ...`,
        });

        const pm = PluginManager.getInstance();
        await pm.setPlugin(plugin.manifest);
        await pm.setIndustry(plugin.plugin_id as any);

        this.emitProgress({
          phase: 'done',
          percent: 100,
          message: `已切换到 ${plugin.name}`,
        });
        return true;
      }

      throw new Error(`插件 ${pluginId} 未安装`);
    } catch (error: any) {
      this.emitProgress({
        phase: 'error',
        percent: 0,
        message: '切换行业失败',
        error: error.message || '未知错误',
      });
      return false;
    }
  }

  /**
   * 获取已安装的插件列表
   */
  async getInstalledPlugins(): Promise<any[]> {
    return (await safeInvoke<any[]>('list_installed_plugins')) || [];
  }

  /**
   * 卸载插件
   */
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    try {
      await safeInvoke('uninstall_plugin', { pluginId });
      return true;
    } catch {
      return false;
    }
  }
}

/** 插件加载器单例实例 */
export const pluginLoader = PluginLoader.getInstance();
