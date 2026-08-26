# MIR4 Codex

This directory owns the pure, authoritative Codex registration and progress domain.

- Persist only versioned, bounded manual registration counters.
- Derive completion and bonuses from authored content and current inventory/collection sources.
- Never persist UI state, event history, duplicate completion flags, or other-class equipment.
- Commands must be atomic and must mark the MIR4 wire revision only after a successful mutation.
- Keep presentation strings and DOM access outside this directory.
