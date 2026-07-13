import { describe, expect, it } from "vitest";
import {
  validateDiscordWebhook,
  validateSlackWebhook,
  validateTeamsWebhook,
} from "./notificationConnectionValidation";

const SLACK_HELP =
  "Paste the full Slack connection link copied from Slack. If you are not sure, leave it blank and set it up later.";
const DISCORD_HELP =
  "Paste the full Discord connection link copied from Discord. If you are not sure, leave it blank and set it up later.";
const TEAMS_HELP =
  "Paste the full Teams connection link copied from Teams. If you are not sure, leave it blank and set it up later.";

describe("notification connection validation", () => {
  describe("Slack", () => {
    it("accepts generated Slack links and empty optional values", () => {
      expect(
        validateSlackWebhook(
          "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX",
        ),
      ).toBeUndefined();
      expect(validateSlackWebhook(" ")).toBeUndefined();
    });

    it("requires HTTPS without credentials or a custom port", () => {
      expect(
        validateSlackWebhook("http://hooks.slack.com/services/T00/B00/XXX"),
      ).toBe(SLACK_HELP);
      expect(
        validateSlackWebhook(
          "https://user:pass@hooks.slack.com/services/T00/B00/XXX",
        ),
      ).toBe(SLACK_HELP);
      expect(
        validateSlackWebhook(
          "https://hooks.slack.com:8080/services/T00/B00/XXX",
        ),
      ).toBe(SLACK_HELP);
    });

    it("requires the exact Slack host and generated path", () => {
      expect(
        validateSlackWebhook("https://api.slack.com/services/T00/B00/XXX"),
      ).toBe(SLACK_HELP);
      expect(
        validateSlackWebhook("https://hooks.slack.com/api/webhooks/123"),
      ).toBe(SLACK_HELP);
    });

    it("rejects malformed and deceptive links", () => {
      expect(validateSlackWebhook("not-a-url")).toBe(SLACK_HELP);
      expect(
        validateSlackWebhook(
          "https://evil.com?https://hooks.slack.com/services/T00/B00/XXX",
        ),
      ).toBe(SLACK_HELP);
      expect(
        validateSlackWebhook(
          "https://evil.com#hooks.slack.com/services/T00/B00/XXX",
        ),
      ).toBe(SLACK_HELP);
    });
  });

  describe("Discord", () => {
    it("accepts supported Discord hosts and empty optional values", () => {
      expect(
        validateDiscordWebhook(
          "https://discord.com/api/webhooks/123456789/secret",
        ),
      ).toBeUndefined();
      expect(
        validateDiscordWebhook(
          "https://discordapp.com/api/webhooks/123/secret",
        ),
      ).toBeUndefined();
      expect(
        validateDiscordWebhook(
          "https://hooks.discord.com/api/webhooks/123/secret",
        ),
      ).toBeUndefined();
      expect(validateDiscordWebhook(" ")).toBeUndefined();
    });

    it("requires HTTPS without credentials or a custom port", () => {
      expect(
        validateDiscordWebhook("http://discord.com/api/webhooks/123/secret"),
      ).toBe(DISCORD_HELP);
      expect(
        validateDiscordWebhook(
          "https://user:pass@discord.com/api/webhooks/123/secret",
        ),
      ).toBe(DISCORD_HELP);
      expect(
        validateDiscordWebhook(
          "https://discord.com:8080/api/webhooks/123/secret",
        ),
      ).toBe(DISCORD_HELP);
    });

    it("requires a supported Discord host and generated path", () => {
      expect(
        validateDiscordWebhook(
          "https://api.discord.com/api/webhooks/123/secret",
        ),
      ).toBe(DISCORD_HELP);
      expect(validateDiscordWebhook("https://discord.com/webhooks/123")).toBe(
        DISCORD_HELP,
      );
    });

    it("rejects malformed and deceptive links", () => {
      expect(validateDiscordWebhook("not-a-url")).toBe(DISCORD_HELP);
      expect(
        validateDiscordWebhook(
          "https://evil.com?https://discord.com/api/webhooks/123/secret",
        ),
      ).toBe(DISCORD_HELP);
      expect(
        validateDiscordWebhook(
          "https://evil.com#discord.com/api/webhooks/123/secret",
        ),
      ).toBe(DISCORD_HELP);
    });
  });

  describe("Teams", () => {
    it("accepts supported Teams connection hosts and empty optional values", () => {
      expect(
        validateTeamsWebhook(
          "https://outlook.office.com/webhook/abc/IncomingWebhook/def/ghi",
        ),
      ).toBeUndefined();
      expect(
        validateTeamsWebhook(
          "https://tenant.webhook.office.com/abc/IncomingWebhook/def/ghi",
        ),
      ).toBeUndefined();
      expect(
        validateTeamsWebhook(
          "https://prod-12.westus.logic.azure.com:443/workflows/abc/triggers/manual/paths/invoke",
        ),
      ).toBeUndefined();
      expect(validateTeamsWebhook(" ")).toBeUndefined();
    });

    it("requires HTTPS without credentials or a custom port", () => {
      expect(
        validateTeamsWebhook("http://outlook.office.com/webhook/abc"),
      ).toBe(TEAMS_HELP);
      expect(
        validateTeamsWebhook(
          "https://user:pass@outlook.office.com/webhook/abc",
        ),
      ).toBe(TEAMS_HELP);
      expect(
        validateTeamsWebhook("https://outlook.office.com:8080/webhook/abc"),
      ).toBe(TEAMS_HELP);
    });

    it("requires a supported Teams host and generated path", () => {
      expect(
        validateTeamsWebhook("https://teams.microsoft.com/webhook/abc"),
      ).toBe(TEAMS_HELP);
      expect(validateTeamsWebhook("https://webhook.office.com/abc")).toBe(
        TEAMS_HELP,
      );
      expect(
        validateTeamsWebhook("https://logic.azure.com/workflows/abc"),
      ).toBe(TEAMS_HELP);
      expect(validateTeamsWebhook("https://tenant.webhook.office.com/")).toBe(
        TEAMS_HELP,
      );
    });

    it("rejects malformed and deceptive links", () => {
      expect(validateTeamsWebhook("not-a-url")).toBe(TEAMS_HELP);
      expect(
        validateTeamsWebhook(
          "https://evil.com?https://outlook.office.com/webhook/abc",
        ),
      ).toBe(TEAMS_HELP);
    });
  });
});
