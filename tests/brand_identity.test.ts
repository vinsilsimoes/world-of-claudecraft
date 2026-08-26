import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { sourceFilesUnder } from './helpers/source_files_under';

const ROOT = process.cwd();
const OLD_BRAND = /(?<!\/)World[ -]of[ -]Claude[Cc]raft|(?<!\/)WORLD[ -]OF[ -]CLAUDECRAFT/;

const PRODUCT_DOCUMENTS = [
  'index.html',
  'play.html',
  'guide.html',
  'admin.html',
  'editor.html',
  'package.json',
  'capacitor.config.ts',
  'public/data-deletion.html',
  'public/links.html',
  'public/llms.txt',
  'public/manifest.webmanifest',
  'public/merch.html',
  'public/press.html',
  'public/privacy.html',
  'public/server-unavailable.html',
  'public/support.html',
  'public/terms.html',
  'public/wallet-return.html',
] as const;

const LOGO_DOCUMENTS = [
  'index.html',
  'play.html',
  'guide.html',
  'public/data-deletion.html',
  'public/links.html',
  'public/merch.html',
  'public/press.html',
  'public/privacy.html',
  'public/server-unavailable.html',
  'public/support.html',
  'public/terms.html',
  'src/guide/chrome.ts',
  'src/guide/head.ts',
  'src/main.ts',
  'src/ui/hud/player_card/player_card.ts',
] as const;

const SQUARE_LOGO_DOCUMENTS = [
  'public/data-deletion.html',
  'public/privacy.html',
  'public/support.html',
  'public/terms.html',
  'src/wallet_handoff.ts',
] as const;

function source(file: string): string {
  return readFileSync(path.join(ROOT, file), 'utf8');
}

function sha256(file: string): string {
  return createHash('sha256')
    .update(readFileSync(path.join(ROOT, file)))
    .digest('hex');
}

