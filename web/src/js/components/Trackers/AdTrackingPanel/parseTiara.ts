import { HTTPFlow } from "../../../flow";
import { MessageUtils } from "../../../flow/utils";
import { TiaraEvent, TiaraEventData, TiaraRequestBody } from "./types";

/**
 * Tiara API 호스트
 */
const TIARA_API_HOST = "stat.tiara.daum.net";

/**
 * Flow가 Tiara API 요청인지 확인
 */
export function isTiaraFlow(flow: HTTPFlow): boolean {
    if (flow.type !== "http") return false;
    const isTiara = flow.request.pretty_host === TIARA_API_HOST;
    if (isTiara) {
        console.log("[Tiara] Found Tiara flow:", flow.request.pretty_host, flow.request.path);
    }
    return isTiara;
}

/**
 * HTTP Flow의 request body를 파싱하여 JSON으로 변환
 *
 * @param flow HTTPFlow
 * @returns 파싱된 JSON 또는 null
 */
function parseRequestBody(flow: HTTPFlow): any {
    try {
        // mitmproxy의 flow 객체 구조 확인
        console.log("[Tiara] Flow request keys:", Object.keys(flow.request));
        console.log("[Tiara] Flow request.content:", flow.request.content);
        console.log("[Tiara] Flow request.contentHash:", (flow.request as any).contentHash);
        console.log("[Tiara] Flow request.text:", (flow.request as any).text);

        const content = flow.request.content;

        if (!content) {
            console.log("[Tiara] No content found, trying alternative methods");
            // 대안: flow 객체의 다른 속성 확인
            const req = flow.request as any;
            if (req.text) {
                console.log("[Tiara] Using request.text");
                return JSON.parse(req.text);
            }
            return null;
        }

        // Uint8Array를 문자열로 변환
        let jsonString: string;
        if (typeof content === "string") {
            jsonString = content;
        } else if (content instanceof Uint8Array) {
            jsonString = new TextDecoder().decode(content);
        } else {
            return null;
        }

        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse Tiara request body:", e);
        return null;
    }
}

/**
 * Tiara 이벤트 데이터 배열에서 핵심 정보 추출
 *
 * @param eventData Tiara 이벤트 데이터 객체
 * @returns 요약 정보 문자열
 */
function extractSummary(eventData: TiaraEventData): string {
    const summaryParts: string[] = [];

    // viewimp_contents에서 imp_id 추출
    if (eventData.viewimp_contents && eventData.viewimp_contents.length > 0) {
        const impIds = eventData.viewimp_contents
            .map((content) => content.imp_id)
            .filter(Boolean)
            .slice(0, 3); // 최대 3개만
        if (impIds.length > 0) {
            summaryParts.push(`imp_id: ${impIds.join(", ")}`);
        }

        const copies = eventData.viewimp_contents
            .map((content) => content.copy)
            .filter(Boolean)
            .slice(0, 2); // 최대 2개만
        if (copies.length > 0) {
            summaryParts.push(`copy: ${copies.join(", ")}`);
        }
    }

    // click_contents에서 정보 추출
    if (eventData.click_contents && eventData.click_contents.length > 0) {
        const impIds = eventData.click_contents
            .map((content) => content.imp_id)
            .filter(Boolean)
            .slice(0, 3);
        if (impIds.length > 0) {
            summaryParts.push(`click_imp_id: ${impIds.join(", ")}`);
        }

        const copies = eventData.click_contents
            .map((content) => content.copy)
            .filter(Boolean)
            .slice(0, 2);
        if (copies.length > 0) {
            summaryParts.push(`click_copy: ${copies.join(", ")}`);
        }
    }

    return summaryParts.join(" | ") || "-";
}

/**
 * HTTP Flow에서 Tiara 이벤트 배열 추출
 * Content를 파싱하지 않고 flow의 기본 정보만 사용
 *
 * @param flow HTTPFlow
 * @returns TiaraEvent 배열 (하나의 이벤트만 포함, content는 나중에 로드)
 */
export function parseTiaraEvents(flow: HTTPFlow): TiaraEvent[] {
    if (!isTiaraFlow(flow)) return [];

    // Content 파싱 없이 기본 Tiara 이벤트 생성
    // 사용자가 클릭하면 그때 content를 fetch
    const event: TiaraEvent = {
        id: flow.id,
        timestamp: flow.request.timestamp_start * 1000, // seconds to ms
        actionType: "Tiara Event", // Content를 로드하기 전 기본값
        actionName: "Click to load details",
        page: "-",
        section: "-",
        summary: `Flow ${flow.id} - Click to view`,
        rawData: null, // Content는 나중에 로드
        flowId: flow.id, // Content를 fetch하기 위해 flow ID 저장
    };

    console.log("[Tiara] Created basic event for flow:", flow.id);
    return [event];
}

