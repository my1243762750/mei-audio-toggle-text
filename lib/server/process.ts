import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const execFileAsync = promisify(execFile);

export function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
