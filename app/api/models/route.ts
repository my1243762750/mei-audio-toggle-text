import { statSync } from "node:fs";

export const runtime = "nodejs";

function checkDirectoryExists(dirPath: string): boolean {
  try {
    const s = statSync(dirPath);
    return s.isDirectory();
  } catch {
    return false;
  }
}

export async function GET() {
  const root = process.cwd();
  
  const hasQwenTts = checkDirectoryExists(`${root}/services/qwen-tts`);
  const hasQwenAsr = checkDirectoryExists(`${root}/services/qwen-asr`);
  const hasCosyVoice = checkDirectoryExists(`${root}/services/cosyvoice`);
  const hasGptSovits = checkDirectoryExists(`${root}/services/gpt-sovits`);
  const hasSenseVoice = checkDirectoryExists(`${root}/services/sensevoice`);

  const hasOpenAiKey = !!process.env.OPENAI_API_KEY;

  return Response.json({
    "qwen3-tts": hasQwenTts ? "active" : "undeployed",
    "cosyvoice": hasCosyVoice ? "active" : "undeployed",
    "gpt-sovits": hasGptSovits ? "active" : "undeployed",
    "qwen3-asr": hasQwenAsr ? "active" : "undeployed",
    "sensevoice": hasSenseVoice ? "active" : "undeployed",
    "whisper": hasOpenAiKey ? "active" : "unconfigured",
  });
}
