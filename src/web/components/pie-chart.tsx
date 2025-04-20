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
  '#3498db', // Soft blue
  '#2ecc71', // Mint green
  '#9b59b6', // Muted purple
  '#e67e22', // Soft orange
  '#1abc9c', // Seafoam
  '#34495e', // Dark slate
  '#f1c40f', // Muted yellow
  '#16a085', // Deep teal
  '#8e44ad', // Deep purple
  '#d35400', // Burnt orange
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