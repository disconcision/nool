import { ResizeStrategy } from "./hazel-integration-base";

/**
 * Basic resize strategy using ResizeObserver
 */
export function createBasicResize(): ResizeStrategy {
  return {
    setup({ id, sendToHazel }) {
      let resizeObserver: ResizeObserver | null = null;

      // Debounced resize function
      let resizeTimeout: number | null = null;
      const debouncedResize = (width: number, height: number) => {
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }
        resizeTimeout = window.setTimeout(() => {
          sendToHazel({ type: "resize", id, width, height });
        }, 100);
      };

      // Set up ResizeObserver on document.body
      if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            debouncedResize(width, height);
          }
        });

        resizeObserver.observe(document.body);
      }

      // Cleanup function
      return () => {
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }
      };
    },
  };
}