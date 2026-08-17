import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function ChartContainer({
  title,
  subtitle,
  type = 'line',
  metrics = [],
  previousMetrics = [],
  granularity = 'day',
  height = 240,
  comparePeriod = true,
}) {
  let labels = [];
  let currentData = [];
  let previousData = [];

  if (metrics && metrics.length > 0) {
    const currentBucketMap = {};
    metrics.forEach((m) => {
      if (m.bucket) {
        currentBucketMap[m.bucket] = (currentBucketMap[m.bucket] || 0) + (m.count || 0);
      }
    });

    const sortedCurrentBuckets = Object.keys(currentBucketMap).sort((a, b) => new Date(a) - new Date(b));
    
    sortedCurrentBuckets.forEach((bucket) => {
      const d = new Date(bucket);
      const label =
        granularity === 'hour'
          ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      labels.push(label);
      currentData.push(currentBucketMap[bucket]);
    });

    if (previousMetrics && previousMetrics.length > 0) {
      const prevBucketMap = {};
      previousMetrics.forEach((pm) => {
        if (pm.bucket) {
          prevBucketMap[pm.bucket] = (prevBucketMap[pm.bucket] || 0) + (pm.count || 0);
        }
      });
      const sortedPrevBuckets = Object.keys(prevBucketMap).sort((a, b) => new Date(a) - new Date(b));
      sortedPrevBuckets.forEach((bucket) => {
        previousData.push(prevBucketMap[bucket]);
      });
    }
  }

  const datasets = [
    {
      label: 'Current Period',
      data: currentData,
      borderColor: '#3b82f6',
      backgroundColor: 'transparent',
      borderWidth: 2,
      fill: false,
      tension: 0.15,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointBackgroundColor: '#3b82f6',
      pointBorderWidth: 0,
    },
  ];

  if (comparePeriod && previousData.length > 0) {
    datasets.push({
      label: 'Previous Period',
      data: previousData,
      borderColor: '#71717a',
      borderDash: [4, 4],
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      fill: false,
      tension: 0.15,
      pointRadius: 0,
      pointHoverRadius: 3,
      pointBackgroundColor: '#71717a',
      pointBorderWidth: 0,
    });
  }

  const chartData = {
    labels,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: '#71717a',
          usePointStyle: true,
          pointStyleWidth: 6,
          boxWidth: 6,
          font: {
            family: 'Inter',
            size: 11,
            weight: '400',
          },
        },
      },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#f4f4f5',
        bodyColor: '#a1a1aa',
        borderColor: '#27272a',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US').format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(39, 39, 42, 0.25)',
          drawBorder: false,
        },
        ticks: {
          color: '#71717a',
          font: {
            family: 'JetBrains Mono',
            size: 10,
          },
          maxRotation: 0,
        },
      },
      y: {
        grid: {
          color: 'rgba(39, 39, 42, 0.25)',
          drawBorder: false,
        },
        ticks: {
          color: '#71717a',
          font: {
            family: 'JetBrains Mono',
            size: 10,
          },
          callback: (val) => {
            if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
            if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
            return val;
          },
        },
      },
    },
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h3 className="text-[13px] font-semibold text-[#f4f4f5] tracking-tight flex items-center gap-2">
            {title}
          </h3>
          {subtitle && <p className="text-[11px] text-[#a1a1aa] mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#71717a]">
            {granularity.toUpperCase()}
          </span>
        </div>
      </div>

      <div style={{ height: `${height}px` }}>
        {type === 'bar' ? (
          <Bar options={options} data={chartData} />
        ) : (
          <Line options={options} data={chartData} />
        )}
      </div>
    </div>
  );
}
