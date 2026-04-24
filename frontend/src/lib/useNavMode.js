import { useEffect, useMemo, useState } from "react";

const NAV_MODE_KEY = "crenit_nav_mode_v1";

function readStoredMode() {
  try {
    const raw = window.localStorage.getItem(NAV_MODE_KEY);
    return raw === "compact" ? "compact" : "expanded";
  } catch {
    return "expanded";
  }
}

export function compactLabel(label) {
  const words = String(label || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return "?";
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

export function useNavMode() {
  const [mode, setMode] = useState("expanded");

  useEffect(() => {
    setMode(readStoredMode());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(NAV_MODE_KEY, mode);
    } catch {
      // Ignore localStorage errors in restricted environments
    }
  }, [mode]);

  const isCompact = useMemo(() => mode === "compact", [mode]);

  function toggleMode() {
    setMode((previous) => (previous === "compact" ? "expanded" : "compact"));
  }

  useEffect(() => {
    function onKeyDown(event) {
      const target = event.target;
      const isTypingContext =
        target instanceof HTMLElement
        && (
          target.tagName === "INPUT"
          || target.tagName === "TEXTAREA"
          || target.tagName === "SELECT"
          || target.isContentEditable
        );

      if (isTypingContext) {
        return;
      }

      const isShortcut =
        (event.ctrlKey || event.metaKey)
        && event.shiftKey
        && (event.key === ")" || (event.code === "Digit0" && event.shiftKey));

      if (!isShortcut) {
        return;
      }

      event.preventDefault();
      toggleMode();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return {
    mode,
    isCompact,
    toggleMode,
    setMode
  };
}
