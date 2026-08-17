import React from 'react';

export default function EmptyState({
  title = 'No events yet',
  description = 'Once your application starts sending events, your analytics will appear here.',
  onOpenSimulator,
  onOpenDocs,
  onCreateApp,
  hasApps = true,
}) {
  return (
    <div className="text-center max-w-md mx-auto py-16 space-y-4 font-sans">
      <div>
        <h3 className="text-sm font-semibold text-[#f4f4f5]">{title}</h3>
        <p className="text-xs text-[#a1a1aa] mt-1.5 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        {!hasApps ? (
          <button
            onClick={onCreateApp}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
          >
            Create Application
          </button>
        ) : (
          <>
            {onOpenSimulator && (
              <button
                onClick={onOpenSimulator}
                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              >
                Send Test Event
              </button>
            )}

            {onOpenDocs && (
              <button
                onClick={onOpenDocs}
                className="text-[#3b82f6] hover:text-[#2563eb] transition-colors text-xs font-medium cursor-pointer"
              >
                View API documentation
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
