export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm font-bold">
        AI
      </div>
      <div className="rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}
