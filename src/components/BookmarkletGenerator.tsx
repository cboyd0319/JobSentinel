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
  authToken: string;
}

const DEFAULT_BOOKMARKLET_CONFIG: BookmarkletConfig = {
  port: 4321,
  enabled: false,
  authToken: "",
};

function isBookmarkletConfig(value: unknown): value is BookmarkletConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as BookmarkletConfig).port === "number" &&
    typeof (value as BookmarkletConfig).enabled === "boolean" &&
    typeof (value as BookmarkletConfig).authToken === "string"
  );
}

export function BookmarkletGenerator() {
  const [config, setConfig] = useState<BookmarkletConfig>(DEFAULT_BOOKMARKLET_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const generateBookmarkletCode = () => {
    const port = config.port;
    const token = JSON.stringify(config.authToken);
    return `javascript:(function(){var scripts=document.querySelectorAll('script[type="application/ld+json"]');var job=null;scripts.forEach(function(s){try{var data=JSON.parse(s.textContent);if(data['@type']==='JobPosting')job=data;}catch(e){}});if(!job){var title=document.querySelector('h1');var company=document.querySelector('[class*="company"]')||document.querySelector('[class*="employer"]');var desc=document.querySelector('[class*="description"]')||document.querySelector('[class*="desc"]');job={title:title?title.textContent:'',company:company?company.textContent:'',description:desc?desc.textContent:'',url:window.location.href};}else{job.url=window.location.href;}fetch('http://localhost:${port}/api/bookmarklet/import',{method:'POST',headers:{'Content-Type':'application/json','X-JobSentinel-Token':${token}},body:JSON.stringify(job)}).then(function(r){if(r.ok){alert('Job imported to JobSentinel.');}else{alert('Could not save job. Make sure JobSentinel is open.');}}).catch(function(e){alert('Cannot connect to JobSentinel. Turn on the import helper in Settings.');});})();`;
  };

  const copyBookmarklet = () => {
    const code = generateBookmarkletCode();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <h3 className="text-lg font-semibold text-white mb-2">Browser Import Button</h3>
          <p className="text-sm text-gray-400">
            Import jobs from any website with one click
          </p>
        </div>
        <HelpIcon
          text="The browser import button saves the job page you are viewing into JobSentinel. It works on many job boards and company career pages, and all processing stays on your computer."
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

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Set Up Browser Button</h4>

          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Browser button setup code</span>
                <Button
                  onClick={copyBookmarklet}
                  size="sm"
                  variant="ghost"
                  disabled={!config.enabled}
                >
                  {copied ? "Copied!" : "Copy Setup Code"}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Setup code is hidden because it is long and includes a local safety token.
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-blue-400 mb-2">How to Set Up:</h5>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Turn on the import helper above</li>
                <li>Copy the setup code using the button above</li>
                <li>Create a new bookmark in your browser (Cmd/Ctrl+D)</li>
                <li>Name it "Import to JobSentinel"</li>
                <li>Paste the copied setup code into the bookmark address field</li>
                <li>Save the bookmark to your bookmarks bar</li>
                <li>Copy fresh setup code after changing the connection number or restarting JobSentinel</li>
              </ol>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-green-400 mb-2">How to Use:</h5>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Browse to any job posting (LinkedIn, Indeed, etc.)</li>
                <li>Click the "Import to JobSentinel" bookmark</li>
                <li>The job will be imported automatically</li>
                <li>You'll see a confirmation message</li>
              </ol>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-yellow-400 mb-2">Supported Sites:</h5>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                <div>
                  <p className="font-medium">Major Job Boards:</p>
                  <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                    <li>LinkedIn</li>
                    <li>Indeed</li>
                    <li>Glassdoor</li>
                    <li>ZipRecruiter</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Company Career Pages:</p>
                  <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                    <li>Google Careers</li>
                    <li>Microsoft Careers</li>
                    <li>Career pages with job details on the page</li>
                    <li>Most modern career sites</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Works best on individual job pages. If a job imports with missing details,
                edit it after saving.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
