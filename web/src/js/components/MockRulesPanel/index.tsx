import React, { useEffect, useState, useCallback } from "react";
import { fetchApi } from "../../utils";
import "./MockRulesPanel.css";

interface MockRule {
    url_pattern: string;
    status_code: number;
    body: string;
    enabled: boolean;
}

const STATUS_PRESETS = [
    { code: 400, label: "400 Bad Request" },
    { code: 401, label: "401 Unauthorized" },
    { code: 403, label: "403 Forbidden" },
    { code: 404, label: "404 Not Found" },
    { code: 408, label: "408 Timeout" },
    { code: 429, label: "429 Too Many Requests" },
    { code: 500, label: "500 Internal Server Error" },
    { code: 502, label: "502 Bad Gateway" },
    { code: 503, label: "503 Service Unavailable" },
];

const DEFAULT_RULE: MockRule = {
    url_pattern: "",
    status_code: 500,
    body: '{"detail": "Internal Server Error"}',
    enabled: true,
};

// Prevent mitmproxy's global keyboard handler from intercepting input keystrokes
const stopKeyPropagation = (e: React.KeyboardEvent) => e.stopPropagation();

export default function MockRulesPanel() {
    const [rules, setRules] = useState<MockRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<MockRule>(DEFAULT_RULE);
    const [error, setError] = useState<string | null>(null);

    const fetchRules = useCallback(async () => {
        try {
            const resp = await fetchApi("/mock-rules");
            const data = await resp.json();
            setRules(data.rules || []);
            setError(null);
        } catch (e) {
            setError("Failed to load rules");
        } finally {
            setLoading(false);
        }
    }, []);

    const saveRules = useCallback(
        async (newRules: MockRule[]) => {
            setSaving(true);
            try {
                const resp = await fetchApi.put("/mock-rules", { rules: newRules });
                if (!resp.ok) {
                    const text = await resp.text();
                    setError(`Save failed (${resp.status}): ${text}`);
                    return;
                }
                const data = await resp.json();
                setRules(data.rules || []);
                setError(null);
            } catch (e) {
                setError(`Failed to save rules: ${e}`);
            } finally {
                setSaving(false);
            }
        },
        [],
    );

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const handleToggle = (index: number) => {
        const updated = rules.map((r, i) =>
            i === index ? { ...r, enabled: !r.enabled } : r,
        );
        saveRules(updated);
    };

    const handleDelete = (index: number) => {
        const updated = rules.filter((_, i) => i !== index);
        saveRules(updated);
    };

    const handleAdd = () => {
        setEditForm({ ...DEFAULT_RULE });
        setEditingIndex(-1); // -1 = new rule
    };

    const handleEdit = (index: number) => {
        setEditForm({ ...rules[index] });
        setEditingIndex(index);
    };

    const handleSaveEdit = () => {
        if (!editForm.url_pattern.trim()) return;
        let updated: MockRule[];
        if (editingIndex === -1) {
            updated = [...rules, editForm];
        } else {
            updated = rules.map((r, i) => (i === editingIndex ? editForm : r));
        }
        saveRules(updated);
        setEditingIndex(null);
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
    };

    const handleStatusPreset = (code: number) => {
        const label = STATUS_PRESETS.find((p) => p.code === code)?.label || `Error ${code}`;
        setEditForm({
            ...editForm,
            status_code: code,
            body: JSON.stringify({ detail: label.split(" ").slice(1).join(" ") }),
        });
    };

    if (loading) {
        return (
            <div className="mock-panel">
                <div className="mock-loading">Loading mock rules...</div>
            </div>
        );
    }

    return (
        <div className="mock-panel">
            <div className="mock-header">
                <div>
                    <h2>Mock Response Rules</h2>
                    <p className="mock-desc">
                        URL pattern matching (substring). Changes apply immediately.
                    </p>
                </div>
                <button className="mock-btn mock-btn-primary" onClick={handleAdd}>
                    + Add Rule
                </button>
            </div>

            {error && <div className="mock-error">{error}</div>}

            {/* Edit / Add Form */}
            {editingIndex !== null && (
                <div className="mock-form-card">
                    <h3>{editingIndex === -1 ? "New Rule" : "Edit Rule"}</h3>

                    <div className="mock-form-row">
                        <label>URL Pattern (substring match)</label>
                        <input
                            type="text"
                            className="mock-input"
                            placeholder="/v1_2/children/7887/reports/"
                            value={editForm.url_pattern}
                            onKeyDown={stopKeyPropagation}
                            onChange={(e) =>
                                setEditForm({ ...editForm, url_pattern: e.target.value })
                            }
                        />
                    </div>

                    <div className="mock-form-row">
                        <label>Status Code</label>
                        <div className="mock-status-row">
                            <input
                                type="number"
                                className="mock-input mock-input-short"
                                value={editForm.status_code}
                                onKeyDown={stopKeyPropagation}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        status_code: parseInt(e.target.value) || 500,
                                    })
                                }
                            />
                            <div className="mock-presets">
                                {STATUS_PRESETS.map((p) => (
                                    <button
                                        key={p.code}
                                        className={`mock-preset ${editForm.status_code === p.code ? "active" : ""}`}
                                        onClick={() => handleStatusPreset(p.code)}
                                    >
                                        {p.code}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mock-form-row">
                        <label>Response Body (JSON)</label>
                        <textarea
                            className="mock-textarea"
                            rows={3}
                            value={editForm.body}
                            onKeyDown={stopKeyPropagation}
                            onChange={(e) =>
                                setEditForm({ ...editForm, body: e.target.value })
                            }
                        />
                    </div>

                    <div className="mock-form-row">
                        <label className="mock-checkbox-label">
                            <input
                                type="checkbox"
                                checked={editForm.enabled}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, enabled: e.target.checked })
                                }
                            />
                            Enabled
                        </label>
                    </div>

                    <div className="mock-form-actions">
                        <button
                            className="mock-btn mock-btn-primary"
                            onClick={handleSaveEdit}
                            disabled={!editForm.url_pattern.trim()}
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                        <button className="mock-btn" onClick={handleCancelEdit}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Rules Table */}
            {rules.length === 0 ? (
                <div className="mock-empty">
                    <p>No mock rules configured.</p>
                    <p className="mock-hint">
                        Add a rule to return custom status codes for specific API URLs.
                    </p>
                </div>
            ) : (
                <div className="mock-table-container">
                    <table className="mock-table">
                        <thead>
                            <tr>
                                <th style={{ width: 60 }}>ON</th>
                                <th>URL Pattern</th>
                                <th style={{ width: 100 }}>Status</th>
                                <th>Response Body</th>
                                <th style={{ width: 120 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map((rule, i) => (
                                <tr
                                    key={i}
                                    className={rule.enabled ? "" : "mock-disabled"}
                                >
                                    <td>
                                        <label className="mock-switch">
                                            <input
                                                type="checkbox"
                                                checked={rule.enabled}
                                                onChange={() => handleToggle(i)}
                                            />
                                            <span className="mock-slider" />
                                        </label>
                                    </td>
                                    <td>
                                        <code className="mock-url-pattern">
                                            {rule.url_pattern}
                                        </code>
                                    </td>
                                    <td>
                                        <span
                                            className={`mock-status-badge ${
                                                rule.status_code >= 500
                                                    ? "error-5xx"
                                                    : rule.status_code >= 400
                                                      ? "error-4xx"
                                                      : "success"
                                            }`}
                                        >
                                            {rule.status_code}
                                        </span>
                                    </td>
                                    <td>
                                        <code className="mock-body-preview">
                                            {rule.body.length > 60
                                                ? rule.body.slice(0, 60) + "..."
                                                : rule.body}
                                        </code>
                                    </td>
                                    <td>
                                        <div className="mock-actions">
                                            <button
                                                className="mock-btn-sm"
                                                onClick={() => handleEdit(i)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="mock-btn-sm mock-btn-danger"
                                                onClick={() => handleDelete(i)}
                                            >
                                                Del
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
