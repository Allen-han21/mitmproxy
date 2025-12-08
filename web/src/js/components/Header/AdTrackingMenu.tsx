import * as React from "react";
import { Menu } from "../ProxyApp";

function AdTrackingMenu() {
    return (
        <div className="menu-row">
            <div className="menu-group">
                <div className="menu-content">
                    <span className="menu-legend">
                        📱 Kidsnote Ad Tracking Analysis
                    </span>
                </div>
            </div>
        </div>
    );
}

AdTrackingMenu.title = "Ad Tracking";

export default AdTrackingMenu as Menu;
