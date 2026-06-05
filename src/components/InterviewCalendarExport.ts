export interface InterviewCalendarData {
  id: number;
  interview_type: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  interviewer_name: string | null;
  interviewer_title: string | null;
  notes: string | null;
  job_title: string;
  company: string;
}

export function generateInterviewICalEvent(
  interview: InterviewCalendarData,
  interviewTypeLabel: string,
): string {
  const start = new Date(interview.scheduled_at);
  const end = new Date(start.getTime() + interview.duration_minutes * 60 * 1000);

  const formatICalDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };

  const escapeICalText = (text: string): string => {
    return text.replace(/[\\;,\n]/g, (match) => {
      if (match === "\n") return "\\n";
      return `\\${match}`;
    });
  };

  const uid = `interview-${interview.id}@jobsentinel`;
  const summary = escapeICalText(
    `${interview.interview_type} Interview - ${interview.company}`,
  );
  const description = escapeICalText(
    `Position: ${interview.job_title}\n` +
      `Company: ${interview.company}\n` +
      `Type: ${interviewTypeLabel}\n` +
      (interview.interviewer_name
        ? `Interviewer: ${interview.interviewer_name}${interview.interviewer_title ? ` (${interview.interviewer_title})` : ""}\n`
        : "") +
      (interview.notes ? `\nNotes: ${interview.notes}` : ""),
  );
  const location = interview.location ? escapeICalText(interview.location) : "";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JobSentinel//Interview Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatICalDate(new Date())}`,
    `DTSTART:${formatICalDate(start)}`,
    `DTEND:${formatICalDate(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : "",
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Interview reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export function downloadInterviewICalFile(
  interview: InterviewCalendarData,
  interviewTypeLabel: string,
): void {
  const icsContent = generateInterviewICalEvent(interview, interviewTypeLabel);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `interview-${interview.company.toLowerCase().replace(/\s+/g, "-")}-${new Date(interview.scheduled_at).toISOString().split("T")[0]}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
