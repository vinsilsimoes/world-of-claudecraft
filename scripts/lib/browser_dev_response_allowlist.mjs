// The offline browser proofs intentionally run against Vite dev, which has no
// product HTTP backend. These two optional homepage probes have explicit,
// stable fallback behavior in that environment. Every other same-origin 4xx/5xx
// remains a hard browser-proof failure, including missing bundles and assets.
const EXPECTED_OFFLINE_DEV_RESPONSES = new Map([
  ['/api/site-presence', 403],
  ['/api/project-stats', 404],
]);

export function isExpectedOfflineDevResponse(status, responseUrl, gameOrigin) {
  const url = new URL(responseUrl);
  return url.origin === gameOrigin && EXPECTED_OFFLINE_DEV_RESPONSES.get(url.pathname) === status;
}
