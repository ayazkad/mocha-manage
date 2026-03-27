import { useEffect, useRef } from 'react';

/**
 * Hook that blocks all vertical touchmove/scroll events on iOS.
 * This prevents the rubber-band bounce effect in Capacitor WebView.
 *
 * @param enabled - set to false to disable (e.g., for Admin panel)
 */
export function usePreventVerticalScroll(enabled = true) {
    const startY = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const handleTouchStart = (e: TouchEvent) => {
            startY.current = e.touches[0].clientY;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (startY.current === null) return;

            const deltaY = e.touches[0].clientY - startY.current;
            const target = e.target as HTMLElement;

            // Allow all scroll inside dialogs/sheets/portals (Radix UI)
            const inDialog = target.closest(
                '[data-radix-dialog-content], [data-radix-alert-dialog-content], [role="dialog"], [data-radix-popper-content-wrapper], [vaul-drawer]'
            );
            if (inDialog) return; // Don't block scroll inside modals

            // Walk up the DOM to find a scrollable ancestor
            let el: HTMLElement | null = target;
            let scrollableFound = false;

            while (el && el !== document.body) {
                const style = window.getComputedStyle(el);
                const overflowY = style.overflowY;
                const isScrollable =
                    overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';

                if (isScrollable && el.scrollHeight > el.clientHeight) {
                    // Allow scroll only if not at the top/bottom boundary
                    const atTop = deltaY > 0 && el.scrollTop === 0;
                    const atBottom =
                        deltaY < 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

                    if (atTop || atBottom) {
                        // At boundary — block the event
                        e.preventDefault();
                    }

                    scrollableFound = true;
                    break;
                }
                el = el.parentElement;
            }

            if (!scrollableFound) {
                // No scrollable ancestor — block vertical scroll entirely
                e.preventDefault();
            }
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
        };
    }, [enabled]);
}
