import * as React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import ProxyApp from "./components/ProxyApp";
import { add as addLog } from "./ducks/eventLog";
import useUrlState from "./urlState";
import WebSocketBackend from "./backends/websocket";
import StaticBackend from "./backends/static";
import { store } from "./ducks";
import { syncSystemTheme } from "./ducks/ui/theme";

// Extend the Window interface to avoid TS errors
declare global {
    interface Window {
        MITMWEB_STATIC?: boolean;
    }
}

if (window.MITMWEB_STATIC) {
    // @ts-expect-error this is not declared above as it should not be used.
    window.backend = new StaticBackend(store);
} else {
    // @ts-expect-error this is not declared above as it should not be used.
    window.backend = new WebSocketBackend(store);
}

useUrlState(store);

// Theme: sync data-theme attribute with Redux state
const applyTheme = () => {
    const { effective } = store.getState().ui.theme;
    document.documentElement.setAttribute("data-theme", effective);
};
applyTheme();
store.subscribe(applyTheme);

// Theme: listen for OS dark mode changes
window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
        store.dispatch(syncSystemTheme());
    });

window.addEventListener("error", (e: ErrorEvent) => {
    store.dispatch(addLog(`${e.message}\n${e.error.stack}`));
});

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("mitmproxy");
    const root = createRoot(container!);
    root.render(
        <Provider store={store}>
            <ProxyApp />
        </Provider>,
    );
});
