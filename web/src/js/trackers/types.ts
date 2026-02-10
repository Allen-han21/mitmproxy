import { HTTPFlow } from "../flow";

/**
 * YAML config에 대응하는 하나의 Tracker 설정.
 * 각 YAML 파일이 하나의 TrackerConfig 인스턴스가 된다.
 */
export interface TrackerConfig {
    /** 사람이 읽을 수 있는 tracker 이름 (e.g. "Kidsnote Ads") */
    name: string;
    /** 짧은 설명 */
    description: string;
    /** HTTP flow를 분류하는 매칭 규칙 배열 */
    matchers: MatcherRule[];
    /** 매칭된 flow에서 데이터를 추출하는 규칙 배열 */
    extractors: ExtractorRule[];
    /** UI 표시 설정 */
    display: DisplayConfig;
}

/**
 * 하나의 매칭 규칙. host + path regex 조합으로 flow를 분류한다.
 *
 * 예: { id: "ad_request", host: "ads-api.example.com", path_pattern: "/req(\\?|$)" }
 */
export interface MatcherRule {
    /** 고유 ID (같은 config 내에서 유일) */
    id: string;
    /** UI에 표시할 라벨 (e.g. "Ad Request") */
    label: string;
    /** badge 색상 (hex, e.g. "#8b5cf6") */
    color: string;
    /** pretty_host 정확히 일치 */
    host: string;
    /** request.path에 대한 regex 패턴 */
    path_pattern: string;
}

/**
 * 매칭된 flow에서 특정 필드를 추출하는 규칙.
 */
export interface ExtractorRule {
    /** 데이터 소스 위치 */
    source:
        | "request.query"
        | "request.body"
        | "response.body"
        | "request.header"
        | "response.header";
    /** 추출할 필드명 (query param key, JSON path 등) */
    field: string;
    /** UI 컬럼 헤더에 표시할 이름 */
    display_name: string;
    /** true이면 이 필드를 이벤트의 고유 식별자로 사용 */
    primary_key?: boolean;
}

/**
 * UI 테이블/카드 표시 설정.
 */
export interface DisplayConfig {
    /** 표시 유형 */
    type: "event_table" | "summary_cards";
    /** 테이블 컬럼 정의 */
    columns: DisplayColumn[];
}

/**
 * 테이블 컬럼 하나의 정의.
 */
export interface DisplayColumn {
    /** TrackedEvent.extractedData 또는 내장 필드의 키 */
    field: string;
    /** 컬럼 헤더 텍스트 */
    label: string;
    /** 렌더링 타입 */
    type: "text" | "code" | "badge" | "timestamp" | "status_code";
}

// ─── Engine 출력 타입 ───

/**
 * TrackerEngine이 flow를 처리한 결과.
 * 하나의 HTTPFlow가 최대 하나의 TrackedEvent를 생성한다.
 */
export interface TrackedEvent {
    /** 고유 ID (flow.id 기반) */
    id: string;
    /** 매칭된 TrackerConfig.name */
    trackerName: string;
    /** 매칭된 MatcherRule.id */
    matcherId: string;
    /** 매칭된 MatcherRule.label */
    matcherLabel: string;
    /** 매칭된 MatcherRule.color */
    matcherColor: string;
    /** request timestamp (ms) */
    timestamp: number;
    /** 원본 mitmproxy flow ID */
    flowId: string;
    /** HTTP method */
    method: string;
    /** request host */
    host: string;
    /** request path */
    path: string;
    /** response status code */
    statusCode?: number;
    /** ExtractorRule로 추출된 key-value 데이터 */
    extractedData: Record<string, string>;
}
