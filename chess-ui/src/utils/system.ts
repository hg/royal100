import os from "os";
import path from "path";

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
  return getAssetPath("sounds", filename);
}

export function getEnginePath(): string {
  const binary = engineBinaries[os.platform() as keyof typeof engineBinaries];
  if (!binary) {
    throw new Error("unsupported platform " + os.platform());
  }
  return getAssetPath("bin", "engine", binary);
}

function getAssetPath(...components: string[]): string {
  if (isDevMode()) {
    return path.join(__dirname, "..", "assets", ...components);
  } else {
    const resources = process.resourcesPath;
    return path.join(resources, "assets", ...components);
  }
}
