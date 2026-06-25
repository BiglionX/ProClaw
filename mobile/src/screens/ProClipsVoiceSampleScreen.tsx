import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import type { AppScreenProps } from '../types/navigation';
import { useProClipsStore } from '../stores/ProClipsStore';
import { submitMixTask, recordVoiceSample } from '../services/ProClipsService';

const ProClipsVoiceSampleScreen: React.FC<AppScreenProps<'ProClipsVoiceSample'>> = ({ navigation }) => {
  const selectedTemplate = useProClipsStore((state) => state.selectedTemplate);
  const productInfo = useProClipsStore((state) => state.productInfo);
  const generatedScript = useProClipsStore((state) => state.generatedScript);
  const sceneUploads = useProClipsStore((state) => state.sceneUploads);
  const setVoiceSampleUri = useProClipsStore((state) => state.setVoiceSampleUri);
  const setMixTask = useProClipsStore((state) => state.setMixTask);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [soundObj, setSoundObj] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationSec, setDurationSec] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (recordedUri) {
      setVoiceSampleUri(recordedUri);
    }
  }, [recordedUri, setVoiceSampleUri]);

  const handleRecord = async () => {
    if (Platform.OS === 'web') {
      setMessage('Web 平台暂不支持录音，直接提交将使用默认音色。');
      return;
    }

    try {
      setMessage('正在初始化录音设备...');
      const Audio = await import('expo-av');
      const { status } = await Audio.Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setMessage('请授予麦克风权限后重试。');
        return;
      }

      await Audio.Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Audio.Recording();
      await recording.prepareToRecordAsync(Audio.Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      setIsRecording(true);
      setMessage('录音中，请说出你的商品介绍，再次点击停止。');

      const stopRecording = async () => {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecordedUri(uri || undefined);
        setIsRecording(false);
        setMessage(uri ? '录音完成，已保存本地。' : '录音结束但未获取到文件。');
      };

      navigation.setOptions({
        headerRight: () => (
          <Button compact onPress={stopRecording}>
            停止录音
          </Button>
        ),
      });
    } catch (error) {
      console.warn('[ProClipsVoiceSample] record init failed', error);
      setMessage('录音初始化失败，请检查麦克风权限。');
    }
  };

  const handleStop = async () => {
    setIsRecording(false);
    setMessage('录音已停止。');
  };

  const handlePlayPause = async () => {
    if (!recordedUri) return;
    try {
      const Audio = await import('expo-av');
      if (!soundObj) {
        const s = new Audio.Audio.Sound();
        await s.loadAsync({ uri: recordedUri });
        const status = await s.getStatusAsync();
        const dur = (status as any).durationMillis;
        if (dur) setDurationSec(Math.round(dur / 1000));
        s.setOnPlaybackStatusUpdate((st: any) => {
          if (st.didJustFinish) {
            setIsPlaying(false);
            s.unloadAsync();
            setSoundObj(null);
          }
        });
        await s.playAsync();
        setSoundObj(s);
        setIsPlaying(true);
      } else {
        if (isPlaying) {
          await soundObj.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundObj.playAsync();
          setIsPlaying(true);
        }
      }
    } catch (err) {
      console.warn('[ProClipsVoiceSample] playback failed', err);
      setMessage('播放失败');
    }
  };

  const handleDelete = async () => {
    try {
      if (soundObj) {
        await soundObj.unloadAsync();
        setSoundObj(null);
      }
    } catch (e) {
      // ignore
    }
    setRecordedUri(undefined);
    setVoiceSampleUri(undefined);
    setMessage('已删除录音');
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    let voiceUrl = recordedUri;
    if (recordedUri) {
      voiceUrl = await recordVoiceSample(recordedUri);
      setVoiceSampleUri(voiceUrl);
    }
    const task = await submitMixTask(
      selectedTemplate,
      productInfo,
      generatedScript,
      voiceUrl,
      sceneUploads.map((item) => ({ sceneIndex: item.sceneIndex, remoteUrl: item.remoteUrl || item.uri }))
    );
    setMixTask(task);
    setLoading(false);
    navigation.navigate('ProClipsMixStatus');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>录制音色</Text>
      <Text style={styles.subtitle}>录制一段 10-15 秒的语音样本，用于生成专属配音音色。</Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.note}>请确保环境安静，声音清晰自然，内容可包含商品介绍、店铺承诺或促销话术。</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {recordedUri ? (
            <Text style={{ marginTop: 8, color: '#6b7280' }}>{durationSec ? `时长：${durationSec}s` : '已录制音频（可播放预览）'}</Text>
          ) : null}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={isRecording ? handleStop : handleRecord}
        style={styles.actionButton}
      >
        {isRecording ? '停止录音' : '开始录音'}
      </Button>

      <Button
        mode="outlined"
        onPress={handlePlayPause}
        disabled={!recordedUri}
        style={[styles.secondaryButton, { marginTop: 8 }]}
      >
        {isPlaying ? '暂停播放' : '播放预览'}
      </Button>

      <Button
        mode="outlined"
        onPress={handleDelete}
        disabled={!recordedUri}
        style={[styles.secondaryButton, { marginTop: 8 }]}
      >
        删除录音
      </Button>

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        style={[styles.actionButton, { marginTop: 12 }]}
      >
        {recordedUri ? '提交录音并生成视频' : '跳过录音，直接生成视频'}
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fcfbff',
  },
  title: {
    marginBottom: 10,
    color: '#2d2b8a',
    fontWeight: '700',
  },
  subtitle: {
    marginBottom: 18,
    color: '#4b5563',
    lineHeight: 22,
  },
  card: {
    borderRadius: 16,
    marginBottom: 20,
  },
  note: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 24,
  },
  message: {
    marginTop: 10,
    color: '#374151',
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 8,
  },
});

export default ProClipsVoiceSampleScreen;
