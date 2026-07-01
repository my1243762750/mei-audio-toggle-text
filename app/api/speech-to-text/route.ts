import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { postToPythonService } from "../../../lib/server/python-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const audio = formData.get("audio");
  const language = String(formData.get("language") ?? "Auto");
  const model = String(formData.get("model") ?? "qwen3-asr");

  // 1. Process third-party model APIs
  const isThirdParty = ["whisper-openai", "custom-asr"].includes(model);

  if (isThirdParty) {
    if (!(audio instanceof File) || !audio.size) {
      return Response.json({ error: "请先选择音频文件" }, { status: 400 });
    }

    const headers = request.headers;
    try {
      let key = "";
      let url = "";
      let modelId = "whisper-1";

      if (model === "whisper-openai") {
        key = headers.get("x-openai-key") || "";
        url = headers.get("x-openai-url") || "https://api.openai.com/v1";
        modelId = "whisper-1";
        if (!key) {
          return Response.json({ error: "OpenAI API Key 未配置，请先在设置中填写" }, { status: 400 });
        }
      } else {
        key = headers.get("x-custom-asr-key") || "";
        url = headers.get("x-custom-asr-url") || "";
        modelId = headers.get("x-custom-asr-model") || "whisper-1";
        if (!url) {
          return Response.json({ error: "自定义 ASR API URL 未配置，请先在设置中填写" }, { status: 400 });
        }
      }

      // Prepare multi-part form data for OpenAI Whisper API
      const apiFormData = new FormData();
      apiFormData.append("file", audio);
      apiFormData.append("model", modelId);
      if (language && language !== "Auto") {
        let langCode = "zh";
        if (language === "Chinese") langCode = "zh";
        else if (language === "English") langCode = "en";
        else if (language === "Japanese") langCode = "ja";
        else if (language === "Korean") langCode = "ko";
        apiFormData.append("language", langCode);
      }

      const fetchHeaders: Record<string, string> = {};
      if (key) {
        fetchHeaders["Authorization"] = `Bearer ${key}`;
      }

      const response = await fetch(`${url}/audio/transcriptions`, {
        method: "POST",
        headers: fetchHeaders,
        body: apiFormData,
      });

      if (!response.ok) {
        const errMsg = await response.text();
        throw new Error(`Whisper API 错误: ${errMsg}`);
      }

      const data = await response.json();
      return Response.json({
        text: data.text || "",
        language: language,
      });

    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "第三方语音识别失败" }, { status: 500 });
    }
  }

  // 2. Process local models
  if (model !== "qwen3-asr") {
    const root = process.cwd();
    const folderExists = existsSync(`${root}/services/sensevoice`);
    if (!folderExists) {
      return Response.json({ error: `本地服务未部署 ${model} 模型，请切换回 Qwen3-ASR` }, { status: 400 });
    }
  }

  if (!(audio instanceof File) || !audio.size) {
    return Response.json({ error: "请先选择音频文件" }, { status: 400 });
  }

  const outputDir = path.resolve("output");
  const ext = path.extname(audio.name) || ".wav";
  const audioPath = path.join(outputDir, `asr_${Date.now()}${ext}`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(audioPath, Buffer.from(await audio.arrayBuffer()));

  try {
    const result = await postToPythonService<{ language?: string; text?: string; error?: string }>("/asr", {
      audioPath,
      language,
    });

    if (result.error) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "识别失败" },
      { status: 500 },
    );
  }
}
