// ProClaw Cloud 托管版 - 语音录制组件
'use client';
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VoiceRecorder;
var react_1 = require("react");
var react_hot_toast_1 = require("react-hot-toast");
function VoiceRecorder(_a) {
    var _this = this;
    var onSendVoice = _a.onSendVoice, disabled = _a.disabled;
    var _b = (0, react_1.useState)(false), isRecording = _b[0], setIsRecording = _b[1];
    var _c = (0, react_1.useState)(0), recordingTime = _c[0], setRecordingTime = _c[1];
    var _d = (0, react_1.useState)(null), audioBlob = _d[0], setAudioBlob = _d[1];
    var _e = (0, react_1.useState)(null), audioUrl = _e[0], setAudioUrl = _e[1];
    var _f = (0, react_1.useState)(false), sending = _f[0], setSending = _f[1];
    var mediaRecorderRef = (0, react_1.useRef)(null);
    var audioChunksRef = (0, react_1.useRef)([]);
    var timerRef = (0, react_1.useRef)(null);
    var startTimeRef = (0, react_1.useRef)(0);
    // 开始录音
    var startRecording = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var stream_1, mediaRecorder, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, navigator.mediaDevices.getUserMedia({ audio: true })];
                case 1:
                    stream_1 = _a.sent();
                    mediaRecorder = new MediaRecorder(stream_1, {
                        mimeType: 'audio/webm;codecs=opus'
                    });
                    audioChunksRef.current = [];
                    mediaRecorderRef.current = mediaRecorder;
                    mediaRecorder.ondataavailable = function (event) {
                        if (event.data.size > 0) {
                            audioChunksRef.current.push(event.data);
                        }
                    };
                    mediaRecorder.onstop = function () {
                        var blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                        setAudioBlob(blob);
                        var url = URL.createObjectURL(blob);
                        setAudioUrl(url);
                        // 停止所有轨道
                        stream_1.getTracks().forEach(function (track) { return track.stop(); });
                    };
                    // 开始录音
                    mediaRecorder.start();
                    setIsRecording(true);
                    startTimeRef.current = Date.now();
                    setRecordingTime(0);
                    // 定时更新录音时长
                    timerRef.current = setInterval(function () {
                        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
                    }, 100);
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('无法访问麦克风:', error_1);
                    react_hot_toast_1.default.error('无法访问麦克风，请检查权限设置');
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }, []);
    // 停止录音
    var stopRecording = (0, react_1.useCallback)(function () {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [isRecording]);
    // 取消录音
    var cancelRecording = (0, react_1.useCallback)(function () {
        var _a;
        if (isRecording) {
            (_a = mediaRecorderRef.current) === null || _a === void 0 ? void 0 : _a.stop();
            setIsRecording(false);
            setRecordingTime(0);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        setAudioBlob(null);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
    }, [isRecording, audioUrl]);
    // 发送语音消息
    var handleSend = function () { return __awaiter(_this, void 0, void 0, function () {
        var duration, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!audioBlob)
                        return [2 /*return*/];
                    setSending(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
                    return [4 /*yield*/, onSendVoice(audioBlob, duration)];
                case 2:
                    _b.sent();
                    cancelRecording();
                    return [3 /*break*/, 5];
                case 3:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('发送失败，请重试');
                    return [3 /*break*/, 5];
                case 4:
                    setSending(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    // 格式化时间
    var formatTime = function (seconds) {
        var mins = Math.floor(seconds / 60);
        var secs = seconds % 60;
        return "".concat(mins, ":").concat(secs.toString().padStart(2, '0'));
    };
    // 录音中
    if (isRecording) {
        return (<div className="flex items-center gap-3 px-4 py-2 bg-red-50 rounded-full">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"/>
        <span className="text-sm text-red-600 font-medium">
          录音中 {formatTime(recordingTime)}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={cancelRecording} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full" title="取消">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <button onClick={stopRecording} className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-full" title="完成">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>
        </div>
      </div>);
    }
    // 预览录音
    if (audioUrl) {
        return (<div className="flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-full">
        <audio src={audioUrl} controls className="h-8 flex-1"/>
        <button onClick={cancelRecording} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full" title="重新录制">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
        <button onClick={handleSend} disabled={sending} className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-full disabled:opacity-50" title="发送">
          {sending ? (<svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>) : (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>)}
        </button>
      </div>);
    }
    // 默认状态
    return (<button onClick={startRecording} disabled={disabled} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="按住说话">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
      </svg>
    </button>);
}
