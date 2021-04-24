import { Modal } from "antd";
import { Fragment, useEffect, useState } from "react";

const links = {
  firefox: (
    <a target="_blank" rel="noreferrer" href="https://firefox.com/">
      Firefox 79+
    </a>
  ),
  chrome: (
    <a target="_blank" rel="noreferrer" href="https://google.com/chrome/">
      Chrome 79+
    </a>
  ),
};

export function useWasmCheck() {
  const [supported] = useState(wasmThreadsSupported);

  useEffect(() => {
    if (!supported) {
      Modal.error({
        title: "Внимание",
        content: (
          <Fragment>
            <p>Ваш браузер не поддерживается.</p>
            <p>
              Перейдите на {links.firefox} или {links.chrome}.
            </p>
          </Fragment>
        ),
      });
    }
  }, [supported]);

  return supported;
}

export function wasmThreadsSupported() {
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
