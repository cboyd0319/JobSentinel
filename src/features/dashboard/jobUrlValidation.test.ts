import { describe, expect, it } from "vitest";
import { isValidJobUrl } from "./jobUrlValidation";

describe("isValidJobUrl", () => {
  it("allows public https URLs", () => {
    expect(isValidJobUrl("https://example.com/jobs")).toBe(true);
  });

  it("blocks public http URLs", () => {
    expect(isValidJobUrl("http://example.com/jobs")).toBe(false);
  });

  it("blocks localhost names and loopback IPs", () => {
    expect(isValidJobUrl("http://localhost:3000/jobs")).toBe(false);
    expect(isValidJobUrl("http://app.localhost/jobs")).toBe(false);
    expect(isValidJobUrl("http://127.0.0.1/jobs")).toBe(false);
    expect(isValidJobUrl("http://127.0.0.2/jobs")).toBe(false);
    expect(isValidJobUrl("http://127.255.255.255/jobs")).toBe(false);
    expect(isValidJobUrl("http://[::1]/jobs")).toBe(false);
  });

  it("blocks IPv4-mapped IPv6 private and loopback addresses", () => {
    expect(isValidJobUrl("http://[::ffff:127.0.0.1]/jobs")).toBe(false);
    expect(isValidJobUrl("http://[::ffff:10.0.0.1]/jobs")).toBe(false);
    expect(isValidJobUrl("http://[::ffff:192.168.1.1]/jobs")).toBe(false);
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

  it("blocks multicast and broadcast IP ranges", () => {
    expect(isValidJobUrl("http://224.0.0.1/jobs")).toBe(false);
    expect(isValidJobUrl("http://255.255.255.255/jobs")).toBe(false);
    expect(isValidJobUrl("http://[ff02::1]/jobs")).toBe(false);
    expect(isValidJobUrl("http://[::ffff:224.0.0.1]/jobs")).toBe(false);
  });

  it("blocks non-http schemes", () => {
    expect(isValidJobUrl("file:///etc/passwd")).toBe(false);
    expect(isValidJobUrl("javascript:alert(1)")).toBe(false);
  });

  it("blocks embedded credentials", () => {
    expect(isValidJobUrl("https://user@example.com/jobs")).toBe(false);
    expect(isValidJobUrl("https://user:pass@example.com/jobs")).toBe(false);
  });
});
