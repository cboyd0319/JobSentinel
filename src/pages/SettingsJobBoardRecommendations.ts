import { useMemo, type Dispatch, type SetStateAction } from "react";
import { searchLooksTechFocused } from "../utils/profiles";
import type { Config } from "./SettingsConfig";

export interface JobBoardRecommendation {
  board: string;
  reason: string;
  enable: () => void;
}

export function useJobBoardRecommendations(
  config: Config | null,
  setConfig: Dispatch<SetStateAction<Config | null>>,
): JobBoardRecommendation[] {
  return useMemo(() => {
    if (!config) {
      return [];
    }

    const recommendations: JobBoardRecommendation[] = [];
    const keywords = [
      ...(config.keywords_boost ?? []),
      ...(config.title_allowlist ?? []),
    ].map((k) => k.toLowerCase());
    const allowRemote = config.location_preferences?.allow_remote ?? false;
    const cities = config.location_preferences?.cities ?? [];
    const isTechFocused = searchLooksTechFocused(keywords);
    const hasRemoteIntent = allowRemote || keywords.some((k) => k.includes("remote"));

    if (isTechFocused && hasRemoteIntent) {
      if (!config.remoteok?.enabled) {
        recommendations.push({
          board: "RemoteOK",
          reason: "Useful for remote tech roles",
          enable: () =>
            setConfig({
              ...config,
              remoteok: {
                ...config.remoteok,
                enabled: true,
                tags: config.remoteok?.tags ?? [],
                limit: 50,
              },
            }),
        });
      }
      if (!config.weworkremotely?.enabled) {
        recommendations.push({
          board: "WeWorkRemotely",
          reason: "Useful for remote tech and product roles",
          enable: () =>
            setConfig({
              ...config,
              weworkremotely: {
                ...config.weworkremotely,
                enabled: true,
                limit: 50,
              },
            }),
        });
      }
    }

    if (
      keywords.some(
        (k) =>
          k.includes("startup") ||
          k.includes("early stage") ||
          k.includes("seed"),
      )
    ) {
      if (!config.yc_startup?.enabled) {
        recommendations.push({
          board: "YC Startups",
          reason: "You're interested in startups",
          enable: () =>
            setConfig({
              ...config,
              yc_startup: {
                ...config.yc_startup,
                enabled: true,
                remote_only: false,
                limit: 50,
              },
            }),
        });
      }
    }

    if (isTechFocused) {
      if (!config.hn_hiring?.enabled) {
        recommendations.push({
          board: "Startup and tech job posts",
          reason: "Active monthly startup and tech hiring posts",
          enable: () =>
            setConfig({
              ...config,
              hn_hiring: {
                ...config.hn_hiring,
                enabled: true,
                remote_only: false,
                limit: 50,
              },
            }),
        });
      }
      if (!config.dice?.enabled) {
        recommendations.push({
          board: "Dice",
          reason: "Technology roles",
          enable: () =>
            setConfig({
              ...config,
              dice: { ...config.dice, enabled: true, query: "", limit: 50 },
            }),
        });
      }
    }

    if (
      keywords.some(
        (k) =>
          k.includes("federal") ||
          k.includes("government") ||
          k.includes("clearance") ||
          k.includes("public sector"),
      )
    ) {
      if (!config.usajobs?.enabled) {
        recommendations.push({
          board: "USAJobs",
          reason: "You're interested in government roles",
          enable: () =>
            setConfig({
              ...config,
              usajobs: {
                ...config.usajobs,
                enabled: true,
                email: config.usajobs?.email ?? "",
                remote_only: false,
                date_posted_days: 30,
                limit: 100,
              },
            }),
        });
      }
    }

    if (
      isTechFocused &&
      cities.some(
        (c) =>
          c.toLowerCase().includes("san francisco") ||
          c.toLowerCase().includes("new york") ||
          c.toLowerCase().includes("austin") ||
          c.toLowerCase().includes("seattle") ||
          c.toLowerCase().includes("chicago"),
      )
    ) {
      if (!config.builtin?.enabled) {
        recommendations.push({
          board: "BuiltIn",
          reason: "Tech and startup jobs near " + cities[0],
          enable: () =>
            setConfig({
              ...config,
              builtin: {
                ...config.builtin,
                enabled: true,
                cities: config.builtin?.cities ?? [],
                limit: 50,
              },
            }),
        });
      }
    }

    return recommendations.slice(0, 3);
  }, [config, setConfig]);
}
