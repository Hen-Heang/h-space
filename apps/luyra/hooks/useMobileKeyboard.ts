"use client";

import { useEffect, useState } from "react";

// Soft-keyboard detection. iOS shrinks `visualViewport` rather than firing a
// keyboard event, so we compare the current height against the last height
// recorded while nothing editable was focused.
const KEYBOARD_HEIGHT_THRESHOLD = 120;

function isEditable(element: Element | null): boolean {
  const el = element as HTMLElement | null;
  return el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || Boolean(el?.isContentEditable);
}

export function useMobileKeyboard(): boolean {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const viewport = window.visualViewport;
    let baseHeight = viewport?.height ?? window.innerHeight;

    function update() {
      const currentHeight = viewport?.height ?? window.innerHeight;
      const editing = isEditable(document.activeElement);

      if (!editing) baseHeight = currentHeight;

      setIsKeyboardOpen(editing && baseHeight - currentHeight > KEYBOARD_HEIGHT_THRESHOLD);
    }

    function handleFocusIn(event: FocusEvent) {
      if (isEditable(event.target as Element | null)) update();
    }

    function handleFocusOut() {
      window.setTimeout(update, 120);
    }

    update();
    viewport?.addEventListener("resize", update);
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);

    return () => {
      viewport?.removeEventListener("resize", update);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return isKeyboardOpen;
}
