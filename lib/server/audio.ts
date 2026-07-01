import { access } from "node:fs/promises";
import { execFileAsync } from "./process";

export async function convertAudioToWav(inputPath: string, outputPath: string, sampleRate: number) {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-ac",
    "1",
    "-ar",
    String(sampleRate),
    outputPath,
  ]);
}

export async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
