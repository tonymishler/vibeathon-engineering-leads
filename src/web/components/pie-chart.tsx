"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface DataPoint {
  name: string;
  value: number;
  id?: string;
  color?: string;
}

interface PieChartProps {
  data: DataPoint[];
  onSliceClick?: (data: DataPoint) => void;
  title?: string;
}

const COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#6366F1', // indigo-500
  '#F59E0B', // amber-500
  '#EC4899', // pink-500
  '#8B5CF6', // violet-500
  '#14B8A6', // teal-500
  '#F97316', // orange-500
];

export function PieChartComponent({ data, onSliceClick, title }: PieChartProps) {
  return (
    <div className="relative h-full">
      {title && (
        <h3 className="absolute top-0 left-0 text-sm font-medium text-gray-500">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            onClick={(_, index) => onSliceClick?.(data[index])}
            cursor={onSliceClick ? 'pointer' : undefined}
            animationBegin={0}
            animationDuration={500}
            animationEasing="ease-out"
          >
            {data.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={data[index].color || COLORS[index % COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value} opportunities`, 'Count']}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
} 