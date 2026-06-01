import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "./Button";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { HelpIcon } from "./HelpIcon";
import { logError } from "../utils/errorUtils";

interface BookmarkletConfig {
  port: number;
  enabled: boolean;
}

const DEFAULT_BOOKMARKLET_CONFIG: BookmarkletConfig = {
  port: 4321,
  enabled: false,
};

function isBookmarkletConfig(value: unknown): value is BookmarkletConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as BookmarkletConfig).port === "number" &&
    typeof (value as BookmarkletConfig).enabled === "boolean"
  );
}

export function BookmarkletGenerator() {
  const [config, setConfig] = useState<BookmarkletConfig>(DEFAULT_BOOKMARKLET_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const cfg = await invoke<BookmarkletConfig>("get_bookmarklet_config");
      setConfig(isBookmarkletConfig(cfg) ? cfg : DEFAULT_BOOKMARKLET_CONFIG);
      setError(null);
    } catch (err) {
      logError("Failed to load bookmarklet config:", err);
      setError("Could not load browser import settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const toggleServer = async () => {
    try {
      setLoading(true);
      if (config.enabled) {
        await invoke("stop_bookmarklet_server");
        setConfig({ ...config, enabled: false });
      } else {
        await invoke("start_bookmarklet_server", { port: config.port });
        setConfig({ ...config, enabled: true });
      }
      setError(null);
    } catch (err) {
      logError("Failed to toggle bookmarklet server:", err);
      setError("Could not update the browser import helper");
    } finally {
      setLoading(false);
    }
  };

  const updatePort = async (newPort: number) => {
    try {
      setLoading(true);
      await invoke("set_bookmarklet_port", { port: newPort });
      setConfig({ ...config, port: newPort });
      setError(null);
    } catch (err) {
      logError("Failed to update bookmarklet port:", err);
      setError("Could not update the browser import connection");
    } finally {
      setLoading(false);
    }
  };

  const copyBookmarklet = async () => {
    try {
      await invoke("copy_bookmarklet_code");
      setCopied(true);
      setError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logError("Failed to copy browser import button:", err);
      setCopied(false);
      setError("Could not copy browser button. Allow clipboard access and try again.");
    }
  };

  if (loading && !config) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">Loading browser import settings...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Install Browser Button</h3>
          <p className="text-sm text-gray-400">
            Save job pages into JobSentinel from your browser
          </p>
        </div>
        <HelpIcon
          text="The browser import button saves the job page you are viewing into JobSentinel. It works best on official career pages and public job pages that show the full posting, and all processing stays on your computer."
          position="left"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Import Helper
            </label>
            <div className="flex items-center gap-3">
              <Badge variant={config.enabled ? "success" : "surface"}>
                {config.enabled ? "On" : "Off"}
              </Badge>
              <Button
                onClick={toggleServer}
                disabled={loading}
                variant={config.enabled ? "danger" : "primary"}
                size="sm"
              >
                {config.enabled ? "Turn Off" : "Turn On"}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="text-sm text-gray-400 hover:text-white underline"
            aria-expanded={showAdvanced}
          >
            Advanced connection settings
          </button>
          {showAdvanced && (
            <div className="mt-3 rounded-lg border border-gray-700 p-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Connection Number
              </label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => updatePort(Number(e.target.value))}
                disabled={config.enabled || loading}
                className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                min="1024"
                max="65535"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: 4321. Change only if support asks.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Set Up Browser Button</h4>

          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Browser button</span>
                <Button
                  onClick={copyBookmarklet}
                  size="sm"
                  variant="ghost"
                  disabled={!config.enabled}
                >
                  {copied ? "Copied!" : "Copy Browser Button"}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Hidden details include a local safety code. You do not need to read or edit it.
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-blue-400 mb-2">How to Set Up:</h5>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Turn on the import helper above</li>
                <li>Copy the browser button using the button above</li>
                <li>Create a new bookmark in your browser (Cmd/Ctrl+D)</li>
                <li>Name it "Import to JobSentinel"</li>
                <li>Paste the copied text into the bookmark address field</li>
                <li>Save the bookmark to your bookmarks bar</li>
                <li>Copy the browser button again after changing advanced settings or restarting JobSentinel</li>
              </ol>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-green-400 mb-2">How to Use:</h5>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Open an individual job page. Official career pages usually work best.</li>
                <li>Click the "Import to JobSentinel" button in your bookmarks bar</li>
                <li>JobSentinel saves the details it can read from that page</li>
                <li>You'll see a confirmation message</li>
              </ol>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-yellow-400 mb-2">Where It Works Best:</h5>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                <div>
                  <p className="font-medium">Official sources:</p>
                  <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                    <li>Company career pages</li>
                    <li>Official ATS job pages</li>
                    <li>Public pages with full job details</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Best page shape:</p>
                  <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                    <li>Career pages with job details on the page</li>
                    <li>One role per page</li>
                    <li>Pages opened by you in your browser</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Some large job boards block page import. JobSentinel does not bypass those
                controls. If a job saves with missing details, edit it after saving or use
                JobSentinel's search link for that site.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
