import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import type { LocationInfo } from "../../utils/locationDetection";
import {
  BuildingIcon,
  GlobeIcon,
  MapPinIcon,
  OfficeIcon,
} from "./SetupWizardIcons";
import { LocationOption } from "./SetupWizardLocationOption";
import type { SetupConfig } from "./setupWizardPreferences";

type WorkLocationPreferenceKey = "allow_remote" | "allow_hybrid" | "allow_onsite";

interface SetupWizardLocationStepProps {
  cityInput: string;
  config: SetupConfig;
  detectedLocation: LocationInfo | null;
  hasSelectedWorkType: boolean;
  isDetectingLocation: boolean;
  onAddCity: () => void;
  onBack: () => void;
  onCityInputChange: (value: string) => void;
  onContinue: () => void;
  onDetectLocation: () => void;
  onLocationNotSure: () => void;
  onRemoveCity: (city: string) => void;
  onUseDetectedLocation: () => void;
  onWorkTypeChange: (key: WorkLocationPreferenceKey, checked: boolean) => void;
}

export function SetupWizardLocationStep({
  cityInput,
  config,
  detectedLocation,
  hasSelectedWorkType,
  isDetectingLocation,
  onAddCity,
  onBack,
  onCityInputChange,
  onContinue,
  onDetectLocation,
  onLocationNotSure,
  onRemoveCity,
  onUseDetectedLocation,
  onWorkTypeChange,
}: SetupWizardLocationStepProps) {
  const locationPreferences = config.location_preferences;
  const showCityControls =
    locationPreferences.allow_hybrid || locationPreferences.allow_onsite;
  const detectedLocationLabel = detectedLocation
    ? `${detectedLocation.city}, ${detectedLocation.region}`
    : "";
  const detectedLocationAdded =
    detectedLocationLabel.length > 0 &&
    locationPreferences.cities.includes(detectedLocationLabel);

  return (
    <div className="motion-safe:animate-slide-up">
      <div className="space-y-3 mb-6">
        <LocationOption
          label="Remote"
          description="Work from anywhere"
          checked={locationPreferences.allow_remote}
          onChange={(checked) => onWorkTypeChange("allow_remote", checked)}
          icon={<GlobeIcon />}
        />
        <LocationOption
          label="Hybrid"
          description="Mix of remote and office"
          checked={locationPreferences.allow_hybrid}
          onChange={(checked) => onWorkTypeChange("allow_hybrid", checked)}
          icon={<BuildingIcon />}
        />
        <LocationOption
          label="On-site"
          description="Work from the office"
          checked={locationPreferences.allow_onsite}
          onChange={(checked) => onWorkTypeChange("allow_onsite", checked)}
          icon={<OfficeIcon />}
        />
      </div>

      <div className="mb-6 rounded-lg border border-surface-200 bg-surface-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-surface-600">
            Not sure yet? Keep remote, hybrid, and on-site jobs visible.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onLocationNotSure}
            aria-label="Not sure about location yet"
          >
            Not sure yet
          </Button>
        </div>
        <p className="mt-2 text-xs text-surface-500">
          Add cities later if commute or office days start to matter.
        </p>
      </div>

      {showCityControls && (
        <div className="mb-6">
          {detectedLocation && (
            <div className="mb-3 p-3 bg-sentinel-50 border border-sentinel-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPinIcon />
                  <span className="text-sm text-sentinel-700">
                    Detected: <strong>{detectedLocationLabel}</strong>
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onUseDetectedLocation}
                  disabled={detectedLocationAdded}
                >
                  {detectedLocationAdded ? "Added" : "Use This"}
                </Button>
              </div>
            </div>
          )}

          {!detectedLocation && (
            <div className="mb-3 p-3 bg-surface-50 border border-surface-200 rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onDetectLocation}
                  loading={isDetectingLocation}
                  loadingText="Detecting..."
                  aria-describedby="setup-location-detection-privacy"
                  icon={<MapPinIcon />}
                >
                  Detect location
                </Button>
              </div>
              <p
                id="setup-location-detection-privacy"
                className="mt-2 text-xs text-surface-500"
              >
                Only when you use this button, JobSentinel asks an outside
                location lookup service for your approximate city from your
                internet address. Nothing is saved unless you add the city.
              </p>
            </div>
          )}

          <div className="flex gap-2 mb-3">
            <Input
              placeholder="e.g., Chicago, Austin"
              value={cityInput}
              onChange={(event) => onCityInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddCity();
                }
              }}
              leftIcon={<MapPinIcon />}
            />
            <Button onClick={onAddCity} disabled={!cityInput.trim()}>
              Add
            </Button>
          </div>
          {locationPreferences.cities.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-surface-50 rounded-lg">
              {locationPreferences.cities.map((city) => (
                <Badge
                  key={city}
                  variant="surface"
                  removable
                  onRemove={() => onRemoveCity(city)}
                >
                  {city}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1" size="lg">
          Back
        </Button>
        <Button
          onClick={onContinue}
          disabled={!hasSelectedWorkType}
          className="flex-1"
          size="lg"
        >
          Continue
        </Button>
      </div>
      {!hasSelectedWorkType && (
        <p className="mt-3 text-center text-sm text-amber-600">
          Choose at least one work location option to continue
        </p>
      )}
    </div>
  );
}
