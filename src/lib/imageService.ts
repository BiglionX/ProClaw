import { invoke } from '@tauri-apps/api/core';

/**
 * 将文件转换为 Base64 字符串
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // 移除 data:image/png;base64, 前缀
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * 上传图片到后端
 */
export async function uploadImage(file: File): Promise<string> {
  try {
    const base64Data = await fileToBase64(file);
    const result = await invoke<string>('upload_image', {
      fileData: base64Data,
    });
    return result;
  } catch (error) {
    console.error('Upload image failed:', error);
    throw error;
  }
}
