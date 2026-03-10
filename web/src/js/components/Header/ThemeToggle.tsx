import * as React from "react";
import { useAppDispatch, useAppSelector } from "../../ducks";
import { setTheme, Theme } from "../../ducks/ui/theme";

const nextTheme: Record<Theme, Theme> = {
    system: "light",
    light: "dark",
    dark: "system",
};

const themeIcon: Record<Theme, string> = {
    system: "fa-adjust",
    light: "fa-sun-o",
    dark: "fa-moon-o",
};

const themeLabel: Record<Theme, string> = {
    system: "System",
    light: "Light",
    dark: "Dark",
};

export default function ThemeToggle() {
    const dispatch = useAppDispatch();
    const preference = useAppSelector((state) => state.ui.theme.preference);

    return (
        <a
            href="#"
            className="theme-toggle"
            title={`Theme: ${themeLabel[preference]}`}
            onClick={(e) => {
                e.preventDefault();
                dispatch(setTheme(nextTheme[preference]));
            }}
        >
            <i className={`fa ${themeIcon[preference]}`} />
        </a>
    );
}
