import { Button } from "../../../../components/Button";
import { RESTRICTED_JOB_SOURCE_WARNING } from "../../../../shared/restrictedSourceTaxonomy";

export const MIN_BROWSER_IMPORT_PORT = 1024;
export const MAX_BROWSER_IMPORT_PORT = 65535;

interface BrowserImportControlsProps {
  copied: boolean;
  enabled: boolean;
  loading: boolean;
  onCopy: () => void;
  onPortInputChange: (value: string) => void;
  onRestrictedSiteAcknowledgedChange: (value: boolean) => void;
  onSavePort: () => void;
  onToggleAdvanced: () => void;
  portChanged: boolean;
  portInput: string;
  portInputError: string | null;
  restrictedSiteAcknowledged: boolean;
  showAdvanced: boolean;
}

export function BrowserImportControls({
  copied,
  enabled,
  loading,
  onCopy,
  onPortInputChange,
  onRestrictedSiteAcknowledgedChange,
  onSavePort,
  onToggleAdvanced,
  portChanged,
  portInput,
  portInputError,
  restrictedSiteAcknowledged,
  showAdvanced,
}: BrowserImportControlsProps) {
  return (
    <>
      <div>
        <button
          type="button"
          onClick={onToggleAdvanced}
          className="text-sm text-gray-400 hover:text-white underline"
          aria-expanded={showAdvanced}
        >
          Optional browser button setting
        </button>
        {showAdvanced && (
          <div className="mt-3 rounded-lg border border-gray-700 p-4">
            <label
              htmlFor="bookmarklet-port"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Button setup number
            </label>
            <div className="flex flex-wrap items-start gap-3">
              <input
                id="bookmarklet-port"
                type="number"
                value={portInput}
                onChange={(event) => onPortInputChange(event.target.value)}
                disabled={enabled || loading}
                aria-invalid={Boolean(portInputError)}
                aria-describedby={
                  portInputError
                    ? "bookmarklet-port-error"
                    : "bookmarklet-port-help"
                }
                className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                min={MIN_BROWSER_IMPORT_PORT}
                max={MAX_BROWSER_IMPORT_PORT}
              />
              <Button
                onClick={onSavePort}
                size="sm"
                variant="secondary"
                disabled={
                  enabled || loading || !portChanged || Boolean(portInputError)
                }
              >
                Save Number
              </Button>
            </div>
            {portInputError && (
              <p
                id="bookmarklet-port-error"
                className="text-xs text-red-400 mt-1"
              >
                {portInputError}
              </p>
            )}
            <p
              id="bookmarklet-port-help"
              className="text-xs text-gray-500 mt-1"
            >
              Leave this number unchanged unless JobSentinel help instructions
              tell you otherwise.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">
          Set Up Browser Button
        </h4>
        <div className="space-y-3">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Browser button</span>
              <Button
                onClick={onCopy}
                size="sm"
                variant="ghost"
                disabled={!enabled || !restrictedSiteAcknowledged}
              >
                {copied ? "Copied!" : "Copy Browser Button"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              For your safety, copy a fresh browser button after each import,
              after about one hour, or if JobSentinel was closed and reopened.
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h5 className="text-sm font-medium text-blue-400 mb-2">
              Choose How to Save Jobs:
            </h5>
            <p className="text-sm text-gray-300 mb-3">
              Recommended: use the browser button on a job page or supported
              jobs list. It adds the page or visible job cards you choose to a
              review list in JobSentinel. Paste a link only when the browser
              button cannot read the page.
            </p>
            <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
              <li>Turn on Browser Import above</li>
              <li>Copy the browser button using the button above</li>
              <li>Use your browser's Add Bookmark option</li>
              <li>Name it "Import to JobSentinel"</li>
              <li>Paste the copied text into the bookmark link field</li>
              <li>Save the bookmark to your bookmarks bar</li>
              <li>
                Copy the browser button again after each import, after about one
                hour, or if JobSentinel was closed and reopened
              </li>
            </ol>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <h5 className="text-sm font-medium text-green-400 mb-2">
              How to Use:
            </h5>
            <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
              <li>Open an individual job page or a supported jobs list.</li>
              <li>
                Use the saved "Import to JobSentinel" item in your bookmarks
                bar.
              </li>
              <li>
                JobSentinel adds the current posting or visible job cards it can
                read to your review list
              </li>
              <li>Return here, check the details, then save the job.</li>
            </ol>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <h5 className="text-sm font-medium text-yellow-400 mb-2">
              Where It Works Best:
            </h5>
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
                  <li>Supported job lists with visible cards</li>
                  <li>Pages opened by you in your browser</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Some large job boards do not let JobSentinel read saved pages.
              JobSentinel respects those controls. If a job appears with missing
              details, edit it after saving or use JobSentinel's search link for
              that site.
            </p>
          </div>

          <div className="bg-amber-500/15 border-2 border-amber-400/60 rounded-lg p-5">
            <h5 className="text-base font-semibold text-amber-200 mb-2">
              Restricted Site Warning
            </h5>
            <p className="text-sm leading-6 text-amber-50">
              {RESTRICTED_JOB_SOURCE_WARNING} Use Browser Import only on pages
              you choose, and verify the saved details before using them.
            </p>
            <label className="mt-4 flex items-start gap-3 text-sm font-medium text-amber-50">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 rounded border-amber-300 bg-gray-900 text-amber-400 focus:ring-amber-400"
                checked={restrictedSiteAcknowledged}
                onChange={(event) =>
                  onRestrictedSiteAcknowledgedChange(event.target.checked)
                }
              />
              <span>
                I understand this risk and want to use Browser Import on pages I
                choose.
              </span>
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
