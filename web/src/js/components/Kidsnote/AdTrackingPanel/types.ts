import { Flow } from "../../../flow";

/**
 * 광고 트래킹 이벤트 타입
 */
export enum TrackingEventType {
    REQUEST = "request",      // 광고 목록 요청
    IMPRESSION = "impression", // 노출
    CLICK = "click",          // 클릭
}

/**
 * 트래킹 이벤트 데이터
 */
export interface TrackingEvent {
    type: TrackingEventType;
    timestamp: number;       // Unix timestamp (ms)
    flowId: string;         // mitmproxy flow ID
}

/**
 * 광고 상태
 */
export enum AdStatus {
    REQUESTED = "requested",       // 요청만 됨
    IMPRESSED = "impressed",       // 노출됨
    CLICKED = "clicked",          // 클릭됨
}

/**
 * 광고 데이터 (서버 응답에서 파싱)
 */
export interface AdData {
    // 핵심 식별자
    adsid: string;              // 광고 ID (ads 배열의 id)

    // 광고 정보 (/req 응답에서 추출)
    title: string;              // 광고 제목
    subtitle?: string;          // 광고 부제목
    ad_imp?: string;           // 노출 트래킹 URL
    link?: string;             // 광고 링크 URL

    // 트래킹 이벤트
    requestEvent?: TrackingEvent;      // 광고 목록 요청 이벤트
    impressionEvent?: TrackingEvent;   // 노출 이벤트
    clickEvent?: TrackingEvent;        // 클릭 이벤트

    // 상태
    status: AdStatus;

    // 타임스탬프
    requestTime?: number;       // 요청 시간
    impressionTime?: number;    // 노출 시간
    clickTime?: number;         // 클릭 시간
}

/**
 * 광고 목록 요청 응답 구조
 */
export interface AdRequestResponse {
    ads: Array<{
        id: string;
        title: string;
        subtitle?: string;
        ad_imp?: string;
        link?: string;
        [key: string]: any;  // 기타 필드들
    }>;
    [key: string]: any;  // 기타 응답 필드들
}

/**
 * 광고 트래킹 상태
 */
export interface AdTrackingState {
    // adsid -> AdData 매핑
    ads: Map<string, AdData>;

    // flowId -> adsid 역방향 매핑 (빠른 조회용)
    flowToAds: Map<string, string>;

    // 필터링 옵션
    filter: {
        search: string;      // 검색어 (adsid or title)
        status?: AdStatus;   // 상태 필터
    };
}
