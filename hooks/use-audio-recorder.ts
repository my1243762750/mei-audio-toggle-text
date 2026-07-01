"use client";

import { useEffect, useRef, useState } from "react";

type AudioRecorderOptions = {
  filePrefix: string;
};

export function useAudioRecorder({ filePrefix }: AudioRecorderOptions) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function clearAudio() {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }

    setAudioFile(null);
    setAudioUrl("");
    setMessage("");
  }

  function setSelectedAudio(file: File | null, nextMessage = "") {
    clearAudio();
    setAudioFile(file);
    setMessage(file ? nextMessage : "");
  }

  async function startRecording() {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("当前浏览器不支持录音");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      clearAudio();
      recordedChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: mimeType || recorder.mimeType || "audio/webm",
        });

        if (!blob.size) {
          setMessage("录音失败，请重试");
          mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
          return;
        }

        const extension = blob.type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `${filePrefix}-${Date.now()}.${extension}`, { type: blob.type });
        const nextAudioUrl = URL.createObjectURL(blob);

        audioUrlRef.current = nextAudioUrl;
        setAudioFile(file);
        setAudioUrl(nextAudioUrl);
        setMessage("录音完成，已作为参考音频");
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
      setMessage("录音中...");
    } catch {
      setMessage("无法获取麦克风权限");
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      return;
    }

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  return {
    audioFile,
    audioUrl,
    message,
    isRecording,
    clearAudio,
    setSelectedAudio,
    startRecording,
    stopRecording,
  };
}
