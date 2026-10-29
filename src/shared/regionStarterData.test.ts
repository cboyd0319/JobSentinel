/** Verifies frontend regional starter-data validation matches the Rust contract. */

import { describe, expect, it } from "vitest";
import euManifest from "../../crates/jobsentinel-domain/src/fixtures/region_manifests/eu_v1.json";
import euStarter from "../../crates/jobsentinel-domain/src/fixtures/region_manifests/eu_starter_v1.json";
import indiaManifest from "../../crates/jobsentinel-domain/src/fixtures/region_manifests/india_v1.json";
import indiaStarter from "../../crates/jobsentinel-domain/src/fixtures/region_manifests/india_starter_v1.json";
import ukManifest from "../../crates/jobsentinel-domain/src/fixtures/region_manifests/uk_v1.json";
import ukStarter from "../../crates/jobsentinel-domain/src/fixtures/region_manifests/uk_starter_v1.json";
import {
  parseRegionStarterData,
  type RegionStarterManifestBinding,
} from "./regionStarterData";

type ManifestFixture = {
  region_id: string;
  taxonomy_ids: string[];
  cv_profiles: string[];
};

function binding(manifest: ManifestFixture): RegionStarterManifestBinding {
  return {
    region_id: manifest.region_id,
    taxonomy_ids: manifest.taxonomy_ids,
    cv_profiles: manifest.cv_profiles,
  };
}

function validStarter() {
  return {
    schema: "jobsentinel.v3.region-starter-data.v1",
    region_id: "uk",
    reviewed_on: "2026-09-11",
    taxonomy_mappings: [{
      taxonomy_id: "uk_soc_2020_research",
      source_code: "2134",
      source_label: "Software developer",
      canonical_term: "software development",
      mapping_type: "close",
      confidence_note: "Tentative vocabulary alignment.",
      provenance_url: "https://example.test/taxonomy",
    }],
    cv_profiles: [{
      profile_id: "uk_cv_research",
      label: "UK CV starter",
      sections: ["Profile"],
      guidance: ["Use confirmed evidence."],
      provenance_urls: ["https://example.test/cv"],
    }],
    source_notes: [{
      source_id: "source-research",
      label: "Source research",
      url: "https://example.test/source",
      access_note: "No source access is granted.",
    }],
  };
}

const ukBinding = binding(ukManifest);

