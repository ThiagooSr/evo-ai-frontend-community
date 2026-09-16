/**
 * Installation branding (name, primary color, favicon)
 *
 * Applies the values served by GET /api/v1/global_config (public, read before
 * login) to the document: browser tab title, favicon, and the CSS custom
 * property the whole theme derives its primary color from. Logo swapping is
 * handled separately by AppLogo, which reads brandLogoUrl straight off
 * GlobalConfigContext (no DOM mutation needed there — it's a React prop).
 *
 * Falls back to the stock look whenever a value is absent, so an
 * unconfigured installation is visually identical to before this feature
 * existed.
 */

const DEFAULT_TITLE = 'Evo CRM';
const FAVICON_LINK_ID = 'app-favicon';

export interface BrandingConfig {
  brandName?: string | null;
  brandPrimaryColor?: string | null;
  brandFaviconUrl?: string | null;
}

export function applyBranding(config: BrandingConfig): void {
  applyTitle(config.brandName);
  applyFavicon(config.brandFaviconUrl);
  applyPrimaryColor(config.brandPrimaryColor);
}

function applyTitle(brandName?: string | null): void {
  document.title = brandName?.trim() || DEFAULT_TITLE;
}

function applyFavicon(faviconUrl?: string | null): void {
  if (!faviconUrl) return;

  let link = document.getElementById(FAVICON_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = FAVICON_LINK_ID;
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = faviconUrl;
}

// Matches "#rgb", "#rrggbb" — what <input type="color"> always produces.
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function applyPrimaryColor(hex?: string | null): void {
  const root = document.documentElement;

  if (!hex || !HEX_COLOR_RE.test(hex)) {
    // No (or invalid) override — let the stylesheet's own default apply.
    root.style.removeProperty('--primary');
    root.style.removeProperty('--sidebar-primary');
    return;
  }

  root.style.setProperty('--primary', hex);
  root.style.setProperty('--sidebar-primary', hex);
}
