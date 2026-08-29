import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const nginx = readFileSync('deploy/aeldrune-desktop-updates.nginx.conf', 'utf8');

describe('Aeldrune desktop update host', () => {
  it('serves only the feed and versioned Windows artifacts', () => {
    expect(nginx).toContain('location = /desktop-updates/latest.yml');
    expect(nginx).toContain('Aeldrune-[0-9]+\\.[0-9]+\\.[0-9]+-win-x64');
    expect(nginx).toContain('location /desktop-updates/');
    expect(nginx).not.toContain('location ^~ /desktop-updates/');
    expect(nginx).toContain('return 404;');
    expect(nginx).not.toContain('autoindex on');
  });

  it('keeps the manifest fresh and versioned payloads immutable', () => {
    expect(nginx).toContain('no-store, no-cache, must-revalidate');
    expect(nginx).toContain('public, max-age=31536000, immutable');
  });
});
