"use client";

import { useEffect, useState } from "react";
import { AsrPanel } from "../components/asr-panel";
import { QwenTtsPanel } from "../components/qwen-tts-panel";

// Supported TTS Models Metadata
const ttsModelsList = [
  { value: "qwen3-tts", title: "Qwen3-TTS (1.7B)", desc: "阿里开源，1.7B 本地生成模型", type: "local" },
  { value: "cosyvoice", title: "CosyVoice (300M)", desc: "阿里开源，高表现力语音合成与克隆", type: "local" },
  { value: "gpt-sovits", title: "GPT-SoVITS", desc: "开源少样本声音克隆与合成系统", type: "local" },
  { value: "openai-tts", title: "OpenAI TTS", desc: "OpenAI 接口，高保真商业合成服务", type: "online" },
  { value: "elevenlabs-tts", title: "ElevenLabs TTS", desc: "ElevenLabs 接口，顶尖情绪拟真合成", type: "online" },
  { value: "minimax-tts", title: "MiniMax TTS", desc: "火山引擎接口，自然对话合成服务", type: "online" },
  { value: "custom-tts", title: "Custom TTS", desc: "自定义 OpenAI 兼容格式音频合成", type: "online" },
];

// Supported ASR Models Metadata
const asrModelsList = [
  { value: "qwen3-asr", title: "Qwen3-ASR (1.7B)", desc: "阿里开源，本地多语种识别模型", type: "local" },
  { value: "sensevoice", title: "SenseVoice-Small", desc: "阿里开源，极速多语种与声音事件识别", type: "local" },
  { value: "whisper-openai", title: "OpenAI Whisper", desc: "OpenAI 接口，通用高精度语音识别", type: "online" },
  { value: "custom-asr", title: "Custom ASR", desc: "自定义 OpenAI 兼容格式语音识别", type: "online" },
];

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ttsModel, setTtsModel] = useState("qwen3-tts");
  const [asrModel, setAsrModel] = useState("qwen3-asr");
  const [showSelector, setShowSelector] = useState(false);
  const [activeModule, setActiveModule] = useState<"tts" | "asr">("tts");
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  // Settings Dialog Visibility & Tab Status
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"openai" | "elevenlabs" | "minimax" | "custom">("openai");

  // Local Storage Settings API Key Inputs
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiUrl, setOpenaiUrl] = useState("");
  const [elevenlabsKey, setElevenlabsKey] = useState("");
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState("");
  const [minimaxKey, setMinimaxKey] = useState("");
  const [minimaxGroupId, setMinimaxGroupId] = useState("");
  const [customTtsUrl, setCustomTtsUrl] = useState("");
  const [customTtsKey, setCustomTtsKey] = useState("");
  const [customTtsModel, setCustomTtsModel] = useState("");
  const [customAsrUrl, setCustomAsrUrl] = useState("");
  const [customAsrKey, setCustomAsrKey] = useState("");
  const [customAsrModel, setCustomAsrModel] = useState("");

  // Dynamic model deployment statuses detected from backend + local API Key check
  const [modelStatuses, setModelStatuses] = useState<Record<string, string>>({
    "qwen3-tts": "active",
    "cosyvoice": "undeployed",
    "gpt-sovits": "undeployed",
    "qwen3-asr": "active",
    "sensevoice": "undeployed",
    "whisper-openai": "unconfigured",
    "openai-tts": "unconfigured",
    "elevenlabs-tts": "unconfigured",
    "minimax-tts": "unconfigured",
    "custom-tts": "unconfigured",
    "custom-asr": "unconfigured",
  });

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");

    // Load API Keys from localStorage
    const savedKeys = localStorage.getItem("mei-audio-keys");
    let keysObj: Record<string, string> = {};
    if (savedKeys) {
      try {
        keysObj = JSON.parse(savedKeys);
        setOpenaiKey(keysObj.openaiKey || "");
        setOpenaiUrl(keysObj.openaiUrl || "");
        setElevenlabsKey(keysObj.elevenlabsKey || "");
        setElevenlabsVoiceId(keysObj.elevenlabsVoiceId || "");
        setMinimaxKey(keysObj.minimaxKey || "");
        setMinimaxGroupId(keysObj.minimaxGroupId || "");
        setCustomTtsUrl(keysObj.customTtsUrl || "");
        setCustomTtsKey(keysObj.customTtsKey || "");
        setCustomTtsModel(keysObj.customTtsModel || "");
        setCustomAsrUrl(keysObj.customAsrUrl || "");
        setCustomAsrKey(keysObj.customAsrKey || "");
        setCustomAsrModel(keysObj.customAsrModel || "");
      } catch (e) {
        console.error("Error reading localStorage keys:", e);
      }
    }

    // Query backend to detect local models
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === "object") {
          // Merge local directory scan with client key status
          const hasOpenai = !!keysObj.openaiKey;
          const hasElevenlabs = !!keysObj.elevenlabsKey;
          const hasMinimax = !!(keysObj.minimaxKey && keysObj.minimaxGroupId);
          const hasCustomTts = !!keysObj.customTtsUrl;
          const hasCustomAsr = !!keysObj.customAsrUrl;

          setModelStatuses({
            ...data,
            "openai-tts": hasOpenai ? "active" : "unconfigured",
            "elevenlabs-tts": hasElevenlabs ? "active" : "unconfigured",
            "minimax-tts": hasMinimax ? "active" : "unconfigured",
            "custom-tts": hasCustomTts ? "active" : "unconfigured",
            "whisper-openai": hasOpenai ? "active" : "unconfigured",
            "custom-asr": hasCustomAsr ? "active" : "unconfigured",
          });
        }
      })
      .catch((err) => console.error("Error detecting local model directories:", err));
  }, []);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const selectTtsModel = (val: string) => {
    const selected = ttsModelsList.find((m) => m.value === val);
    if (!selected) return;

    const status = modelStatuses[val] || "undeployed";
    if (status === "undeployed") {
      triggerToast(`⚠️ ${selected.title} 本地未部署，请先在 services 文件夹下配置`);
      return;
    }

    if (status === "unconfigured") {
      // Direct user to configure the model in modal
      if (val === "openai-tts") setActiveTab("openai");
      else if (val === "elevenlabs-tts") setActiveTab("elevenlabs");
      else if (val === "minimax-tts") setActiveTab("minimax");
      else if (val === "custom-tts") setActiveTab("custom");
      
      setShowSettings(true);
      triggerToast(`请先配置 ${selected.title} 的 API Key`);
      return;
    }

    setTtsModel(val);
    triggerToast(`已切换合成(TTS)模型为: ${selected.title}`);
  };

  const selectAsrModel = (val: string) => {
    const selected = asrModelsList.find((m) => m.value === val);
    if (!selected) return;

    const status = modelStatuses[val] || "undeployed";
    if (status === "undeployed") {
      triggerToast(`⚠️ ${selected.title} 本地未部署，请先在 services 文件夹下配置`);
      return;
    }

    if (status === "unconfigured") {
      if (val === "whisper-openai") setActiveTab("openai");
      else if (val === "custom-asr") setActiveTab("custom");

      setShowSettings(true);
      triggerToast(`请先配置 ${selected.title} 的 API Key`);
      return;
    }

    setAsrModel(val);
    triggerToast(`已切换识别(ASR)模型为: ${selected.title}`);
  };

  const saveSettings = () => {
    const keysObj = {
      openaiKey,
      openaiUrl,
      elevenlabsKey,
      elevenlabsVoiceId,
      minimaxKey,
      minimaxGroupId,
      customTtsUrl,
      customTtsKey,
      customTtsModel,
      customAsrUrl,
      customAsrKey,
      customAsrModel,
    };
    localStorage.setItem("mei-audio-keys", JSON.stringify(keysObj));

    // Update statuses immediately in memory
    setModelStatuses((prev) => ({
      ...prev,
      "openai-tts": openaiKey ? "active" : "unconfigured",
      "elevenlabs-tts": elevenlabsKey ? "active" : "unconfigured",
      "minimax-tts": (minimaxKey && minimaxGroupId) ? "active" : "unconfigured",
      "custom-tts": customTtsUrl ? "active" : "unconfigured",
      "whisper-openai": openaiKey ? "active" : "unconfigured",
      "custom-asr": customAsrUrl ? "active" : "unconfigured",
    }));

    // If current model is active, we don't change. If activeModel was unconfigured and now is configured, select it.
    setShowSettings(false);
    triggerToast("✅ API 配置保存成功");
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  // Filter lists: local models are only visible if deployed/active, online models are always visible
  const visibleTtsModels = ttsModelsList.filter((item) => {
    const status = modelStatuses[item.value] || "undeployed";
    if (item.type === "local") {
      return status === "active";
    }
    return true;
  });

  const visibleAsrModels = asrModelsList.filter((item) => {
    const status = modelStatuses[item.value] || "undeployed";
    if (item.type === "local") {
      return status === "active";
    }
    return true;
  });

  const currentTtsInfo = ttsModelsList.find((m) => m.value === ttsModel);
  const currentAsrInfo = asrModelsList.find((m) => m.value === asrModel);

  return (
    <>
      {/* Toast Notification */}
      <div className={`mei-toast ${showToast ? "show" : ""}`}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>{toastMessage}</span>
      </div>

      <header className="mei-navbar">
        <div className="mei-navbar-inner">
          <a href="#" className="mei-brand-link">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="32" height="32" rx="10" fill="url(#logo-grad)" />
              <path
                d="M9 16H11V16H9Z"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M13 12V20"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M17 8V24"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M21 13V19"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M25 16H27V16H25Z"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  id="logo-grad"
                  x1="0"
                  y1="0"
                  x2="32"
                  y2="32"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#6C5CE7" />
                  <stop offset="1" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>
            <span>Mei Audio</span>
          </a>

          <div className="mei-tab-switcher">
            <button
              className={`mei-tab-switch-btn ${activeModule === "tts" ? "active" : ""}`}
              onClick={() => setActiveModule("tts")}
              type="button"
            >
              文字转语音 (TTS)
            </button>
            <button
              className={`mei-tab-switch-btn ${activeModule === "asr" ? "active" : ""}`}
              onClick={() => setActiveModule("asr")}
              type="button"
            >
              语音转文字 (ASR)
            </button>
          </div>

          <div className="navbar-actions">
            {/* Dynamic Model Selector dropdown */}
            <div className="model-select-container">
              <button
                className="model-select-trigger-btn"
                onClick={() => setShowSelector(!showSelector)}
                type="button"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="2" y1="14" x2="6" y2="14" />
                  <line x1="10" y1="8" x2="14" y2="8" />
                  <line x1="18" y1="16" x2="22" y2="16" />
                </svg>
                <span>模型设置</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: showSelector ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform var(--motion-duration-fast)",
                  }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {showSelector && (
                <>
                  <div
                    className="mei-dropdown-backdrop"
                    onClick={() => setShowSelector(false)}
                  />
                  <div className="mei-dropdown-menu">
                    <div className="mei-dropdown-section">
                      <span className="mei-dropdown-section-title">语音合成 (TTS) 模型</span>
                      {visibleTtsModels.map((item) => {
                        const status = modelStatuses[item.value] || "undeployed";
                        return (
                          <button
                            key={item.value}
                            className={`mei-dropdown-item ${ttsModel === item.value ? "active" : ""}`}
                            onClick={() => {
                              selectTtsModel(item.value);
                              setShowSelector(false);
                            }}
                            type="button"
                          >
                            <div className="mei-dropdown-item-meta" style={{ gap: "4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <span className="mei-dropdown-item-title">{item.title}</span>
                                <span className={`mei-model-badge ${item.type}`}>
                                  {item.type === "local" ? "本地" : "第三方"}
                                </span>
                                <span className={`mei-model-badge ${status}`}>
                                  {status === "active" ? "已启用" : "未配置"}
                                </span>
                              </div>
                              <span className="mei-dropdown-item-desc">{item.desc}</span>
                            </div>
                            {ttsModel === item.value && (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <hr
                      style={{
                        margin: 0,
                        border: "none",
                        borderTop: "1px solid var(--theme-border-default)",
                      }}
                    />

                    <div className="mei-dropdown-section">
                      <span className="mei-dropdown-section-title">语音识别 (ASR) 模型</span>
                      {visibleAsrModels.map((item) => {
                        const status = modelStatuses[item.value] || "undeployed";
                        return (
                          <button
                            key={item.value}
                            className={`mei-dropdown-item ${asrModel === item.value ? "active" : ""}`}
                            onClick={() => {
                              selectAsrModel(item.value);
                              setShowSelector(false);
                            }}
                            type="button"
                          >
                            <div className="mei-dropdown-item-meta" style={{ gap: "4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <span className="mei-dropdown-item-title">{item.title}</span>
                                <span className={`mei-model-badge ${item.type}`}>
                                  {item.type === "local" ? "本地" : "第三方"}
                                </span>
                                <span className={`mei-model-badge ${status}`}>
                                  {status === "active" ? "已启用" : "未配置"}
                                </span>
                              </div>
                              <span className="mei-dropdown-item-desc">{item.desc}</span>
                            </div>
                            {asrModel === item.value && (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              className="theme-toggle-btn"
              onClick={() => setShowSettings(true)}
              aria-label="Open API settings"
              type="button"
              style={{ marginRight: "6px" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>

            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              type="button"
            >
              {theme === "light" ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="9" x2="4" y2="9"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="page-container">
        {activeModule === "tts" ? (
          <QwenTtsPanel activeModel={ttsModel} activeModelLabel={currentTtsInfo?.title || ""} />
        ) : (
          <AsrPanel activeModel={asrModel} activeModelLabel={currentAsrInfo?.title || ""} />
        )}
      </main>

      {/* API Configuration Settings Dialog */}
      {showSettings && (
        <div className="mei-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="mei-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="mei-dialog-header">
              <h3>API 密钥与自定义配置</h3>
              <button className="mei-dialog-close" onClick={() => setShowSettings(false)} type="button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="mei-dialog-body">
              <div className="settings-tab-bar">
                <button
                  className={`settings-tab-btn ${activeTab === "openai" ? "active" : ""}`}
                  onClick={() => setActiveTab("openai")}
                  type="button"
                >
                  OpenAI
                </button>
                <button
                  className={`settings-tab-btn ${activeTab === "elevenlabs" ? "active" : ""}`}
                  onClick={() => setActiveTab("elevenlabs")}
                  type="button"
                >
                  ElevenLabs
                </button>
                <button
                  className={`settings-tab-btn ${activeTab === "minimax" ? "active" : ""}`}
                  onClick={() => setActiveTab("minimax")}
                  type="button"
                >
                  MiniMax
                </button>
                <button
                  className={`settings-tab-btn ${activeTab === "custom" ? "active" : ""}`}
                  onClick={() => setActiveTab("custom")}
                  type="button"
                >
                  自定义/代理
                </button>
              </div>

              {activeTab === "openai" && (
                <div className="settings-grid">
                  <div className="mei-form-group">
                    <label className="mei-label">OpenAI API Key</label>
                    <input
                      type="password"
                      className="mei-input"
                      placeholder="sk-..."
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                    />
                  </div>
                  <div className="mei-form-group">
                    <label className="mei-label">自定义 API 接口域名 (API Base URL)</label>
                    <input
                      type="text"
                      className="mei-input"
                      placeholder="https://api.openai.com/v1 (可选，用于中转或代理)"
                      value={openaiUrl}
                      onChange={(e) => setOpenaiUrl(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {activeTab === "elevenlabs" && (
                <div className="settings-grid">
                  <div className="mei-form-group">
                    <label className="mei-label">ElevenLabs API Key</label>
                    <input
                      type="password"
                      className="mei-input"
                      placeholder="输入 ElevenLabs API Key"
                      value={elevenlabsKey}
                      onChange={(e) => setElevenlabsKey(e.target.value)}
                    />
                  </div>
                  <div className="mei-form-group">
                    <label className="mei-label">自定义声音 ID (Voice ID)</label>
                    <input
                      type="text"
                      className="mei-input"
                      placeholder="21m00Tcm4TlvDq8ikWAM (可选)"
                      value={elevenlabsVoiceId}
                      onChange={(e) => setElevenlabsVoiceId(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {activeTab === "minimax" && (
                <div className="settings-grid">
                  <div className="mei-form-group">
                    <label className="mei-label">MiniMax API Key</label>
                    <input
                      type="password"
                      className="mei-input"
                      placeholder="输入 MiniMax API Key"
                      value={minimaxKey}
                      onChange={(e) => setMinimaxKey(e.target.value)}
                    />
                  </div>
                  <div className="mei-form-group">
                    <label className="mei-label">企业组 ID (Group ID)</label>
                    <input
                      type="text"
                      className="mei-input"
                      placeholder="输入 MiniMax Group ID"
                      value={minimaxGroupId}
                      onChange={(e) => setMinimaxGroupId(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {activeTab === "custom" && (
                <div className="settings-grid">
                  <h4 style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--theme-text-primary)", fontWeight: "bold" }}>语音合成 (TTS) 自定义</h4>
                  <div className="mei-form-group">
                    <label className="mei-label">自定义 TTS API Endpoint</label>
                    <input
                      type="text"
                      className="mei-input"
                      placeholder="http://127.0.0.1:5000/v1 (支持 /audio/speech 接口)"
                      value={customTtsUrl}
                      onChange={(e) => setCustomTtsUrl(e.target.value)}
                    />
                  </div>
                  <div className="mei-form-group">
                    <label className="mei-label">自定义 TTS Bearer Key (可选)</label>
                    <input
                      type="password"
                      className="mei-input"
                      placeholder="自定义 API Key"
                      value={customTtsKey}
                      onChange={(e) => setCustomTtsKey(e.target.value)}
                    />
                  </div>
                  <div className="mei-form-group">
                    <label className="mei-label">自定义 TTS 模型名称 (Model Name)</label>
                    <input
                      type="text"
                      className="mei-input"
                      placeholder="tts-1 (可选)"
                      value={customTtsModel}
                      onChange={(e) => setCustomTtsModel(e.target.value)}
                    />
                  </div>

                  <hr style={{ margin: "20px 0 16px", border: "none", borderTop: "1px solid var(--theme-border-default)" }} />

                  <h4 style={{ margin: "0", fontSize: "14px", color: "var(--theme-text-primary)", fontWeight: "bold" }}>语音识别 (ASR) 自定义</h4>
                  <div className="mei-form-group">
                    <label className="mei-label">自定义 ASR API Endpoint</label>
                    <input
                      type="text"
                      className="mei-input"
                      placeholder="http://127.0.0.1:5000/v1 (支持 /audio/transcriptions 接口)"
                      value={customAsrUrl}
                      onChange={(e) => setCustomAsrUrl(e.target.value)}
                    />
                  </div>
                  <div className="mei-form-group">
                    <label className="mei-label">自定义 ASR Bearer Key (可选)</label>
                    <input
                      type="password"
                      className="mei-input"
                      placeholder="自定义 API Key"
                      value={customAsrKey}
                      onChange={(e) => setCustomAsrKey(e.target.value)}
                    />
                  </div>
                  <div className="mei-form-group">
                    <label className="mei-label">自定义 ASR 模型名称 (Model Name)</label>
                    <input
                      type="text"
                      className="mei-input"
                      placeholder="whisper-1 (可选)"
                      value={customAsrModel}
                      onChange={(e) => setCustomAsrModel(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mei-dialog-footer">
              <button className="mei-btn-secondary" onClick={() => setShowSettings(false)} type="button">
                取消
              </button>
              <button className="mei-btn-primary" onClick={saveSettings} type="button">
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
