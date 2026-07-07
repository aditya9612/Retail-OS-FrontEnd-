import React from "react";
import "./StockSummaryChart.css";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";

const stockData = [
  {
    name: "Available",
    value: 8250,
  },
  {
    name: "Low Stock",
    value: 18,
  },
  {
    name: "Out Of Stock",
    value: 9,
  },
  {
    name: "Expired",
    value: 5,
  },
];

const COLORS = [
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

const StockSummaryChart = () => {
  return (
    <div className="stock-summary-chart">

      <div className="chart-header">

        <div>

          <h2>📊 Inventory Stock Summary</h2>

          <p>
            Overview of current inventory stock across all products.
          </p>

        </div>

      </div>

      <div className="chart-wrapper">

        <ResponsiveContainer
          width="100%"
          height={350}
        >

          <BarChart
            data={stockData}
            margin={{
              top: 20,
              right: 30,
              left: 10,
              bottom: 10,
            }}
          >

            <CartesianGrid
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="name"
            />

            <YAxis />

            <Tooltip />

            <Legend />

            <Bar
              dataKey="value"
              radius={[8, 8, 0, 0]}
            >

              {

                stockData.map((entry, index) => (

                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index]}
                  />

                ))

              }

            </Bar>

          </BarChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
};

export default StockSummaryChart;