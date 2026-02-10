import { Flow, HTTPFlow } from "../../../flow";

export interface MetricsSummary {
    totalRequests: number;
    errorRate: number;
    avgResponseTime: number;
    slowQueries: number;
}

export interface StatusCodeCount {
    code: number;
    count: number;
}

export interface DomainStat {
    domain: string;
    count: number;
    avgTime: number;
}

export interface ResponseTimePoint {
    timestamp: number;
    time: number;
}

/**
 * Calculate summary metrics from flows
 */
export function calculateSummary(flows: Flow[]): MetricsSummary {
    const httpFlows = flows.filter((f) => f.type === "http") as HTTPFlow[];

    const totalRequests = httpFlows.length;

    // Calculate error rate (4xx, 5xx status codes)
    const errorCount = httpFlows.filter(
        (f) => f.response && f.response.status_code >= 400
    ).length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    // Calculate average response time
    const responseTimes = httpFlows
        .filter((f) => f.response?.timestamp_end && f.request?.timestamp_start)
        .map((f) => {
            const start = f.request.timestamp_start;
            const end = f.response!.timestamp_end!;
            return (end - start) * 1000; // Convert to milliseconds
        });

    const avgResponseTime =
        responseTimes.length > 0
            ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
            : 0;

    // Count slow queries (> 1 second)
    const slowQueries = responseTimes.filter((time) => time > 1000).length;

    return {
        totalRequests,
        errorRate,
        avgResponseTime,
        slowQueries,
    };
}

/**
 * Calculate status code distribution
 */
export function calculateStatusCodes(flows: Flow[]): StatusCodeCount[] {
    const httpFlows = flows.filter((f) => f.type === "http") as HTTPFlow[];

    const statusCodeMap = new Map<number, number>();

    httpFlows.forEach((f) => {
        if (f.response) {
            const code = f.response.status_code;
            statusCodeMap.set(code, (statusCodeMap.get(code) || 0) + 1);
        }
    });

    return Array.from(statusCodeMap.entries())
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 status codes
}

/**
 * Calculate domain statistics
 */
export function calculateDomainStats(flows: Flow[]): DomainStat[] {
    const httpFlows = flows.filter((f) => f.type === "http") as HTTPFlow[];

    const domainMap = new Map<string, { count: number; totalTime: number }>();

    httpFlows.forEach((f) => {
        const domain = f.request.pretty_host;
        const stat = domainMap.get(domain) || { count: 0, totalTime: 0 };

        stat.count += 1;

        if (f.response?.timestamp_end && f.request?.timestamp_start) {
            const responseTime =
                (f.response.timestamp_end - f.request.timestamp_start) * 1000;
            stat.totalTime += responseTime;
        }

        domainMap.set(domain, stat);
    });

    return Array.from(domainMap.entries())
        .map(([domain, stat]) => ({
            domain,
            count: stat.count,
            avgTime: stat.count > 0 ? stat.totalTime / stat.count : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 domains
}

/**
 * Calculate response time over time
 * Groups data points by time buckets for charting
 */
export function calculateResponseTimeOverTime(
    flows: Flow[],
    bucketSizeMs: number = 5000 // 5 seconds
): ResponseTimePoint[] {
    const httpFlows = flows.filter((f) => f.type === "http") as HTTPFlow[];

    const timeMap = new Map<number, number[]>();

    httpFlows.forEach((f) => {
        if (f.response?.timestamp_end && f.request?.timestamp_start) {
            const timestamp = Math.floor(f.request.timestamp_start * 1000);
            const bucket = Math.floor(timestamp / bucketSizeMs) * bucketSizeMs;
            const responseTime =
                (f.response.timestamp_end - f.request.timestamp_start) * 1000;

            if (!timeMap.has(bucket)) {
                timeMap.set(bucket, []);
            }
            timeMap.get(bucket)!.push(responseTime);
        }
    });

    return Array.from(timeMap.entries())
        .map(([timestamp, times]) => ({
            timestamp,
            time:
                times.reduce((sum, time) => sum + time, 0) / times.length,
        }))
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-50); // Last 50 data points
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
    return num.toLocaleString();
}

/**
 * Format milliseconds to readable string
 */
export function formatTime(ms: number): string {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format percentage
 */
export function formatPercentage(percent: number): string {
    return `${percent.toFixed(1)}%`;
}
