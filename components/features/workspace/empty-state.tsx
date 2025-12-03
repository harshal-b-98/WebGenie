import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateClick: () => void;
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="text-center">
      <svg
        className="mx-auto h-24 w-24 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
        />
      </svg>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">No projects yet</h3>
      <p className="mt-2 text-sm text-gray-500">
        Get started by creating your first AI-powered website
      </p>
      <div className="mt-6">
        <Button onClick={onCreateClick} size="lg">
          Create Your First Website
        </Button>
      </div>
    </div>
  );
}
