import { describe, expect, it } from "vitest";
import {
  getSearchSourceDefaults,
  searchLooksTechFocused,
} from "./jobSourceRecommendations";

describe("job source recommendations", () => {
  it("recognizes narrowly technical and broad search terms", () => {
    const technicalSearches = [
      ["Software Engineer"],
      ["Frontend Engineer", "React"],
      ["React Developer"],
      ["Data Analyst"],
      ["Business Intelligence Analyst"],
    ];
    const broadSearches = [
      ["Technical Product Manager"],
      ["Sales Engineer"],
      ["Software Sales Manager"],
      ["Software Implementation Specialist"],
      ["Software Support Specialist"],
      ["Curriculum Developer"],
      ["Support Engineer"],
      ["Customer Success Engineer"],
      ["Accountant", "SQL"],
      ["Operations Manager", "Python"],
      ["Sales Manager", "AWS"],
      ["Product Designer"],
      ["Office Manager", "Scheduling"],
      ["Medical Assistant", "EMR"],
      ["Store Manager", "Point of Sale"],
      ["Maintenance Technician", "Work Orders"],
      ["Policy Analyst"],
    ];

    for (const search of technicalSearches) {
      expect(searchLooksTechFocused(search)).toBe(true);
    }
    for (const search of broadSearches) {
      expect(searchLooksTechFocused(search)).toBe(false);
    }
  });

  it("enables relevant defaults only for narrowly technical searches", () => {
    expect(
      getSearchSourceDefaults({
        titles: ["Software Engineer"],
        keywords: ["React"],
        allowRemote: true,
      }),
    ).toEqual({
      remoteokEnabled: true,
      hnHiringEnabled: true,
      weworkremotelyEnabled: true,
    });

    for (const search of [
      { titles: ["Office Manager"], keywords: ["Scheduling"] },
      {
        titles: [
          "Sales Engineer",
          "Software Sales Manager",
          "Curriculum Developer",
          "Support Engineer",
        ],
        keywords: ["customer onboarding", "training"],
      },
      { titles: ["Accountant"], keywords: ["SQL", "Excel"] },
    ]) {
      expect(getSearchSourceDefaults({ ...search, allowRemote: true })).toEqual({
        remoteokEnabled: false,
        hnHiringEnabled: false,
        weworkremotelyEnabled: false,
      });
    }

    expect(
      getSearchSourceDefaults({
        titles: ["Business Intelligence Analyst"],
        keywords: ["Tableau"],
        allowRemote: true,
      }),
    ).toEqual({
      remoteokEnabled: true,
      hnHiringEnabled: true,
      weworkremotelyEnabled: true,
    });
  });
});
