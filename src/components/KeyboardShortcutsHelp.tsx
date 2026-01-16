import { Modal } from './Modal';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = {
  navigation: {
    title: 'Navigation',
    shortcuts: [
      { keys: ['j', '↓'], description: 'Move down' },
      { keys: ['k', '↑'], description: 'Move up' },
      { keys: ['Home'], description: 'Go to first item' },
      { keys: ['End'], description: 'Go to last item' },
      { keys: ['Esc'], description: 'Clear selection' },
    ],
  },
  actions: {
    title: 'Job Actions',
    shortcuts: [
      { keys: ['o', 'Enter'], description: 'Open job' },
      { keys: ['h', 'Del'], description: 'Hide job' },
      { keys: ['b'], description: 'Toggle bookmark' },
      { keys: ['n'], description: 'Add/edit notes' },
      { keys: ['c'], description: 'Research company' },
      { keys: ['x'], description: 'Toggle selection' },
    ],
  },
  global: {
    title: 'Global',
    shortcuts: [
      { keys: ['⌘K'], description: 'Open command palette' },
      { keys: ['⌘,'], description: 'Open settings' },
      { keys: ['⌘1-5'], description: 'Switch pages' },
      { keys: ['⌘Z'], description: 'Undo last action' },
      { keys: ['⌘⇧Z'], description: 'Redo' },
      { keys: ['?'], description: 'Show this help' },
    ],
  },
  filters: {
    title: 'Filters & Search',
    shortcuts: [
      { keys: ['/'], description: 'Focus search' },
      { keys: ['r'], description: 'Refresh jobs' },
    ],
  },
};

function ShortcutKey({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-mono bg-surface-100 dark:bg-surface-700 border border-surface-300 dark:border-surface-600 rounded shadow-sm">
      {children}
    </kbd>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-surface-600 dark:text-surface-400">
        {description}
      </span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={key} className="flex items-center gap-1">
            {i > 0 && <span className="text-xs text-surface-400">or</span>}
            <ShortcutKey>{key}</ShortcutKey>
          </span>
        ))}
      </div>
    </div>
  );
}

function ShortcutSection({ title, shortcuts }: { title: string; shortcuts: { keys: string[]; description: string }[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-2">
        {title}
      </h4>
      <div className="space-y-0.5">
        {shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.description} {...shortcut} />
        ))}
      </div>
    </div>
  );
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="md"
    >
      <div className="grid grid-cols-2 gap-6 p-4">
        <div className="space-y-6">
          <ShortcutSection {...SHORTCUTS.navigation} />
          <ShortcutSection {...SHORTCUTS.actions} />
        </div>
        <div className="space-y-6">
          <ShortcutSection {...SHORTCUTS.global} />
          <ShortcutSection {...SHORTCUTS.filters} />
        </div>
      </div>

      <div className="border-t border-surface-200 dark:border-surface-700 px-4 py-3 bg-surface-50 dark:bg-surface-800/50 rounded-b-lg">
        <p className="text-xs text-surface-500 dark:text-surface-400 text-center">
          Press <ShortcutKey>?</ShortcutKey> anytime to show this help
        </p>
      </div>
    </Modal>
  );
}
