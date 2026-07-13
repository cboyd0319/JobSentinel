type SupportedTarget = (url: URL) => boolean;

const SLACK_CONNECTION_LINK_HELP =
  "Paste the full Slack connection link copied from Slack. If you are not sure, leave it blank and set it up later.";
const DISCORD_CONNECTION_LINK_HELP =
  "Paste the full Discord connection link copied from Discord. If you are not sure, leave it blank and set it up later.";
const TEAMS_CONNECTION_LINK_HELP =
  "Paste the full Teams connection link copied from Teams. If you are not sure, leave it blank and set it up later.";

function validateNotificationConnection(
  value: string,
  help: string,
  isSupportedTarget: SupportedTarget,
): string | undefined {
  if (!value.trim()) return undefined;

  try {
    const url = new URL(value);
    const usesSupportedTransport =
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443");
    return usesSupportedTransport && isSupportedTarget(url) ? undefined : help;
  } catch {
    return help;
  }
}

export function validateSlackWebhook(value: string): string | undefined {
  return validateNotificationConnection(
    value,
    SLACK_CONNECTION_LINK_HELP,
    (url) =>
      url.hostname === "hooks.slack.com" &&
      url.pathname.startsWith("/services/"),
  );
}

export function validateDiscordWebhook(value: string): string | undefined {
  return validateNotificationConnection(
    value,
    DISCORD_CONNECTION_LINK_HELP,
    (url) =>
      ["discord.com", "discordapp.com", "hooks.discord.com"].includes(
        url.hostname.toLowerCase(),
      ) && url.pathname.startsWith("/api/webhooks/"),
  );
}

export function validateTeamsWebhook(value: string): string | undefined {
  return validateNotificationConnection(
    value,
    TEAMS_CONNECTION_LINK_HELP,
    (url) => {
      const host = url.hostname.toLowerCase();
      if (
        (host === "outlook.office.com" || host === "outlook.office365.com") &&
        url.pathname.startsWith("/webhook/")
      ) {
        return true;
      }

      const hasGeneratedPath = url.pathname.length > 1;
      return (
        hasGeneratedPath &&
        ((host.endsWith(".webhook.office.com") &&
          host !== "webhook.office.com") ||
          (host.endsWith(".logic.azure.com") && host !== "logic.azure.com"))
      );
    },
  );
}
