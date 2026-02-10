/**
 * Auto-generated tracker configs.
 * This file will be replaced by the build script (scripts/build-frontend.sh)
 * which converts configs/*.yaml → this TypeScript file.
 *
 * For now, it contains sample configs equivalent to the old hardcoded trackers.
 */
import { TrackerConfig } from "./types";

const kidsnoteAds: TrackerConfig = {
    name: "Kidsnote Ads",
    description: "Kidsnote ad tracking (request/impression/click)",
    matchers: [
        {
            id: "ad_request",
            label: "Ad Request",
            color: "#8b5cf6",
            host: "ads-api-kcsandbox-01.kidsnote.com",
            path_pattern: "/req(\\?|$)",
        },
        {
            id: "ad_impression",
            label: "Impression",
            color: "#3b82f6",
            host: "ads-api-kcsandbox-01.kidsnote.com",
            path_pattern: "/imp(\\?|$)",
        },
        {
            id: "ad_click",
            label: "Click",
            color: "#10b981",
            host: "ads-api-kcsandbox-01.kidsnote.com",
            path_pattern: "/click(\\?|$)",
        },
    ],
    extractors: [
        {
            source: "request.query",
            field: "adsid",
            display_name: "Ad ID",
            primary_key: true,
        },
    ],
    display: {
        type: "event_table",
        columns: [
            { field: "Ad ID", label: "Ad ID", type: "code" },
            { field: "matcher_label", label: "Event", type: "badge" },
            { field: "timestamp", label: "Time", type: "timestamp" },
            { field: "status_code", label: "Status", type: "status_code" },
        ],
    },
};

const kidsnotetiara: TrackerConfig = {
    name: "Tiara Analytics",
    description: "Kakao Tiara analytics event tracking",
    matchers: [
        {
            id: "tiara_track",
            label: "Tiara Event",
            color: "#f59e0b",
            host: "stat.tiara.daum.net",
            path_pattern: ".*",
        },
    ],
    extractors: [],
    display: {
        type: "event_table",
        columns: [
            { field: "matcher_label", label: "Event", type: "badge" },
            { field: "timestamp", label: "Time", type: "timestamp" },
            { field: "method", label: "Method", type: "text" },
            { field: "path", label: "Path", type: "text" },
            { field: "status_code", label: "Status", type: "status_code" },
        ],
    },
};

export const trackerConfigs: TrackerConfig[] = [kidsnoteAds, kidsnotetiara];
