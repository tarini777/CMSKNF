'use client'

import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

interface PaymentDistributionChartProps {
  data: Array<{ range: string; count: number; percentage: number }>
  title?: string
}

export default function PaymentDistributionChart({ data, title = "Payment Distribution" }: PaymentDistributionChartProps) {
  const colors = [
    'rgb(59, 130, 246)', // Blue-500
    'rgb(16, 185, 129)', // Emerald-500
    'rgb(245, 158, 11)', // Amber-500
    'rgb(239, 68, 68)',  // Red-500
    'rgb(139, 92, 246)', // Violet-500
    'rgb(236, 72, 153)', // Pink-500
  ]

  const chartData = {
    labels: data.map(item => item.range),
    datasets: [
      {
        data: data.map(item => item.count),
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length).map(color => color.replace('rgb', 'rgba').replace(')', ', 0.8)')),
        borderWidth: 2,
        hoverOffset: 10,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'rgb(107, 114, 128)', // Gray-500
          font: {
            size: 12,
            weight: '500' as const,
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
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
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.label || ''
            const value = context.parsed
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${label}: ${value} records (${percentage}%)`
          },
        },
      },
    },
    cutout: '60%',
    radius: '80%',
  }

  return (
    <div className="w-full h-80">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}