describe('Aeldrune product identity', () => {
  it('uses the new product name throughout shipped source and public documents', () => {
    const shippedSource = ['src', 'server', 'bot', 'electron'].flatMap((root) =>
      sourceFilesUnder(path.join(ROOT, root)),
    );
    const stale = shippedSource
      .filter(({ full }) => OLD_BRAND.test(readFileSync(full, 'utf8')))
      .map(({ file }) => file);

    expect(stale).toEqual([]);
    for (const file of PRODUCT_DOCUMENTS) {
      const text = source(file);
      expect(text, file).toContain('Aeldrune');
      expect(text, file).not.toMatch(OLD_BRAND);
    }
  });

  it('does not expose the old WoC product abbreviation as an account or service name', () => {
    const displaySources = [
      ...sourceFilesUnder(path.join(ROOT, 'bot')),
      ...sourceFilesUnder(path.join(ROOT, 'src/admin/i18n.locales')),
      ...sourceFilesUnder(path.join(ROOT, 'src/ui/i18n.locales')),
      { file: 'src/admin/i18n.en.ts', full: path.join(ROOT, 'src/admin/i18n.en.ts') },
      {
        file: 'src/ui/i18n.catalog/hud_chrome.ts',
        full: path.join(ROOT, 'src/ui/i18n.catalog/hud_chrome.ts'),
      },
    ];
    const stale = displaySources
      .filter(({ full }) => readFileSync(full, 'utf8').includes('WoC'))
      .map(({ file }) => file);

    expect(stale).toEqual([]);
  });

  it('uses the supplied logo on every branded web surface', () => {
    for (const file of LOGO_DOCUMENTS) {
      expect(source(file), file).toContain('aeldrune-logo.png');
    }
    for (const file of SQUARE_LOGO_DOCUMENTS) {
      expect(source(file), file).toContain('icon-192.png');
    }
  });

  it('keeps compatibility identifiers while changing installable display names', () => {
    const pkg = JSON.parse(source('package.json'));
    expect(pkg.name).toBe('world-of-claudecraft');
    expect(pkg.build.appId).toBe('com.worldofclaudecraft.desktop');
    expect(pkg.build.productName).toBe('Aeldrune');
    expect(pkg.build.protocols[0]).toEqual({
      name: 'Aeldrune Login',
      schemes: ['worldofclaudecraft'],
    });

    const capacitor = source('capacitor.config.ts');
    expect(capacitor).toContain("appId: 'com.worldofclaudecraft'");
    expect(capacitor).toContain("appName: 'Aeldrune'");

    const android = source('android/app/src/main/res/values/strings.xml');
    expect(android).toContain('<string name="app_name">Aeldrune</string>');
    expect(android).toContain('<string name="title_activity_main">Aeldrune</string>');
    expect(android).toContain('<string name="package_name">com.worldofclaudecraft</string>');

    const ios = source('ios/App/App/Info.plist');
    expect(ios).toContain('<key>CFBundleDisplayName</key>');
    expect(ios).toContain('<string>Aeldrune</string>');
    expect(ios).toContain('<string>worldofclaudecraft</string>');

    const electron = source('electron/main.cjs');
    expect(electron).toContain("productName: 'Aeldrune'");
    expect(electron).toContain("_companyName: 'Aeldrune'");
    expect(electron).toContain("title: 'Aeldrune'");
    expect(electron).toContain("const deepLinkProtocol = 'worldofclaudecraft'");
    expect(source('electron/shell_strings.cjs')).toContain("crashTitle: 'Aeldrune'");

    expect(source('.github/workflows/desktop-publish.yml')).toContain(
      'release/mac-universal/Aeldrune.app',
    );
    const epicUpload = source('scripts/epic-bpt-upload.mjs');
    expect(epicUpload).toContain("win: 'Aeldrune.exe'");
    expect(epicUpload).toContain("path.join('Aeldrune.app', 'Contents', 'MacOS', 'Aeldrune')");
  });

  it('ships the master logo and square platform derivatives', async () => {
    const master = await sharp(path.join(ROOT, 'public/aeldrune-logo.png')).metadata();
    expect({ width: master.width, height: master.height }).toEqual({ width: 1536, height: 1024 });

    for (const [file, size] of [
      ['public/icon-192.png', 192],
      ['public/icon-512.png', 512],
      ['public/apple-touch-icon.png', 180],
      ['build/icon.png', 1024],
    ] as const) {
      const metadata = await sharp(path.join(ROOT, file)).metadata();
      expect({ width: metadata.width, height: metadata.height }, file).toEqual({
        width: size,
        height: size,
      });
    }

    const expectedHashes = {
      'public/aeldrune-logo.png':
        '4f9a71d76fe279c181ac12f638e42950bf8ddfc81212a180a231def10e6a2579',
      'public/favicon.ico': '66218f0b6c046d2bf95acb1689beb4adad3f1abb73e6e2e7780fb1ce63bbbeef',
      'public/icon-192.png': '5b761a203b1d9dfc05a0d6087395bd03d057faf1e63cd6741007e60093a340e9',
      'public/icon-512.png': '6a9ec204ef2b5138f0a2e1757a2a1acf791dced2953d469bf5cd3150fa0515f2',
      'public/apple-touch-icon.png':
        '70e291eadf73b61be1aaa532ff20a5ffd845ceff43d29a0bca8bbfd8a05e4cb5',
      'build/icon.png': '35043895a7bd1cc0178cf74ff7281b83bac9296ff12015a5a543639838d20960',
      'build/icon.ico': '8406f0143bdbadb96cca486e95032b604dfeb6c725d580c9ff9248de2921729a',
      'build/icon.icns': '5bc93833ae822f87d4e680c78fd5a680458c44573783527bbf9d00b82ccfd714',
      'android/app/src/main/res/mipmap-mdpi/ic_launcher.png':
        '08c872b3f89d56280c0585f926ca8df59b162a8d6a051b4e42f1829e397bc9ae',
      'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png':
        '4ba7a58e84c36f8be0168c70e43199c6a47541b331b3f986dc231efc54505b93',
      'android/app/src/main/res/drawable/splash.png':
        '69a730beadd9169cc47eeddf1e701603e376c5278b38323df2970db9bc35c17c',
      'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png':
        '35043895a7bd1cc0178cf74ff7281b83bac9296ff12015a5a543639838d20960',
      'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png':
        '42cb3fcc6fbdf9a5ea68fbe54b56bef3885a9327cb6c34cc969ed1da1f323fce',
    } as const;
    for (const [file, hash] of Object.entries(expectedHashes)) {
      expect(sha256(file), file).toBe(hash);
    }

    expect(readFileSync(path.join(ROOT, 'public/favicon.ico')).subarray(0, 4)).toEqual(
      Buffer.from([0, 0, 1, 0]),
    );
    expect(readFileSync(path.join(ROOT, 'build/icon.icns')).subarray(0, 4).toString('ascii')).toBe(
      'icns',
    );
  });
});
