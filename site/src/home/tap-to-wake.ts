// nool: copied unchanged from declarative-dragging.github.io/page/tap-to-wake.ts
// On a touch screen, a live figure would take every swipe that starts on
// it, and the page couldn't be scrolled past it. Until it's tapped, it lets
// vertical swipes scroll the page (the CSS for .tap-dormant is the page's). Once it's awake, a swipe that starts on something
// draggable is a drag, never a scroll.
export function tapToWake(host: HTMLElement) {
  host.classList.add("tap-dormant");
  host.addEventListener("click", () => host.classList.remove("tap-dormant"), {
    once: true,
  });
  holdDragTouches(host, () => !host.classList.contains("tap-dormant"));
}

/**
 * Keeps a touch that starts on something draggable in `host` (Dragology
 * gives those cursor: grab) from scrolling the page, while `on()`. The
 * renderer's svg asks for that with touch-action, which iOS Safari doesn't
 * always honor, so the touch's moves are cancelled; a touch anywhere else
 * still scrolls. And a touch the browser takes back is let go of (see
 * releaseOnCancel).
 */
export function holdDragTouches(
  host: HTMLElement,
  on: () => boolean = () => true,
) {
  releaseOnCancel(host);
  let held = false;
  host.addEventListener(
    "touchstart",
    (e) => {
      held =
        on() && !!(e.target as Element).closest?.('[style*="cursor: grab"]');
    },
    { passive: true },
  );
  host.addEventListener(
    "touchmove",
    (e) => {
      if (held) e.preventDefault();
    },
    { passive: false },
  );
}

/**
 * The browser can take a touch back partway (a second finger, a system
 * gesture): its pointer gets a pointercancel and never a pointerup, and the
 * renderer, which ends a drag on pointerup, would leave what was dragged
 * stuck partway. So a pointer that started in `host` and is cancelled is let
 * go of where it last was, as if lifted there.
 */
function releaseOnCancel(host: HTMLElement) {
  let id: number | null = null;
  let last: PointerEvent | null = null;
  host.addEventListener(
    "pointerdown",
    (e) => ((id = e.pointerId), (last = e)),
    true,
  );
  document.addEventListener(
    "pointermove",
    (e) => e.pointerId === id && (last = e),
    true,
  );
  document.addEventListener(
    "pointerup",
    (e) => e.pointerId === id && (id = null),
    true,
  );
  document.addEventListener(
    "pointercancel",
    (e) => {
      if (e.pointerId !== id || !last) return;
      id = null;
      document.dispatchEvent(
        new PointerEvent("pointerup", {
          pointerId: e.pointerId,
          pointerType: e.pointerType,
          isPrimary: e.isPrimary,
          clientX: last.clientX,
          clientY: last.clientY,
          bubbles: true,
        }),
      );
    },
    true,
  );
}
