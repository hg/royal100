export function isDevMode(): boolean {
  return process.env.NODE_ENV === "development";
}

export function numCpus(): number {
  return navigator.hardwareConcurrency;
}

export function getAudioPath(filename: string): string {
  return getAssetPath("sounds", filename);
}

function getAssetPath(...components: string[]): string {
  return "public/" + components.join("/");
}
