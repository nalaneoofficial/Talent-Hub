let lastError: unknown = null;

if (typeof globalThis !== "undefined") {
  const g = globalThis as any;
  const orig = console.error.bind(console);
  if (!g.__lov_err_capture) {
    g.__lov_err_capture = true;
    console.error = (...args: unknown[]) => {
      const e = args.find((a) => a instanceof Error);
      if (e) lastError = e;
      orig(...args);
    };
  }
}

export function captureError(error: unknown) {
  lastError = error;
  console.error(error);
}

export function consumeLastCapturedError(): unknown {
  const e = lastError;
  lastError = null;
  return e;
}
