export const PLACEHOLDER: string;
export const GENERATED_DIR: string;

export interface ViteManifestEntry {
  file?: string;
  [key: string]: unknown;
}

export type ViteManifest = Record<string, ViteManifestEntry>;

export function parseSupportedLocales(loadersSource: string): string[];
export function localeChunkMap(
  manifest: ViteManifest,
  locales: string[],
  base?: string,
  dir?: string,
): Record<string, string>;
export function injectLocaleChunkMap(
  html: string,
  map: Record<string, string>,
  placeholder?: string,
): string;
export function templateModulepreload(options: { root: string; outDir: string; base?: string }): {
  map: Record<string, string>;
  htmlPath: string;
  manifestPath: string;
};
