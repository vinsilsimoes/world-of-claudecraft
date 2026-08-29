import { describe, expect, it } from 'vitest';
import {
  assertAeldrunePackagedClient,
  assertNewerAeldruneVersion,
  planAeldruneDesktopPublish,
  validateAeldruneDesktopRemote,
} from '../scripts/lib/aeldrune_desktop_release.mjs';

const version = '0.40.0';
const installer = `Aeldrune-${version}-win-x64.exe`;
const blockmap = `${installer}.blockmap`;
const archive = `Aeldrune-${version}-win-x64.zip`;
const feed = [
  `version: ${version}`,
  'files:',
  `  - url: ${installer}`,
  '    sha512: test-hash',
  `path: ${installer}`,
  'sha512: test-hash',
  'aeldruneApiOrigin: "https://aeldrune.tibiadepot.com"',
  '',
].join('\n');

describe('Aeldrune desktop release publication', () => {
  it('proves the packaged client is the Aeldrune gameplay build before publication', () => {
    expect(() =>
      assertAeldrunePackagedClient({
        packagedPackage: {
          name: 'aeldrune-desktop',
          version,
          wocDesktop: {
            distribution: 'standalone',
            gameProfile: 'mir4-gameplay-port',
            apiOrigin: 'https://aeldrune.tibiadepot.com',
            loginOrigin: 'https://aeldrune.tibiadepot.com',
          },
        },
        appUpdateText: [
          'provider: generic',
          'url: https://aeldrune.tibiadepot.com/desktop-updates',
          'channel: latest',
          'updaterCacheDirName: aeldrune-desktop-updater',
          '',
        ].join('\n'),
        expectedPackageName: 'aeldrune-desktop',
        expectedVersion: version,
        expectedApiOrigin: 'https://aeldrune.tibiadepot.com',
        expectedUpdateUrl: 'https://aeldrune.tibiadepot.com/desktop-updates',
        expectedGameProfile: 'mir4-gameplay-port',
      }),
    ).not.toThrow();
  });

  it('refuses a packaged WoC profile even when its artifact names look like Aeldrune', () => {
    expect(() =>
      assertAeldrunePackagedClient({
        packagedPackage: {
          name: 'aeldrune-desktop',
          version,
          wocDesktop: {
            distribution: 'standalone',
            gameProfile: 'woc-classic',
            apiOrigin: 'https://aeldrune.tibiadepot.com',
            loginOrigin: 'https://aeldrune.tibiadepot.com',
          },
        },
        appUpdateText: [
          'provider: generic',
          'url: https://aeldrune.tibiadepot.com/desktop-updates',
          'channel: latest',
          'updaterCacheDirName: aeldrune-desktop-updater',
          '',
        ].join('\n'),
        expectedPackageName: 'aeldrune-desktop',
        expectedVersion: version,
        expectedApiOrigin: 'https://aeldrune.tibiadepot.com',
        expectedUpdateUrl: 'https://aeldrune.tibiadepot.com/desktop-updates',
        expectedGameProfile: 'mir4-gameplay-port',
      }),
    ).toThrow(/game profile/);
  });

  it('refuses a package or updater cache that still carries the WoC identity', () => {
    const common = {
      packagedPackage: {
        name: 'world-of-claudecraft',
        version,
        wocDesktop: {
          distribution: 'standalone',
          gameProfile: 'mir4-gameplay-port',
          apiOrigin: 'https://aeldrune.tibiadepot.com',
          loginOrigin: 'https://aeldrune.tibiadepot.com',
        },
      },
      appUpdateText: [
        'provider: generic',
        'url: https://aeldrune.tibiadepot.com/desktop-updates',
        'channel: latest',
        'updaterCacheDirName: world-of-claudecraft-updater',
        '',
      ].join('\n'),
      expectedPackageName: 'aeldrune-desktop',
      expectedVersion: version,
      expectedApiOrigin: 'https://aeldrune.tibiadepot.com',
      expectedUpdateUrl: 'https://aeldrune.tibiadepot.com/desktop-updates',
      expectedGameProfile: 'mir4-gameplay-port',
    };

    expect(() => assertAeldrunePackagedClient(common)).toThrow(/package name/);
    expect(() =>
      assertAeldrunePackagedClient({
        ...common,
        packagedPackage: { ...common.packagedPackage, name: 'aeldrune-desktop' },
      }),
    ).toThrow(/updater cache/);
  });

  it('publishes immutable artifacts before the mutable latest manifest', () => {
    const plan = planAeldruneDesktopPublish({
      names: ['latest.yml', archive, blockmap, installer],
      feedText: feed,
      expectedVersion: version,
      expectedApiOrigin: 'https://aeldrune.tibiadepot.com',
    });

    expect(plan).toEqual({
      version,
      artifacts: [archive, installer, blockmap],
      manifest: 'latest.yml',
      orderedFiles: [archive, installer, blockmap, 'latest.yml'],
    });
  });

  it('refuses a WoC or staging client before any upload begins', () => {
    expect(() =>
      planAeldruneDesktopPublish({
        names: ['latest.yml', blockmap, installer],
        feedText: feed.replace('aeldrune.tibiadepot.com', 'worldofclaudecraft.com'),
        expectedVersion: version,
        expectedApiOrigin: 'https://aeldrune.tibiadepot.com',
      }),
    ).toThrow(/API origin/);
  });

  it('refuses incomplete, stale, or path-traversing feeds', () => {
    expect(() =>
      planAeldruneDesktopPublish({
        names: ['latest.yml', installer],
        feedText: feed,
        expectedVersion: version,
        expectedApiOrigin: 'https://aeldrune.tibiadepot.com',
      }),
    ).toThrow(/blockmap/);

    expect(() =>
      planAeldruneDesktopPublish({
        names: ['latest.yml', blockmap, installer],
        feedText: feed,
        expectedVersion: '0.41.0',
        expectedApiOrigin: 'https://aeldrune.tibiadepot.com',
      }),
    ).toThrow(/version/);

    expect(() =>
      planAeldruneDesktopPublish({
        names: ['latest.yml', blockmap, installer, '../escape.exe'],
        feedText: feed,
        expectedVersion: version,
        expectedApiOrigin: 'https://aeldrune.tibiadepot.com',
      }),
    ).toThrow(/unsafe release filename/);
  });

  it('requires every published update to advance numeric semver', () => {
    expect(() => assertNewerAeldruneVersion('0.40.1', '0.40.0')).not.toThrow();
    expect(() => assertNewerAeldruneVersion('0.40.0', '0.40.0')).toThrow(/already published/);
    expect(() => assertNewerAeldruneVersion('0.39.9', '0.40.0')).toThrow(/downgrade/);
    expect(() => assertNewerAeldruneVersion('latest', '0.40.0')).toThrow(/numeric semver/);
  });

  it('accepts only a bounded SSH publication target', () => {
    expect(
      validateAeldruneDesktopRemote({
        host: '163.176.238.80',
        user: 'ubuntu',
        remoteDir: '/opt/aeldrune/shared/desktop-updates/',
      }),
    ).toEqual({
      host: '163.176.238.80',
      user: 'ubuntu',
      remoteDir: '/opt/aeldrune/shared/desktop-updates',
    });
    expect(() =>
      validateAeldruneDesktopRemote({
        host: 'host; reboot',
        user: 'ubuntu',
        remoteDir: '/opt/aeldrune/shared/desktop-updates',
      }),
    ).toThrow(/host/);
    expect(() =>
      validateAeldruneDesktopRemote({
        host: 'example.com',
        user: 'ubuntu',
        remoteDir: '/opt/aeldrune/../other',
      }),
    ).toThrow(/directory/);
  });
});
