import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card } from "./";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartData = Record<string, any>;

interface TrendChartProps {
  data: ChartData[];
  type: "line" | "bar";
  title: string;
  xKey: string;
  yKey: string;
  yLabel?: string;
  color?: string;
  height?: number;
  loading?: boolean;
  emptyMessage?: string;
}

export function TrendChart({
  data,
  type,
  title,
  xKey,
  yKey,
  yLabel,
  color = "#6366f1",
  height = 250,
  loading = false,
  emptyMessage = "No data available",
}: TrendChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      [xKey]: String(item[xKey]),
      [yKey]: Number(item[yKey]) || 0,
    }));
  }, [data, xKey, yKey]);

  if (loading) {
    return (
      <Card className="dark:bg-surface-800">
        <h3 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
          {title}
        </h3>
        <div className="animate-pulse">
          <div className="h-[250px] bg-surface-200 dark:bg-surface-700 rounded" />
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="dark:bg-surface-800">
        <h3 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
          {title}
        </h3>
        <div className="h-[250px] flex items-center justify-center">
          <p className="text-surface-500 dark:text-surface-400">{emptyMessage}</p>
        </div>
      </Card>
    );
  }

  const commonProps = {
    data: chartData,
    margin: { top: 5, right: 20, left: 10, bottom: 5 },
  };

  return (
    <Card className="dark:bg-surface-800">
      <h3 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        {type === "line" ? (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey={xKey}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickLine={{ stroke: "#6b7280" }}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickLine={{ stroke: "#6b7280" }}
              label={
                yLabel
                  ? {
                      value: yLabel,
                      angle: -90,
                      position: "insideLeft",
                      fill: "#9ca3af",
                      fontSize: 12,
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "0.5rem",
                color: "#f9fafb",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: color }}
            />
          </LineChart>
        ) : (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey={xKey}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickLine={{ stroke: "#6b7280" }}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickLine={{ stroke: "#6b7280" }}
              label={
                yLabel
                  ? {
                      value: yLabel,
                      angle: -90,
                      position: "insideLeft",
                      fill: "#9ca3af",
                      fontSize: 12,
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "0.5rem",
                color: "#f9fafb",
              }}
            />
            <Legend />
            <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Card>
  );
}
