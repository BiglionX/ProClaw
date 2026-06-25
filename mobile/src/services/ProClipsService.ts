import { getApiClient } from './AuthService';
import { getConnectionMode } from './ConnectionManager';
import axios from 'axios';
import { generateText } from './AIService';
import { logger } from '../utils/logger';
import { showToast } from '../components/Toast';

export interface ProClipsTemplate {
  id: string;
  title: string;
  description: string;
  scenes: string[];
  duration: string;
  sample: string;
}

export interface ProClipsProductInfo {
  name: string;
  features: string;
  price: string;
}

export interface ProClipsSceneUploadResult {
  sceneIndex: number;
  uri: string;
  remoteUrl?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
}

export interface ProClipsMixTaskResult {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  resultVideoUrl?: string;
  errorMessage?: string;
}

export const TEMPLATES: ProClipsTemplate[] = [
  {
    id: 'tpl_1',
    title: '餐饮新品推广',
    description: '适用于菜品展示与门店氛围展示的短视频模板。',
    scenes: ['开场口播', '菜品特写', '环境展示', '优惠信息'],
    duration: '15-30秒',
    sample: '适合餐饮、火锅、甜品等门店宣传。',
  },
  {
    id: 'tpl_2',
    title: '美业门店宣传',
    description: '适用于美发/美甲/美容门店的个人 IP 营销短视频。',
    scenes: ['店铺介绍', '服务展示', '效果前后', '优惠卡片'],
    duration: '15-30秒',
    sample: '适合美发、美容、SPA 等商家。',
  },
  {
    id: 'tpl_3',
    title: '零售热销爆款',
    description: '适用于商品展示、推荐理由和购买引导的视频模板。',
    scenes: ['商品展示', '核心卖点', '使用场景', '结尾促单'],
    duration: '15-30秒',
    sample: '适合零售、小商品、快消品推广。',
  },
];

export const getTemplateById = (templateId: string): ProClipsTemplate | undefined => {
  return TEMPLATES.find((item) => item.id === templateId);
};

// Development: when true, call the local mock backend directly
const USE_LOCAL_MOCK = true;
const MOCK_BASE = 'http://localhost:4000';

