export interface Shortcut {
  key: string;
  modifiers: ("meta" | "ctrl" | "alt" | "shift")[];
  description: string;
  action: () => void;
  category: "navigation" | "actions" | "ui";
}
