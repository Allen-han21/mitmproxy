import { Flow, HTTPFlow } from "../flow";
import { TrackerConfig, MatcherRule, TrackedEvent } from "./types";

/**
 * 컴파일된 matcher — path_pattern 문자열을 RegExp로 변환하여 캐싱.
 */
interface CompiledMatcher {
    config: TrackerConfig;
    rule: MatcherRule;
    pathRegex: RegExp;
}

/**
 * TrackerEngine — YAML config 기반으로 HTTP flow를 매칭하고 데이터를 추출한다.
 *
 * 사용법:
 *   const engine = new TrackerEngine(configs);
 *   const event = engine.processFlow(flow);    // 단건
 *   const events = engine.processFlows(flows); // 일괄
 */
export class TrackerEngine {
    private compiled: CompiledMatcher[] = [];

    constructor(configs: TrackerConfig[]) {
        this.loadConfigs(configs);
    }

    /**
     * config 배열을 받아 matcher를 컴파일한다.
     * 기존 compiled 목록을 교체한다.
     */
    loadConfigs(configs: TrackerConfig[]): void {
        this.compiled = [];
        for (const config of configs) {
            for (const rule of config.matchers) {
                try {
                    this.compiled.push({
                        config,
                        rule,
                        pathRegex: new RegExp(rule.path_pattern),
                    });
                } catch (e) {
                    console.error(
                        `[TrackerEngine] Invalid regex in "${config.name}" matcher "${rule.id}": ${rule.path_pattern}`,
                        e,
                    );
                }
            }
        }
    }

    /**
     * HTTPFlow에 매칭되는 첫 번째 (config, matcher) 쌍을 반환한다.
     * 매칭 순서: compiled 배열 순서 (config 등록 순 → matcher 선언 순).
     */
    matchFlow(
        flow: HTTPFlow,
    ): { config: TrackerConfig; matcher: MatcherRule } | null {
        const host = flow.request.pretty_host;
        const path = flow.request.path;

        for (const { config, rule, pathRegex } of this.compiled) {
            if (rule.host === host && pathRegex.test(path)) {
                return { config, matcher: rule };
            }
        }
        return null;
    }

    /**
     * 매칭된 flow에서 config의 extractors에 따라 데이터를 추출한다.
     * 현재 지원: request.query (URL query parameter)
     * request.header, response.header도 지원.
     * request.body, response.body는 비동기 content fetch가 필요하므로 placeholder만 둔다.
     */
    extractData(
        flow: HTTPFlow,
        config: TrackerConfig,
    ): Record<string, string> {
        const data: Record<string, string> = {};

        for (const extractor of config.extractors) {
            const { source, field, display_name } = extractor;

            switch (source) {
                case "request.query": {
                    const value = this.extractQueryParam(flow, field);
                    if (value !== null) {
                        data[display_name] = value;
                    }
                    break;
                }
                case "request.header": {
                    const value = this.extractHeader(
                        flow.request.headers,
                        field,
                    );
                    if (value !== null) {
                        data[display_name] = value;
                    }
                    break;
                }
                case "response.header": {
                    if (flow.response) {
                        const value = this.extractHeader(
                            flow.response.headers,
                            field,
                        );
                        if (value !== null) {
                            data[display_name] = value;
                        }
                    }
                    break;
                }
                case "request.body":
                case "response.body":
                    // Body 추출은 비동기 content fetch 필요 — Step 5/6에서 구현
                    break;
            }
        }

        return data;
    }

    /**
     * 단일 flow를 처리하여 TrackedEvent를 반환한다.
     * 매칭되지 않으면 null.
     */
    processFlow(flow: Flow): TrackedEvent | null {
        if (flow.type !== "http") return null;
        const httpFlow = flow as HTTPFlow;

        const match = this.matchFlow(httpFlow);
        if (!match) return null;

        const { config, matcher } = match;
        const extractedData = this.extractData(httpFlow, config);

        return {
            id: flow.id,
            trackerName: config.name,
            matcherId: matcher.id,
            matcherLabel: matcher.label,
            matcherColor: matcher.color,
            timestamp: httpFlow.request.timestamp_start * 1000,
            flowId: flow.id,
            method: httpFlow.request.method,
            host: httpFlow.request.pretty_host,
            path: httpFlow.request.path,
            statusCode: httpFlow.response?.status_code,
            extractedData,
        };
    }

    /**
     * flow 배열을 일괄 처리하여 매칭된 이벤트만 반환한다.
     * 최신순(timestamp 내림차순) 정렬.
     */
    processFlows(flows: Flow[]): TrackedEvent[] {
        const events: TrackedEvent[] = [];
        for (const flow of flows) {
            const event = this.processFlow(flow);
            if (event) {
                events.push(event);
            }
        }
        return events.sort((a, b) => b.timestamp - a.timestamp);
    }

    // ─── Private helpers ───

    private extractQueryParam(
        flow: HTTPFlow,
        paramName: string,
    ): string | null {
        try {
            const url = new URL(
                flow.request.path,
                `${flow.request.scheme}://${flow.request.pretty_host}`,
            );
            return url.searchParams.get(paramName);
        } catch {
            return null;
        }
    }

    private extractHeader(
        headers: [string, string][],
        headerName: string,
    ): string | null {
        if (!headers) return null;
        const lowerName = headerName.toLowerCase();
        const entry = headers.find(([key]) => key.toLowerCase() === lowerName);
        return entry ? entry[1] : null;
    }
}
