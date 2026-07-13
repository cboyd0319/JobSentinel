import { sanitizeResumeHtmlDocument } from "./resumeHtmlSanitizer";
import { downloadBlob, downloadTextFile } from "../../../shared/browserDownload";

export function downloadResumeDocx(docxData: number[], candidateName: string): void {
  const blob = new Blob([new Uint8Array(docxData)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  downloadBlob(
    blob,
    `${candidateName.replace(/\s+/g, "_")}_Resume.docx`,
    "JobSentinel_Resume.docx",
  );
}

export function downloadResumeJson(jsonResumeData: unknown, candidateName: string): void {
  downloadTextFile(
    `${JSON.stringify(jsonResumeData, null, 2)}\n`,
    `${candidateName.replace(/\s+/g, "_")}_Resume.json`,
    "application/json",
    "JobSentinel_Resume.json",
  );
}

export function openResumePrintDialog(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-modals");
  iframe.setAttribute("referrerpolicy", "no-referrer");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  const safeHtml = sanitizeResumeHtmlDocument(html);

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 250);
  };

  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch {
      // Print dialog may have been triggered already.
    }
  }, 500);

  iframe.srcdoc = safeHtml;
  document.body.appendChild(iframe);
}
