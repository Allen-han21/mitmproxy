import React from "react";
import { connect } from "react-redux";
import { RootState } from "../../../ducks";
import { Flow } from "../../../flow";
import { TrackerRegistry } from "../../../trackers/registry";
import { trackerConfigs } from "../../../trackers/configs.generated";
import { TrackerConfig, TrackedEvent, DisplayColumn } from "../../../trackers/types";
import "./EventTrackerPanel.css";

// Initialize registry with generated configs
const registry = TrackerRegistry.getInstance();
registry.loadConfigs(trackerConfigs);

type EventTrackerPanelProps = {
    flows: Flow[];
};

function formatTimestamp(ms: number): string {
    const date = new Date(ms);
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
        hour12: false,
    });
}

/**
 * 단일 셀을 DisplayColumn.type에 따라 렌더링한다.
 */
function renderCell(column: DisplayColumn, event: TrackedEvent): React.ReactNode {
    // 내장 필드 매핑
    let value: string | number | undefined;
    switch (column.field) {
        case "matcher_label":
            return (
                <span
                    className="etp-badge"
                    style={{ backgroundColor: event.matcherColor }}
                >
                    {event.matcherLabel}
                </span>
            );
        case "timestamp":
            return (
                <span className="etp-mono">{formatTimestamp(event.timestamp)}</span>
            );
        case "status_code":
            if (!event.statusCode) return "-";
            return (
                <span
                    className={`etp-status-code ${
                        event.statusCode >= 200 && event.statusCode < 300
                            ? "success"
                            : "error"
                    }`}
                >
                    {event.statusCode}
                </span>
            );
        case "method":
            return <span className="etp-method">{event.method}</span>;
        case "host":
            value = event.host;
            break;
        case "path":
            value = event.path;
            break;
        default:
            // extractedData에서 찾기
            value = event.extractedData[column.field];
            break;
    }

    if (value === undefined || value === null) return "-";

    switch (column.type) {
        case "code":
            return <code className="etp-code">{value}</code>;
        case "badge":
            return <span className="etp-badge">{value}</span>;
        case "timestamp":
            return (
                <span className="etp-mono">
                    {typeof value === "number" ? formatTimestamp(value) : value}
                </span>
            );
        case "status_code":
            return <span className="etp-status-code">{value}</span>;
        default:
            return <>{value}</>;
    }
}

function PureEventTrackerPanel({ flows }: EventTrackerPanelProps) {
    const configs = registry.getConfigs();
    const [activeTab, setActiveTab] = React.useState<string>(
        configs.length > 0 ? configs[0].name : "",
    );
    const [selectedEvent, setSelectedEvent] = React.useState<TrackedEvent | null>(null);

    // 전체 이벤트를 한 번만 처리
    const allEvents = React.useMemo(
        () => registry.processFlows(flows),
        [flows],
    );

    // 현재 탭의 config와 이벤트
    const activeConfig = React.useMemo(
        () => configs.find((c) => c.name === activeTab),
        [configs, activeTab],
    );

    const tabEvents = React.useMemo(
        () => allEvents.filter((e) => e.trackerName === activeTab),
        [allEvents, activeTab],
    );

    // 각 탭별 이벤트 수 (badge 표시용)
    const eventCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        for (const config of configs) {
            counts[config.name] = allEvents.filter(
                (e) => e.trackerName === config.name,
            ).length;
        }
        return counts;
    }, [configs, allEvents]);

    if (configs.length === 0) {
        return (
            <div className="etp-panel">
                <div className="etp-header">
                    <h2>Event Trackers</h2>
                    <p className="etp-desc">No tracker configs loaded.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="etp-panel">
            <div className="etp-header">
                <h2>Event Trackers</h2>
                <p className="etp-desc">
                    Config-driven network event tracking
                </p>
            </div>

            {/* Stats */}
            <div className="etp-stats">
                <div className="etp-stat-card">
                    <div className="etp-stat-label">Trackers</div>
                    <div className="etp-stat-value">{configs.length}</div>
                </div>
                <div className="etp-stat-card">
                    <div className="etp-stat-label">Total Events</div>
                    <div className="etp-stat-value">{allEvents.length}</div>
                </div>
                <div className="etp-stat-card">
                    <div className="etp-stat-label">Current Tab</div>
                    <div className="etp-stat-value">{tabEvents.length}</div>
                </div>
            </div>

            {/* Tracker Tabs */}
            <div className="etp-tabs">
                {configs.map((config) => (
                    <button
                        key={config.name}
                        className={`etp-tab ${activeTab === config.name ? "active" : ""}`}
                        onClick={() => setActiveTab(config.name)}
                    >
                        {config.name}
                        {eventCounts[config.name] > 0 && (
                            <span className="etp-tab-count">
                                {eventCounts[config.name]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Event Table */}
            <div className="etp-table-container">
                {!activeConfig ? (
                    <div className="etp-empty">
                        <p>Select a tracker tab</p>
                    </div>
                ) : tabEvents.length === 0 ? (
                    <div className="etp-empty">
                        <p>No events matched for "{activeConfig.name}"</p>
                        <p className="etp-hint">
                            Events will appear when network requests match the
                            configured host/path patterns
                        </p>
                    </div>
                ) : (
                    <table className="etp-table">
                        <thead>
                            <tr>
                                {activeConfig.display.columns.map((col) => (
                                    <th key={col.field}>{col.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {tabEvents.map((event) => (
                                <tr
                                    key={event.id}
                                    onClick={() => setSelectedEvent(event)}
                                >
                                    {activeConfig.display.columns.map((col) => (
                                        <td key={col.field}>
                                            {renderCell(col, event)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div
                    className="etp-modal-backdrop"
                    onClick={() => setSelectedEvent(null)}
                >
                    <div
                        className="etp-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="etp-modal-header">
                            <h3>Event Details</h3>
                            <button
                                className="etp-close"
                                onClick={() => setSelectedEvent(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="etp-detail-row">
                            <strong>Tracker:</strong> {selectedEvent.trackerName}
                        </div>
                        <div className="etp-detail-row">
                            <strong>Event:</strong>{" "}
                            <span
                                className="etp-badge"
                                style={{ backgroundColor: selectedEvent.matcherColor }}
                            >
                                {selectedEvent.matcherLabel}
                            </span>
                        </div>
                        <div className="etp-detail-row">
                            <strong>Time:</strong>{" "}
                            {formatTimestamp(selectedEvent.timestamp)}
                        </div>
                        <div className="etp-detail-row">
                            <strong>Method:</strong>{" "}
                            <span className="etp-method">{selectedEvent.method}</span>
                        </div>
                        <div className="etp-detail-row">
                            <strong>URL:</strong>
                            <div className="etp-url">
                                {selectedEvent.host}{selectedEvent.path}
                            </div>
                        </div>
                        {selectedEvent.statusCode && (
                            <div className="etp-detail-row">
                                <strong>Status:</strong>{" "}
                                <span
                                    className={`etp-status-code ${
                                        selectedEvent.statusCode >= 200 &&
                                        selectedEvent.statusCode < 300
                                            ? "success"
                                            : "error"
                                    }`}
                                >
                                    {selectedEvent.statusCode}
                                </span>
                            </div>
                        )}

                        {Object.keys(selectedEvent.extractedData).length > 0 && (
                            <>
                                <h4 style={{ marginTop: 16, marginBottom: 8 }}>
                                    Extracted Data
                                </h4>
                                <ul className="etp-extracted-list">
                                    {Object.entries(selectedEvent.extractedData).map(
                                        ([key, value]) => (
                                            <li key={key}>
                                                <span className="etp-extracted-key">
                                                    {key}:
                                                </span>
                                                <span className="etp-extracted-value">
                                                    {value}
                                                </span>
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default connect((state: RootState) => ({
    flows: state.flows.list,
}))(PureEventTrackerPanel);
