export type LandingViewSelector = '#download-view';

export function initialLandingView(pathname: string): LandingViewSelector | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return normalized === '/download' ? '#download-view' : null;
}
