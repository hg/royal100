import { cpus } from "os";

export function numCpus(): number {
  return cpus().length;
}
