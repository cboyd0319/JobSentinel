import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validateRequiredEmail,
  validateUrl,
  validateRequiredUrl,
  validatePhone,
  validateSlackWebhook,
  validateDiscordWebhook,
  validateRequired,
  validateRegex,
  validateRequiredRegex,
  validatePort,
  validateEmailList,
} from "./formValidation";

describe("formValidation", () => {
  describe("validateEmail", () => {
    it("returns undefined for valid email addresses", () => {
      // Arrange & Act & Assert
      expect(validateEmail("user@example.com")).toBeUndefined();
      expect(validateEmail("test.user@domain.co")).toBeUndefined();
      expect(validateEmail("user+tag@example.com")).toBeUndefined();
      expect(validateEmail("user_name@example.org")).toBeUndefined();
      expect(validateEmail("123@numbers.com")).toBeUndefined();
    });

    it("returns undefined for empty string (optional field)", () => {
      // Arrange & Act & Assert
      expect(validateEmail("")).toBeUndefined();
      expect(validateEmail("   ")).toBeUndefined();
    });

    it("returns error message for invalid email addresses", () => {
      // Arrange & Act & Assert
      expect(validateEmail("invalid")).toBe(
        "Please enter a valid email address (e.g., user@example.com)"
      );
      expect(validateEmail("@example.com")).toBe(
        "Please enter a valid email address (e.g., user@example.com)"
      );
      expect(validateEmail("user@")).toBe(
        "Please enter a valid email address (e.g., user@example.com)"
      );
      expect(validateEmail("user@domain")).toBe(
        "Please enter a valid email address (e.g., user@example.com)"
      );
      expect(validateEmail("user @example.com")).toBe(
        "Please enter a valid email address (e.g., user@example.com)"
      );
    });

    it("trims whitespace before validation", () => {
      // Arrange & Act & Assert
      expect(validateEmail("  user@example.com  ")).toBeUndefined();
      expect(validateEmail("  invalid  ")).toBe(
        "Please enter a valid email address (e.g., user@example.com)"
      );
    });
  });

  describe("validateRequiredEmail", () => {
    it("returns undefined for valid email addresses", () => {
      // Arrange & Act & Assert
      expect(validateRequiredEmail("user@example.com")).toBeUndefined();
      expect(validateRequiredEmail("test@domain.co")).toBeUndefined();
    });

    it("returns error message for empty string", () => {
      // Arrange & Act & Assert
      expect(validateRequiredEmail("")).toBe("Email is required");
      expect(validateRequiredEmail("   ")).toBe("Email is required");
    });

    it("returns error message for invalid email addresses", () => {
      // Arrange & Act & Assert
      expect(validateRequiredEmail("invalid")).toBe(
        "Please enter a valid email address (e.g., user@example.com)"
      );
      expect(validateRequiredEmail("user@")).toBe(
        "Please enter a valid email address (e.g., user@example.com)"
      );
    });
  });

  describe("validateUrl", () => {
    it("returns undefined for valid URLs", () => {
      // Arrange & Act & Assert
      expect(validateUrl("https://example.com")).toBeUndefined();
      expect(validateUrl("http://example.com")).toBeUndefined();
      expect(validateUrl("https://subdomain.example.com")).toBeUndefined();
      expect(validateUrl("https://example.com/path")).toBeUndefined();
      expect(validateUrl("https://example.com/path?query=value")).toBeUndefined();
      expect(validateUrl("https://example.com:8080")).toBeUndefined();
    });

    it("returns undefined for empty string (optional field)", () => {
      // Arrange & Act & Assert
      expect(validateUrl("")).toBeUndefined();
      expect(validateUrl("   ")).toBeUndefined();
    });

    it("returns error message for invalid URLs", () => {
      // Arrange & Act & Assert
      expect(validateUrl("not-a-url")).toBe(
        "Please enter a valid URL (e.g., https://example.com)"
      );
      expect(validateUrl("example.com")).toBe(
        "Please enter a valid URL (e.g., https://example.com)"
      );
      expect(validateUrl("//example.com")).toBe(
        "Please enter a valid URL (e.g., https://example.com)"
      );
    });

    it("returns error message for non-HTTP protocols", () => {
      // Arrange & Act & Assert
      expect(validateUrl("ftp://example.com")).toBe(
        "URL must start with http:// or https://"
      );
      expect(validateUrl("file://example.com")).toBe(
        "URL must start with http:// or https://"
      );
      expect(validateUrl("javascript:alert(1)")).toBe(
        "URL must start with http:// or https://"
      );
    });

    it("trims whitespace before validation", () => {
      // Arrange & Act & Assert
      expect(validateUrl("  https://example.com  ")).toBeUndefined();
      expect(validateUrl("  not-a-url  ")).toBe(
        "Please enter a valid URL (e.g., https://example.com)"
      );
    });
  });

  describe("validateRequiredUrl", () => {
    it("returns undefined for valid URLs", () => {
      // Arrange & Act & Assert
      expect(validateRequiredUrl("https://example.com")).toBeUndefined();
      expect(validateRequiredUrl("http://example.com")).toBeUndefined();
    });

    it("returns error message for empty string", () => {
      // Arrange & Act & Assert
      expect(validateRequiredUrl("")).toBe("URL is required");
      expect(validateRequiredUrl("   ")).toBe("URL is required");
    });

    it("returns error message for invalid URLs", () => {
      // Arrange & Act & Assert
      expect(validateRequiredUrl("not-a-url")).toBe(
        "Please enter a valid URL (e.g., https://example.com)"
      );
      expect(validateRequiredUrl("ftp://example.com")).toBe(
        "URL must start with http:// or https://"
      );
    });
  });

  describe("validatePhone", () => {
    it("returns undefined for valid phone numbers", () => {
      // Arrange & Act & Assert
      expect(validatePhone("1234567890")).toBeUndefined(); // 10 digits
      expect(validatePhone("12345678901")).toBeUndefined(); // 11 digits
      expect(validatePhone("123456789012345")).toBeUndefined(); // 15 digits (max)
      expect(validatePhone("(123) 456-7890")).toBeUndefined(); // Formatted
      expect(validatePhone("+1 (123) 456-7890")).toBeUndefined(); // International format
      expect(validatePhone("123-456-7890")).toBeUndefined(); // Dashed format
    });

    it("returns undefined for empty string (optional field)", () => {
      // Arrange & Act & Assert
      expect(validatePhone("")).toBeUndefined();
      expect(validatePhone("   ")).toBeUndefined();
    });

    it("returns error message for too few digits", () => {
      // Arrange & Act & Assert
      expect(validatePhone("123456789")).toBe(
        "Phone number must have 10-15 digits"
      );
      expect(validatePhone("12345")).toBe("Phone number must have 10-15 digits");
      expect(validatePhone("(123) 456-78")).toBe(
        "Phone number must have 10-15 digits"
      );
    });

    it("returns error message for too many digits", () => {
      // Arrange & Act & Assert
      expect(validatePhone("1234567890123456")).toBe(
        "Phone number must have 10-15 digits"
      );
      expect(validatePhone("12345678901234567890")).toBe(
        "Phone number must have 10-15 digits"
      );
    });

    it("strips non-digit characters correctly", () => {
      // Arrange & Act & Assert
      expect(validatePhone("abc1234567890xyz")).toBeUndefined();
      expect(validatePhone("+++1234567890---")).toBeUndefined();
    });

    it("handles boundary conditions", () => {
      // Arrange & Act & Assert
      expect(validatePhone("9876543210")).toBeUndefined(); // Exactly 10 digits
      expect(validatePhone("987654321")).toBe(
        "Phone number must have 10-15 digits"
      ); // 9 digits (just below min)
      expect(validatePhone("123456789012345")).toBeUndefined(); // Exactly 15 digits
      expect(validatePhone("1234567890123456")).toBe(
        "Phone number must have 10-15 digits"
      ); // 16 digits (just above max)
    });
  });

  describe("validateSlackWebhook", () => {
    it("returns undefined for valid Slack webhook URLs", () => {
      // Arrange & Act & Assert
      expect(
        validateSlackWebhook("https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX")
      ).toBeUndefined();
      expect(
        validateSlackWebhook("https://hooks.slack.com/services/ABC/DEF/GHI")
      ).toBeUndefined();
    });

    it("returns undefined for empty string (optional field)", () => {
      // Arrange & Act & Assert
      expect(validateSlackWebhook("")).toBeUndefined();
      expect(validateSlackWebhook("   ")).toBeUndefined();
    });

    it("returns error message for non-HTTPS protocol", () => {
      // Arrange & Act & Assert
      expect(
        validateSlackWebhook("http://hooks.slack.com/services/T00/B00/XXX")
      ).toBe("Slack webhook must use HTTPS");
    });

    it("returns error message for wrong hostname", () => {
      // Arrange & Act & Assert
      expect(
        validateSlackWebhook("https://evil.com/services/T00/B00/XXX")
      ).toBe("Slack webhook must use hooks.slack.com domain");
      expect(
        validateSlackWebhook("https://slack.com/services/T00/B00/XXX")
      ).toBe("Slack webhook must use hooks.slack.com domain");
      expect(
        validateSlackWebhook("https://api.slack.com/services/T00/B00/XXX")
      ).toBe("Slack webhook must use hooks.slack.com domain");
    });

    it("returns error message for invalid path", () => {
      // Arrange & Act & Assert
      expect(validateSlackWebhook("https://hooks.slack.com/invalid")).toBe(
        "Invalid Slack webhook path"
      );
      expect(validateSlackWebhook("https://hooks.slack.com/")).toBe(
        "Invalid Slack webhook path"
      );
      expect(validateSlackWebhook("https://hooks.slack.com/api/webhooks/123")).toBe(
        "Invalid Slack webhook path"
      );
    });

    it("returns error message for malformed URLs", () => {
      // Arrange & Act & Assert
      expect(validateSlackWebhook("not-a-url")).toBe("Invalid URL format");
      expect(validateSlackWebhook("https://")).toBe("Invalid URL format");
    });

    it("prevents bypass attacks with query parameters", () => {
      // Arrange & Act & Assert
      expect(
        validateSlackWebhook("https://evil.com?https://hooks.slack.com/services/T00/B00/XXX")
      ).toBe("Slack webhook must use hooks.slack.com domain");
    });

    it("prevents bypass attacks with URL fragments", () => {
      // Arrange & Act & Assert
      expect(
        validateSlackWebhook("https://evil.com#hooks.slack.com/services/T00/B00/XXX")
      ).toBe("Slack webhook must use hooks.slack.com domain");
    });
  });

  describe("validateDiscordWebhook", () => {
    it("returns undefined for valid Discord webhook URLs", () => {
      // Arrange & Act & Assert
      expect(
        validateDiscordWebhook("https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz")
      ).toBeUndefined();
      expect(
        validateDiscordWebhook("https://discordapp.com/api/webhooks/123/abc")
      ).toBeUndefined();
    });

    it("returns undefined for empty string (optional field)", () => {
      // Arrange & Act & Assert
      expect(validateDiscordWebhook("")).toBeUndefined();
      expect(validateDiscordWebhook("   ")).toBeUndefined();
    });

    it("returns error message for non-HTTPS protocol", () => {
      // Arrange & Act & Assert
      expect(
        validateDiscordWebhook("http://discord.com/api/webhooks/123/abc")
      ).toBe("Discord webhook must use HTTPS");
    });

    it("returns error message for wrong hostname", () => {
      // Arrange & Act & Assert
      expect(
        validateDiscordWebhook("https://evil.com/api/webhooks/123/abc")
      ).toBe("Discord webhook must use discord.com or discordapp.com domain");
      expect(
        validateDiscordWebhook("https://slack.com/api/webhooks/123/abc")
      ).toBe("Discord webhook must use discord.com or discordapp.com domain");
      expect(
        validateDiscordWebhook("https://api.discord.com/api/webhooks/123/abc")
      ).toBe("Discord webhook must use discord.com or discordapp.com domain");
    });

    it("returns error message for invalid path", () => {
      // Arrange & Act & Assert
      expect(validateDiscordWebhook("https://discord.com/invalid")).toBe(
        "Invalid Discord webhook path"
      );
      expect(validateDiscordWebhook("https://discord.com/")).toBe(
        "Invalid Discord webhook path"
      );
      expect(validateDiscordWebhook("https://discord.com/webhooks/123")).toBe(
        "Invalid Discord webhook path"
      );
    });

    it("returns error message for malformed URLs", () => {
      // Arrange & Act & Assert
      expect(validateDiscordWebhook("not-a-url")).toBe("Invalid URL format");
      expect(validateDiscordWebhook("https://")).toBe("Invalid URL format");
    });

    it("prevents bypass attacks with query parameters", () => {
      // Arrange & Act & Assert
      expect(
        validateDiscordWebhook("https://evil.com?https://discord.com/api/webhooks/123/abc")
      ).toBe("Discord webhook must use discord.com or discordapp.com domain");
    });

    it("prevents bypass attacks with URL fragments", () => {
      // Arrange & Act & Assert
      expect(
        validateDiscordWebhook("https://evil.com#discord.com/api/webhooks/123/abc")
      ).toBe("Discord webhook must use discord.com or discordapp.com domain");
    });
  });

  describe("validateRequired", () => {
    it("returns undefined for non-empty strings", () => {
      // Arrange & Act & Assert
      expect(validateRequired("value")).toBeUndefined();
      expect(validateRequired("test")).toBeUndefined();
      expect(validateRequired("123")).toBeUndefined();
    });

    it("returns error message for empty string with default field name", () => {
      // Arrange & Act & Assert
      expect(validateRequired("")).toBe("This field is required");
      expect(validateRequired("   ")).toBe("This field is required");
    });

    it("returns error message with custom field name", () => {
      // Arrange & Act & Assert
      expect(validateRequired("", "Username")).toBe("Username is required");
      expect(validateRequired("   ", "Email")).toBe("Email is required");
    });

    it("trims whitespace before validation", () => {
      // Arrange & Act & Assert
      expect(validateRequired("  value  ")).toBeUndefined();
      expect(validateRequired("  ")).toBe("This field is required");
    });
  });

  describe("validateRegex", () => {
    it("returns undefined for valid regex patterns", () => {
      // Arrange & Act & Assert
      expect(validateRegex(".*")).toBeUndefined();
      expect(validateRegex("^test$")).toBeUndefined();
      expect(validateRegex("[a-z]+")).toBeUndefined();
      expect(validateRegex("\\d{3}-\\d{4}")).toBeUndefined();
      expect(validateRegex("(foo|bar)")).toBeUndefined();
      expect(validateRegex("test.*123")).toBeUndefined();
    });

    it("returns undefined for empty string (optional field)", () => {
      // Arrange & Act & Assert
      expect(validateRegex("")).toBeUndefined();
      expect(validateRegex("   ")).toBeUndefined();
    });

    it("returns error message for invalid regex patterns", () => {
      // Arrange & Act & Assert
      expect(validateRegex("[invalid")).toBe(
        "Invalid regex pattern. Check for unmatched brackets or special characters."
      );
      expect(validateRegex("(unclosed")).toBe(
        "Invalid regex pattern. Check for unmatched brackets or special characters."
      );
      expect(validateRegex("*invalid")).toBe(
        "Invalid regex pattern. Check for unmatched brackets or special characters."
      );
      expect(validateRegex("(?invalid)")).toBe(
        "Invalid regex pattern. Check for unmatched brackets or special characters."
      );
    });

    it("trims whitespace before validation", () => {
      // Arrange & Act & Assert
      expect(validateRegex("  .*  ")).toBeUndefined();
      expect(validateRegex("  [invalid  ")).toBe(
        "Invalid regex pattern. Check for unmatched brackets or special characters."
      );
    });

    it("handles complex regex patterns", () => {
      // Arrange & Act & Assert
      expect(validateRegex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")).toBeUndefined();
      expect(validateRegex("(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)")).toBeUndefined();
    });
  });

  describe("validateRequiredRegex", () => {
    it("returns undefined for valid regex patterns", () => {
      // Arrange & Act & Assert
      expect(validateRequiredRegex(".*")).toBeUndefined();
      expect(validateRequiredRegex("^test$")).toBeUndefined();
    });

    it("returns error message for empty string", () => {
      // Arrange & Act & Assert
      expect(validateRequiredRegex("")).toBe("Pattern is required");
      expect(validateRequiredRegex("   ")).toBe("Pattern is required");
    });

    it("returns error message for invalid regex patterns", () => {
      // Arrange & Act & Assert
      expect(validateRequiredRegex("[invalid")).toBe(
        "Invalid regex pattern. Check for unmatched brackets or special characters."
      );
      expect(validateRequiredRegex("(unclosed")).toBe(
        "Invalid regex pattern. Check for unmatched brackets or special characters."
      );
    });
  });

  describe("validatePort", () => {
    it("returns undefined for valid port numbers", () => {
      // Arrange & Act & Assert
      expect(validatePort(1)).toBeUndefined(); // Minimum
      expect(validatePort(80)).toBeUndefined();
      expect(validatePort(443)).toBeUndefined();
      expect(validatePort(3000)).toBeUndefined();
      expect(validatePort(8080)).toBeUndefined();
      expect(validatePort(65535)).toBeUndefined(); // Maximum
    });

    it("returns error message for port below minimum", () => {
      // Arrange & Act & Assert
      expect(validatePort(0)).toBe("Port must be between 1 and 65535");
      expect(validatePort(-1)).toBe("Port must be between 1 and 65535");
      expect(validatePort(-100)).toBe("Port must be between 1 and 65535");
    });

    it("returns error message for port above maximum", () => {
      // Arrange & Act & Assert
      expect(validatePort(65536)).toBe("Port must be between 1 and 65535");
      expect(validatePort(70000)).toBe("Port must be between 1 and 65535");
      expect(validatePort(100000)).toBe("Port must be between 1 and 65535");
    });

    it("handles boundary conditions", () => {
      // Arrange & Act & Assert
      expect(validatePort(1)).toBeUndefined(); // Lower bound
      expect(validatePort(0)).toBe("Port must be between 1 and 65535"); // Just below
      expect(validatePort(65535)).toBeUndefined(); // Upper bound
      expect(validatePort(65536)).toBe("Port must be between 1 and 65535"); // Just above
    });

    it("handles common port numbers", () => {
      // Arrange & Act & Assert
      expect(validatePort(21)).toBeUndefined(); // FTP
      expect(validatePort(22)).toBeUndefined(); // SSH
      expect(validatePort(80)).toBeUndefined(); // HTTP
      expect(validatePort(443)).toBeUndefined(); // HTTPS
      expect(validatePort(3306)).toBeUndefined(); // MySQL
      expect(validatePort(5432)).toBeUndefined(); // PostgreSQL
    });
  });

  describe("validateEmailList", () => {
    it("returns undefined for valid single email", () => {
      // Arrange & Act & Assert
      expect(validateEmailList("user@example.com")).toBeUndefined();
    });

    it("returns undefined for valid multiple emails", () => {
      // Arrange & Act & Assert
      expect(validateEmailList("user1@example.com,user2@example.com")).toBeUndefined();
      expect(
        validateEmailList("user1@example.com,user2@domain.co,user3@test.org")
      ).toBeUndefined();
    });

    it("returns undefined for empty string (optional field)", () => {
      // Arrange & Act & Assert
      expect(validateEmailList("")).toBeUndefined();
      expect(validateEmailList("   ")).toBeUndefined();
    });

    it("handles whitespace around emails", () => {
      // Arrange & Act & Assert
      expect(
        validateEmailList("user1@example.com, user2@example.com")
      ).toBeUndefined();
      expect(
        validateEmailList("  user1@example.com  ,  user2@example.com  ")
      ).toBeUndefined();
    });

    it("returns error message for invalid email in list", () => {
      // Arrange & Act & Assert
      const result = validateEmailList("user1@example.com,invalid,user2@example.com");
      expect(result).toContain("Invalid email addresses:");
      expect(result).toContain("invalid");
    });

    it("returns error message for multiple invalid emails", () => {
      // Arrange & Act & Assert
      const result = validateEmailList("invalid1,user@example.com,invalid2");
      expect(result).toContain("Invalid email addresses:");
      expect(result).toContain("invalid1");
      expect(result).toContain("invalid2");
    });

    it("returns error message for all invalid emails", () => {
      // Arrange & Act & Assert
      const result = validateEmailList("invalid1,invalid2,invalid3");
      expect(result).toContain("Invalid email addresses:");
      expect(result).toContain("invalid1");
      expect(result).toContain("invalid2");
      expect(result).toContain("invalid3");
    });

    it("handles edge case with single invalid email", () => {
      // Arrange & Act & Assert
      const result = validateEmailList("invalid");
      expect(result).toContain("Invalid email addresses:");
      expect(result).toContain("invalid");
    });

    it("handles trailing comma", () => {
      // Arrange & Act & Assert
      const result = validateEmailList("user@example.com,");
      expect(result).toContain("Invalid email addresses:");
      expect(result).toContain(""); // Empty string after comma is invalid
    });

    it("handles leading comma", () => {
      // Arrange & Act & Assert
      const result = validateEmailList(",user@example.com");
      expect(result).toContain("Invalid email addresses:");
      expect(result).toContain(""); // Empty string before comma is invalid
    });

    it("handles multiple commas", () => {
      // Arrange & Act & Assert
      const result = validateEmailList("user1@example.com,,user2@example.com");
      expect(result).toContain("Invalid email addresses:");
      expect(result).toContain(""); // Empty string between commas is invalid
    });
  });
});
