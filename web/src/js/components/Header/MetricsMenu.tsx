import * as React from "react";
import { Menu } from "../ProxyApp";

function MetricsMenu() {
    return (
        <div className="menu-row">
            <div className="menu-group">
                <div className="menu-content">
                    <span className="menu-legend">
                        📊 Network Metrics Dashboard
                    </span>
                </div>
            </div>
        </div>
    );
}

MetricsMenu.title = "Metrics";

export default MetricsMenu as Menu;
