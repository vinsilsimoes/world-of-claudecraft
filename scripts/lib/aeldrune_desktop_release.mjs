const SAFE_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function yamlScalar(text, key) {
  const match = String(text).match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'));
  if (!match) return '';
  const raw = match[1].trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}

function feedUrls(text) {
  return [...String(text).matchAll(/^\s*-\s+url:\s*(.+?)\s*$/gm)].map((match) => {
    const raw = match[1].trim();
    return raw.replace(/^(["'])(.*)\1$/, '$2');
  });
}

export function assertAeldrunePackagedClient({
  packagedPackage,
  appUpdateText,
  expectedPackageName,
  expectedVersion,
  expectedApiOrigin,
  expectedUpdateUrl,
  expectedGameProfile,
}) {
  if (!packagedPackage || typeof packagedPackage !== 'object') {
    throw new Error('packaged Aeldrune package metadata is required');
  }
  if (packagedPackage.name !== expectedPackageName) {
    throw new Error(
      `packaged client package name ${JSON.stringify(packagedPackage.name)} is not ${expectedPackageName}`,
    );
  }
  if (packagedPackage.version !== expectedVersion) {
    throw new Error(
      `packaged client version ${JSON.stringify(packagedPackage.version)} is not ${expectedVersion}`,
    );
  }
  const stamp = packagedPackage.wocDesktop;
  if (!stamp || typeof stamp !== 'object') {
    throw new Error('packaged client has no desktop identity stamp');
  }
  if (stamp.distribution !== 'standalone') {
    throw new Error(
      `packaged client distribution ${JSON.stringify(stamp.distribution)} is not standalone`,
    );
  }
  if (stamp.gameProfile !== expectedGameProfile) {
    throw new Error(
      `packaged client game profile ${JSON.stringify(stamp.gameProfile)} is not ${expectedGameProfile}`,
    );
  }
  if (stamp.apiOrigin !== expectedApiOrigin || stamp.loginOrigin !== expectedApiOrigin) {
    throw new Error('packaged client API and login origins are not the Aeldrune production origin');
  }
  if (yamlScalar(appUpdateText, 'provider') !== 'generic') {
    throw new Error('packaged client update provider is not generic');
  }
  if (yamlScalar(appUpdateText, 'url') !== expectedUpdateUrl) {
    throw new Error('packaged client update URL is not the Aeldrune desktop feed');
  }
  if (yamlScalar(appUpdateText, 'channel') !== 'latest') {
    throw new Error('packaged client update channel is not latest');
  }
  if (yamlScalar(appUpdateText, 'updaterCacheDirName') !== `${expectedPackageName}-updater`) {
    throw new Error('packaged client updater cache is not isolated for Aeldrune');
  }
}

function artifactPriority(name) {
  if (name.endsWith('.zip')) return 0;
  if (name.endsWith('.exe')) return 1;
  return 2;
}

export function planAeldruneDesktopPublish({
  names,
  feedText,
  expectedVersion,
  expectedApiOrigin,
}) {
  if (!Array.isArray(names)) throw new Error('release filenames are required');
  for (const name of names) {
    if (typeof name !== 'string' || !SAFE_FILE_NAME.test(name)) {
      throw new Error(`unsafe release filename: ${String(name)}`);
    }
  }
  if (!names.includes('latest.yml')) throw new Error('missing latest.yml update manifest');

  const version = yamlScalar(feedText, 'version');
  if (version !== expectedVersion) {
    throw new Error(`desktop feed version ${JSON.stringify(version)} is not ${expectedVersion}`);
  }
  const apiOrigin = yamlScalar(feedText, 'wocApiOrigin');
  if (apiOrigin !== expectedApiOrigin) {
    throw new Error(
      `desktop feed API origin ${JSON.stringify(apiOrigin)} is not ${expectedApiOrigin}`,
    );
  }

  const installer = `Aeldrune-${expectedVersion}-win-x64.exe`;
  const blockmap = `${installer}.blockmap`;
  const archive = `Aeldrune-${expectedVersion}-win-x64.zip`;
  if (!names.includes(installer)) throw new Error(`missing Aeldrune installer ${installer}`);
  if (!names.includes(blockmap)) throw new Error(`missing Aeldrune blockmap ${blockmap}`);
  if (!names.includes(archive)) throw new Error(`missing Aeldrune portable archive ${archive}`);

  const urls = feedUrls(feedText);
  if (!urls.includes(installer)) {
    throw new Error(`latest.yml does not reference the Aeldrune installer ${installer}`);
  }
  for (const url of urls) {
    if (!SAFE_FILE_NAME.test(url)) throw new Error(`unsafe update feed URL: ${url}`);
    if (!names.includes(url)) throw new Error(`update feed references missing artifact ${url}`);
  }

  const expectedPrefix = `Aeldrune-${expectedVersion}-win-x64`;
  const staleAeldrune = names.find(
    (name) => name.startsWith('Aeldrune-') && !name.startsWith(expectedPrefix),
  );
  if (staleAeldrune)
    throw new Error(`stale Aeldrune artifact in release directory: ${staleAeldrune}`);

  const artifacts = [archive, installer, blockmap].sort(
    (a, b) => artifactPriority(a) - artifactPriority(b) || a.localeCompare(b),
  );
  return {
    version,
    artifacts,
    manifest: 'latest.yml',
    orderedFiles: [...artifacts, 'latest.yml'],
  };
}

function numericVersionParts(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Aeldrune desktop releases need a numeric semver; got ${version}`);
  return match.slice(1).map(Number);
}

export function assertNewerAeldruneVersion(candidate, current) {
  const next = numericVersionParts(candidate);
  const previous = numericVersionParts(current);
  for (let index = 0; index < next.length; index += 1) {
    if (next[index] > previous[index]) return;
    if (next[index] < previous[index]) {
      throw new Error(`refusing desktop downgrade from ${current} to ${candidate}`);
    }
  }
  throw new Error(`desktop version ${candidate} is already published; bump package.json first`);
}

export function validateAeldruneDesktopRemote({ host, user, remoteDir }) {
  if (!/^[A-Za-z0-9.-]+$/.test(String(host))) throw new Error('invalid desktop update host');
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(String(user))) {
    throw new Error('invalid desktop update SSH user');
  }
  if (
    !/^\/[A-Za-z0-9._/-]+$/.test(String(remoteDir)) ||
    String(remoteDir).split('/').includes('..')
  ) {
    throw new Error('invalid desktop update remote directory');
  }
  return {
    host: String(host),
    user: String(user),
    remoteDir: String(remoteDir).replace(/\/$/, ''),
  };
}
