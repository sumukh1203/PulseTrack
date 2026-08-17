import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchMetrics, fetchRecentEvents } from '../services/api';

/**
 * Calculates start and end Date objects for preset ranges
 */
export function getDateRangeWindow(rangeKey, customStart = null, customEnd = null) {
  const now = new Date();
  let end = new Date(now);
  let start = new Date(now);

  switch (rangeKey) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case '7d':
      start.setDate(now.getDate() - 7);
      break;
    case '30d':
      start.setDate(now.getDate() - 30);
      break;
    case '90d':
      start.setDate(now.getDate() - 90);
      break;
    case 'custom':
      if (customStart) start = new Date(customStart);
      if (customEnd) end = new Date(customEnd);
      break;
    default: // 7d
      start.setDate(now.getDate() - 7);
      break;
  }

  return { start, end };
}

/**
 * Given a current range window [start, end], calculates the matching previous period window
 */
export function getPreviousPeriodWindow(start, end) {
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { start: prevStart, end: prevEnd };
}

export function useAnalytics(selectedApp) {
  const [dateRange, setDateRange] = useState('7d'); // 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [comparePeriod, setComparePeriod] = useState(true);
  const [granularity, setGranularity] = useState('day');
  const [selectedEventFilter, setSelectedEventFilter] = useState('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentMetrics, setCurrentMetrics] = useState([]);
  const [previousMetrics, setPreviousMetrics] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Compute active date windows
  const { start: startDate, end: endDate } = useMemo(
    () => getDateRangeWindow(dateRange, customStart, customEnd),
    [dateRange, customStart, customEnd]
  );

  const { start: prevStartDate, end: prevEndDate } = useMemo(
    () => getPreviousPeriodWindow(startDate, endDate),
    [startDate, endDate]
  );

  // Auto-switch granularity based on duration
  useEffect(() => {
    const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
    if (durationDays <= 2 && granularity !== 'hour') {
      setGranularity('hour');
    } else if (durationDays > 2 && granularity !== 'day') {
      setGranularity('day');
    }
  }, [startDate, endDate]);

  const loadAnalytics = useCallback(async () => {
    if (!selectedApp?.id) {
      setLoading(false);
      setCurrentMetrics([]);
      setPreviousMetrics([]);
      setRecentEvents([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const eventFilterParam = selectedEventFilter !== 'all' ? selectedEventFilter : undefined;

      const currentParams = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        granularity: granularity,
        ...(eventFilterParam ? { event_name: eventFilterParam } : {}),
      };

      const prevParams = {
        start_date: prevStartDate.toISOString(),
        end_date: prevEndDate.toISOString(),
        granularity: granularity,
        ...(eventFilterParam ? { event_name: eventFilterParam } : {}),
      };

      // Fetch parallel metrics & recent events
      const [currRes, prevRes, eventsRes] = await Promise.all([
        fetchMetrics(selectedApp.id, currentParams),
        comparePeriod ? fetchMetrics(selectedApp.id, prevParams) : Promise.resolve(null),
        fetchRecentEvents(selectedApp.id, null, 50),
      ]);

      if (currRes === null || (comparePeriod && prevRes === null)) {
        throw new Error('Metrics API request failed');
      }

      setCurrentMetrics(currRes?.data || []);
      setPreviousMetrics(prevRes?.data || []);
      setRecentEvents(eventsRes || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Analytics load error:', err);
      setError('Unable to retrieve metrics right now. Please verify system status.');
    } finally {
      setLoading(false);
    }
  }, [
    selectedApp?.id,
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    granularity,
    selectedEventFilter,
    comparePeriod,
  ]);

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [loadAnalytics]);

  // Derived Metrics & Calculations
  const analyticsSummary = useMemo(() => {
    const totalEvents = currentMetrics.reduce((sum, item) => sum + (item.count || 0), 0);
    const totalEventsPrev = previousMetrics.reduce((sum, item) => sum + (item.count || 0), 0);

    let eventsDeltaPct = 0;
    if (totalEventsPrev > 0) {
      eventsDeltaPct = Math.round(((totalEvents - totalEventsPrev) / totalEventsPrev) * 1000) / 10;
    } else if (totalEvents > 0) {
      eventsDeltaPct = 100;
    }

    // Active event types
    const eventTypeMap = {};
    currentMetrics.forEach((m) => {
      if (m.event_name) {
        eventTypeMap[m.event_name] = (eventTypeMap[m.event_name] || 0) + m.count;
      }
    });

    const activeEventTypesCount = Object.keys(eventTypeMap).length;

    // Days count in range
    const daysCount = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24))
    );
    const eventsPerDay = Math.round(totalEvents / daysCount);

    const prevDaysCount = Math.max(
      1,
      Math.round((prevEndDate.getTime() - prevStartDate.getTime()) / (1000 * 3600 * 24))
    );
    const prevEventsPerDay = Math.round(totalEventsPrev / prevDaysCount);

    let eventsPerDayDeltaPct = 0;
    if (prevEventsPerDay > 0) {
      eventsPerDayDeltaPct =
        Math.round(((eventsPerDay - prevEventsPerDay) / prevEventsPerDay) * 1000) / 10;
    } else if (eventsPerDay > 0) {
      eventsPerDayDeltaPct = 100;
    }

    // Peak Activity calculation
    let maxBucketCount = 0;
    let peakBucketTime = 'N/A';

    const bucketCounts = {};
    currentMetrics.forEach((m) => {
      if (m.bucket) {
        bucketCounts[m.bucket] = (bucketCounts[m.bucket] || 0) + (m.count || 0);
      }
    });

    Object.entries(bucketCounts).forEach(([bucket, totalCount]) => {
      if (totalCount > maxBucketCount) {
        maxBucketCount = totalCount;
        const d = new Date(bucket);
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        peakBucketTime = `${dayStr} · ${timeStr}`;
      }
    });

    // Event Breakdown ranking
    const breakdownList = Object.entries(eventTypeMap).map(([name, count]) => {
      const share = totalEvents > 0 ? Math.round((count / totalEvents) * 1000) / 10 : 0;

      // Estimate previous count for event if available
      const prevCount = previousMetrics
        .filter((pm) => pm.event_name === name)
        .reduce((sum, pm) => sum + pm.count, 0);

      let delta = 0;
      if (prevCount > 0) {
        delta = Math.round(((count - prevCount) / prevCount) * 1000) / 10;
      }

      return {
        event_name: name,
        events: count,
        share: share,
        delta: delta,
      };
    });

    breakdownList.sort((a, b) => b.events - a.events);

    // What's Changed insights
    let biggestIncrease = null;
    let biggestDecrease = null;

    if (breakdownList.length > 0) {
      const sortedByDelta = [...breakdownList].sort((a, b) => b.delta - a.delta);
      if (sortedByDelta[0] && sortedByDelta[0].delta > 0) {
        biggestIncrease = sortedByDelta[0];
      }
      const lowestDelta = sortedByDelta[sortedByDelta.length - 1];
      if (lowestDelta && lowestDelta.delta < 0) {
        biggestDecrease = lowestDelta;
      }
    }

    const mostActiveEvent = breakdownList.length > 0 ? breakdownList[0] : null;

    // Build Activity Heatmap Matrix (7 Days x 24 Hours)
    // Days: 0 (Sun) - 6 (Sat)
    const heatmapGrid = Array.from({ length: 7 }, () => Array(24).fill(0));
    currentMetrics.forEach((m) => {
      if (m.bucket) {
        const d = new Date(m.bucket);
        const dayIdx = d.getDay(); // 0 is Sunday
        const hourIdx = d.getHours();
        heatmapGrid[dayIdx][hourIdx] += m.count;
      }
    });

    return {
      totalEvents,
      totalEventsPrev,
      eventsDeltaPct,
      activeEventTypesCount,
      eventsPerDay,
      eventsPerDayDeltaPct,
      peakBucketTime,
      breakdownList,
      whatsChanged: {
        biggestIncrease,
        biggestDecrease,
        mostActiveEvent,
        peakActivity: peakBucketTime,
      },
      heatmapGrid,
    };
  }, [currentMetrics, previousMetrics, recentEvents, startDate, endDate, prevStartDate, prevEndDate]);

  return {
    dateRange,
    setDateRange,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    comparePeriod,
    setComparePeriod,
    granularity,
    setGranularity,
    selectedEventFilter,
    setSelectedEventFilter,
    loading,
    error,
    currentMetrics,
    previousMetrics,
    recentEvents,
    lastRefreshed,
    loadAnalytics,
    analyticsSummary,
  };
}
