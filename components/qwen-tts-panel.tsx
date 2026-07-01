"use client";

import { useEffect, useRef, useState } from "react";
import { useAudioRecorder } from "../hooks/use-audio-recorder";
import { formatRefAudioLabel } from "../lib/client/audio";
import {
  instructExamples,
  languages,
  modes,
  nativeSpeakerByLanguage,
  sampleTextByLanguage,
  speakers,
  voiceDesignExamples,
} from "../lib/client/tts-options";

export function QwenTtsPanel({
  activeModel,
  activeModelLabel,
}: {
  activeModel: string;
  activeModelLabel: string;
}) {
  const [mode, setMode] = useState("custom_voice");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [speaker, setSpeaker] = useState("Serena");
  const [language, setLanguage] = useState("Chinese");
  const [instruct, setInstruct] = useState("音调低沉");
  const [refText, setRefText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const audioUrlRef = useRef("");
  const refAudioInputRef = useRef<HTMLInputElement | null>(null);
  const recorder = useAudioRecorder({ filePrefix: "base-recording" });

  // 自定义播放器状态
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showReady, setShowReady] = useState(false);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  // 已就绪提示淡出
  useEffect(() => {
    if (showReady) {
      const timer = setTimeout(() => {
        setShowReady(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showReady]);

  // 当音频 URL 改变时重置播放器状态
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => console.error(err));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = parseFloat(event.target.value);
    setCurrentTime(nextTime);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioRef.current.muted = nextMute;
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = parseFloat(event.target.value);
    setVolume(nextVal);
    if (audioRef.current) {
      audioRef.current.volume = nextVal;
      if (nextVal > 0 && isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  function changeLanguage(value: string) {
    setLanguage(value);
    const nextSpeaker = nativeSpeakerByLanguage[value];
    if (nextSpeaker) {
      setSpeaker(nextSpeaker);
    }
  }

  function clearReferenceAudio() {
    recorder.clearAudio();
    if (refAudioInputRef.current) {
      refAudioInputRef.current.value = "";
    }
  }

  function clearGeneratedAudio() {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }

    setAudioUrl("");
    setMessage("");
  }

  async function generateSpeech() {
    if (!text.trim()) {
      setMessage("请先输入文字");
      return;
    }

    setIsGenerating(true);
    setMessage(`正在调用 ${activeModelLabel} 生成音频`);

    try {
      const formData = new FormData();
      formData.append("model", activeModel);
      formData.append("mode", mode);
      formData.append("text", text);
      formData.append("speaker", speaker);
      formData.append("language", language);
      formData.append("instruct", instruct);
      formData.append("refText", refText);

      if (recorder.audioFile) {
        formData.append("refAudio", recorder.audioFile);
      }

      const savedKeys = localStorage.getItem("mei-audio-keys");
      const headers: Record<string, string> = {};
      if (savedKeys) {
        try {
          const keysObj = JSON.parse(savedKeys);
          if (keysObj.openaiKey) headers["x-openai-key"] = keysObj.openaiKey;
          if (keysObj.openaiUrl) headers["x-openai-url"] = keysObj.openaiUrl;
          if (keysObj.elevenlabsKey) headers["x-elevenlabs-key"] = keysObj.elevenlabsKey;
          if (keysObj.elevenlabsVoiceId) headers["x-elevenlabs-voice"] = keysObj.elevenlabsVoiceId;
          if (keysObj.minimaxKey) headers["x-minimax-key"] = keysObj.minimaxKey;
          if (keysObj.minimaxGroupId) headers["x-minimax-group"] = keysObj.minimaxGroupId;
          if (keysObj.customTtsUrl) headers["x-custom-tts-url"] = keysObj.customTtsUrl;
          if (keysObj.customTtsKey) headers["x-custom-tts-key"] = keysObj.customTtsKey;
          if (keysObj.customTtsModel) headers["x-custom-tts-model"] = keysObj.customTtsModel;
        } catch (e) {
          console.error("Error reading storage keys in TTS panel:", e);
        }
      }

      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "生成失败");
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      const blob = await response.blob();
      const nextAudioUrl = URL.createObjectURL(blob);
      audioUrlRef.current = nextAudioUrl;
      setAudioUrl(nextAudioUrl);
      setMessage("");
      setShowReady(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="mei-workspace-layout">
      {/* 左栏：输入与生成 */}
      <div className="mei-workspace-main">
        <div className="field-stack" style={{ flexShrink: 0 }}>
          <div className="mei-card-title-container">
            <h2>文字转语音</h2>
            <span className="mei-card-model-badge">{activeModelLabel}</span>
          </div>
        </div>

        <div className="mei-workspace-textarea-container field-stack">
          <div className="field-header">
            <span className="field-title">输入文字</span>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {sampleTextByLanguage[language] ? (
                <button
                  className="mei-btn-ghost"
                  onClick={() => setText(sampleTextByLanguage[language] ?? "")}
                  type="button"
                >
                  填入{language}示例
                </button>
              ) : null}
              {text ? (
                <button className="mei-btn-ghost" onClick={() => setText("")} type="button">
                  清空
                </button>
              ) : null}
            </div>
          </div>
          <textarea
            className="mei-textarea"
            placeholder="输入一段需要转换成语音的文字..."
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>

        {/* 底部生成与播放 */}
        <div className="mei-panel-footer" style={{ borderTop: "1px solid var(--theme-border-default)", paddingTop: "16px", marginTop: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* 第一行：生成控制和状态提示 */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minHeight: "38px" }}>
            <button
              className="mei-btn-primary"
              disabled={isGenerating}
              onClick={generateSpeech}
              style={{ flexShrink: 0 }}
            >
              {isGenerating ? (
                <>
                  <span className="spinner" style={{ width: "12px", height: "12px", borderWidth: "1.5px", marginRight: "6px" }}></span>
                  生成中...
                </>
              ) : "生成语音"}
            </button>
            
            {/* 状态与就绪微提示 (完全不换行，保持在第一行，保证高度不变) */}
            <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              {isGenerating && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--theme-text-secondary)", fontSize: "13px" }}>
                  <span>正在合成音频，请稍候...</span>
                </div>
              )}
              {!isGenerating && message && (
                <div 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "6px", 
                    color: message.includes("失败") || message.includes("请先") ? "var(--color-semantic-error-base)" : "var(--theme-text-secondary)", 
                    fontSize: "13px",
                    fontWeight: 500
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{message}</span>
                </div>
              )}
              {!isGenerating && !message && showReady && (
                <div className="mei-ready-badge" style={{ animation: "fadeIn 0.3s ease" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>音频已就绪</span>
                </div>
              )}
            </div>
          </div>

          {/* 第二行：自定义音频播放器 (固定渲染，消除高度抖动) */}
          <div className="field-stack" style={{ gap: "6px", width: "100%" }}>
            <div className={`mei-custom-player ${!audioUrl ? "disabled" : ""}`}>
              <button 
                className="player-btn" 
                onClick={togglePlay} 
                type="button" 
                title={isPlaying ? "暂停" : "播放"}
                disabled={!audioUrl}
              >
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <rect x="2" y="1" width="3" height="12" rx="1" />
                    <rect x="9" y="1" width="3" height="12" rx="1" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style={{ marginLeft: "2px" }}>
                    <path d="M3 1.5L12 7L3 12.5V1.5Z" />
                  </svg>
                )}
              </button>
              
              <div className="player-time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
              
              <div className="player-progress-container">
                <input
                  className="player-progress-bar"
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.1}
                  value={currentTime}
                  onChange={handleProgressChange}
                  disabled={!audioUrl}
                />
              </div>
              
              <button 
                className="player-btn" 
                onClick={toggleMute} 
                type="button" 
                title={isMuted ? "取消静音" : "静音"}
                disabled={!audioUrl}
              >
                {isMuted || volume === 0 ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M1.5 5h3l3.5-3v12l-3.5-3h-3v-6zm12.854-1.646l1.414 1.414L11.414 9l4.354 4.354-1.414 1.414L10 10.414l-4.354 4.354-1.414-1.414L8.586 9 4.232 4.646l1.414-1.414L10 7.586l4.354-4.232z" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.5 8c0-1.48-.85-2.73-2-3.3V4.7c1.65.65 2.8 2.27 2.8 4.15s-1.15 3.5-2.8 4.15v-1.15c1.15-.57 2-1.82 2-3.3zM2 5v6h3.5L9 14.5v-13L5.5 5H2zm9.5 3c0-2.48-1.72-4.57-4-5.15v1.05c1.72.53 3 2.1 3 4.1s-1.28 3.57-3 4.1v1.05c2.28-.58 4-2.67 4-5.15z" />
                  </svg>
                )}
              </button>
              
              <div className="player-volume-slider-container">
                <input
                  className="player-volume-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  disabled={!audioUrl}
                />
              </div>
              
              <audio
                ref={audioRef}
                src={audioUrl || undefined}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 右栏：侧边栏配置面板 */}
      <div className="mei-workspace-sidebar">
        <div className="field-stack" style={{ borderBottom: "1px solid var(--theme-border-default)", paddingBottom: "12px", flexShrink: 0 }}>
          <span className="field-title" style={{ fontSize: "14px", fontWeight: "bold" }}>基本配置</span>
        </div>

        {/* Mode selection */}
        <div className="field-stack" style={{ gap: "var(--spacing-scale-1)" }}>
          <span className="field-label">生成模式</span>
          <div className="mei-segmented-control">
            {modes.map((item) => (
              <button
                className={mode === item.value ? "mei-segmented-item active" : "mei-segmented-item"}
                key={item.value}
                onClick={() => setMode(item.value)}
                type="button"
              >
                <strong>{item.title}</strong>
              </button>
            ))}
          </div>

        </div>

        {/* 语种 */}
        <div className="field-stack">
          <div className="field-header">
            <span className="field-title">语种</span>
            <button className="mei-btn-ghost" onClick={() => changeLanguage("Chinese")} type="button">
              重置
            </button>
          </div>
          <select
            className="mei-select"
            value={language}
            onChange={(event) => changeLanguage(event.target.value)}
          >
            {languages.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* 音色 */}
        {mode === "custom_voice" ? (
          <div className="field-stack">
            <div className="field-header">
              <span className="field-title">音色</span>
              <button className="mei-btn-ghost" onClick={() => setSpeaker("Serena")} type="button">
                重置
              </button>
            </div>
            <select
              className="mei-select"
              value={speaker}
              onChange={(event) => setSpeaker(event.target.value)}
            >
              {speakers.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* 其它高级配置 */}
        {mode === "base_clone" ? (
          <div className="field-stack" style={{ gap: "14px", borderTop: "1px solid var(--theme-border-default)", paddingTop: "14px" }}>
            <div className="field-stack">
              <div className="field-header">
                <span className="field-title">参考音频</span>
                {recorder.audioFile && (
                  <button className="mei-btn-ghost" onClick={clearReferenceAudio} type="button">清空</button>
                )}
              </div>
              <div className="mei-file-input-wrapper" style={{ height: "46px" }}>
                <div className="mei-file-input-trigger" style={{ padding: "10px 14px", height: "100%" }}>
                  {recorder.audioFile ? (
                    <span style={{ fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {recorder.audioFile.name}
                    </span>
                  ) : (
                    "点击或拖拽参考音频上传"
                  )}
                </div>
                <input
                  ref={refAudioInputRef}
                  accept="audio/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    recorder.setSelectedAudio(file, "已选择本地参考音频");
                  }}
                  type="file"
                />
              </div>
            </div>

            <div className="chips-container" style={{ margin: "4px 0", gap: "10px", alignItems: "center" }}>
              <button
                className="mei-btn-secondary"
                onClick={recorder.isRecording ? recorder.stopRecording : recorder.startRecording}
                type="button"
                style={{ fontSize: "13px", padding: "8px 12px" }}
              >
                {recorder.isRecording ? "停止录音" : "开始录音"}
              </button>
              {recorder.audioUrl && (
                <audio src={recorder.audioUrl} controls style={{ height: "32px", flex: 1, minWidth: "100px" }} />
              )}
            </div>

            <div className="field-stack">
              <div className="field-header">
                <span className="field-title">参考音频文本</span>
              </div>
              <input
                className="mei-input"
                value={refText}
                onChange={(event) => setRefText(event.target.value)}
                placeholder="参考音频里说的话..."
                style={{ fontSize: "13px" }}
              />
            </div>
          </div>
        ) : (
          <div className="field-stack" style={{ gap: "12px", borderTop: "1px solid var(--theme-border-default)", paddingTop: "14px" }}>
            <div className="field-header">
              <span className="field-title">{mode === "voice_design" ? "音色描述" : "风格指令"}</span>
              {instruct && (
                <button className="mei-btn-ghost" onClick={() => setInstruct("")} type="button">清空</button>
              )}
            </div>
            <input
              className="mei-input"
              value={instruct}
              onChange={(event) => setInstruct(event.target.value)}
              placeholder={mode === "voice_design" ? "年轻女性声音，温柔..." : "用特别愤怒的语气说..."}
            />
            <div className="chips-container" style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "64px", overflow: "hidden" }}>
              {(mode === "voice_design" ? voiceDesignExamples : instructExamples).map((item) => (
                <button
                  className="mei-tag"
                  key={item}
                  onClick={() => setInstruct(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
