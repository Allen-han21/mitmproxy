import React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { Flow } from "../../../flow";
import { calculateResponseTimeOverTime } from "./calculateMetrics";

type ResponseTimeChartProps = {
    flows: Flow[];
};

export default function ResponseTimeChart({ flows }: ResponseTimeChartProps) {
    const data = React.useMemo(
        () => calculateResponseTimeOverTime(flows),
        [flows]
    );

    if (data.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                No response time data available
            </div>
        );
    }

    return (
        <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
                <LineChart
                    data={data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="timestamp"
                        tickFormatter={(timestamp) => {
                            const date = new Date(timestamp);
                            return `${date.getHours()}:${String(
                                date.getMinutes()
                            ).padStart(2, "0")}`;
                        }}
                        label={{
                            value: "Time",
                            position: "insideBottom",
                            offset: -5,
                        }}
                    />
                    <YAxis
                        label={{
                            value: "Response Time (ms)",
                            angle: -90,
                            position: "insideLeft",
                        }}
                    />
                    <Tooltip
                        labelFormatter={(timestamp) => {
                            const date = new Date(timestamp as number);
                            return date.toLocaleTimeString();
                        }}
                        formatter={(value: number) => [`${value.toFixed(2)}ms`, "Avg Response Time"]}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="time"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={false}
                        name="Response Time"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
