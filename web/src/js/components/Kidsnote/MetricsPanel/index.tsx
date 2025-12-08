import React from "react";
import "./MetricsPanel.css";

export default function MetricsPanel() {
    return (
        <div className="kidsnote-metrics-panel">
            <h2>📊 Network Metrics</h2>
            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-label">Total Requests</div>
                    <div className="metric-value">0</div>
                </div>
                <div className="metric-card">
                    <div className="metric-label">Error Rate</div>
                    <div className="metric-value">0%</div>
                </div>
                <div className="metric-card">
                    <div className="metric-label">Avg Response Time</div>
                    <div className="metric-value">0ms</div>
                </div>
                <div className="metric-card">
                    <div className="metric-label">Slow Queries</div>
                    <div className="metric-value">0</div>
                </div>
            </div>
            <div className="metrics-info">
                <p>✨ Kidsnote mitmweb - Network Debugging Tool</p>
                <p>🚀 Phase 1: MVP - Metrics dashboard initialized</p>
            </div>
        </div>
    );
}
