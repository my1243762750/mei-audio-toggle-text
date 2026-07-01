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
  const [instruct, setInstruct] = useState("撒娇语气");
  const [refText, setRefText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const audioUrlRef = useRef("");
  const refAudioInputRef = useRef<HTMLInputElement | null>(null);
  const recorder = useAudioRecorder({ filePrefix: "base-recording" });

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

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
      setMessage("生成完成");
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
        <div className="mei-panel-footer" style={{ borderTop: "1px solid var(--theme-border-default)", paddingTop: "16px", marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <button
              className="mei-btn-primary"
              disabled={isGenerating}
              onClick={generateSpeech}
              style={{ flexShrink: 0 }}
            >
              {isGenerating ? "生成中..." : "生成语音"}
            </button>
            {message && (
              <div
                className={`mei-status-msg ${message.includes("失败") || message.includes("请先") ? "error" : message.includes("完成") ? "success" : "info"}`}
                style={{ margin: 0, flex: 1, padding: "6px 12px", fontSize: "13px" }}
              >
                {message}
              </div>
            )}
          </div>
          {audioUrl && (
            <div className="field-stack" style={{ gap: "6px", marginTop: "8px" }}>
              <audio controls src={audioUrl} style={{ width: "100%", height: "38px" }} />
            </div>
          )}
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
