# Aeldrune

![Version](https://img.shields.io/badge/version-0.39.3-blue)

Aeldrune is a private 3D MMORPG in active alpha development. This repository contains the authoritative Aeldrune web client, Windows client, simulation, server, content, tools, and automated verification.

## Product profile

- Product: Aeldrune
- World: Aelvarin
- Gameplay profile: `mir4-gameplay-port`
- Production: `https://aeldrune.tibiadepot.com`
- Windows updates: `https://aeldrune.tibiadepot.com/desktop-updates`

The Windows package must always be built through the fail-closed Aeldrune target. Generic desktop targets are not release artifacts.

```powershell
npm run electron:build:aeldrune
npm run electron:verify:aeldrune
```

The verifier inspects the packaged `app.asar` and rejects a release unless the product name, server origin, update channel, and `mir4-gameplay-port` profile are all pinned correctly.

## Local development

```powershell
npm install
npm run dev
```

Run the scoped contribution gate before integration:

```powershell
node scripts/gate_select.mjs
```

Deployment and desktop-update procedures are documented in `docs/desktop-release.md`. Production data must be backed up and verified before every server update. Never recreate or remove the PostgreSQL volume during a deploy.

## Ownership and distribution

The Aeldrune product, branding, game-specific content, and distribution builds are private and proprietary. Redistribution is not permitted. Required notices for incorporated third-party components remain in the repository and release package.
