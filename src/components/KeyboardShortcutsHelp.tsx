import { Modal } from './Modal';
import { useOnboarding } from './OnboardingTour';

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

// Exported for use in tooltips and button hints
export function ShortcutKey({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-mono bg-surface-100 dark:bg-surface-700 border border-surface-300 dark:border-surface-600 rounded shadow-sm">
      {children}
    </kbd>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between py-1.5" role="listitem">
      <span className="text-sm text-surface-600 dark:text-surface-400">
        {description}
      </span>
      <div className="flex items-center gap-1" role="group" aria-label={`Keyboard shortcut: ${keys.join(' or ')}`}>
        {keys.map((key, i) => (
          <span key={key} className="flex items-center gap-1">
            {i > 0 && <span className="text-xs text-surface-400" aria-hidden="true">or</span>}
            <ShortcutKey>{key}</ShortcutKey>
          </span>
        ))}
      </div>
    </div>
  );
}

function ShortcutSection({ title, shortcuts }: { title: string; shortcuts: { keys: string[]; description: string }[] }) {
  return (
    <div role="group" aria-labelledby={`shortcut-section-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <h4 id={`shortcut-section-${title.replace(/\s+/g, '-').toLowerCase()}`} className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-2">
        {title}
      </h4>
      <div className="space-y-0.5" role="list" aria-label={`${title} shortcuts`}>
        {shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.description} {...shortcut} />
        ))}
      </div>
    </div>
  );
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const { startTour, hasCompletedTour } = useOnboarding();

  const handleStartTour = () => {
    onClose();
    startTour();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="md"
    >
      <div className="grid grid-cols-2 gap-6 p-4" role="region" aria-label="Keyboard shortcuts reference">
        <div className="space-y-6">
          <ShortcutSection {...SHORTCUTS.navigation} />
          <ShortcutSection {...SHORTCUTS.actions} />
        </div>
        <div className="space-y-6">
          <ShortcutSection {...SHORTCUTS.global} />
          <ShortcutSection {...SHORTCUTS.filters} />
        </div>
      </div>

      <div className="border-t border-surface-200 dark:border-surface-700 px-4 py-3 bg-surface-50 dark:bg-surface-800/50 rounded-b-lg space-y-2" role="contentinfo">
        <p className="text-xs text-surface-500 dark:text-surface-400 text-center">
          Press <ShortcutKey>?</ShortcutKey> anytime to show this help
        </p>
        <div className="text-center pt-2 border-t border-surface-200 dark:border-surface-700">
          <button
            onClick={handleStartTour}
            className="text-xs text-sentinel-600 dark:text-sentinel-400 hover:text-sentinel-700 dark:hover:text-sentinel-300 underline"
            aria-label={hasCompletedTour ? 'Retake the guided tour' : 'Take a guided tour'}
          >
            {hasCompletedTour ? 'Retake the guided tour' : 'Take a guided tour'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
