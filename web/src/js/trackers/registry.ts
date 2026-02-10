import { TrackerConfig, TrackedEvent } from "./types";
import { TrackerEngine } from "./engine";
import { Flow } from "../flow";

/**
 * TrackerRegistry — 로드된 TrackerConfig를 관리하고 TrackerEngine에 접근하는 싱글턴.
 *
 * 사용법:
 *   const registry = TrackerRegistry.getInstance();
 *   registry.loadConfigs(configs);          // 빌드 시 생성된 configs 로드
 *   const events = registry.processFlows(flows);
 *   const configs = registry.getConfigs();  // UI에서 탭 목록 등에 사용
 */
export class TrackerRegistry {
    private static instance: TrackerRegistry | null = null;
    private engine: TrackerEngine;
    private configs: TrackerConfig[] = [];

    private constructor() {
        this.engine = new TrackerEngine([]);
    }

    static getInstance(): TrackerRegistry {
        if (!TrackerRegistry.instance) {
            TrackerRegistry.instance = new TrackerRegistry();
        }
        return TrackerRegistry.instance;
    }

    /**
     * TrackerConfig 배열을 로드하고 engine을 재구성한다.
     * 기존 config를 완전히 교체한다.
     */
    loadConfigs(configs: TrackerConfig[]): void {
        this.configs = [...configs];
        this.engine.loadConfigs(this.configs);
    }

    /**
     * 현재 로드된 config 목록 반환.
     * UI에서 tracker 탭 목록을 렌더링할 때 사용.
     */
    getConfigs(): readonly TrackerConfig[] {
        return this.configs;
    }

    /**
     * 이름으로 특정 config 조회.
     */
    getConfigByName(name: string): TrackerConfig | undefined {
        return this.configs.find((c) => c.name === name);
    }

    /**
     * 내부 TrackerEngine 인스턴스 반환.
     * 고급 사용 시 직접 접근.
     */
    getEngine(): TrackerEngine {
        return this.engine;
    }

    /**
     * flow 배열을 처리하여 매칭된 이벤트를 반환한다.
     * engine.processFlows의 편의 래퍼.
     */
    processFlows(flows: Flow[]): TrackedEvent[] {
        return this.engine.processFlows(flows);
    }

    /**
     * 특정 tracker name에 해당하는 이벤트만 필터링하여 반환.
     */
    processFlowsForTracker(
        flows: Flow[],
        trackerName: string,
    ): TrackedEvent[] {
        return this.engine
            .processFlows(flows)
            .filter((e) => e.trackerName === trackerName);
    }

    /**
     * 로드된 config 개수 반환.
     */
    get configCount(): number {
        return this.configs.length;
    }

    /**
     * 테스트용: 싱글턴 인스턴스를 리셋한다.
     */
    static resetInstance(): void {
        TrackerRegistry.instance = null;
    }
}
