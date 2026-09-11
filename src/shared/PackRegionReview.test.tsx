/** Proves active regional packs display verified research metadata as inert text. */

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "../platform/tauri";
import { PackRegionReview } from "./PackRegionReview";
import { pack, release } from "../features/settings/packs/packManagementTestData";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const mockInvoke = vi.mocked(invoke);

const regionManifest = {
  schema: "jobsentinel.v3.region-manifest.v1",
  region_id: "uk",
  reviewed_on: "2026-07-19",
  country_codes: ["GB"],
  languages: ["en"],
  currencies: ["GBP"],
  pay_periods: ["hourly", "annual", "not_disclosed"],
  location_rules: {
    remote_labels: ["remote", "hybrid", "onsite"],
    subdivision_required: false,
    locality_required: false,
  },
  work_authorization_labels: ["right_to_work_not_assessed", "not_disclosed"],
  source_classes: ["regional_board", "user_import"],
  cv_profiles: ["uk_cv_research"],
  taxonomy_ids: ["uk_soc_2020_research"],
  policy_note_refs: ["https://example.test/policy"],
  provenance_refs: ["https://example.test/provenance"],
  evaluation_fixture_ids: ["accessibility-keyboard-zoom-motion-v1"],
  incomplete_coverage: true,
};

const starterData = {
  schema: "jobsentinel.v3.region-starter-data.v1",
  region_id: "uk",
  reviewed_on: "2026-09-11",
  taxonomy_mappings: [{
    taxonomy_id: "uk_soc_2020_research",
    source_code: "2231",
    source_label: "Registered nurse",
    canonical_term: "registered nurse",
    mapping_type: "exact",
    confidence_note: "Starter mapping only; verify the source's current classification.",
    provenance_url: "https://www.ons.gov.uk/example",
  }],
  cv_profiles: [{
    profile_id: "uk_cv_research",
    label: "UK CV starter profile",
    sections: ["Professional profile", "Employment history"],
    guidance: ["Describe confirmed experience in plain language."],
    provenance_urls: ["https://www.gov.uk/example"],
  }],
  source_notes: [{
    source_id: "find-a-job",
    label: "Find a job",
    url: "https://findajob.dwp.gov.uk/",
    access_note: "Review the source's current access terms before use.",
  }],
};

function regionPack(generation = 4) {
  const regionRelease = release({
    packType: "region",
    purpose: "regional_guidance",
  });
  return pack({
    packId: "jobsentinel.region.uk",
    generation,
    currentRelease: regionRelease,
    releases: [regionRelease],
  });
}

