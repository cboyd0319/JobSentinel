import { Button } from "../../../ui/Button";
import { Card } from "../../../ui/Card";

export function DashboardErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center p-4">
      <Card className="max-w-md text-center py-8 dark:bg-surface-800">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 dark:text-red-400 text-xl">!</span>
        </div>
        <h2 className="font-display text-display-md text-surface-900 dark:text-white mb-2">
          JobSentinel needs attention
        </h2>
        <p className="text-surface-500 dark:text-surface-400 mb-4">{error}</p>
        <Button onClick={onRetry}>Try Again</Button>
      </Card>
    </div>
  );
}
