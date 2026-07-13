import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { formatSetupPayFloorSummary, type SetupPayUnit } from "./setupWizardPreferences";
import { PayIcon } from "./SetupWizardIcons";

interface SetupWizardPayFloorSectionProps {
  payFloorInput: string;
  payFloorUnit: SetupPayUnit;
  salaryFloorUsd: number;
  onPayFloorChange: (value: string) => void;
  onPayNotSure: () => void;
  onPayUnitChange: (unit: SetupPayUnit) => void;
}

export function SetupWizardPayFloorSection({
  payFloorInput,
  payFloorUnit,
  salaryFloorUsd,
  onPayFloorChange,
  onPayNotSure,
  onPayUnitChange,
}: SetupWizardPayFloorSectionProps) {
  return (
    <div>
      <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
        <PayIcon /> Lowest Pay
      </h3>
      <p className="mb-3 text-sm text-surface-500">
        Optional. Add the lowest pay that would make a job worth considering.
      </p>
      <div className="space-y-2">
        <fieldset className="flex gap-2" aria-label="Pay unit">
          {(["yearly", "hourly"] as const).map((unit) => (
            <label
              key={unit}
              className={`
                flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm
                ${payFloorUnit === unit
                  ? "border-sentinel-500 bg-sentinel-50 text-surface-800"
                  : "border-surface-200 text-surface-600"
                }
              `}
            >
              <input
                type="radio"
                name="setup-pay-unit"
                value={unit}
                checked={payFloorUnit === unit}
                onChange={() => onPayUnitChange(unit)}
                className="h-4 w-4 border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
              />
              <span className="capitalize">{unit}</span>
            </label>
          ))}
        </fieldset>
        <Input
          label="Minimum pay"
          type="number"
          inputMode="numeric"
          min={0}
          step={payFloorUnit === "hourly" ? 0.5 : 1000}
          placeholder={payFloorUnit === "hourly" ? "e.g., 20" : "e.g., 60000"}
          value={payFloorInput}
          onChange={(e) => onPayFloorChange(e.target.value)}
          hint="Leave blank if unsure. Jobs without pay stay visible and marked."
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onPayNotSure}
          disabled={salaryFloorUsd === 0}
          aria-label="Not sure about pay yet"
        >
          Not sure yet
        </Button>
      </div>
      {salaryFloorUsd > 0 && (
        <p className="mt-2 text-sm text-surface-600">
          JobSentinel will warn when listed pay is below{" "}
          <span className="font-semibold text-surface-800">
            {formatSetupPayFloorSummary(salaryFloorUsd, payFloorUnit)
              .replace("At least ", "")}
          </span>
          .
        </p>
      )}
      {salaryFloorUsd === 0 && (
        <p className="mt-2 text-sm text-surface-600">
          Jobs without pay stay visible and marked.
        </p>
      )}
    </div>
  );
}
