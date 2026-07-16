import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../../test-support/mocks/handlers";
import {
  handleMockCoverLetterTemplateCommand,
  type MockCoverLetterTemplate,
} from "./coverLetterTemplateCommands";

describe("Applications cover-letter template mock commands", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("stores templates with the backend command names", async () => {
    expect(await mockInvoke<number>("seed_default_templates")).toBe(6);
    const seededTemplates = await mockInvoke<MockCoverLetterTemplate[]>(
      "list_cover_letter_templates",
    );
    expect(seededTemplates).toHaveLength(6);

    const created = await mockInvoke<MockCoverLetterTemplate>(
      "create_cover_letter_template",
      {
        name: "Targeted letter",
        content: "Dear {company}, I can help.",
        category: "custom",
      },
    );

    expect(created).toMatchObject({
      id: "mock-cover-letter-template-7",
      name: "Targeted letter",
      content: "Dear {company}, I can help.",
      category: "custom",
    });
    expect(created.createdAt).toEqual(expect.any(String));
    expect(created.updatedAt).toEqual(created.createdAt);

    expect(
      await mockInvoke<MockCoverLetterTemplate | null>(
        "get_cover_letter_template",
        { id: created.id },
      ),
    ).toEqual(created);

    const updated = await mockInvoke<MockCoverLetterTemplate | null>(
      "update_cover_letter_template",
      {
        id: created.id,
        name: "Updated letter",
        content: "Hello {company}",
        category: "healthcare",
      },
    );

    expect(updated).toMatchObject({
      id: created.id,
      name: "Updated letter",
      content: "Hello {company}",
      category: "healthcare",
      createdAt: created.createdAt,
    });
    expect(updated?.updatedAt).toEqual(expect.any(String));

    expect(
      await mockInvoke<boolean>("delete_cover_letter_template", {
        id: created.id,
      }),
    ).toBe(true);
    expect(
      await mockInvoke<MockCoverLetterTemplate | null>(
        "get_cover_letter_template",
        { id: created.id },
      ),
    ).toBeNull();
  });

  it("imports each template identifier once", async () => {
    const template: MockCoverLetterTemplate = {
      id: "template-import-1",
      name: "Imported letter",
      content: "Hello {company}",
      category: "general",
      createdAt: "2026-06-19T12:00:00Z",
      updatedAt: "2026-06-19T12:00:00Z",
    };

    expect(
      await mockInvoke<number>("import_cover_letter_templates", {
        templates: [template, template],
      }),
    ).toBe(1);
    expect(
      await mockInvoke<MockCoverLetterTemplate[]>("list_cover_letter_templates"),
    ).toEqual([template]);
  });

  it("rejects commands owned by another feature", () => {
    const state = { coverLetterTemplates: [] };

    expect(
      handleMockCoverLetterTemplateCommand("list_saved_searches", undefined, state),
    ).toMatchObject({ handled: false, shouldSave: false, state });
  });
});
