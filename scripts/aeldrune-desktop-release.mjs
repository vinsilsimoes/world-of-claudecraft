import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractFile } from '@electron/asar';
import desktopIdentity from '../electron/identity.cjs';
import {
  assertAeldrunePackagedClient,
  assertNewerAeldruneVersion,
  planAeldruneDesktopPublish,
  validateAeldruneDesktopRemote,
} from './lib/aeldrune_desktop_release.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function readOption(name, fallback = '') {
  const prefix = `--${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && typeof process.argv[index + 1] === 'string') return process.argv[index + 1];
  return fallback;
}

function run(command, args, { capture = false, allowStatus = [] } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: capture ? 'utf8' : undefined,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: false,
  });
  if (result.error) throw new Error(`${command} failed to start: ${result.error.message}`);
  if (result.status !== 0 && !allowStatus.includes(result.status)) {
    const detail = capture ? String(result.stderr || result.stdout || '').trim() : '';
    throw new Error(`${command} exited ${result.status}${detail ? `: ${detail}` : ''}`);
  }
  return result;
}

function releasePlan(releaseDir) {
  const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const resourcesDir = path.join(releaseDir, 'win-unpacked', 'resources');
  const asarPath = path.join(resourcesDir, 'app.asar');
  const appUpdatePath = path.join(resourcesDir, 'app-update.yml');
  if (!existsSync(asarPath)) throw new Error(`packaged app not found: ${asarPath}`);
  if (!existsSync(appUpdatePath)) {
    throw new Error(`packaged updater configuration not found: ${appUpdatePath}`);
  }
  const packagedPackage = JSON.parse(extractFile(asarPath, 'package.json').toString('utf8'));
  assertAeldrunePackagedClient({
    packagedPackage,
    appUpdateText: readFileSync(appUpdatePath, 'utf8'),
    expectedPackageName: desktopIdentity.PACKAGE_NAME,
    expectedVersion: packageJson.version,
    expectedApiOrigin: desktopIdentity.PRODUCTION_API_ORIGIN,
    expectedUpdateUrl: desktopIdentity.DESKTOP_UPDATE_URL,
    expectedGameProfile: desktopIdentity.GAME_PROFILE,
  });
  const names = readdirSync(releaseDir).filter((name) =>
    statSync(path.join(releaseDir, name)).isFile(),
  );
  const feedText = readFileSync(path.join(releaseDir, 'latest.yml'), 'utf8');
  return {
    packageVersion: packageJson.version,
    feedText,
    plan: planAeldruneDesktopPublish({
      names,
      feedText,
      expectedVersion: packageJson.version,
      expectedApiOrigin: desktopIdentity.PRODUCTION_API_ORIGIN,
    }),
  };
}

function remoteVersion(sshBase, remoteDir) {
  const result = run(
    'ssh',
    [
      ...sshBase,
      `if test -f ${remoteDir}/latest.yml; then cat ${remoteDir}/latest.yml; else exit 44; fi`,
    ],
    { capture: true, allowStatus: [44] },
  );
  if (result.status === 44) return '';
  const match = String(result.stdout).match(/^version:\s*(\d+\.\d+\.\d+)\s*$/m);
  if (!match) throw new Error('remote latest.yml has no valid numeric version');
  return match[1];
}

function cleanupRemote(sshBase, stagingDir) {
  run('ssh', [...sshBase, `rm -rf ${stagingDir}`], { capture: true, allowStatus: [255] });
}

function publish({ releaseDir, packageVersion, plan }) {
  const target = validateAeldruneDesktopRemote({
    host: readOption('host', process.env.AELDRUNE_DESKTOP_SSH_HOST),
    user: readOption('user', process.env.AELDRUNE_DESKTOP_SSH_USER || 'ubuntu'),
    remoteDir: readOption(
      'remote-dir',
      process.env.AELDRUNE_DESKTOP_REMOTE_DIR || '/opt/aeldrune/shared/desktop-updates',
    ),
  });
  const identityOption = readOption('identity', process.env.AELDRUNE_DESKTOP_SSH_IDENTITY || '');
  if (!identityOption) throw new Error('SSH identity file is required');
  const identityFile = path.resolve(identityOption);
  if (!existsSync(identityFile) || !statSync(identityFile).isFile()) {
    throw new Error(`SSH identity file not found: ${identityFile}`);
  }

  const destination = `${target.user}@${target.host}`;
  const sshBase = ['-i', identityFile, '-o', 'BatchMode=yes', destination];
  const current = remoteVersion(sshBase, target.remoteDir);
  if (current) assertNewerAeldruneVersion(packageVersion, current);

  const stagingDir = `${target.remoteDir}/.staging-${packageVersion}-${Date.now()}`;
  run('ssh', [...sshBase, `install -d -m 0755 ${target.remoteDir} ${stagingDir}`]);
  try {
    for (const name of plan.orderedFiles) {
      run('scp', [
        '-i',
        identityFile,
        '-o',
        'BatchMode=yes',
        path.join(releaseDir, name),
        `${destination}:${stagingDir}/${name}`,
      ]);
    }
    const versionedMoves = plan.artifacts
      .map((name) => `mv ${stagingDir}/${name} ${target.remoteDir}/${name}`)
      .join('; ');
    run('ssh', [
      ...sshBase,
      `set -eu; chmod 0644 ${plan.orderedFiles.map((name) => `${stagingDir}/${name}`).join(' ')}; ` +
        `${versionedMoves}; mv ${stagingDir}/${plan.manifest} ${target.remoteDir}/${plan.manifest}; ` +
        `rmdir ${stagingDir}`,
    ]);
  } catch (error) {
    cleanupRemote(sshBase, stagingDir);
    throw error;
  }
  const published = remoteVersion(sshBase, target.remoteDir);
  if (published !== packageVersion) {
    throw new Error(
      `remote feed verification returned ${published || 'nothing'}, expected ${packageVersion}`,
    );
  }
  console.log(
    `[aeldrune-desktop] published ${packageVersion}; manifest moved last to ${desktopIdentity.DESKTOP_UPDATE_URL}/latest.yml`,
  );
}

const mode = process.argv[2] || 'verify';
if (!['verify', 'publish'].includes(mode)) {
  throw new Error(`unknown mode ${mode}; use verify or publish`);
}
const releaseDir = path.resolve(readOption('release-dir', path.join(root, 'release-aeldrune')));
if (!existsSync(releaseDir)) throw new Error(`release directory not found: ${releaseDir}`);
const { packageVersion, plan } = releasePlan(releaseDir);
console.log(`[aeldrune-desktop] verified ${packageVersion}: ${plan.orderedFiles.join(', ')}`);
if (mode === 'publish') publish({ releaseDir, packageVersion, plan });
