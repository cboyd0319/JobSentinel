import { useState, KeyboardEvent, memo } from "react";
import { Input, Button, Badge, HelpIcon } from "..";

interface FilterListInputProps {
  label: string;
  helpText?: string;
  placeholder?: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
  badgeVariant?: "sentinel" | "alert" | "surface" | "success" | "danger";
  emptyMessage?: string;
  testId?: string;
}

/**
 * Reusable component for input field + add button + badge list pattern.
 * Used throughout Settings for managing lists of job titles, skills, keywords, companies, etc.
 */
export const FilterListInput = memo(function FilterListInput({
  label,
  helpText,
  placeholder = "Add an item...",
  items,
  onAdd,
  onRemove,
  badgeVariant = "sentinel",
  emptyMessage = "No items added",
  testId,
}: FilterListInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <section className="mb-6" data-testid={testId}>
      <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
        {label}
        {helpText && <HelpIcon text={helpText} />}
      </h3>

      <div className="flex gap-2 mb-3">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label={label}
          autoComplete="off"
        />
        <Button onClick={handleAdd} disabled={!inputValue.trim()}>
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge
            key={item}
            variant={badgeVariant}
            removable
            onRemove={() => onRemove(item)}
          >
            {item}
          </Badge>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-surface-400">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
});
