'use client'

import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface AnomalyTypesChartProps {
  data: Array<{ type: string; count: number; percentage: number }>
  title?: string
}

export default function AnomalyTypesChart({ data, title = "Top Anomaly Types" }: AnomalyTypesChartProps) {
  const chartData = {
    labels: data.map(item => item.type),
    datasets: [
      {
        label: 'Count',
        data: data.map(item => item.count),
        backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red-500 with opacity
        borderColor: 'rgb(239, 68, 68)', // Red-500
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Percentage (%)',
        data: data.map(item => item.percentage),
        backgroundColor: 'rgba(245, 158, 11, 0.8)', // Amber-500 with opacity
        borderColor: 'rgb(245, 158, 11)', // Amber-500
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        yAxisID: 'y1',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(107, 114, 128)', // Gray-500
          font: {
            size: 12,
            weight: '500' as const,
          },
        },
      },
      title: {
        display: true,
        text: title,
        color: 'rgb(17, 24, 39)', // Gray-900
        font: {
          size: 16,
          weight: '600' as const,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'rgb(255, 255, 255)',
        bodyColor: 'rgb(255, 255, 255)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            if (label === 'Count') {
              return `${label}: ${value} records`
            } else {
              return `${label}: ${value}%`
            }
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Anomaly Type',
          color: 'rgb(107, 114, 128)',
          font: {
            size: 12,
            weight: '500' as const,
          },
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          maxRotation: 45,
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Count',
          color: 'rgb(107, 114, 128)',
          font: {
            size: 12,
            weight: '500' as const,
          },
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Percentage (%)',
          color: 'rgb(107, 114, 128)',
          font: {
            size: 12,
            weight: '500' as const,
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          callback: function(value: any) {
            return value + '%'
          },
        },
      },
    },
  }

  return (
    <div className="w-full h-80">
      <Bar data={chartData} options={options} />
    </div>
  )
}
