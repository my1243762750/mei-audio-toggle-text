const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL ?? "http://127.0.0.1:8001";

type PythonServiceError = {
  error?: string;
};

export async function postToPythonService<T>(pathname: string, payload: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${PYTHON_SERVICE_URL}${pathname}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    throw new Error("本地 Python 服务未启动，请先运行 python3 scripts/qwen_service.py");
  }

  const result = await response.json() as T & PythonServiceError;

  if (!response.ok) {
    throw new Error(result.error ?? "Python 服务调用失败");
  }

  return result;
}
