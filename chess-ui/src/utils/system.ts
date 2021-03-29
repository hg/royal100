import os from "os";

export function isDevMode(): boolean {
  return process.env.NODE_ENV === "development";
}

export function numCpus(): number {
  return os.cpus().length;
}

const engineBinaries = {
  linux: "royal100",
  win32: "royal100.exe",
};

export function getAudioPath(filename: string): string {
  return `${__dirname}/../assets/sounds/${filename}`;
}

export function getEnginePath(): string {
  const binary = engineBinaries[os.platform() as keyof typeof engineBinaries];
  if (!binary) {
    throw new Error("unsupported platform " + os.platform());
  }
  return `${__dirname}/../assets/bin/engine/${binary}`;
}
