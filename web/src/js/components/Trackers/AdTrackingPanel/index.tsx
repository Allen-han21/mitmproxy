import React from "react";
import { connect } from "react-redux";
import { RootState } from "../../../ducks";
import { Flow, HTTPFlow } from "../../../flow";
import {
    isAdRequestFlow,
    isImpressionFlow,
    isClickFlow,
    extractAdsid,
    createTrackingEvent,
    createPacketDetail,
    formatTimestamp,
    formatStatus,
    getStatusColor,
    formatPacketType,
    getPacketTypeColor,
    isAdApiFlow,
} from "./parseAdTracking";
import {
    parseTiaraEvents,
    extractUniqueActionTypes,
    formatTiaraTimestamp,
    fetchTiaraEventDetails,
    isTiaraFlow,
    getActionTypeColor,
} from "./parseTiara";
import { AdData, AdStatus, TrackingEventType, PacketDetail, TiaraEvent } from "./types";
import "./AdTrackingPanel.css";

type AdTrackingPanelProps = {
    flows: Flow[];
};

function parseAdDataFromFlows(flows: Flow[]): Map<string, AdData> {
    const adsMap = new Map<string, AdData>();

    flows.forEach((flow) => {
        if (flow.type !== "http") return;
        const httpFlow = flow as HTTPFlow;

        // 1. Ad list request
        if (isAdRequestFlow(httpFlow) && httpFlow.response) {
            // TODO: 실제 response body 파싱
            // 현재는 임시로 더미 데이터 생성
            // 실제로는 response.contentHash를 사용하여 content를 가져와야 함
        }

        // 2. 노출 이벤트 처리
        if (isImpressionFlow(httpFlow)) {
            const adsid = extractAdsid(httpFlow);
            if (adsid) {
                const existing = adsMap.get(adsid) || {
                    adsid,
                    title: `Ad ${adsid.substring(0, 8)}...`,
                    status: AdStatus.REQUESTED,
                };

                const impressionEvent = createTrackingEvent(
                    httpFlow,
                    TrackingEventType.IMPRESSION
                );

                adsMap.set(adsid, {
                    ...existing,
                    impressionEvent,
                    impressionTime: impressionEvent.timestamp,
                    status: AdStatus.IMPRESSED,
                });
            }
        }

        // 3. 클릭 이벤트 처리
        if (isClickFlow(httpFlow)) {
            const adsid = extractAdsid(httpFlow);
            if (adsid) {
                const existing = adsMap.get(adsid) || {
                    adsid,
                    title: `Ad ${adsid.substring(0, 8)}...`,
                    status: AdStatus.REQUESTED,
                };

                const clickEvent = createTrackingEvent(
                    httpFlow,
                    TrackingEventType.CLICK
                );

                adsMap.set(adsid, {
                    ...existing,
                    clickEvent,
                    clickTime: clickEvent.timestamp,
                    status: AdStatus.CLICKED,
                });
            }
        }
    });

    return adsMap;
}

type ViewType = "ads" | "packets" | "tiara";

