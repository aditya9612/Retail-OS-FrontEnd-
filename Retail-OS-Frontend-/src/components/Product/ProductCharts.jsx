import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const stockData = [
  { month: "Jan", stock: 120, movement: 35 },
  { month: "Feb", stock: 180, movement: 42 },
  { month: "Mar", stock: 150, movement: 47 },
  { month: "Apr", stock: 210, movement: 41 },
  { month: "May", stock: 260, movement: 52 },
  { month: "Jun", stock: 220, movement: 45 },
];

const ProductCharts = () => {
  return (
    <div className="dash-charts-row">
      {/* Inventory Chart */}
      <div className="chart-card">
        <div className="chart-card-header">
          <h2 className="chart-title">
            Monthly Inventory Volume
          </h2>
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={stockData}
            margin={{
              top: 8,
              right: 8,
              bottom: 0,
              left: -20,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              vertical={false}
            />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 11,
                fill: "#94a3b8",
              }}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 11,
                fill: "#94a3b8",
              }}
            />

            <Tooltip
              contentStyle={{
                borderRadius: 8,
                fontSize: 12,
              }}
            />

            <Bar
              dataKey="stock"
              fill="#6366F1"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stock Movement */}
      <div className="chart-card">
        <div className="chart-card-header">
          <h2 className="chart-title">
            Monthly Stock Movement
          </h2>
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <LineChart
            data={stockData}
            margin={{
              top: 8,
              right: 8,
              bottom: 0,
              left: -20,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              vertical={false}
            />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 11,
                fill: "#94a3b8",
              }}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 11,
                fill: "#94a3b8",
              }}
            />

            <Tooltip
              contentStyle={{
                borderRadius: 8,
                fontSize: 12,
              }}
            />

            <Line
              type="monotone"
              dataKey="movement"
              stroke="#22D3EE"
              strokeWidth={2.5}
              dot={{
                r: 4,
                fill: "#22D3EE",
                strokeWidth: 0,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProductCharts;