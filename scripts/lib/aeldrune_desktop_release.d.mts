export interface AeldruneDesktopPublishPlan {
  version: string;
  artifacts: string[];
  manifest: 'latest.yml';
  orderedFiles: string[];
}

export function assertAeldrunePackagedClient(options: {
  packagedPackage: {
    name?: unknown;
    version?: unknown;
    wocDesktop?: {
      distribution?: unknown;
      gameProfile?: unknown;
      apiOrigin?: unknown;
      loginOrigin?: unknown;
    };
  };
  appUpdateText: string;
  expectedPackageName: string;
  expectedVersion: string;
  expectedApiOrigin: string;
  expectedUpdateUrl: string;
  expectedGameProfile: string;
}): void;

export function planAeldruneDesktopPublish(options: {
  names: string[];
  feedText: string;
  expectedVersion: string;
  expectedApiOrigin: string;
}): AeldruneDesktopPublishPlan;

export function assertNewerAeldruneVersion(candidate: string, current: string): void;

export function validateAeldruneDesktopRemote(options: {
  host: string;
  user: string;
  remoteDir: string;
}): { host: string; user: string; remoteDir: string };
