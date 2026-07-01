import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/*": ["./services/qwen-tts/venv/**/*", "./services/qwen-asr/venv/**/*"],
  },
};

export default nextConfig;
