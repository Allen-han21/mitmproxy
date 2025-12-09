import { HTTPFlow } from "../../../flow";
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
    return flow.request.pretty_host === TIARA_API_HOST;
}

/**
 * HTTP Flow의 request body를 파싱하여 JSON으로 변환
 *
 * @param flow HTTPFlow
 * @returns 파싱된 JSON 또는 null
 */
function parseRequestBody(flow: HTTPFlow): any {
    try {
        // mitmproxy의 request content는 Uint8Array 또는 string일 수 있음
        // 실제로는 flow.request.contentHash를 통해 content API로 조회해야 할 수 있으나
        // 여기서는 직접 접근 가능하다고 가정
        const content = flow.request.content;

        if (!content) return null;

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
 *
 * @param flow HTTPFlow
 * @returns TiaraEvent 배열 (파싱 실패 시 빈 배열)
 */
export function parseTiaraEvents(flow: HTTPFlow): TiaraEvent[] {
    if (!isTiaraFlow(flow)) return [];

    const requestBody = parseRequestBody(flow);
    if (!requestBody || !Array.isArray(requestBody)) {
        return [];
    }

    const events: TiaraEvent[] = [];

    requestBody.forEach((eventData: TiaraEventData, index: number) => {
        try {
            // 필수 필드 검증
            if (!eventData.action || !eventData.common) {
                return;
            }

            const event: TiaraEvent = {
                id: `${flow.id}-${index}`, // flow ID + 배열 인덱스
                timestamp: eventData.common.access_timestamp || Date.now(),
                actionType: eventData.action.type || "-",
                actionName: eventData.action.name || "-",
                page: eventData.common.page || "-",
                section: eventData.common.section || "-",
                summary: extractSummary(eventData),
                rawData: eventData,
            };

            events.push(event);
        } catch (e) {
            console.error("Failed to parse Tiara event data:", e, eventData);
        }
    });

    return events;
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
