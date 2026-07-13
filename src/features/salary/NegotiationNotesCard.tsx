import { Card } from "../../components/Card";

export function NegotiationNotesCard({ notes }: { notes: string }) {
  return (
    <Card className="lg:col-span-2 dark:bg-surface-800">
      <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
        Negotiation Notes
      </h2>
      <div className="p-4 bg-surface-50 dark:bg-surface-700 rounded-lg">
        <pre className="whitespace-pre-wrap text-sm text-surface-700 dark:text-surface-300 font-mono">
          {notes}
        </pre>
      </div>
      <p className="mt-4 text-sm text-surface-500 dark:text-surface-400">
        Use these notes as a starting point. Do not add facts, offers, or legal claims unless
        they are true and current.
      </p>
    </Card>
  );
}
