export interface Mir4AssetIsolationOptions {
  readonly sourceRoot: string;
  readonly targetRoots: readonly string[];
  readonly minBytes?: number;
}

export interface Mir4AssetIsolationMatch {
  readonly source: string;
  readonly target: string;
  readonly bytes: number;
}

export interface Mir4AssetIsolationResult {
  readonly sourceFiles: number;
  readonly targetFiles: number;
  readonly comparedCandidates: number;
  readonly matches: readonly Mir4AssetIsolationMatch[];
}

export function auditAssetIsolation(
  options: Mir4AssetIsolationOptions,
): Promise<Mir4AssetIsolationResult>;
