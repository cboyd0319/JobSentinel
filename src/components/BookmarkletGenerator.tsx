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

const MIN_BOOKMARKLET_PORT = 1024;
const MAX_BOOKMARKLET_PORT = 65535;

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
  const [portInput, setPortInput] = useState(String(DEFAULT_BOOKMARKLET_CONFIG.port));
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const parsedPort = Number(portInput);
  const portChanged = portInput !== String(config.port);
  const portInputError =
    portChanged &&
    (!Number.isInteger(parsedPort) ||
      parsedPort < MIN_BOOKMARKLET_PORT ||
      parsedPort > MAX_BOOKMARKLET_PORT)
      ? `Use a number from ${MIN_BOOKMARKLET_PORT} to ${MAX_BOOKMARKLET_PORT}.`
      : null;

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const cfg = await invoke<BookmarkletConfig>("get_bookmarklet_config");
      const nextConfig = isBookmarkletConfig(cfg) ? cfg : DEFAULT_BOOKMARKLET_CONFIG;
      setConfig(nextConfig);
      setPortInput(String(nextConfig.port));
      setError(null);
    } catch (err) {
      logError("Failed to load bookmarklet config:", err);
      setError("Browser Import could not load. Close and reopen Settings. If this keeps happening, copy or save a safe support report from Settings.");
    } finally {
      setHasLoaded(true);
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
      setError("Browser Import could not be changed. Try again. If this keeps happening, copy or save a safe support report from Settings.");
    } finally {
      setLoading(false);
    }
  };

  const updatePort = async () => {
    if (portInputError || !portChanged) {
      return;
    }

    try {
      setLoading(true);
      await invoke("set_bookmarklet_port", { port: parsedPort });
      setConfig({ ...config, port: parsedPort });
      setPortInput(String(parsedPort));
      setError(null);
    } catch (err) {
      logError("Failed to update bookmarklet port:", err);
      setError("That browser button number could not be saved. Leave it unchanged unless JobSentinel help instructions give you a different number.");
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
      logError("Could not copy browser import button:", err);
      setCopied(false);
      setError("Could not copy Browser Button. Allow clipboard access, then click Copy Browser Button again. If this keeps happening, copy or save a safe support report from Settings.");
    }
  };

  if (loading && !hasLoaded) {
    return (
      <Card className="p-6" aria-busy="true">
        <div className="text-center text-gray-400">Loading Browser Import...</div>
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
          text="The browser import button saves the job page you are viewing into JobSentinel. Use it only on official career pages and trusted public job pages that show the full posting. All processing stays on your computer."
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
              Browser Import
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
            Optional browser button setting
          </button>
          {showAdvanced && (
            <div className="mt-3 rounded-lg border border-gray-700 p-4">
              <label htmlFor="bookmarklet-port" className="block text-sm font-medium text-gray-300 mb-2">
                Button setup number
              </label>
              <div className="flex flex-wrap items-start gap-3">
                <input
                  id="bookmarklet-port"
                  type="number"
                  value={portInput}
                  onChange={(e) => setPortInput(e.target.value)}
                  disabled={config.enabled || loading}
                  aria-invalid={Boolean(portInputError)}
                  aria-describedby={portInputError ? "bookmarklet-port-error" : "bookmarklet-port-help"}
                  className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  min={MIN_BOOKMARKLET_PORT}
                  max={MAX_BOOKMARKLET_PORT}
                />
                <Button
                  onClick={updatePort}
                  size="sm"
                  variant="secondary"
                  disabled={config.enabled || loading || !portChanged || Boolean(portInputError)}
                >
                  Save Number
                </Button>
              </div>
              {portInputError && (
                <p id="bookmarklet-port-error" className="text-xs text-red-400 mt-1">
                  {portInputError}
                </p>
              )}
              <p id="bookmarklet-port-help" className="text-xs text-gray-500 mt-1">
                Leave this number unchanged unless JobSentinel help instructions
                tell you otherwise.
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
                For your safety, copy a fresh browser button after each saved job, after
                about one hour, or if JobSentinel was closed and reopened.
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-blue-400 mb-2">Choose How to Save Jobs:</h5>
              <p className="text-sm text-gray-300 mb-3">
                Recommended: paste the job link into JobSentinel. Optional shortcut:
                use Browser Button only if you already use browser bookmarks or have
                step-by-step help for your browser.
              </p>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Turn on Browser Import above</li>
                <li>Copy the browser button using the button above</li>
                <li>Use your browser's Add Bookmark option</li>
                <li>Name it "Import to JobSentinel"</li>
                <li>Paste the copied text into the bookmark link field</li>
                <li>Save the bookmark to your bookmarks bar</li>
                <li>Copy the browser button again after each saved job, after about one hour, or if JobSentinel was closed and reopened</li>
              </ol>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-green-400 mb-2">How to Use:</h5>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Open an individual job page. Official career pages usually work best.</li>
                <li>Use the "Import to JobSentinel" button in your bookmarks bar</li>
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
                    <li>Company application pages</li>
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
                Some large job boards do not let JobSentinel read saved pages. JobSentinel
                respects those controls. If a job saves with missing details, edit it after saving or use
                JobSentinel's search link for that site.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
