import { HTTPFlow } from "../../../flow";
import {
    AdData,
    AdRequestResponse,
    AdStatus,
    TrackingEvent,
    TrackingEventType,
} from "./types";

/**
 * 광고 API 호스트
 */
const AD_API_HOST = "ads-api-kcsandbox-01.kidsnote.com";

/**
 * API 엔드포인트 패턴
 */
const ENDPOINTS = {
    REQUEST: /\/api\/v1\/kidsnote_benefit\/benefit\/req$/,
    IMPRESSION: /\/api\/v1\/kidsnote_benefit\/benefit\/imp$/,
    CLICK: /\/api\/v2\/kidsnote_benefit\/benefit\/click$/,
};

/**
 * Flow가 광고 API 요청인지 확인
 */
export function isAdApiFlow(flow: HTTPFlow): boolean {
    if (flow.type !== "http") return false;
    return flow.request.pretty_host === AD_API_HOST;
}

/**
 * Flow가 광고 목록 요청(/req)인지 확인
 */
export function isAdRequestFlow(flow: HTTPFlow): boolean {
    if (!isAdApiFlow(flow)) return false;
    const path = flow.request.path;
    return ENDPOINTS.REQUEST.test(path);
}

/**
 * Flow가 노출 트래킹(/imp)인지 확인
 */
export function isImpressionFlow(flow: HTTPFlow): boolean {
    if (!isAdApiFlow(flow)) return false;
    const path = flow.request.path;
    return ENDPOINTS.IMPRESSION.test(path);
}

/**
 * Flow가 클릭 트래킹(/click)인지 확인
 */
export function isClickFlow(flow: HTTPFlow): boolean {
    if (!isAdApiFlow(flow)) return false;
    const path = flow.request.path;
    return ENDPOINTS.CLICK.test(path);
}

/**
 * URL에서 query parameter를 파싱
 */
function parseQueryString(url: string): Map<string, string> {
    const params = new Map<string, string>();
    try {
        const urlObj = new URL(url, "http://dummy.com");
        urlObj.searchParams.forEach((value, key) => {
            params.set(key, value);
        });
    } catch (e) {
        // URL 파싱 실패시 빈 맵 반환
    }
    return params;
}

/**
 * 광고 목록 요청 응답에서 광고 데이터 파싱
 *
 * @param flow HTTPFlow (광고 목록 요청)
 * @returns AdData 배열 (파싱 실패시 빈 배열)
 */
export function parseAdRequestResponse(flow: HTTPFlow): AdData[] {
    if (!isAdRequestFlow(flow) || !flow.response) {
        return [];
    }

    try {
        // Response body를 JSON으로 파싱
        // mitmproxy의 flow.response에는 contentHash가 있고 실제 내용은 별도로 조회해야 하지만
        // 여기서는 flow 객체에 직접 접근 가능하다고 가정
        // 실제로는 mitmproxy의 content API를 사용해야 할 수 있음

        // 임시로 빈 배열 반환 (실제 구현 시 수정 필요)
        // 실제 환경에서는 flow의 response content를 가져와서 파싱해야 함
        return [];
    } catch (e) {
        console.error("Failed to parse ad request response:", e);
        return [];
    }
}

/**
 * 노출/클릭 이벤트에서 adsid 추출
 *
 * @param flow HTTPFlow (노출 또는 클릭 요청)
 * @returns adsid (파싱 실패시 null)
 */
export function extractAdsid(flow: HTTPFlow): string | null {
    if (!isImpressionFlow(flow) && !isClickFlow(flow)) {
        return null;
    }

    try {
        // Request URL의 query string에서 adsid 추출
        const fullUrl = `${flow.request.scheme}://${flow.request.pretty_host}${flow.request.path}`;
        const params = parseQueryString(fullUrl);
        return params.get("adsid") || null;
    } catch (e) {
        console.error("Failed to extract adsid:", e);
        return null;
    }
}

/**
 * Flow에서 TrackingEvent 생성
 */
export function createTrackingEvent(
    flow: HTTPFlow,
    type: TrackingEventType
): TrackingEvent {
    return {
        type,
        timestamp: flow.request.timestamp_start * 1000, // seconds to ms
        flowId: flow.id,
    };
}

/**
 * AdData 업데이트: 노출 이벤트 추가
 */
export function addImpressionEvent(
    ad: AdData,
    event: TrackingEvent
): AdData {
    return {
        ...ad,
        impressionEvent: event,
        impressionTime: event.timestamp,
        status: AdStatus.IMPRESSED,
    };
}

/**
 * AdData 업데이트: 클릭 이벤트 추가
 */
export function addClickEvent(ad: AdData, event: TrackingEvent): AdData {
    return {
        ...ad,
        clickEvent: event,
        clickTime: event.timestamp,
        status: AdStatus.CLICKED,
    };
}

/**
 * 시간을 읽기 쉬운 형식으로 포맷
 */
export function formatTimestamp(timestamp: number | undefined): string {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
    });
}

/**
 * 상태를 한글로 표시
 */
export function formatStatus(status: AdStatus): string {
    switch (status) {
        case AdStatus.REQUESTED:
            return "요청됨";
        case AdStatus.IMPRESSED:
            return "노출됨";
        case AdStatus.CLICKED:
            return "클릭됨";
        default:
            return status;
    }
}

/**
 * 상태에 따른 색상 반환
 */
export function getStatusColor(status: AdStatus): string {
    switch (status) {
        case AdStatus.REQUESTED:
            return "#6b7280"; // Gray
        case AdStatus.IMPRESSED:
            return "#3b82f6"; // Blue
        case AdStatus.CLICKED:
            return "#10b981"; // Green
        default:
            return "#6b7280";
    }
}
