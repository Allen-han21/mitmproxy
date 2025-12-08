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
    formatTimestamp,
    formatStatus,
    getStatusColor,
} from "./parseAdTracking";
import { AdData, AdStatus, TrackingEventType } from "./types";
import "./AdTrackingPanel.css";

type AdTrackingPanelProps = {
    flows: Flow[];
};

function parseAdDataFromFlows(flows: Flow[]): Map<string, AdData> {
    const adsMap = new Map<string, AdData>();

    flows.forEach((flow) => {
        if (flow.type !== "http") return;
        const httpFlow = flow as HTTPFlow;

        // 1. 광고 목록 요청 처리
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

export function PureAdTrackingPanel({ flows }: AdTrackingPanelProps) {
    const [searchQuery, setSearchQuery] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState<AdStatus | "all">("all");

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

    const handleClear = () => {
        if (confirm("모든 광고 트래킹 데이터를 삭제하시겠습니까?")) {
            // TODO: Redux action으로 변경
            window.location.reload();
        }
    };

    return (
        <div className="kidsnote-ad-tracking-panel">
            <div className="ad-tracking-header">
                <h2>📱 Kidsnote Ad Tracking Analysis</h2>
                <p className="description">
                    키즈노트 광고 트래킹 분석 대시보드 - 광고 요청(req), 노출(imp), 클릭(click)을 자동으로 추적합니다
                </p>
            </div>

            <div className="ad-tracking-controls">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="🔍 Ad ID 또는 제목 검색..."
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
                        <option value="all">모든 상태</option>
                        <option value={AdStatus.REQUESTED}>요청됨</option>
                        <option value={AdStatus.IMPRESSED}>노출됨</option>
                        <option value={AdStatus.CLICKED}>클릭됨</option>
                    </select>
                </div>

                <button onClick={handleClear} className="clear-button">
                    🗑️ 초기화
                </button>
            </div>

            <div className="ad-tracking-stats">
                <div className="stat-card">
                    <div className="stat-label">총 광고</div>
                    <div className="stat-value">{adsMap.size}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">노출됨</div>
                    <div className="stat-value">
                        {
                            Array.from(adsMap.values()).filter(
                                (ad) => ad.status === AdStatus.IMPRESSED || ad.status === AdStatus.CLICKED
                            ).length
                        }
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">클릭됨</div>
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

            <div className="ad-tracking-table-container">
                {ads.length === 0 ? (
                    <div className="empty-state">
                        <p>📭 광고 트래킹 데이터가 없습니다</p>
                        <p className="hint">
                            키즈노트 앱에서 광고를 요청하면 자동으로 추적됩니다
                        </p>
                    </div>
                ) : (
                    <table className="ad-tracking-table">
                        <thead>
                            <tr>
                                <th>Ad ID</th>
                                <th>광고 제목</th>
                                <th>상태</th>
                                <th>노출 시간</th>
                                <th>클릭 시간</th>
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
                )}
            </div>
        </div>
    );
}

export default connect((state: RootState) => ({
    flows: state.flows.list,
}))(PureAdTrackingPanel);
