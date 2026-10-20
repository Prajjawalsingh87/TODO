import { useCallback, useSyncExternalStore } from "react";

// The browser fires beforeinstallprompt once, possibly before React mounts,
// so the event is captured at module load and shared through a tiny store.
let deferredPrompt = null;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit();
  });
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export default function useInstallPrompt() {
  const prompt = useSyncExternalStore(subscribe, () => deferredPrompt, () => null);

  const install = useCallback(async () => {
    const event = deferredPrompt;
    if (!event) return;
    deferredPrompt = null;
    emit();
    event.prompt();
    try {
      await event.userChoice;
    } catch {
      // Ignore: the prompt was dismissed or could not be shown.
    }
  }, []);

  return { canInstall: Boolean(prompt), install };
}
