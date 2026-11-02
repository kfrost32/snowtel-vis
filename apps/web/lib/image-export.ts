export function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function shareImage(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type });
  try {
    if (!navigator.canShare?.({ files: [file] })) throw new DOMException("Sharing files unsupported", "NotSupportedError");
    await navigator.share({ files: [file] });
  } catch (err) {
    const name = (err as DOMException).name;
    if (name === "NotSupportedError" || name === "NotAllowedError") downloadBlob(blob, filename);
    else if (name !== "AbortError") throw err;
  }
}

export async function copyImage(blob: Blob | Promise<Blob>): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

export function canShareFiles(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.canShare === "function";
}
