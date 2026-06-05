export type EmailProvider = "custom" | "gmail" | "outlook" | "yahoo";

export const EMAIL_PROVIDER_TEMPLATES: Record<
  EmailProvider,
  { server: string; port: number; starttls: boolean; hint: string }
> = {
  gmail: {
    server: "smtp.gmail.com",
    port: 587,
    starttls: true,
    hint: "Use an app password from Google Account Security",
  },
  outlook: {
    server: "smtp-mail.outlook.com",
    port: 587,
    starttls: true,
    hint: "Use an app password if Outlook asks for one",
  },
  yahoo: {
    server: "smtp.mail.yahoo.com",
    port: 587,
    starttls: true,
    hint: "Use an app password from Yahoo Account Security",
  },
  custom: {
    server: "",
    port: 587,
    starttls: true,
    hint: "Leave these alone unless your email service gave you these details.",
  },
};
