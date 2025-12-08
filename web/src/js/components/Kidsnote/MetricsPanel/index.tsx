import React from "react";
import { connect } from "react-redux";
import { RootState } from "../../../ducks";
import { Flow } from "../../../flow";
import {
    calculateSummary,
    formatNumber,
    formatTime,
    formatPercentage,
} from "./calculateMetrics";
import ResponseTimeChart from "./ResponseTimeChart";
import StatusCodeChart from "./StatusCodeChart";
import DomainStatsChart from "./DomainStatsChart";
import "./MetricsPanel.css";

type MetricsPanelProps = {
    flows: Flow[];
};

export function PureMetricsPanel({ flows }: MetricsPanelProps) {
    const metrics = React.useMemo(() => calculateSummary(flows), [flows]);

    return (
        <div className="kidsnote-metrics-panel">
            <h2>📊 Network Metrics</h2>

            {/* Summary Cards */}
            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-label">Total Requests</div>
                    <div className="metric-value">
                        {formatNumber(metrics.totalRequests)}
                    </div>
                </div>
                <div className="metric-card">
                    <div className="metric-label">Error Rate</div>
                    <div className="metric-value">
                        {formatPercentage(metrics.errorRate)}
                    </div>
                </div>
                <div className="metric-card">
                    <div className="metric-label">Avg Response Time</div>
                    <div className="metric-value">
                        {formatTime(metrics.avgResponseTime)}
                    </div>
                </div>
                <div className="metric-card">
                    <div className="metric-label">Slow Queries (&gt;1s)</div>
                    <div className="metric-value">
                        {formatNumber(metrics.slowQueries)}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-section">
                <div className="chart-container">
                    <h3>Response Time Over Time</h3>
                    <ResponseTimeChart flows={flows} />
                </div>

                <div className="charts-row">
                    <div className="chart-container">
                        <h3>Status Code Distribution</h3>
                        <StatusCodeChart flows={flows} />
                    </div>
                    <div className="chart-container">
                        <h3>Top Domains by Request Count</h3>
                        <DomainStatsChart flows={flows} />
                    </div>
                </div>
            </div>

            {/* Footer Info */}
            <div className="metrics-info">
                <p>✨ Kidsnote mitmweb - Network Debugging Tool</p>
                <p>
                    🚀 Phase 1: MVP - Real-time metrics from {formatNumber(flows.length)}{" "}
                    flows
                </p>
            </div>
        </div>
    );
}

export default connect((state: RootState) => ({
    flows: state.flows.list,
}))(PureMetricsPanel);
