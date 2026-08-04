'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Cell
} from 'recharts';
import { PUBLIC_STATUS_LABELS } from '@/lib/validations/cases';

const GOLD = '#C9A24B';
const GOLD_LIGHT = '#F0DEA9';

function tooltipStyle() {
  return {
    contentStyle: {
      background: 'rgba(0,0,0,0.9)',
      border: '1px solid rgba(201,162,75,0.3)',
      borderRadius: 12,
      color: '#fff',
      fontSize: 12
    },
    itemStyle: { color: '#fff' },
    labelStyle: { color: '#F0DEA9', fontSize: 11 }
  };
}

export function CasesLast30dChart({
  data
}: {
  data: { day: string; count: number }[];
}) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="goldStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={GOLD} />
              <stop offset="100%" stopColor={GOLD_LIGHT} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="day"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
            interval="preserveStartEnd"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip {...tooltipStyle()} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="url(#goldStroke)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: GOLD_LIGHT, stroke: GOLD }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CasesByStatusChart({
  data
}: {
  data: { status: string; count: number }[];
}) {
  const chartData = data.slice(0, 8).map((d) => ({
    label:
      PUBLIC_STATUS_LABELS[d.status as keyof typeof PUBLIC_STATUS_LABELS] ?? d.status,
    count: d.count
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip {...tooltipStyle()} />
          <Bar dataKey="count" fill={GOLD} radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={i === 0 ? GOLD_LIGHT : GOLD} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueLast6MonthsChart({
  data
}: {
  data: { month: string; total: number }[];
}) {
  const chartData = data.map((d) => {
    const [y, m] = d.month.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return {
      label: `${monthNames[parseInt(m) - 1]}/${y.slice(2)}`,
      total: d.total
    };
  });

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="goldBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD_LIGHT} stopOpacity={0.9} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
            }
          />
          <Tooltip
            {...tooltipStyle()}
            formatter={(value: number) => [
              `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              'Faturado'
            ]}
          />
          <Bar dataKey="total" fill="url(#goldBar)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
