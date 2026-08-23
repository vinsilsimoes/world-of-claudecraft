const MANIFEST_VERSION = 1;

/**
 * Serialize one Vitest argv list for a child process without placing every
 * selected path on the operating system command line.
 *
 * @param {readonly string[]} args
 * @returns {string}
 */
export function serializeVitestArgvManifest(args) {
  const normalized = validateArgs(args);
  return JSON.stringify({ version: MANIFEST_VERSION, args: normalized });
}

/**
 * Parse the bounded manifest consumed by scripts/vitest_from_argv_manifest.mjs.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function parseVitestArgvManifest(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('invalid Vitest argv manifest: expected JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('invalid Vitest argv manifest: expected object');
  }
  if (parsed.version !== MANIFEST_VERSION) {
    throw new Error(`invalid Vitest argv manifest version: ${String(parsed.version)}`);
  }
  return validateArgs(parsed.args);
}

/** @param {unknown} value */
function validateArgs(value) {
  if (!Array.isArray(value) || value.some((arg) => typeof arg !== 'string' || arg.length === 0)) {
    throw new Error('invalid Vitest argv manifest: args must be non-empty strings');
  }
  return [...value];
}
