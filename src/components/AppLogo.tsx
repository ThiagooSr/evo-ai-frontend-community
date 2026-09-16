import type { CSSProperties } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';
import { useGlobalConfig } from '../contexts/GlobalConfigContext';
import logoDark from '../assets/EVO_CRM.svg';
import logoLight from '../assets/EVO_CRM_light.svg';

interface AppLogoProps {
  className?: string;
  alt?: string;
  style?: CSSProperties;
  forceTheme?: 'dark' | 'light';
}

export function AppLogo({ className, alt, style, forceTheme }: AppLogoProps) {
  const { theme } = useDarkMode();
  const { brandName, brandLogoUrl } = useGlobalConfig();
  const effectiveTheme = forceTheme ?? theme;
  // /settings/admin/branding lets an installation replace the stock wordmark
  // with its own logo (one image for both themes — most uploaded logos are
  // not theme-aware). Falls back to the stock dark/light SVG pair otherwise.
  const src = brandLogoUrl || (effectiveTheme === 'dark' ? logoDark : logoLight);

  return <img src={src} alt={alt ?? brandName ?? 'EVO CRM'} className={className} style={style} />;
}
