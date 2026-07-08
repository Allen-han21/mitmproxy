import * as React from "react";
import { Menu } from "../ProxyApp";

function MockMenu() {
    return (
        <div className="menu-row">
            <div className="menu-group">
                <div className="menu-content">
                    <span className="menu-legend">
                        Mock Response Rules
                    </span>
                </div>
            </div>
        </div>
    );
}

MockMenu.title = "Mock";

export default MockMenu as Menu;