export function PureAdTrackingPanel({ flows }: AdTrackingPanelProps) {
    const [searchQuery, setSearchQuery] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState<AdStatus | "all">("all");
    const [currentView, setCurrentView] = React.useState<ViewType>("ads");
    const [selectedPacket, setSelectedPacket] = React.useState<PacketDetail | null>(null);
    const [selectedTiaraEvent, setSelectedTiaraEvent] = React.useState<TiaraEvent | null>(null);
    const [actionTypeFilter, setActionTypeFilter] = React.useState<string>("all");

    const adsMap = React.useMemo(
        () => parseAdDataFromFlows(flows),
        [flows]
    );

    const ads = React.useMemo(() => {
        let filtered = Array.from(adsMap.values());

        // 검색 필터
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (ad) =>
                    ad.adsid.toLowerCase().includes(query) ||
                    ad.title.toLowerCase().includes(query)
            );
        }

        // 상태 필터
        if (statusFilter !== "all") {
            filtered = filtered.filter((ad) => ad.status === statusFilter);
        }

        // 최신순 정렬 (requestTime 기준)
        return filtered.sort((a, b) => {
            const timeA = a.requestTime || a.impressionTime || a.clickTime || 0;
            const timeB = b.requestTime || b.impressionTime || b.clickTime || 0;
            return timeB - timeA;
        });
    }, [adsMap, searchQuery, statusFilter]);

    // Extract packet list
    const packets = React.useMemo(() => {
        const packetList: PacketDetail[] = [];

        flows.forEach((flow) => {
            if (flow.type !== "http") return;
            const httpFlow = flow as HTTPFlow;

            // Filter ad API packets only
            if (isAdApiFlow(httpFlow)) {
                const packet = createPacketDetail(httpFlow);
                if (packet) {
                    packetList.push(packet);
                }
            }
        });

        // 최신순 정렬
        return packetList.sort((a, b) => b.timestamp - a.timestamp);
    }, [flows]);

    // Tiara 이벤트 목록 (비동기 로드)
    const [tiaraEvents, setTiaraEvents] = React.useState<TiaraEvent[]>([]);
    const [loadingTiara, setLoadingTiara] = React.useState(false);

    // Tiara flows를 감지하고 content fetch
    React.useEffect(() => {
        const loadTiaraEvents = async () => {
            setLoadingTiara(true);
            const eventList: TiaraEvent[] = [];

            console.log("[Tiara] Total flows:", flows.length);

            // Tiara flows만 추출
            const tiaraFlows = flows.filter((flow) => {
                if (flow.type !== "http") return false;
                return isTiaraFlow(flow as HTTPFlow);
            });

            console.log("[Tiara] Found", tiaraFlows.length, "Tiara flows");

            // 각 Tiara flow의 content를 fetch
            for (const flow of tiaraFlows) {
                const httpFlow = flow as HTTPFlow;
                const events = await fetchTiaraEventDetails(httpFlow);
                eventList.push(...events);
            }

            console.log("[Tiara] Total loaded events:", eventList.length);

            // 최신순 정렬
            setTiaraEvents(eventList.sort((a, b) => b.timestamp - a.timestamp));
            setLoadingTiara(false);
        };

        loadTiaraEvents();
    }, [flows]);

    // 필터링된 Tiara 이벤트
    const filteredTiaraEvents = React.useMemo(() => {
        if (actionTypeFilter === "all") {
            return tiaraEvents;
        }
        return tiaraEvents.filter((event) => event.actionType === actionTypeFilter);
    }, [tiaraEvents, actionTypeFilter]);

    // 고유한 action type 추출
    const uniqueActionTypes = React.useMemo(() => {
        return extractUniqueActionTypes(tiaraEvents);
    }, [tiaraEvents]);

    const handleClear = () => {
        if (confirm("Clear all tracker data?")) {
            // TODO: Redux action으로 변경
            window.location.reload();
        }
    };

    return (
        <div className="mitmios-tracker-panel">
            <div className="ad-tracking-header">
                <h2>Event Trackers</h2>
                <p className="description">
                    Track ad requests, impressions, clicks and analytics events in real-time
                </p>
            </div>

            <div className="ad-tracking-controls">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search by Ad ID or title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="filter-box">
                    <select
                        value={statusFilter}
                        onChange={(e) =>
                            setStatusFilter(e.target.value as AdStatus | "all")
                        }
                        className="status-filter"
                    >
                        <option value="all">All Status</option>
                        <option value={AdStatus.REQUESTED}>Requested</option>
                        <option value={AdStatus.IMPRESSED}>Impressed</option>
                        <option value={AdStatus.CLICKED}>Clicked</option>
                    </select>
                </div>

                <button onClick={handleClear} className="clear-button">
                    Clear
                </button>
            </div>

            <div className="ad-tracking-stats">
                <div className="stat-card">
                    <div className="stat-label">Total Ads</div>
                    <div className="stat-value">{adsMap.size}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Impressed</div>
                    <div className="stat-value">
                        {
                            Array.from(adsMap.values()).filter(
                                (ad) => ad.status === AdStatus.IMPRESSED || ad.status === AdStatus.CLICKED
                            ).length
                        }
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Clicked</div>
                    <div className="stat-value">
                        {
                            Array.from(adsMap.values()).filter(
                                (ad) => ad.status === AdStatus.CLICKED
                            ).length
                        }
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">CTR</div>
                    <div className="stat-value">
                        {adsMap.size > 0
                            ? (
                                  (Array.from(adsMap.values()).filter(
                                      (ad) => ad.status === AdStatus.CLICKED
                                  ).length /
                                      adsMap.size) *
                                  100
                              ).toFixed(1) + "%"
                            : "-"}
                    </div>
                </div>
            </div>

            {/* View Tabs */}
            <div className="view-tabs">
                <button
                    className={`view-tab ${currentView === "ads" ? "active" : ""}`}
                    onClick={() => setCurrentView("ads")}
                >
                    Ad Summary
                </button>
                <button
                    className={`view-tab ${currentView === "packets" ? "active" : ""}`}
                    onClick={() => setCurrentView("packets")}
                >
                    Packets
                </button>
                <button
                    className={`view-tab ${currentView === "tiara" ? "active" : ""}`}
                    onClick={() => setCurrentView("tiara")}
                >
                    Tiara
                </button>
            </div>

            <div className="ad-tracking-table-container">
                {currentView === "ads" ? (
                    ads.length === 0 ? (
                        <div className="empty-state">
                            <p>No ad tracking data yet</p>
                            <p className="hint">
                                Ad events will appear here automatically when detected
                            </p>
                        </div>
                    ) : (
                        <table className="ad-tracking-table">
                        <thead>
                            <tr>
                                <th>Ad ID</th>
                                <th>Ad Title</th>
                                <th>Status</th>
                                <th>Impression Time</th>
                                <th>Click Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ads.map((ad) => (
                                <tr key={ad.adsid}>
                                    <td className="ad-id">
                                        <code>{ad.adsid}</code>
                                    </td>
                                    <td className="ad-title">{ad.title}</td>
                                    <td className="ad-status">
                                        <span
                                            className="status-badge"
                                            style={{
                                                backgroundColor: getStatusColor(
                                                    ad.status
                                                ),
                                            }}
                                        >
                                            {formatStatus(ad.status)}
                                        </span>
                                    </td>
                                    <td className="ad-time">
                                        {formatTimestamp(ad.impressionTime)}
                                    </td>
                                    <td className="ad-time">
                                        {formatTimestamp(ad.clickTime)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    )
                ) : currentView === "packets" ? (
                    /* Packets View */
                    packets.length === 0 ? (
                        <div className="empty-state">
                            <p>No packet data yet</p>
                            <p className="hint">
                                Packets will appear here when ad API calls are detected
                            </p>
                        </div>
                    ) : (
                        <table className="ad-tracking-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Type</th>
                                    <th>Method</th>
                                    <th>URL</th>
                                    <th>Ad ID</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {packets.map((packet) => (
                                    <tr
                                        key={packet.id}
                                        onClick={() => setSelectedPacket(packet)}
                                    >
                                        <td className="ad-time">
                                            {formatTimestamp(packet.timestamp)}
                                        </td>
                                        <td>
                                            <span
                                                className="packet-type-badge"
                                                style={{
                                                    backgroundColor: getPacketTypeColor(
                                                        packet.type
                                                    ),
                                                }}
                                            >
                                                {formatPacketType(packet.type)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="packet-method">
                                                {packet.method}
                                            </span>
                                        </td>
                                        <td className="packet-url">
                                            {packet.path}
                                        </td>
                                        <td className="ad-id">
                                            {packet.adsid ? (
                                                <code>{packet.adsid}</code>
                                            ) : (
                                                "-"
                                            )}
                                        </td>
                                        <td>
                                            {packet.statusCode ? (
                                                <span
                                                    className={`packet-status-code ${
                                                        packet.statusCode >= 200 &&
                                                        packet.statusCode < 300
                                                            ? "success"
                                                            : "error"
                                                    }`}
                                                >
                                                    {packet.statusCode}
                                                </span>
                                            ) : (
                                                "-"
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                ) : currentView === "tiara" ? (
                    /* Tiara View */
                    <>
                        {/* Action Type Filter */}
                        <div className="tiara-filter-section" style={{ padding: "16px", borderBottom: "1px solid #e5e7eb" }}>
                            <label style={{ marginRight: "8px", fontWeight: "500" }}>
                                Action Type:
                            </label>
                            <select
                                value={actionTypeFilter}
                                onChange={(e) => setActionTypeFilter(e.target.value)}
                                className="status-filter"
                                style={{ minWidth: "150px" }}
                            >
                                <option value="all">All ({tiaraEvents.length})</option>
                                {uniqueActionTypes.map((actionType) => {
                                    const count = tiaraEvents.filter(
                                        (e) => e.actionType === actionType
                                    ).length;
                                    return (
                                        <option key={actionType} value={actionType}>
                                            {actionType} ({count})
                                        </option>
                                    );
                                })}
                            </select>
                            <span style={{ marginLeft: "16px", color: "#6b7280" }}>
                                Showing {filteredTiaraEvents.length} events
                            </span>
                        </div>

                        {loadingTiara ? (
                            <div className="empty-state">
                                <p>Loading Tiara events...</p>
                                <p className="hint">
                                    Analyzing request body
                                </p>
                            </div>
                        ) : filteredTiaraEvents.length === 0 ? (
                            <div className="empty-state">
                                <p>No Tiara events yet</p>
                                <p className="hint">
                                    Events will appear here when user actions are detected
                                </p>
                            </div>
                        ) : (
                            <table className="ad-tracking-table">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Action Type</th>
                                        <th>Action Name</th>
                                        <th>Page</th>
                                        <th>Section</th>
                                        <th>Summary</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTiaraEvents.map((event) => (
                                        <tr
                                            key={event.id}
                                            onClick={() => setSelectedTiaraEvent(event)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <td className="ad-time">
                                                {formatTiaraTimestamp(event.timestamp)}
                                            </td>
                                            <td>
                                                <span
                                                    className="packet-type-badge"
                                                    style={{
                                                        backgroundColor: getActionTypeColor(event.actionType),
                                                    }}
                                                >
                                                    {event.actionType}
                                                </span>
                                            </td>
                                            <td>{event.actionName}</td>
                                            <td>{event.page}</td>
                                            <td>{event.section}</td>
                                            <td
                                                style={{
                                                    maxWidth: "300px",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {event.summary}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </>
                ) : null}
            </div>

            {/* Packet Detail Modal */}
            {selectedPacket && (
                <div
                    className="packet-detail-modal"
                    onClick={() => setSelectedPacket(null)}
                >
                    <div
                        className="packet-detail-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="packet-detail-header">
                            <h3>Packet Details</h3>
                            <button
                                className="close-button"
                                onClick={() => setSelectedPacket(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <strong>Type:</strong>{" "}
                            <span
                                className="packet-type-badge"
                                style={{
                                    backgroundColor: getPacketTypeColor(
                                        selectedPacket.type
                                    ),
                                    marginLeft: "8px",
                                }}
                            >
                                {formatPacketType(selectedPacket.type)}
                            </span>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <strong>Time:</strong>{" "}
                            {formatTimestamp(selectedPacket.timestamp)}
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <strong>Method:</strong>{" "}
                            <span className="packet-method">
                                {selectedPacket.method}
                            </span>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <strong>Full URL:</strong>
                            <div
                                className="packet-url"
                                style={{
                                    marginTop: "8px",
                                    padding: "8px",
                                    background: "#f3f4f6",
                                    borderRadius: "4px",
                                }}
                            >
                                {selectedPacket.url}
                            </div>
                        </div>

                        {selectedPacket.adsid && (
                            <div style={{ marginBottom: "16px" }}>
                                <strong>Ad ID:</strong>{" "}
                                <code
                                    style={{
                                        background: "#f3f4f6",
                                        padding: "4px 8px",
                                        borderRadius: "4px",
                                    }}
                                >
                                    {selectedPacket.adsid}
                                </code>
                            </div>
                        )}

                        {selectedPacket.statusCode && (
                            <div style={{ marginBottom: "16px" }}>
                                <strong>Status Code:</strong>{" "}
                                <span
                                    className={`packet-status-code ${
                                        selectedPacket.statusCode >= 200 &&
                                        selectedPacket.statusCode < 300
                                            ? "success"
                                            : "error"
                                    }`}
                                >
                                    {selectedPacket.statusCode}
                                </span>
                            </div>
                        )}

                        {selectedPacket.queryParams.size > 0 && (
                            <div>
                                <strong>Query Parameters:</strong>
                                <ul className="query-params-list">
                                    {Array.from(selectedPacket.queryParams.entries()).map(
                                        ([key, value]) => (
                                            <li key={key}>
                                                <span className="query-param-key">
                                                    {key}:
                                                </span>
                                                <span className="query-param-value">
                                                    {value}
                                                </span>
                                            </li>
                                        )
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tiara Event Detail Modal */}
            {selectedTiaraEvent && (
                <div
                    className="packet-detail-modal"
                    onClick={() => setSelectedTiaraEvent(null)}
                >
                    <div
                        className="packet-detail-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: "800px" }}
                    >
                        <div className="packet-detail-header">
                            <h3>Tiara Event Details</h3>
                            <button
                                className="close-button"
                                onClick={() => setSelectedTiaraEvent(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <strong>Timestamp:</strong>{" "}
                            {formatTiaraTimestamp(selectedTiaraEvent.timestamp)}
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <strong>Action Type:</strong>{" "}
                            <span
                                className="packet-type-badge"
                                style={{
                                    backgroundColor: getActionTypeColor(selectedTiaraEvent.actionType),
                                    marginLeft: "8px",
                                }}
                            >
                                {selectedTiaraEvent.actionType}
                            </span>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <strong>Action Name:</strong>{" "}
                            {selectedTiaraEvent.actionName}
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <strong>Page:</strong> {selectedTiaraEvent.page}
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <strong>Section:</strong> {selectedTiaraEvent.section}
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <strong>Summary:</strong> {selectedTiaraEvent.summary}
                        </div>

                        <div>
                            <strong>Raw Event Data:</strong>
                            <pre
                                style={{
                                    marginTop: "8px",
                                    padding: "12px",
                                    background: "#f3f4f6",
                                    borderRadius: "4px",
                                    overflow: "auto",
                                    maxHeight: "400px",
                                    fontSize: "12px",
                                }}
                            >
                                {JSON.stringify(
                                    selectedTiaraEvent.rawData,
                                    null,
                                    2
                                )}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default connect((state: RootState) => ({
    flows: state.flows.list,
}))(PureAdTrackingPanel);
