export function formatRefAudioLabel(file: File | null) {
  if (!file) {
    return "未选择参考音频";
  }

  return `当前参考音频：${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
}