describe("PackRegionReview", () => {
  beforeEach(() => mockInvoke.mockReset());

  it("re-verifies and renders the incomplete English starter research as inert text", async () => {
    const user = userEvent.setup();
    const candidate = regionPack();
    mockInvoke.mockResolvedValueOnce(regionManifest);

    render(<PackRegionReview pack={candidate} />);
    await user.click(screen.getByRole("button", { name: "Open regional review" }));

    expect(mockInvoke).toHaveBeenCalledWith("open_region_pack", {
      publisherKeyId: candidate.publisherKeyId,
      packId: candidate.packId,
      expectedGeneration: candidate.generation,
    });
    expect(screen.getByText("Starter research. Coverage is incomplete.")).toBeInTheDocument();
    expect(screen.getByText("These research seeds are not integrated sources, source grants, eligibility advice, or credentials.")).toBeInTheDocument();
    expect(screen.getByText("Reviewed date")).toBeInTheDocument();
    expect(screen.getByText("2026-07-19")).toBeInTheDocument();
    expect(screen.getByText("Countries")).toBeInTheDocument();
    expect(screen.getByText("GB")).toBeInTheDocument();
    expect(screen.getByText("Currencies")).toBeInTheDocument();
    expect(screen.getByText("GBP")).toBeInTheDocument();
    expect(screen.getByText("Pay periods")).toBeInTheDocument();
    expect(screen.getByText("Work authorization labels")).toBeInTheDocument();
    expect(screen.getByText("CV profiles")).toBeInTheDocument();
    expect(screen.getByText("Taxonomy IDs")).toBeInTheDocument();
    expect(screen.getByText("Source policy notes")).toBeInTheDocument();
    expect(screen.getByText("Provenance")).toBeInTheDocument();
    expect(screen.getByText("https://example.test/policy")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "https://example.test/policy" })).not.toBeInTheDocument();
  });

  it("renders a local occupation lookup, CV profiles, and inert source research notes", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce({ ...regionManifest, starter_data: starterData });
    render(<PackRegionReview pack={regionPack()} />);

    await user.click(screen.getByRole("button", { name: "Open regional review" }));
    const lookup = await screen.findByRole("searchbox", { name: "Find a local occupation term" });
    await user.type(lookup, "nurse");

    expect(screen.getByText("2231")).toBeInTheDocument();
    expect(screen.getByText("2231").closest("p")).toHaveTextContent("Registered nurse");
    expect(screen.getByText(/Starter data reviewed 2026-09-11/i)).toBeInTheDocument();
    expect(screen.getByText(/Publisher reference:/i)).toBeInTheDocument();
    expect(screen.getByText("UK CV starter profile")).toBeInTheDocument();
    expect(screen.getByText("Professional profile")).toBeInTheDocument();
    expect(screen.getByText("Find a job")).toBeInTheDocument();
    expect(screen.getByText("https://findajob.dwp.gov.uk/")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "https://findajob.dwp.gov.uk/" })).not.toBeInTheDocument();
  });

  it("rejects malformed supplied starter data instead of falling back to the manifest", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce({
      ...regionManifest,
      starter_data: { ...starterData, region_id: "eu" },
    });
    render(<PackRegionReview pack={regionPack()} />);

    await user.click(screen.getByRole("button", { name: "Open regional review" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Regional research could not be verified. Refresh Packs and try again.",
    );
    expect(screen.queryByRole("searchbox", { name: "Find a local occupation term" })).not.toBeInTheDocument();
  });

  it("clears late results when the pack generation changes", async () => {
    const user = userEvent.setup();
    let resolve!: (value: typeof regionManifest) => void;
    const delayed = new Promise<typeof regionManifest>((done) => { resolve = done; });
    mockInvoke.mockReturnValueOnce(delayed);
    const { rerender } = render(<PackRegionReview pack={regionPack()} />);

    await user.click(screen.getByRole("button", { name: "Open regional review" }));
    rerender(<PackRegionReview pack={regionPack(5)} />);
    await act(async () => {
      resolve(regionManifest);
      await delayed;
    });

    expect(screen.getByRole("button", { name: "Open regional review" })).toBeInTheDocument();
    expect(screen.queryByText("Starter research. Coverage is incomplete.")).not.toBeInTheDocument();
  });

  it("clears opened research when the pack identity changes", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(regionManifest);
    const candidate = regionPack();
    const { rerender } = render(<PackRegionReview pack={candidate} />);
    await user.click(screen.getByRole("button", { name: "Open regional review" }));
    await screen.findByText("Starter research. Coverage is incomplete.");

    rerender(<PackRegionReview pack={{ ...candidate, packId: "jobsentinel.region.eu" }} />);

    expect(screen.queryByText("Starter research. Coverage is incomplete.")).not.toBeInTheDocument();
  });

  it("clears opened research when pack state changes", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(regionManifest);
    const candidate = regionPack();
    const { rerender } = render(<PackRegionReview pack={candidate} />);
    await user.click(screen.getByRole("button", { name: "Open regional review" }));
    await screen.findByText("Starter research. Coverage is incomplete.");

    rerender(<PackRegionReview pack={{ ...candidate, state: "disabled" }} />);

    expect(screen.queryByText("Starter research. Coverage is incomplete.")).not.toBeInTheDocument();
  });

  it("rejects a response that no longer proves incomplete starter coverage", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce({
      ...regionManifest,
      incomplete_coverage: false,
    });
    render(<PackRegionReview pack={regionPack()} />);

    await user.click(screen.getByRole("button", { name: "Open regional review" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Regional research could not be verified. Refresh Packs and try again.",
    );
    expect(screen.queryByText("GB")).not.toBeInTheDocument();
  });

  it("rejects a response without required country coverage", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce({ ...regionManifest, country_codes: [] });
    render(<PackRegionReview pack={regionPack()} />);

    await user.click(screen.getByRole("button", { name: "Open regional review" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Regional research could not be verified. Refresh Packs and try again.",
    );
    expect(screen.queryByText("GB")).not.toBeInTheDocument();
  });
});
