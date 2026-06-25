import { create } from 'zustand';
import type { ProClipsTemplate, ProClipsProductInfo, ProClipsSceneUploadResult, ProClipsMixTaskResult } from '../services/ProClipsService';

export interface ProClipsState {
  selectedTemplate?: ProClipsTemplate;
  sceneUploads: ProClipsSceneUploadResult[];
  productInfo: ProClipsProductInfo;
  generatedScript: string;
  voiceSampleUri?: string;
  mixTask?: ProClipsMixTaskResult;
  setSelectedTemplate: (template: ProClipsTemplate) => void;
  setSceneUpload: (sceneUpload: ProClipsSceneUploadResult) => void;
  setProductInfo: (productInfo: ProClipsProductInfo) => void;
  setGeneratedScript: (script: string) => void;
  setVoiceSampleUri: (uri?: string) => void;
  setMixTask: (task: ProClipsMixTaskResult) => void;
  reset: () => void;
}

export const useProClipsStore = create<ProClipsState>((set) => ({
  selectedTemplate: undefined,
  sceneUploads: [],
  productInfo: { name: '', features: '', price: '' },
  generatedScript: '',
  voiceSampleUri: undefined,
  mixTask: undefined,
  setSelectedTemplate: (template) => set({ selectedTemplate: template, sceneUploads: [], generatedScript: '', voiceSampleUri: undefined, mixTask: undefined }),
  setSceneUpload: (sceneUpload) => set((state) => ({
    sceneUploads: [...state.sceneUploads.filter((item) => item.sceneIndex !== sceneUpload.sceneIndex), sceneUpload],
  })),
  setProductInfo: (productInfo) => set({ productInfo }),
  setGeneratedScript: (script) => set({ generatedScript: script }),
  setVoiceSampleUri: (uri) => set({ voiceSampleUri: uri }),
  setMixTask: (task) => set({ mixTask: task }),
  reset: () => set({ selectedTemplate: undefined, sceneUploads: [], productInfo: { name: '', features: '', price: '' }, generatedScript: '', voiceSampleUri: undefined, mixTask: undefined }),
}));
