// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { desktopDownloadUrl, initDesktopDownload } from '../src/game/desktop_download';

function buildView(): void {
  document.body.innerHTML = `
    <section id="download-view">
      <div class="desktop-download-actions">
        <a class="desktop-download-link" data-platform="mac" href="#">mac</a>
        <a class="desktop-download-link" data-platform="linux" href="#">linux</a>
        <a class="desktop-download-link" data-platform="win" href="#">win</a>
      </div>
      <p class="desktop-download-hint" data-platform-hint="linux" hidden>hint</p>
    </section>`;
}

function setUserAgent(ua: string): void {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
}

describe('initDesktopDownload', () => {
  beforeEach(buildView);

  it('enables only the published Aeldrune Windows artifact', () => {
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64)');
    initDesktopDownload(document);
    const mac = document.querySelector('[data-platform="mac"]') as HTMLAnchorElement;
    const linux = document.querySelector('[data-platform="linux"]') as HTMLAnchorElement;
    expect(mac.hasAttribute('href')).toBe(false);
    expect(mac.getAttribute('aria-disabled')).toBe('true');
    expect(linux.hasAttribute('href')).toBe(false);
    expect(linux.getAttribute('aria-disabled')).toBe('true');
    expect(linux.classList.contains('is-unavailable')).toBe(true);
    const win = document.querySelector('[data-platform="win"]') as HTMLAnchorElement;
    expect(win.href).toBe(desktopDownloadUrl('win'));
    expect(win.getAttribute('aria-disabled')).toBe('false');
    expect(win.classList.contains('is-unavailable')).toBe(false);
  });

  it('does not highlight or reveal a hint for an unavailable Linux build', () => {
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64) Chrome/125');
    initDesktopDownload(document);
    const actions = document.querySelector('.desktop-download-actions') as HTMLElement;
    const first = actions.firstElementChild as HTMLElement;
    expect(first.dataset.platform).toBe('mac');
    expect(first.classList.contains('is-detected')).toBe(false);
    const hint = document.querySelector('.desktop-download-hint') as HTMLElement;
    expect(hint.hidden).toBe(true);
  });

  it('keeps unsupported macOS unavailable', () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    initDesktopDownload(document);
    const hint = document.querySelector('.desktop-download-hint') as HTMLElement;
    expect(hint.hidden).toBe(true);
    const mac = document.querySelector('[data-platform="mac"]') as HTMLElement;
    expect(mac.classList.contains('is-detected')).toBe(false);
    expect(mac.getAttribute('aria-disabled')).toBe('true');
  });

  it('highlights and floats the Windows button for Windows visitors', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125');
    initDesktopDownload(document);
    const actions = document.querySelector('.desktop-download-actions') as HTMLElement;
    const first = actions.firstElementChild as HTMLElement;
    expect(first.dataset.platform).toBe('win');
    expect(first.classList.contains('is-detected')).toBe(true);
  });

  it('no-ops when the download view is absent', () => {
    document.body.innerHTML = '<main></main>';
    expect(() => initDesktopDownload(document)).not.toThrow();
  });
});

// The static entry-page hrefs are the no-JS fallback for the download buttons.
// They are release-owned (scripts/release_version.mjs rewrites them at prepare)
// while the module derives its version from package.json at build time, so this
// is the guard that reds when only one of the two moves.
function entryLinks(path: string, platform: string): HTMLAnchorElement[] {
  const entry = new DOMParser().parseFromString(readFileSync(path, 'utf8'), 'text/html');
  return [
    ...entry.querySelectorAll<HTMLAnchorElement>(
      `.desktop-download-link[data-platform="${platform}"]`,
    ),
  ];
}

describe('desktop download entry markup', () => {
  it.each(['index.html', 'play.html'])('%s pins its Windows fallback href', (path) => {
    const links = entryLinks(path, 'win');
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe(desktopDownloadUrl('win'));
  });

  it('keeps unsupported static links as non-download placeholders', () => {
    expect(entryLinks('index.html', 'mac')[0]?.getAttribute('href')).toBe('#');
    expect(entryLinks('index.html', 'linux')[0]?.getAttribute('href')).toBe('#');
    expect(entryLinks('play.html', 'mac')[0]?.getAttribute('href')).toBe('#');
  });

  it.each(['index.html', 'play.html'])('%s ships an enabled Windows fallback link', (path) => {
    const html = readFileSync(path, 'utf8');
    const entry = new DOMParser().parseFromString(html, 'text/html');
    const links = entry.querySelectorAll<HTMLAnchorElement>(
      '.desktop-download-link[data-platform="win"]',
    );

    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe(desktopDownloadUrl('win'));
    expect(links[0]?.dataset.i18n).toBe('download.windowsCta');
    expect(links[0]?.classList.contains('is-unavailable')).toBe(false);
    expect(entry.querySelector('[data-i18n="download.windowsPending"]')).toBeNull();
  });
});
