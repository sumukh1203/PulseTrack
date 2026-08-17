import React from 'react';

export default function ErrorState({
  title = 'Couldn\'t load analytics.',
  message = 'Try again.',
  onRetry,
}) {
  return (
    <div className="text-center max-w-sm mx-auto py-16 space-y-4 font-sans">
      <div>
        <h3 className="text-sm font-semibold text-[#ef4444]">{title}</h3>
        {message && <p className="text-xs text-[#a1a1aa] mt-1.5">{message}</p>}
      </div>

      {onRetry && (
        <div className="flex justify-center pt-1">
          <button
            onClick={onRetry}
            className="bg-[#18181b] hover:bg-[#27272a] text-[#f4f4f5] border border-[#27272a] px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
