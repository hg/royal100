import { useState } from "react";

export function useWasmCheck() {
  const [supported] = useState(wasmThreadsSupported);
  return supported;
}

function wasmThreadsSupported() {
  if (typeof WebAssembly?.validate !== "function") {
    return false;
  }

  const source = Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00);
  if (!WebAssembly.validate(source)) {
    return false;
  }

  if (typeof SharedArrayBuffer !== "function") {
    return false;
  }

  if (typeof Atomics !== "object") {
    return false;
  }

  const mem = new WebAssembly.Memory({
    shared: true,
    initial: 8,
    maximum: 16,
  } as WebAssembly.MemoryDescriptor & { shared: boolean });

  if (!(mem.buffer instanceof SharedArrayBuffer)) {
    return false;
  }

  try {
    window.postMessage(mem, "*");
  } catch (e) {
    return false;
  }

  try {
    mem.grow(8);
  } catch (e) {
    return false;
  }

  return true;
}
