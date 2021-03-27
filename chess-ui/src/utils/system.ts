import os from "os";
import path from "path";

export function numCpus(): number {
  return os.cpus().length;
}

const engineBinaries = {
  linux: "royal100",
  win32: "royal100.exe",
};

export function getEnginePath() {
  const binary = engineBinaries[os.platform() as keyof typeof engineBinaries];
  if (!binary) {
    throw new Error("unsupported platform " + os.platform());
  }
  return path.join(__dirname, "../assets/bin/engine/" + binary);
}
