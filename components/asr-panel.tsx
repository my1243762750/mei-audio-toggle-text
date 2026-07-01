"use client";

import { useRef, useState } from "react";
import { languages } from "../lib/client/tts-options";

export function AsrPanel({
  activeModel,
  activeModelLabel,
}: {
  activeModel: string;
  activeModelLabel: string;
}) {
  const [asrAudio, setAsrAudio] = useState<File | null>(null);
  const [asrLanguage, setAsrLanguage] = useState("Auto");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechMessage, setSpeechMessage] = useState("");
  const asrAudioInputRef = useRef<HTMLInputElement | null>(null);

  async function transcribeAudio() {
    if (!asrAudio) {
      setSpeechMessage("请先选择音频文件");
      return;
    }

    setIsTranscribing(true);
    setSpeechMessage(`正在调用 ${activeModelLabel} 识别`);
    setTranscript("");

    try {
      const formData = new FormData();
      formData.append("model", activeModel);
      formData.append("audio", asrAudio);
      formData.append("language", asrLanguage);

      const savedKeys = localStorage.getItem("mei-audio-keys");
      const headers: Record<string, string> = {};
      if (savedKeys) {
        try {
          const keysObj = JSON.parse(savedKeys);
          if (keysObj.openaiKey) headers["x-openai-key"] = keysObj.openaiKey;
          if (keysObj.openaiUrl) headers["x-openai-url"] = keysObj.openaiUrl;
          if (keysObj.customAsrUrl) headers["x-custom-asr-url"] = keysObj.customAsrUrl;
          if (keysObj.customAsrKey) headers["x-custom-asr-key"] = keysObj.customAsrKey;
          if (keysObj.customAsrModel) headers["x-custom-asr-model"] = keysObj.customAsrModel;
        } catch (e) {
          console.error("Error reading storage keys in ASR panel:", e);
        }
      }

      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        headers,
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "识别失败");
      }

      setTranscript(result.text ?? "");
      setSpeechMessage(`识别完成${result.language ? `：${result.language}` : ""}`);
    } catch (error) {
      setSpeechMessage(error instanceof Error ? error.message : "识别失败");
    } finally {
      setIsTranscribing(false);
    }
  }

  function clearAsrAudio() {
    setAsrAudio(null);
    setSpeechMessage("");
    setTranscript("");
    if (asrAudioInputRef.current) {
      asrAudioInputRef.current.value = "";
    }
  }

  return (
    <div className="mei-workspace-layout">
      {/* 左栏：上传与操作 */}
      <div className="mei-workspace-main">
        <div className="field-stack" style={{ flexShrink: 0 }}>
          <div className="mei-card-title-container">
            <h2>语音转文字</h2>
            <span className="mei-card-model-badge">{activeModelLabel}</span>
          </div>
        </div>

        {/* 上传大框 */}
        <div className="field-stack" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div className="field-header">
            <span className="field-title">音频文件</span>
            {asrAudio ? (
              <button className="mei-btn-ghost" onClick={clearAsrAudio} type="button">
                清空
              </button>
            ) : null}
          </div>
          <div className="mei-file-input-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="mei-file-input-trigger" style={{ flex: 1, height: "100%", padding: "24px", flexDirection: "column", gap: "12px", justifyContent: "center" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-primary-scale-500)" }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              {asrAudio ? (
                <span style={{ fontSize: "14px" }}>
                  已选择音频: <strong style={{ color: "var(--theme-text-primary)" }}>{asrAudio.name}</strong>
                  <br />
                  <span style={{ fontSize: "12px", color: "var(--theme-text-secondary)" }}>
                    大小: ({(asrAudio.size / 1024).toFixed(1)} KB)
                  </span>
                </span>
              ) : (
                <span style={{ fontSize: "14px" }}>
                  点击或拖拽音频文件到此处上传
                  <br />
                  <span style={{ fontSize: "11px", color: "var(--theme-text-tertiary)", marginTop: "2px", display: "block" }}>
                    支持 wav, mp3, m4a, ogg 等常用格式
                  </span>
                </span>
              )}
            </div>
            <input
              ref={asrAudioInputRef}
              type="file"
              accept="audio/*"
              onChange={(event) => setAsrAudio(event.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        {/* 底部控制 */}
        <div className="mei-panel-footer" style={{ borderTop: "1px solid var(--theme-border-default)", paddingTop: "16px", marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <button
              className="mei-btn-primary"
              disabled={isTranscribing}
              onClick={transcribeAudio}
              style={{ flexShrink: 0 }}
            >
              {isTranscribing ? "识别中..." : "识别文字"}
            </button>
            {speechMessage && (
              <div
                className={`mei-status-msg ${speechMessage.includes("失败") || speechMessage.includes("请先") ? "error" : speechMessage.includes("完成") ? "success" : "info"}`}
                style={{ margin: 0, flex: 1, padding: "6px 12px", fontSize: "13px" }}
              >
                {speechMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右栏：结果展示区和配置 */}
      <div className="mei-workspace-sidebar">
        <div className="field-stack" style={{ borderBottom: "1px solid var(--theme-border-default)", paddingBottom: "12px", flexShrink: 0 }}>
          <span className="field-title" style={{ fontSize: "14px", fontWeight: "bold" }}>识别配置与结果</span>
        </div>

        <div className="field-stack" style={{ flexShrink: 0 }}>
          <div className="field-header">
            <span className="field-title">语种</span>
            <button className="mei-btn-ghost" onClick={() => setAsrLanguage("Auto")} type="button">
              重置
            </button>
          </div>
          <select
            className="mei-select"
            value={asrLanguage}
            onChange={(event) => setAsrLanguage(event.target.value)}
          >
            {languages.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* 识别结果文本展示区 */}
        <div className="field-stack" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, marginTop: "8px" }}>
          <div className="field-header">
            <span className="field-title">识别结果</span>
            {transcript && (
              <button className="mei-btn-ghost" onClick={() => setTranscript("")} type="button">
                清空结果
              </button>
            )}
          </div>
          <div
            className="mei-codeblock"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              fontSize: "14px",
              lineHeight: "1.6",
              backgroundColor: "var(--theme-bg-surface)",
              border: "1px solid var(--theme-border-default)",
              borderRadius: "var(--border-radius-scale-md)"
            }}
          >
            {transcript ? transcript : <span style={{ color: "var(--theme-text-tertiary)", fontStyle: "italic" }}>等待上传音频并识别...</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
