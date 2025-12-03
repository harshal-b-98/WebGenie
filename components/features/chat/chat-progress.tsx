interface ChatProgressProps {
  current: number;
  total: number;
}

export function ChatProgress({ current, total }: ChatProgressProps) {
  const percentage = Math.min((current / total) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 font-medium">Interview Progress</span>
        <span className="text-gray-500">
          {current} of {total} questions
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
