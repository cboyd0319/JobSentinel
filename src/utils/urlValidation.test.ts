import { describe, expect, it } from "vitest";
import { isValidJobUrl } from "./urlValidation";

describe("isValidJobUrl", () => {
  it("allows public http and https URLs", () => {
    expect(isValidJobUrl("https://example.com/jobs")).toBe(true);
    expect(isValidJobUrl("http://example.com/jobs")).toBe(true);
  });

  it("blocks localhost names and loopback IPs", () => {
    expect(isValidJobUrl("http://localhost:3000/jobs")).toBe(false);
    expect(isValidJobUrl("http://app.localhost/jobs")).toBe(false);
    expect(isValidJobUrl("http://127.0.0.1/jobs")).toBe(false);
    expect(isValidJobUrl("http://[::1]/jobs")).toBe(false);
  });

  it("blocks private and link-local IPv4 ranges", () => {
    expect(isValidJobUrl("http://10.0.0.1/jobs")).toBe(false);
    expect(isValidJobUrl("http://172.16.0.1/jobs")).toBe(false);
    expect(isValidJobUrl("http://192.168.1.1/jobs")).toBe(false);
    expect(isValidJobUrl("http://169.254.1.1/jobs")).toBe(false);
  });

  it("blocks shared-address and unspecified IPv4 ranges", () => {
    expect(isValidJobUrl("http://100.64.0.1/jobs")).toBe(false);
    expect(isValidJobUrl("http://0.0.0.0/jobs")).toBe(false);
  });

  it("blocks non-http schemes", () => {
    expect(isValidJobUrl("file:///etc/passwd")).toBe(false);
    expect(isValidJobUrl("javascript:alert(1)")).toBe(false);
  });
});
