#!/bin/bash

# 确保在脚本出错时及时退出
set -e

# 获取脚本所在根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "========================================="
echo "   Audio Toggle Text 一键安装启动脚本"
echo "========================================="

# 后台进程 PID 记录
PYTHON_PID=""

# 清理函数，在退出时终止后台 Python 服务
cleanup() {
  echo ""
  if [ -n "$PYTHON_PID" ]; then
    echo "[-] 正在停止后台 Python 转发服务 (PID: $PYTHON_PID)..."
    kill "$PYTHON_PID" 2>/dev/null || true
  fi
  echo "[+] 退出完成。"
}

# 绑定退出信号
trap cleanup EXIT SIGINT SIGTERM

# 1. 检查并安装 Node 依赖
if [ ! -d "node_modules" ]; then
  echo "[*] 未检测到 node_modules，开始安装 Node 依赖..."
  npm install
  echo "[+] Node 依赖安装成功。"
else
  echo "[+] Node 依赖已存在，跳过安装。"
fi

# 2. 检查并安装 Python TTS 虚拟环境依赖
TTS_VENV="services/qwen-tts/venv"
if [ ! -d "$TTS_VENV" ] || [ ! -f "$TTS_VENV/.setup_complete" ]; then
  echo "[*] 开始配置 Qwen TTS 虚拟环境..."
  python3 -m venv "$TTS_VENV"
  "$TTS_VENV/bin/pip" install --upgrade pip
  "$TTS_VENV/bin/pip" install -r services/qwen-tts/scripts/requirements.txt
  touch "$TTS_VENV/.setup_complete"
  echo "[+] Qwen TTS 虚拟环境配置成功。"
else
  echo "[+] Qwen TTS 虚拟环境已存在，跳过安装。"
fi

# 3. 检查并安装 Python ASR 虚拟环境依赖
ASR_VENV="services/qwen-asr/venv"
if [ ! -d "$ASR_VENV" ] || [ ! -f "$ASR_VENV/.setup_complete" ]; then
  echo "[*] 开始配置 Qwen ASR 虚拟环境..."
  python3 -m venv "$ASR_VENV"
  "$ASR_VENV/bin/pip" install --upgrade pip
  "$ASR_VENV/bin/pip" install -r services/qwen-asr/service/requirements.txt
  touch "$ASR_VENV/.setup_complete"
  echo "[+] Qwen ASR 虚拟环境配置成功。"
else
  echo "[+] Qwen ASR 虚拟环境已存在，跳过安装。"
fi

# 4. 启动 Python 转发服务 (后台运行)
echo "[*] 正在启动本地 Python 转发服务..."
python3 -B scripts/qwen_service.py &
PYTHON_PID=$!

# 稍微等待确保 Python 服务启动
sleep 2

# 检查 Python 服务是否依然在运行
if ! kill -0 "$PYTHON_PID" 2>/dev/null; then
  echo "[!] 警告：Python 转发服务启动失败，请检查 scripts/qwen_service.py 的运行日志。"
  exit 1
fi
echo "[+] Python 转发服务已在后台运行 (PID: $PYTHON_PID)。"

# 5. 启动 Next.js 前端开发服务 (前台运行，以便接收 Ctrl+C 信号)
echo "[*] 正在启动 Next.js 页面服务..."
echo "-----------------------------------------"
npm run dev
