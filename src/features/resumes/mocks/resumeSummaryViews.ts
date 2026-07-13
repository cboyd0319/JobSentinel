import type {
  MockResumeData,
  MockResumeSummary,
  MockResumeTextPreview,
} from "../../../mocks/handlers/types";

const MAX_MOCK_RESUME_TEXT_PREVIEW_CHARS = 6000;

export function toMockResumeSummary(resume: MockResumeData): MockResumeSummary {
  const readableText = (resume.parsed_text ?? "").trim();
  return {
    id: resume.id,
    name: resume.name,
    is_active: resume.is_active,
    created_at: resume.created_at,
    updated_at: resume.updated_at,
    format_label: getMockResumeFormatLabel(resume),
    has_readable_text: readableText.length > 0,
    readable_text_chars: Array.from(readableText).length,
  };
}

export function toMockResumeTextPreview(resume: MockResumeData): MockResumeTextPreview {
  const readableText = (resume.parsed_text ?? "").trim();
  const textPreview = Array.from(readableText)
    .slice(0, MAX_MOCK_RESUME_TEXT_PREVIEW_CHARS)
    .join("");

  return {
    resume_id: resume.id,
    name: resume.name,
    has_text: readableText.length > 0,
    text_preview: textPreview,
    text_chars: Array.from(readableText).length,
    is_truncated: Array.from(readableText).length > Array.from(textPreview).length,
  };
}

function getMockResumeFormatLabel(resume: MockResumeData): string {
  const source = resume.file_path || resume.name;
  const extension = source.split(".").pop()?.toLowerCase() ?? "";

  switch (extension) {
    case "pdf":
      return "PDF";
    case "docx":
      return "DOCX";
    case "txt":
      return "Plain text";
    case "md":
    case "markdown":
      return "Markdown";
    default:
      return "Resume file";
  }
}
