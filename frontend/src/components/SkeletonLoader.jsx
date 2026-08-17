import React from 'react';

export function SkeletonKpiGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-4 border-b border-[#27272a]">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 py-1">
          <div className="w-20 h-3 rounded skeleton-shimmer" />
          <div className="w-28 h-7 rounded skeleton-shimmer" />
          <div className="w-36 h-3 rounded skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 240 }) {
  return (
    <div className="py-4 border-b border-[#27272a] space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div className="space-y-2">
          <div className="w-32 h-4 rounded skeleton-shimmer" />
          <div className="w-48 h-3 rounded skeleton-shimmer" />
        </div>
        <div className="w-12 h-4 rounded skeleton-shimmer" />
      </div>
      <div style={{ height: `${height}px` }} className="w-full rounded skeleton-shimmer" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="py-4 space-y-3">
      <div className="w-28 h-4 rounded skeleton-shimmer mb-4" />
      <div className="border-b border-[#27272a] pb-2">
        <div className="w-full h-3 rounded skeleton-shimmer" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex justify-between items-center py-3 border-b border-[#18181b]">
          <div className="w-1/3 h-3 rounded skeleton-shimmer" />
          <div className="w-1/5 h-3 rounded skeleton-shimmer" />
          <div className="w-1/6 h-3 rounded skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}
