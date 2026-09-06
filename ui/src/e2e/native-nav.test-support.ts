import type { Page } from "playwright";

// Mirror the native app's document-start flags and document-end chrome styling.
export async function installNativeWebChrome(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const nativeWindow = window as Window & {
      __GRANTED_NATIVE_WEB_CHROME__?: boolean;
      __GRANTED_NATIVE_HISTORY__?: { canGoBack: boolean; canGoForward: boolean };
    };
    nativeWindow["__GRANTED_NATIVE_WEB_CHROME__"] = true;
    nativeWindow["__GRANTED_NATIVE_HISTORY__"] = {
      canGoBack: false,
      canGoForward: false,
    };
    const stamp = () => {
      document.documentElement.classList.add("openclaw-native-macos", "openclaw-native-web-chrome");
      document.documentElement.style.setProperty("--openclaw-native-titlebar-height", "52px");
    };
    if (document.documentElement) {
      stamp();
    } else {
      document.addEventListener("DOMContentLoaded", stamp);
    }
  });
}
