export function validateRequired(
  value: string,
  fieldName: string = "This field",
): string | undefined {
  if (!value.trim()) {
    const field =
      fieldName === "This field" ? "this detail" : fieldName.toLowerCase();
    return `Add ${field}.`;
  }
  return undefined;
}

export function validateRequiredQuestionWording(
  pattern: string,
): string | undefined {
  return pattern.trim() ? undefined : "Add question wording.";
}
