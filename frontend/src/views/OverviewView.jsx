import React, { useState } from 'react';
import KpiCard from '../components/KpiCard';
import ChartContainer from '../components/ChartContainer';
import EventBreakdownTable from '../components/EventBreakdownTable';
import RecentActivity from '../components/RecentActivity';
import { SkeletonKpiGrid, SkeletonChart, SkeletonTable } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { getStoredApiKey, storeApiKey } from '../services/api';

export default function OverviewView({
  selectedApp,
  analytics,
  onSelectEvent,
  onOpenSimulator,
  onOpenDocs,
  onCreateApp,
  onOpenSettings,
}) {
  const { loading, error, currentMetrics, previousMetrics, granularity, comparePeriod, analyticsSummary, loadAnalytics, recentEvents } = analytics;
  const [tempKey, setTempKey] = useState('');
  const [inputError, setInputError] = useState('');

  const hasKey = selectedApp ? !!getStoredApiKey(selectedApp.id) : true;

  if (selectedApp && !hasKey) {
    const handleSaveKey = (e) => {
      e.preventDefault();
      if (!tempKey.trim().startsWith('pt_live_')) {
        setInputError('API Key must start with "pt_live_"');
        return;
      }
      storeApiKey(selectedApp.id, tempKey.trim());
      setInputError('');
      loadAnalytics();
    };

    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-[#18181b] border border-[#27272a] rounded-lg space-y-6 font-sans">
        <div className="space-y-2 text-center">
          <h2 className="text-sm font-bold text-[#f4f4f5] tracking-tight">API Key Required</h2>
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            Analytics metrics for <span className="font-semibold text-[#f4f4f5]">"{selectedApp.name}"</span> are secured. Please enter the API Key issued during registration to unlock the dashboard.
          </p>
        </div>

        <form onSubmit={handleSaveKey} className="space-y-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#71717a] mb-1.5 block">
              Ingestion API Key
            </label>
            <input
              type="password"
              placeholder="pt_live_..."
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-3.5 py-2 font-mono text-xs text-[#38bdf8] focus:outline-none focus:border-[#3b82f6] placeholder-[#3f3f46]"
            />
            {inputError && (
              <span className="text-[10px] text-red-500 mt-1 block font-medium">{inputError}</span>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-[#fafafa] hover:bg-[#e4e4e7] text-[#18181b] font-semibold py-2 rounded-md text-xs transition-colors focus:outline-none cursor-pointer"
          >
            Unlock Dashboard
          </button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8 font-sans">
        <div className="mb-4 space-y-2">
          <div className="w-32 h-6 rounded skeleton-shimmer" />
          <div className="w-56 h-4 rounded skeleton-shimmer" />
        </div>
        <SkeletonKpiGrid />
        <SkeletonChart height={240} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <SkeletonTable rows={5} />
          <SkeletonTable rows={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadAnalytics} />;
  }

  const {
    totalEvents,
    eventsDeltaPct,
    activeEventTypesCount,
    eventsPerDay,
    eventsPerDayDeltaPct,
    breakdownList,
  } = analyticsSummary;

  // Render empty state if no events captured for this app
  if (totalEvents === 0 && (!currentMetrics || currentMetrics.length === 0)) {
    return (
      <div className="font-sans">
        <div className="mb-8 border-b border-[#27272a] pb-6">
          <h1 className="text-xl font-bold tracking-tight text-[#f4f4f5]">Overview</h1>
          <p className="text-xs text-[#a1a1aa] mt-1">Understand how your application is being used.</p>
        </div>
        <EmptyState
          title="No events tracked yet"
          description={`No telemetry events have been ingested for application "${selectedApp?.name || 'Selected Application'}". Start sending events using the cURL or SDK snippet.`}
          onOpenSimulator={onOpenSimulator}
          onOpenDocs={onOpenDocs}
          onCreateApp={onCreateApp}
          hasApps={!!selectedApp}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="border-b border-[#27272a] pb-4">
        <h1 className="text-lg font-bold tracking-tight text-[#f4f4f5]">Overview</h1>
        <p className="text-xs text-[#a1a1aa] mt-0.5">Understand how your application is being used.</p>
      </div>

      {/* Level 1 — Flat KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-2 border-b border-[#27272a]">
        <KpiCard
          title="Total Events"
          value={new Intl.NumberFormat('en-US').format(totalEvents)}
          trendPct={eventsDeltaPct}
        />

        <KpiCard
          title="Active Event Types"
          value={activeEventTypesCount}
          trendPct={null}
        />

        <KpiCard
          title="Events / Day"
          value={new Intl.NumberFormat('en-US').format(eventsPerDay)}
          trendPct={eventsPerDayDeltaPct}
        />
      </div>

      {/* Level 2 — Flat Time-Series Chart */}
      <div className="border-b border-[#27272a] pb-4">
        <ChartContainer
          title="Event activity"
          metrics={currentMetrics}
          previousMetrics={previousMetrics}
          granularity={granularity}
          comparePeriod={comparePeriod}
          height={260}
        />
      </div>

      {/* Level 3 — Split Row: Breakdown vs Recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-2">
        <EventBreakdownTable breakdownList={breakdownList} onSelectEvent={onSelectEvent} />
        <RecentActivity recentEvents={recentEvents} onSelectEvent={onSelectEvent} />
      </div>

      {/* Footer System Health status bar */}
      <div className="mt-12 pt-4 border-t border-[#27272a] flex items-center justify-between text-[11px] text-[#71717a] font-mono">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 hover:text-[#a1a1aa] transition-colors cursor-pointer bg-transparent border-none p-0 focus:outline-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-status-pulse" />
          <span>System operational</span>
        </button>
        <span>Tenant Isolation Enforced</span>
      </div>
    </div>
  );
}
