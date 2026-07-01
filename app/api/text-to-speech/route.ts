import { mkdir, readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { existsSync } from "node:fs";
import { convertAudioToWav, fileExists, sanitizeFilename } from "../../../lib/server/audio";
import { postToPythonService } from "../../../lib/server/python-service";

export const runtime = "nodejs";

const speakers = new Set([
  "Serena",
  "Vivian",
  "Uncle_Fu",
  "Dylan",
  "Eric",
  "Ryan",
  "Aiden",
  "Ono_Anna",
  "Sohee",
]);

const languages = new Set([
  "Auto",
  "Chinese",
  "English",
  "Japanese",
  "Korean",
  "German",
  "French",
  "Russian",
  "Portuguese",
  "Spanish",
  "Italian",
]);

async function fileMatches(filePath: string, content: Buffer) {
  try {
    const existing = await readFile(filePath);
    return existing.equals(content);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const model = String(formData.get("model") ?? "qwen3-tts");
  const mode = String(formData.get("mode") ?? "custom_voice");
  const text = String(formData.get("text") ?? "").trim();
  const speaker = String(formData.get("speaker") ?? "Serena");

  // 1. Process third-party model APIs
  const isThirdParty = ["openai-tts", "elevenlabs-tts", "minimax-tts", "custom-tts"].includes(model);

  if (isThirdParty) {
    const headers = request.headers;
    try {
      if (!text) {
        return Response.json({ error: "请输入文字" }, { status: 400 });
      }

      if (model === "openai-tts") {
        const openaiKey = headers.get("x-openai-key");
        const openaiUrl = headers.get("x-openai-url") || "https://api.openai.com/v1";
        if (!openaiKey) {
          return Response.json({ error: "OpenAI API Key 未配置，请先在设置中填写" }, { status: 400 });
        }
        
        let voice = "alloy";
        if (speaker === "Serena") voice = "alloy";
        else if (speaker === "Vivian") voice = "shimmer";
        else if (speaker === "Uncle_Fu") voice = "onyx";
        else if (speaker === "Dylan") voice = "echo";
        else if (speaker === "Eric") voice = "fable";
        else if (speaker === "Ryan") voice = "nova";

        const response = await fetch(`${openaiUrl}/audio/speech`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "tts-1",
            input: text,
            voice: voice,
          }),
        });

        if (!response.ok) {
          const errMsg = await response.text();
          throw new Error(`OpenAI API 错误: ${errMsg}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        return new Response(buffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": 'inline; filename="speech.mp3"',
          },
        });
      }

      if (model === "elevenlabs-tts") {
        const elevenlabsKey = headers.get("x-elevenlabs-key");
        const voiceId = headers.get("x-elevenlabs-voice") || "21m00Tcm4TlvDq8ikWAM";
        if (!elevenlabsKey) {
          return Response.json({ error: "ElevenLabs API Key 未配置，请先在设置中填写" }, { status: 400 });
        }

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: {
            "xi-api-key": elevenlabsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_monolingual_v1",
          }),
        });

        if (!response.ok) {
          const errMsg = await response.text();
          throw new Error(`ElevenLabs API 错误: ${errMsg}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        return new Response(buffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": 'inline; filename="speech.mp3"',
          },
        });
      }

      if (model === "minimax-tts") {
        const minimaxKey = headers.get("x-minimax-key");
        const groupId = headers.get("x-minimax-group");
        if (!minimaxKey || !groupId) {
          return Response.json({ error: "MiniMax API Key 或 Group ID 未配置，请先在设置中填写" }, { status: 400 });
        }

        const response = await fetch(`https://api.minimax.chat/v1/text_to_speech?GroupId=${groupId}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${minimaxKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voice_setting: {
              voice_id: "male-qn-neutral",
            },
            text: text,
            model: "speech-01",
          }),
        });

        if (!response.ok) {
          const errMsg = await response.text();
          throw new Error(`MiniMax API 错误: ${errMsg}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        return new Response(buffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": 'inline; filename="speech.mp3"',
          },
        });
      }

      if (model === "custom-tts") {
        const customUrl = headers.get("x-custom-tts-url");
        const customKey = headers.get("x-custom-tts-key");
        const customModel = headers.get("x-custom-tts-model") || "tts-1";
        if (!customUrl) {
          return Response.json({ error: "自定义 API URL 未配置，请先在设置中填写" }, { status: 400 });
        }

        const fetchHeaders: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (customKey) {
          fetchHeaders["Authorization"] = `Bearer ${customKey}`;
        }

        const response = await fetch(`${customUrl}/audio/speech`, {
          method: "POST",
          headers: fetchHeaders,
          body: JSON.stringify({
            model: customModel,
            input: text,
            voice: "alloy",
          }),
        });

        if (!response.ok) {
          const errMsg = await response.text();
          throw new Error(`自定义 API 错误: ${errMsg}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        return new Response(buffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": 'inline; filename="speech.mp3"',
          },
        });
      }

    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "第三方语音生成失败" }, { status: 500 });
    }
  }

  // 2. Process local models
  if (model !== "qwen3-tts") {
    let folderExists = false;
    const root = process.cwd();
    if (model === "cosyvoice") {
      folderExists = existsSync(root + "/services/cosyvoice");
    } else if (model === "gpt-sovits") {
      folderExists = existsSync(root + "/services/gpt-sovits");
    }
    
    if (!folderExists) {
      return Response.json({ error: `本地服务未部署 ${model} 模型，请切换回 Qwen3-TTS` }, { status: 400 });
    }
  }
  const language = String(formData.get("language") ?? "Chinese");
  const instruct = String(formData.get("instruct") ?? "").trim();
  const refText = String(formData.get("refText") ?? "").trim();

  if (!text) {
    return Response.json({ error: "请输入文字" }, { status: 400 });
  }

  if (!["custom_voice", "voice_design", "base_clone"].includes(mode)) {
    return Response.json({ error: "模式不合法" }, { status: 400 });
  }

  if (!languages.has(language) || (mode === "custom_voice" && !speakers.has(speaker))) {
    return Response.json({ error: "参数不合法" }, { status: 400 });
  }

  const outputDir = path.resolve("output");

  await mkdir(outputDir, { recursive: true });
  let serviceRefAudioPath = "";

  if (mode === "base_clone") {
    const refAudio = formData.get("refAudio");

    if (!(refAudio instanceof File) || !refAudio.size || !refText) {
      return Response.json({ error: "Base 声音克隆需要参考音频和对应文本" }, { status: 400 });
    }

    const bytes = Buffer.from(await refAudio.arrayBuffer());
    const ext = path.extname(refAudio.name) || ".wav";
    const fileHash = crypto.createHash("sha1").update(bytes).digest("hex").slice(0, 12);
    const originalName = sanitizeFilename(path.basename(refAudio.name, ext)) || `ref_${fileHash}`;
    const preferredOriginalRefPath = path.join(outputDir, `${originalName}${ext}`);
    const preferredRefPath = path.join(outputDir, `${originalName}.wav`);
    const usePreferredName = await fileMatches(preferredOriginalRefPath, bytes);
    const originalRefPath = usePreferredName
      ? preferredOriginalRefPath
      : path.join(outputDir, `ref_${fileHash}${ext}`);
    const refPath = usePreferredName
      ? preferredRefPath
      : path.join(outputDir, `ref_${fileHash}.wav`);

    if (!(await fileExists(originalRefPath))) {
      await writeFile(originalRefPath, bytes);
    }

    if (ext.toLowerCase() === ".wav") {
      serviceRefAudioPath = originalRefPath;
    } else {
      try {
        if (!(await fileExists(refPath))) {
          await convertAudioToWav(originalRefPath, refPath, 24000);
        }
      } catch {
        return Response.json({ error: "参考音频格式不支持，请上传 wav/mp3/m4a，或重新录音" }, { status: 400 });
      }

      serviceRefAudioPath = refPath;
    }
  }

  try {
    const result = await postToPythonService<{ filePath: string }>("/tts", {
      mode,
      text,
      speaker,
      language,
      instruct,
      outputDir,
      refAudio: serviceRefAudioPath,
      refText,
    });
    const filePath = result.filePath;

    if (!filePath) {
      return Response.json({ error: "生成失败：没有找到音频文件" }, { status: 500 });
    }

    const audio = await readFile(filePath);

    return new Response(audio, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    const unsupportedFormat = /unsupported file format/i.test(message);

    return Response.json(
      { error: unsupportedFormat ? "参考音频格式不支持，请改用 wav/mp3/m4a，或重新录音后再试" : message },
      { status: 500 },
    );
  }
}
