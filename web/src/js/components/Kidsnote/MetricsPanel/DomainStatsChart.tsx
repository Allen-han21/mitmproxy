import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { Flow } from "../../../flow";
import { calculateDomainStats } from "./calculateMetrics";

type DomainStatsChartProps = {
    flows: Flow[];
};

export default function DomainStatsChart({ flows }: DomainStatsChartProps) {
    const data = React.useMemo(() => calculateDomainStats(flows), [flows]);

    if (data.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                No domain data available
            </div>
        );
    }

    return (
        <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
                <BarChart
                    data={data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="domain"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                        tick={{ fontSize: 10 }}
                    />
                    <YAxis
                        yAxisId="left"
                        label={{
                            value: "Request Count",
                            angle: -90,
                            position: "insideLeft",
                        }}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{
                            value: "Avg Time (ms)",
                            angle: 90,
                            position: "insideRight",
                        }}
                    />
                    <Tooltip
                        formatter={(value: number, name: string) => {
                            if (name === "count") {
                                return [`${value} requests`, "Count"];
                            }
                            return [`${value.toFixed(2)}ms`, "Avg Time"];
                        }}
                    />
                    <Legend />
                    <Bar
                        yAxisId="left"
                        dataKey="count"
                        fill="#8884d8"
                        name="Request Count"
                    />
                    <Bar
                        yAxisId="right"
                        dataKey="avgTime"
                        fill="#82ca9d"
                        name="Avg Response Time"
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
