import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/desktop-publish.yml', 'utf8');

describe('Aeldrune desktop publication workflow', () => {
  it('builds and verifies only the explicit Windows Aeldrune distribution', () => {
    expect(workflow).toContain('name: Aeldrune Windows desktop publish');
    expect(workflow).toContain('runs-on: windows-latest');
    expect(workflow).toContain('npm run electron:build:aeldrune');
    expect(workflow).toContain('npm run electron:verify:aeldrune');
    expect(workflow).not.toMatch(/^\s{2}(linux|mac):\s*$/m);
  });

  it('publishes through the Aeldrune SSH release guard and never the WoC R2 feed', () => {
    expect(workflow).toContain('node scripts/aeldrune-desktop-release.mjs publish');
    expect(workflow).toContain('AELDRUNE_DESKTOP_SSH_HOST');
    expect(workflow).toContain('AELDRUNE_DESKTOP_SSH_IDENTITY');
    expect(workflow).not.toContain('updates.worldofclaudecraft.com');
    expect(workflow).not.toContain('R2_ACCESS_KEY_ID');
    // biome-ignore lint/suspicious/noTemplateCurlyInString: this asserts an absent shell template literally.
    expect(workflow).not.toContain('world-of-claudecraft-${VERSION}');
  });

  it('keeps manual runs dry by default and requires main ancestry for tag publication', () => {
    expect(workflow).toContain('default: false');
    expect(workflow).toContain('git merge-base --is-ancestor');
    expect(workflow).toContain('origin/main');
    expect(workflow).toContain("github.event_name == 'push' || inputs.publish");
  });

  it('writes the private key only to a temporary file with restricted permissions', () => {
    expect(workflow).toContain("$identityPath = Join-Path $env:RUNNER_TEMP 'aeldrune-desktop.key'");
    expect(workflow).toContain('AELDRUNE_DESKTOP_SSH_PRIVATE_KEY');
    expect(workflow).toContain('icacls $identityPath /inheritance:r');
    expect(workflow).toContain('Remove-Item -LiteralPath $identityPath -Force');
  });
});
