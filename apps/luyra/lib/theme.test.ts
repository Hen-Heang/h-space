import { afterEach, describe, expect, it, vi } from "vitest";
import { readPreference, resolveTheme, setThemePreference, THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from "@/lib/theme";

// Minimal browser stand-ins: the inline script and the helpers only touch
// localStorage, matchMedia, and <html>'s attribute and color-scheme.
function stubBrowser({ stored, osDark, storageThrows = false }: { stored?: string; osDark: boolean; storageThrows?: boolean }) {
  const store = new Map<string, string>(stored ? [[THEME_STORAGE_KEY, stored]] : []);
  const attributes = new Map<string, string>();
  const root = { setAttribute: (name: string, value: string) => attributes.set(name, value), style: { colorScheme: "" } };
  const blocked = () => {
    throw new DOMException("blocked", "SecurityError");
  };
  const localStorage = {
    getItem: storageThrows ? blocked : (key: string) => store.get(key) ?? null,
    setItem: storageThrows ? blocked : (key: string, value: string) => void store.set(key, value),
    removeItem: storageThrows ? blocked : (key: string) => void store.delete(key),
  };
  const matchMedia = () => ({ matches: osDark, addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("document", { documentElement: root });
  vi.stubGlobal("window", { localStorage, matchMedia, dispatchEvent: () => true });
  vi.stubGlobal("CustomEvent", class { constructor(public type: string) {} });
  return { theme: () => attributes.get("data-theme"), colorScheme: () => root.style.colorScheme, store };
}

const runInitScript = () => new Function(THEME_INIT_SCRIPT)();

afterEach(() => vi.unstubAllGlobals());

describe("THEME_INIT_SCRIPT (runs before first paint)", () => {
  it("applies a saved dark choice even when the OS is light", () => {
    const browser = stubBrowser({ stored: "dark", osDark: false });
    runInitScript();
    expect(browser.theme()).toBe("dark");
    expect(browser.colorScheme()).toBe("dark");
  });

  it("applies a saved light choice even when the OS is dark", () => {
    const browser = stubBrowser({ stored: "light", osDark: true });
    runInitScript();
    expect(browser.theme()).toBe("light");
  });

  it("follows the OS when nothing is saved", () => {
    const browser = stubBrowser({ osDark: true });
    runInitScript();
    expect(browser.theme()).toBe("dark");
  });

  it("ignores a garbage stored value and follows the OS", () => {
    const browser = stubBrowser({ stored: "purple", osDark: true });
    runInitScript();
    expect(browser.theme()).toBe("dark");
  });

  it("still follows the OS when storage is blocked (private mode)", () => {
    const browser = stubBrowser({ osDark: true, storageThrows: true });
    expect(runInitScript).not.toThrow();
    expect(browser.theme()).toBe("dark");
  });
});

describe("theme helpers", () => {
  it("reads 'system' when nothing (or garbage) is stored", () => {
    stubBrowser({ stored: "purple", osDark: false });
    expect(readPreference()).toBe("system");
  });

  it("resolves 'system' from the OS and passes explicit choices through", () => {
    stubBrowser({ osDark: true });
    expect(resolveTheme("system")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
  });

  it("saving a choice stores it and applies it; choosing System clears the stored value", () => {
    const browser = stubBrowser({ osDark: false });
    setThemePreference("dark");
    expect(browser.store.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(browser.theme()).toBe("dark");

    setThemePreference("system");
    expect(browser.store.has(THEME_STORAGE_KEY)).toBe(false);
    expect(browser.theme()).toBe("light");
  });

  it("still applies the theme for this page view when storage is blocked", () => {
    const browser = stubBrowser({ osDark: false, storageThrows: true });
    expect(() => setThemePreference("dark")).not.toThrow();
    expect(browser.theme()).toBe("dark");
  });

  it("keeps reporting the unsaved choice when storage is blocked, so toggles and OS changes respect it", () => {
    stubBrowser({ osDark: false, storageThrows: true });
    setThemePreference("dark");
    // Toggles read this; it must not fall back to "system" while the page is dark.
    expect(readPreference()).toBe("dark");
    // watchTheme only follows the OS when the preference is "system".
    expect(readPreference() === "system").toBe(false);

    setThemePreference("system");
    expect(readPreference()).toBe("system");
  });

  it("goes back to trusting storage once a save succeeds", () => {
    const blocked = stubBrowser({ osDark: false, storageThrows: true });
    setThemePreference("dark");
    expect(blocked.theme()).toBe("dark");

    const working = stubBrowser({ osDark: false });
    setThemePreference("light");
    expect(working.store.get(THEME_STORAGE_KEY)).toBe("light");
    working.store.set(THEME_STORAGE_KEY, "dark"); // another tab's change
    expect(readPreference()).toBe("dark");
  });
});
