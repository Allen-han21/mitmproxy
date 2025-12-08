import React from "react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { Flow } from "../../../flow";
import { calculateStatusCodes } from "./calculateMetrics";

type StatusCodeChartProps = {
    flows: Flow[];
};

// Color palette for different status code ranges
const COLORS: { [key: string]: string } = {
    "2xx": "#10b981", // Green for success
    "3xx": "#3b82f6", // Blue for redirects
    "4xx": "#f59e0b", // Orange for client errors
    "5xx": "#ef4444", // Red for server errors
    default: "#6b7280", // Gray for others
};

function getStatusCodeColor(code: number): string {
    if (code >= 200 && code < 300) return COLORS["2xx"];
    if (code >= 300 && code < 400) return COLORS["3xx"];
    if (code >= 400 && code < 500) return COLORS["4xx"];
    if (code >= 500 && code < 600) return COLORS["5xx"];
    return COLORS.default;
}

export default function StatusCodeChart({ flows }: StatusCodeChartProps) {
    const data = React.useMemo(() => {
        const statusCodes = calculateStatusCodes(flows);
        return statusCodes.map((item) => ({
            name: `${item.code}`,
            value: item.count,
            fill: getStatusCodeColor(item.code),
        }));
    }, [flows]);

    if (data.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                No status code data available
            </div>
        );
    }

    return (
        <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                            `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: number, name: string) => [
                            `${value} requests`,
                            `Status ${name}`,
                        ]}
                    />
                    <Legend
                        formatter={(value, entry: any) =>
                            `${value} (${entry.payload.value})`
                        }
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
