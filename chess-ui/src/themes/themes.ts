import { localStore } from "../utils/store";
import { action, makeAutoObservable } from "mobx";

const themes = {
  light: `${process.env.PUBLIC_URL}/css/theme.light.css`,
  dark: `${process.env.PUBLIC_URL}/css/theme.dark.css`,
};

type ThemeName = keyof typeof themes;

const defaultTheme: ThemeName = "dark";

class ThemeManager {
  theme = defaultTheme;

  constructor() {
    makeAutoObservable(this);
    const theme: ThemeName = localStore.get("chess-theme") || defaultTheme;
    this.change(theme);
  }

  @action
  toggle = () => {
    if (this.theme === "light") {
      this.change("dark");
    } else {
      this.change("light");
    }
  };

  @action
  change = (name: ThemeName) => {
    const link = document.getElementById("app-theme-link") as HTMLLinkElement;
    if (link) {
      link.href = themes[name] || themes[defaultTheme];
    }
    this.theme = name;
    localStore.set("chess-theme", name);
  };
}

export const themeManager = new ThemeManager();
