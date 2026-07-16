import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../mocks/handlers";

type ResumeDraft = {
  id: number;
  contact: {
    name: string;
    email: string;
  };
  summary: string;
  experience: Array<{
    id: number;
    title: string;
    company: string;
  }>;
  education: Array<{
    id: number;
    degree: string;
    institution: string;
  }>;
  skills: Array<{
    name: string;
    category: string;
  }>;
};

describe("mock resume builder commands", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("normalizes draft updates through backend command names", async () => {
    const resumeId = await mockInvoke<number>("create_resume_draft", {});

    await mockInvoke<void>("update_resume_contact", {
      resumeId,
      contact: {
        name: "Jordan Lee",
        email: "jordan@example.com",
      },
    });
    await mockInvoke<void>("update_resume_summary", {
      resumeId,
      summary: "Support leader",
    });
    const experienceId = await mockInvoke<number>("add_resume_experience", {
      resumeId,
      experience: {
        title: "Client Success Lead",
        company: "CareBridge Health",
        bullets: ["Handled renewals"],
      },
    });
    const educationId = await mockInvoke<number>("add_resume_education", {
      resumeId,
      education: {
        degree: "BA",
        institution: "Metro College",
      },
    });
    await mockInvoke<void>("set_resume_skills", {
      resumeId,
      skills: [
        { name: "Customer Support", category: "service" },
        { name: "ignored" },
      ],
    });

    const draft = await mockInvoke<ResumeDraft>("get_resume_draft", { resumeId });

    expect(draft).toMatchObject({
      id: resumeId,
      contact: {
        name: "Jordan Lee",
        email: "jordan@example.com",
      },
      summary: "Support leader",
    });
    expect(draft.experience).toEqual([
      expect.objectContaining({
        id: experienceId,
        title: "Client Success Lead",
        company: "CareBridge Health",
      }),
    ]);
    expect(draft.education).toEqual([
      expect.objectContaining({
        id: educationId,
        degree: "BA",
        institution: "Metro College",
      }),
    ]);
    expect(draft.skills).toEqual([
      expect.objectContaining({
        name: "Customer Support",
        category: "service",
      }),
    ]);
  });

  it("renders and exports normalized resume content", async () => {
    const html = await mockInvoke<string>("render_resume_html", {
      resume: {
        contact: {
          name: "Jordan <Lee>",
          email: "jordan@example.com",
        },
        summary: "Care & support",
      },
    });

    expect(html).toContain("Jordan &lt;Lee&gt;");
    expect(html).toContain("Care &amp; support");

    const text = await mockInvoke<string>("export_resume_text", {
      resume: {
        contact: {
          name: "Jordan Lee",
          email: "jordan@example.com",
        },
        summary: "Support leader",
      },
    });

    expect(text).toBe("Jordan Lee\njordan@example.com\n\nSupport leader");
  });
});
