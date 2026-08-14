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
  Filler,
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
  Legend,
  Filler
);

export default function ChartContainer({ title, type = 'line', data, height = 260 }) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#94A3B8',
          font: {
            family: 'Inter',
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: '#1A202C',
        titleColor: '#F8FAFC',
        bodyColor: '#38BDF8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(30, 41, 59, 0.5)',
        },
        ticks: {
          color: '#64748B',
          font: {
            family: 'JetBrains Mono',
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(30, 41, 59, 0.5)',
        },
        ticks: {
          color: '#64748B',
          font: {
            family: 'JetBrains Mono',
            size: 11,
          },
        },
      },
    },
  };

  const defaultData = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    datasets: [
      {
        label: 'Events / Sec (Ingestion Throughput)',
        data: [120, 240, 480, 890, 650, 1120, 940],
        borderColor: '#38BDF8',
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#38BDF8',
      },
    ],
  };

  const chartData = data || defaultData;

  return (
    <div className="bg-[#111620] border border-[#1E293B] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#F8FAFC] tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
          {title}
        </h3>
        <span className="text-xs text-[#64748B] font-mono">Real-time Telemetry</span>
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
