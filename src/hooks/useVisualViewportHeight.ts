import { useEffect, useState } from 'react';

// Mobile keyboards resize the VISUAL viewport when they open, but not always the
// layout viewport that CSS `dvh` units are computed from (Safari iOS never
// resizes it for on-page content; Android Chrome only does when the page opts in
// via <meta interactive-widget=resizes-content>, see index.html). Without this,
// a flex-column-anchored, non-fixed element at the bottom of the page (like the
// chat message composer) ends up positioned below the visible area — covered by
// the keyboard instead of pushed above it.
//
// Returns the current `visualViewport.height` in px, updated live as the
// keyboard opens/closes, or `null` when the API isn't available (desktop
// browsers, older mobile browsers) — callers should fall back to the `h-dvh`
// CSS class in that case, which is correct there.
export function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(() =>
    typeof window !== 'undefined' && window.visualViewport ? window.visualViewport.height : null,
  );

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => setHeight(viewport.height);
    update();

    viewport.addEventListener('resize', update);
    return () => viewport.removeEventListener('resize', update);
  }, []);

  return height;
}