describe("region starter data", () => {
  it.each([
    ["UK", ukStarter, ukManifest],
    ["EU", euStarter, euManifest],
    ["India", indiaStarter, indiaManifest],
  ])("accepts the canonical %s starter fixture", (_name, starter, manifest) => {
    const parsed = parseRegionStarterData(starter, binding(manifest));

    expect(parsed).not.toBeNull();
  });

  it("preserves exact ESCO identity and separates India's verified row from cached qualification research", () => {
    expect(parseRegionStarterData(euStarter, binding(euManifest))?.taxonomy_mappings[0]?.source_code)
      .toBe("http://data.europa.eu/esco/occupation/f2b15a0e-e65a-438a-affb-29b9d50b77d1");
    const india = parseRegionStarterData(indiaStarter, binding(indiaManifest));
    expect(india?.taxonomy_mappings[0]).toMatchObject({
      source_code: "2512.0204",
      mapping_type: "close",
      provenance_url: "https://www.msde.gov.in/static/uploads/2025/07/6a62ad4129b524c392ed1450393804f4.pdf",
    });
    expect(india?.taxonomy_mappings[0]?.confidence_note).toMatch(/official secondary/i);
    const qualification = india?.source_notes.find(note => note.source_id === "india_nsqf_nos_research");
    expect(qualification?.access_note).toMatch(/cached/i);
    expect(qualification?.access_note).toContain("2511.0103");
    expect(qualification?.access_note).toMatch(/not.*equivalence/i);
  });

  it.each([
    ["query", "https://example.test/reference?source=starter"],
    ["fragment", "https://example.test/reference#starter"],
    ["localhost", "https://localhost/reference"],
    ["localhost subdomain", "https://pack.localhost/reference"],
    ["loopback IPv4", "https://127.0.0.1/reference"],
    ["private IPv4", "https://10.0.0.1/reference"],
    ["private IPv4 range", "https://172.16.0.1/reference"],
    ["private IPv4 subnet", "https://192.168.0.1/reference"],
    ["link-local IPv4", "https://169.254.0.1/reference"],
    ["shared IPv4", "https://100.64.0.1/reference"],
    ["IETF protocol IPv4", "https://192.0.0.1/reference"],
    ["documentation IPv4", "https://192.0.2.1/reference"],
    ["benchmarking IPv4", "https://198.18.0.1/reference"],
    ["benchmarking IPv4 upper range", "https://198.19.255.254/reference"],
    ["documentation IPv4 range", "https://198.51.100.1/reference"],
    ["documentation IPv4 net", "https://203.0.113.1/reference"],
    ["multicast IPv4", "https://224.0.0.1/reference"],
    ["reserved IPv4", "https://240.0.0.1/reference"],
    ["loopback IPv6", "https://[::1]/reference"],
    ["mapped loopback IPv6", "https://[::ffff:127.0.0.1]/reference"],
    ["documentation IPv6", "https://[2001:db8::1]/reference"],
    ["documentation IPv6 current range", "https://[3fff:fff::1]/reference"],
    ["local translation IPv6", "https://[64:ff9b:1::1]/reference"],
    ["discard-only IPv6", "https://[100::1]/reference"],
    ["dummy IPv6", "https://[100:0:0:1::1]/reference"],
    ["IETF protocol IPv6", "https://[2001:1::4]/reference"],
    ["benchmarking IPv6", "https://[2001:2::1]/reference"],
    ["IETF protocol IPv6 upper range", "https://[2001:1ff::1]/reference"],
    ["SRv6 IPv6", "https://[5f00::1]/reference"],
  ])("rejects a Rust-blocked %s publisher URL", (_name, provenanceUrl) => {
    const value = validStarter();
    value.taxonomy_mappings[0]!.provenance_url = provenanceUrl;

    expect(parseRegionStarterData(value, ukBinding)).toBeNull();
  });

  it.each([
    ["PCP anycast", "https://192.0.0.9/reference"],
    ["TURN anycast", "https://192.0.0.10/reference"],
    ["global translation IPv6", "https://[64:ff9b::1]/reference"],
    ["PCP IPv6 anycast", "https://[2001:1::1]/reference"],
    ["TURN IPv6 anycast", "https://[2001:1::2]/reference"],
    ["DNS-SD IPv6 anycast", "https://[2001:1::3]/reference"],
    ["AMT IPv6", "https://[2001:3::1]/reference"],
    ["AS112 IPv6", "https://[2001:4:112::1]/reference"],
    ["ORCHIDv2 IPv6", "https://[2001:20::1]/reference"],
    ["DETs IPv6", "https://[2001:3f::1]/reference"],
  ])("accepts a globally reachable IETF exception %s", (_name, provenanceUrl) => {
    const value = validStarter();
    value.taxonomy_mappings[0]!.provenance_url = provenanceUrl;

    expect(parseRegionStarterData(value, ukBinding)).not.toBeNull();
  });

  it.each([
    ["duplicate taxonomy code", (value: ReturnType<typeof validStarter>) => ({ ...value, taxonomy_mappings: [...value.taxonomy_mappings, { ...value.taxonomy_mappings[0] }] })],
    ["duplicate profile id", (value: ReturnType<typeof validStarter>) => ({ ...value, cv_profiles: [...value.cv_profiles, { ...value.cv_profiles[0] }] })],
    ["duplicate source id", (value: ReturnType<typeof validStarter>) => ({ ...value, source_notes: [...value.source_notes, { ...value.source_notes[0] }] })],
    ["future review date", (value: ReturnType<typeof validStarter>) => ({ ...value, reviewed_on: "9999-12-31" })],
    ["zero-width control", (value: ReturnType<typeof validStarter>) => ({ ...value, source_notes: [{ ...value.source_notes[0], label: "bad\u200Blabel" }] })],
    ["C1 control", (value: ReturnType<typeof validStarter>) => ({ ...value, source_notes: [{ ...value.source_notes[0], label: "bad\u0085label" }] })],
    ["UTF-8 source-code limit", (value: ReturnType<typeof validStarter>) => ({ ...value, taxonomy_mappings: [{ ...value.taxonomy_mappings[0], source_code: "é".repeat(129) }] })],
    ["UTF-8 CV-section limit", (value: ReturnType<typeof validStarter>) => ({ ...value, cv_profiles: [{ ...value.cv_profiles[0], sections: ["é".repeat(257)] }] })],
    ["64 KiB serialized limit", (value: ReturnType<typeof validStarter>) => ({ ...value, taxonomy_mappings: Array.from({ length: 64 }, (_, index) => ({ ...value.taxonomy_mappings[0], source_code: `source-${index}`, provenance_url: `https://e.test/${"a".repeat(2_000)}` })) })],
  ])("rejects %s", (_name, create) => {
    expect(parseRegionStarterData(create(validStarter()), ukBinding)).toBeNull();
  });
});