/**
 * 모든 고유한 action.type 추출 (필터링용)
 *
 * @param events TiaraEvent 배열
 * @returns 고유한 action type 배열 (정렬됨)
 */
export function extractUniqueActionTypes(events: TiaraEvent[]): string[] {
    const types = new Set<string>();
    events.forEach((event) => {
        if (event.actionType && event.actionType !== "-") {
            types.add(event.actionType);
        }
    });
    return Array.from(types).sort();
}

/**
 * 시간을 읽기 쉬운 형식으로 포맷
 */
export function formatTiaraTimestamp(timestamp: number): string {
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
 * Action Type에 따른 배경색 반환
 */
export function getActionTypeColor(actionType: string): string {
    // 일관된 색상을 위해 문자열을 해시하여 색상 선택
    const colors = [
        "#8b5cf6", // Purple - ViewImp
        "#3b82f6", // Blue - Click
        "#10b981", // Green - Search
        "#f59e0b", // Amber - PageView
        "#ef4444", // Red - Error
        "#ec4899", // Pink - Custom
        "#6366f1", // Indigo - Action
        "#14b8a6", // Teal - Event
    ];

    // 특정 액션 타입에 고정 색상 할당
    const typeColorMap: { [key: string]: string } = {
        ViewImp: "#8b5cf6",      // Purple
        Click: "#3b82f6",         // Blue
        Search: "#10b981",        // Green
        PageView: "#f59e0b",      // Amber
        Error: "#ef4444",         // Red
        CustomEvent: "#ec4899",   // Pink
        Action: "#6366f1",        // Indigo
        Track: "#14b8a6",         // Teal
    };

    // 매핑된 색상이 있으면 사용, 없으면 해시 기반 색상
    if (typeColorMap[actionType]) {
        return typeColorMap[actionType];
    }

    // 문자열 해시를 통한 일관된 색상 선택
    let hash = 0;
    for (let i = 0; i < actionType.length; i++) {
        hash = actionType.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

/**
 * Flow의 request content를 fetch하여 Tiara 이벤트 상세 정보 로드
 *
 * @param flow HTTPFlow
 * @returns Promise<TiaraEvent[]> - 파싱된 Tiara 이벤트 배열
 */
export async function fetchTiaraEventDetails(flow: HTTPFlow): Promise<TiaraEvent[]> {
    try {
        const contentUrl = MessageUtils.getContentURL(flow, flow.request);
        console.log("[Tiara] Fetching content from:", contentUrl);

        const response = await fetch(contentUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch content: ${response.statusText}`);
        }

        const content = await response.text();
        console.log("[Tiara] Fetched content length:", content.length);

        const requestBody = JSON.parse(content);
        if (!Array.isArray(requestBody)) {
            console.error("[Tiara] Request body is not an array:", requestBody);
            return [];
        }

        console.log("[Tiara] Parsing", requestBody.length, "events");
        const events: TiaraEvent[] = [];

        requestBody.forEach((eventData: TiaraEventData, index: number) => {
            try {
                // 필수 필드 검증
                if (!eventData.action || !eventData.common) {
                    console.log("[Tiara] Missing required fields in event", index);
                    return;
                }

                // Timestamp 처리: access_timestamp는 이미 ms 단위일 수 있음
                let timestamp = eventData.common.access_timestamp || Date.now();
                // 타임스탬프가 초 단위인지 확인 (1970년대 이후 타임스탬프는 10자리 이상)
                if (timestamp < 10000000000) {
                    timestamp = timestamp * 1000; // 초 -> 밀리초 변환
                }

                const event: TiaraEvent = {
                    id: `${flow.id}-${index}`,
                    timestamp: timestamp,
                    actionType: eventData.action.type || "-",
                    actionName: eventData.action.name || "-",
                    page: eventData.common.page || "-",
                    section: eventData.common.section || "-",
                    summary: extractSummary(eventData),
                    rawData: eventData,
                    flowId: flow.id,
                };

                console.log("[Tiara] Parsed event:", event.actionType, event.actionName);
                events.push(event);
            } catch (e) {
                console.error("Failed to parse Tiara event data:", e, eventData);
            }
        });

        return events;
    } catch (e) {
        console.error("[Tiara] Failed to fetch event details:", e);
        return [];
    }
}
