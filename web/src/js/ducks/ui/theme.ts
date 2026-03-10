import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function getInitialTheme(): Theme {
    const stored = localStorage.getItem("mitmios-theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
    }
    return "system";
}

function getEffectiveTheme(theme: Theme): "light" | "dark" {
    return theme === "system" ? getSystemTheme() : theme;
}

const themeSlice = createSlice({
    name: "ui/theme",
    initialState: {
        preference: getInitialTheme(),
        effective: getEffectiveTheme(getInitialTheme()),
    },
    reducers: {
        setTheme(state, action: PayloadAction<Theme>) {
            state.preference = action.payload;
            state.effective = getEffectiveTheme(action.payload);
            localStorage.setItem("mitmios-theme", action.payload);
        },
        syncSystemTheme(state) {
            if (state.preference === "system") {
                state.effective = getSystemTheme();
            }
        },
    },
});

export const { setTheme, syncSystemTheme } = themeSlice.actions;
export default themeSlice.reducer;