export const uploadSceneClip = async (
  templateId: string,
  sceneIndex: number,
  uri: string,
  fileName: string
): Promise<{ remoteUrl: string; uri: string }> => {
  try {
    if (USE_LOCAL_MOCK) {
      const form = new FormData();
      form.append('template_id', templateId);
      form.append('scene_index', String(sceneIndex));
      form.append('file', {
        uri,
        name: fileName,
        type: fileName.endsWith('.mov') || fileName.endsWith('.mp4') ? 'video/mp4' : 'video/mp4',
      } as any);
      const resp = await axios.post(`${MOCK_BASE}/api/proclips/upload-scene`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { remoteUrl: resp.data?.remoteUrl || uri, uri };
    }
    const client = await getApiClient();
    const form = new FormData();
    form.append('template_id', templateId);
    form.append('scene_index', String(sceneIndex));
    form.append('file', {
      uri,
      name: fileName,
      type: fileName.endsWith('.mov') || fileName.endsWith('.mp4') ? 'video/mp4' : 'video/mp4',
    } as any);

    const response = await client.post('/api/proclips/upload-scene', form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      remoteUrl: response.data?.remoteUrl || uri,
      uri,
    };
  } catch (error) {
    const safeUri = uri;
    logger.warn('[ProClipsService] uploadSceneClip failed, falling back to local uri:', error);
    showToast('info', '素材上传失败，已保存在本地', '请在网络恢复后重试上传');
    return { remoteUrl: safeUri, uri: safeUri };
  }
};

export const generateUploadUrl = async (
  templateId: string,
  sceneIndex: number,
  fileName: string
): Promise<{ uploadUrl: string; key: string } | null> => {
  try {
    if (USE_LOCAL_MOCK) {
      const resp = await axios.post(`${MOCK_BASE}/api/proclips/generate-upload-url`, {
        template_id: templateId,
        scene_index: sceneIndex,
        fileName,
      });
      return { uploadUrl: resp.data.uploadUrl, key: resp.data.key };
    }
    const client = await getApiClient();
    const response = await client.post('/api/proclips/generate-upload-url', { template_id: templateId, scene_index: sceneIndex, fileName });
    return { uploadUrl: response.data.uploadUrl, key: response.data.key };
  } catch (error) {
    logger.warn('[ProClipsService] generateUploadUrl failed:', error);
    return null;
  }
};

export const confirmSceneUpload = async (templateId: string, sceneIndex: number, key: string): Promise<boolean> => {
  try {
    if (USE_LOCAL_MOCK) {
      await axios.post(`${MOCK_BASE}/api/proclips/confirm-scene-upload`, { template_id: templateId, scene_index: sceneIndex, key });
      return true;
    }
    const client = await getApiClient();
    await client.post('/api/proclips/confirm-scene-upload', { template_id: templateId, scene_index: sceneIndex, key });
    return true;
  } catch (error) {
    logger.warn('[ProClipsService] confirmSceneUpload failed:', error);
    return false;
  }
};

export const generateScript = async (
  template: ProClipsTemplate,
  productInfo: ProClipsProductInfo
): Promise<string> => {
  const prompt = `请为以下商品生成一段适合短视频配音的营销文案，语言要简洁亲切、强调卖点与促销。

模板：${template.title}
商品名称：${productInfo.name}
商品卖点：${productInfo.features}
参考价格：${productInfo.price}

请输出一份中文营销文案，不超过100字。`;

  try {
    return await generateText(prompt);
  } catch (error) {
    logger.warn('[ProClipsService] generateScript failed, using fallback text:', error);
    return `这是 ${productInfo.name} 的短视频文案，突出${productInfo.features}，建议价格为${productInfo.price}。欢迎关注并下单。`;
  }
};

export const submitMixTask = async (
  template: ProClipsTemplate,
  productInfo: ProClipsProductInfo,
  script: string,
  voiceSampleUri?: string,
  sceneUploads?: Array<{ sceneIndex: number; remoteUrl: string }>
): Promise<ProClipsMixTaskResult> => {
  const fallbackTaskId = `local_mix_${Date.now()}`;
  try {
    if (USE_LOCAL_MOCK) {
      const response = await axios.post(`${MOCK_BASE}/api/proclips/mix/submit`, {
        template_id: template.id,
        product_name: productInfo.name,
        product_features: productInfo.features,
        product_price: productInfo.price,
        script,
        voice_sample_uri: voiceSampleUri,
        scene_uploads: sceneUploads || [],
      });
      return {
        taskId: response.data?.taskId || fallbackTaskId,
        status: response.data?.status || 'processing',
        progress: response.data?.progress ?? 0,
        resultVideoUrl: response.data?.resultVideoUrl,
      };
    }
    const client = await getApiClient();
    const response = await client.post('/api/proclips/mix/submit', {
      template_id: template.id,
      product_name: productInfo.name,
      product_features: productInfo.features,
      product_price: productInfo.price,
      script,
      voice_sample_uri: voiceSampleUri,
      scene_uploads: sceneUploads || [],
    });

    return {
      taskId: response.data?.taskId || fallbackTaskId,
      status: response.data?.status || 'processing',
      progress: response.data?.progress ?? 0,
      resultVideoUrl: response.data?.resultVideoUrl,
    };
  } catch (error) {
    logger.warn('[ProClipsService] submitMixTask failed, using local simulation:', error);
    showToast('info', '混剪任务未能提交到服务器，已进入本地模拟流程。', '请在联网后重试完成生成。');
    return {
      taskId: fallbackTaskId,
      status: 'processing',
      progress: 0,
    };
  }
};

export const recordVoiceSample = async (
  uri: string,
  fileName?: string
): Promise<string> => {
  try {
    const form = new FormData();
    form.append('file', {
      uri,
      name: fileName || `voice_${Date.now()}.wav`,
      type: 'audio/wav',
    } as any);
    if (USE_LOCAL_MOCK) {
      const resp = await axios.post(`${MOCK_BASE}/api/proclips/record-voice`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return resp.data?.remoteUrl || uri;
    }
    const client = await getApiClient();
    const response = await client.post('/api/proclips/record-voice', form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data?.remoteUrl || uri;
  } catch (error) {
    logger.warn('[ProClipsService] recordVoiceSample failed, fallback to local uri:', error);
    showToast('info', '音色保存失败，已保存在本地', '请在网络恢复后重试上传');
    return uri;
  }
};

export const getMixTaskStatus = async (
  taskId: string,
  currentProgress = 0
): Promise<Pick<ProClipsMixTaskResult, 'status' | 'progress' | 'resultVideoUrl' | 'errorMessage'>> => {
  if (taskId.startsWith('local_mix_')) {
    const createdAt = Number(taskId.replace('local_mix_', '')) || Date.now();
    const elapsedSeconds = Math.max(0, (Date.now() - createdAt) / 1000);
    const progress = Math.min(1, currentProgress + elapsedSeconds / 30);
    const completed = progress >= 1;
    return {
      status: completed ? 'completed' : 'processing',
      progress: completed ? 1 : progress,
      resultVideoUrl: completed ? `https://example.com/proclips/result/${taskId}.mp4` : undefined,
    };
  }

  try {
    if (USE_LOCAL_MOCK) {
      const resp = await axios.get(`${MOCK_BASE}/api/proclips/mix/status/${taskId}`);
      return {
        status: resp.data?.status || 'processing',
        progress: resp.data?.progress ?? currentProgress,
        resultVideoUrl: resp.data?.resultVideoUrl,
        errorMessage: resp.data?.errorMessage,
      };
    }
    const client = await getApiClient();
    const response = await client.get(`/api/proclips/mix/status/${taskId}`);
    return {
      status: response.data?.status || 'processing',
      progress: response.data?.progress ?? currentProgress,
      resultVideoUrl: response.data?.resultVideoUrl,
      errorMessage: response.data?.errorMessage,
    };
  } catch (error) {
    logger.warn('[ProClipsService] getMixTaskStatus failed:', error);
    return {
      status: 'processing',
      progress: Math.min(1, currentProgress + 0.12),
    };
  }
};
