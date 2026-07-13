export function sanitizeDownloadFilename(
  filename: string,
  fallback: string = "jobsentinel-download",
): string {
  const basename = filename
    .split(/[\\/]+/)
    .filter(Boolean)
    .pop()
    ?.trim();
  const withoutControlCharacters = Array.from(basename ?? "")
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");
  const sanitized = withoutControlCharacters
    .replace(/[<>:"|?*]/g, "-")
    .replace(/^\.+/, "")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized || fallback;
}

export function downloadBlob(
  blob: Blob,
  filename: string,
  fallbackFilename?: string,
): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = sanitizeDownloadFilename(filename, fallbackFilename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string,
  fallbackFilename?: string,
): void {
  downloadBlob(
    new Blob([content], { type: mimeType }),
    filename,
    fallbackFilename,
  );
}
