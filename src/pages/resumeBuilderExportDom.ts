import DOMPurify from "dompurify";

const resumePrintSanitizeOptions = {
  SANITIZE_NAMED_PROPS: true,
} as const;

export function downloadResumeDocx(docxData: number[], candidateName: string): void {
  const blob = new Blob([new Uint8Array(docxData)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${candidateName.replace(/\s+/g, "_")}_Resume.docx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function openResumePrintDialog(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const safeHtml = DOMPurify.sanitize(html, resumePrintSanitizeOptions);
  doc.open();
  doc.write(safeHtml);
  doc.close();

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
}
