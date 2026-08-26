// The auto diagnostics character is deliberately disposable. Reapply its real
// dev-command fixtures on every entry so a reload always starts with enough
// collection currency for summon/fusion QA.

interface DiagnosticsPlaytestChat {
  readonly player: { readonly name: string };
  chat(text: string): void;
}

const COLLECTION_TICKET_COMMANDS = ['/dev mounts', '/dev spirits'] as const;

export function provisionDiagnosticsCollectionTickets(
  world: DiagnosticsPlaytestChat,
  params: URLSearchParams,
  dev: boolean,
): boolean {
  if (
    !dev ||
    world.player.name !== 'Diagnostics' ||
    params.get('diagnostics') !== '1' ||
    params.get('diagnosticsAuto') !== '1'
  ) {
    return false;
  }

  for (const command of COLLECTION_TICKET_COMMANDS) world.chat(command);
  return true;
}
