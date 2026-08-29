import { describe, expect, it } from 'vitest';
import {
  resolveDesktopConfig,
  resolveDistribution,
  updaterAllowed,
} from '../electron/desktop_config.cjs';
import {
  DESKTOP_UPDATE_URL,
  GAME_PROFILE,
  PACKAGE_NAME,
  PRODUCT_NAME,
  PRODUCTION_API_ORIGIN,
} from '../electron/identity.cjs';
import {
  desktopBuilderConfig,
  desktopClientBuildEnv,
} from '../scripts/electron-builder-config.mjs';

const standaloneStamp = {
  wocDesktop: {
    distribution: 'standalone',
    apiOrigin: PRODUCTION_API_ORIGIN,
    loginOrigin: PRODUCTION_API_ORIGIN,
  },
};

const base = {
  appId: 'com.aeldrune.desktop',
  productName: PRODUCT_NAME,
  // biome-ignore lint/suspicious/noTemplateCurlyInString: electron-builder expands this data string.
  artifactName: 'Aeldrune-${version}-${os}-${arch}.${ext}',
  files: ['dist/**', 'electron/**', '!node_modules/**'],
  directories: { buildResources: 'build', output: 'release' },
  publish: { provider: 'generic', url: DESKTOP_UPDATE_URL },
  mac: { target: [{ target: 'dmg', arch: ['universal'] }] },
  win: { target: [{ target: 'nsis', arch: ['x64', 'arm64'] }] },
  linux: { target: [{ target: 'AppImage', arch: ['x64', 'arm64'] }] },
};

describe('Aeldrune standalone desktop updater', () => {
  it('treats the packaged standalone shell as an updater-enabled distribution', () => {
    expect(resolveDistribution({ packagedMetadata: standaloneStamp, isPackaged: true })).toBe(
      'standalone',
    );
    expect(updaterAllowed({ distribution: 'standalone', isPackaged: true })).toBe(true);
    expect(resolveDesktopConfig({ packagedMetadata: standaloneStamp, isPackaged: true })).toEqual({
      distribution: 'standalone',
      updaterEnabled: true,
      crashSubmitUrl: '',
      updateChannel: 'latest',
      apiOrigin: PRODUCTION_API_ORIGIN,
      loginOrigin: PRODUCTION_API_ORIGIN,
    });
  });

  it('pins every standalone client build to the Aeldrune gameplay profile', () => {
    expect(
      desktopClientBuildEnv({
        baseEnv: { VITE_GAME_PROFILE: 'woc-classic', UNRELATED: 'kept' },
        distribution: 'standalone',
        apiOrigin: PRODUCTION_API_ORIGIN,
      }),
    ).toMatchObject({
      UNRELATED: 'kept',
      VITE_DESKTOP_APP: '1',
      VITE_DESKTOP_API_ORIGIN: PRODUCTION_API_ORIGIN,
      VITE_GAME_PROFILE: 'mir4-gameplay-port',
    });
  });

  it('emits an x64 NSIS feed on the Aeldrune update host', () => {
    const config = desktopBuilderConfig({
      base,
      distribution: 'standalone',
      apiOrigin: PRODUCTION_API_ORIGIN,
      loginOrigin: PRODUCTION_API_ORIGIN,
    });
    expect(config.publish).toEqual({
      provider: 'generic',
      url: DESKTOP_UPDATE_URL,
      channel: 'latest',
    });
    expect(config.directories.output).toBe('release-aeldrune');
    expect(config.win.target).toEqual([
      { target: 'nsis', arch: ['x64'] },
      { target: 'zip', arch: ['x64'] },
    ]);
    expect(config.extraMetadata.wocDesktop).toMatchObject({
      distribution: 'standalone',
      gameProfile: GAME_PROFILE,
      apiOrigin: PRODUCTION_API_ORIGIN,
      loginOrigin: PRODUCTION_API_ORIGIN,
    });
    expect(config.extraMetadata.name).toBe(PACKAGE_NAME);
  });

  it('refuses to package a WoC identity or update endpoint as Aeldrune', () => {
    expect(() =>
      desktopBuilderConfig({
        base: {
          ...base,
          appId: 'com.worldofclaudecraft.desktop',
          publish: { provider: 'generic', url: 'https://updates.worldofclaudecraft.com/desktop' },
        },
        distribution: 'standalone',
        apiOrigin: PRODUCTION_API_ORIGIN,
        loginOrigin: PRODUCTION_API_ORIGIN,
      }),
    ).toThrow(/refusing standalone build with non-Aeldrune identity/);
  });

  it('keeps unpackaged and store-managed builds updater-free', () => {
    expect(updaterAllowed({ distribution: 'standalone', isPackaged: false })).toBe(false);
    expect(updaterAllowed({ distribution: 'steam', isPackaged: true })).toBe(false);
    expect(updaterAllowed({ distribution: 'epic', isPackaged: true })).toBe(false);
  });
});
