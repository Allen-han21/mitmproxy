import * as React from "react";
import { Menu } from "../ProxyApp";

function TrackerMenu() {
    return (
        <div className="menu-row">
            <div className="menu-group">
                <div className="menu-content">
                    <span className="menu-legend">
                        Event Trackers
                    </span>
                </div>
            </div>
        </div>
    );
}

TrackerMenu.title = "Trackers";

export default TrackerMenu as Menu;
