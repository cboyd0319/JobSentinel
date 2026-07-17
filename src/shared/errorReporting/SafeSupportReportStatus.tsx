export type SupportReportStatus =
  | "idle"
  | "copying"
  | "copied"
  | "saving"
  | "saved"
  | "failed";

export function SafeSupportReportStatus({
  status,
  fileName,
}: {
  status: SupportReportStatus;
  fileName: string | null;
}) {
  if (status === "copied") {
    return (
      <p className="text-center text-sm text-success" role="status">
        Safe support report copied
      </p>
    );
  }

  if (status === "saved" && fileName) {
    return (
      <p className="text-center text-sm text-success" role="status">
        Safe support report saved: {fileName}
      </p>
    );
  }

  if (status === "failed") {
    return (
      <p className="text-center text-sm text-danger" role="status">
        Could not create safe support report
      </p>
    );
  }

  return null;
}
