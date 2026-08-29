'use strict';

// One identity for every native-shell boundary. Keep these values free of
// Electron imports so build scripts, runtime helpers, and tests can share them
// without booting Chromium.
const PRODUCT_NAME = 'Aeldrune';
const PACKAGE_NAME = 'aeldrune-desktop';
const APP_ID = 'com.aeldrune.desktop';
// Keep the inherited renderer origin during the alpha compatibility window.
// It is not player-visible, and production already trusts it for REST calls.
const APP_ORIGIN = 'app://worldofclaudecraft';
const DEEP_LINK_PROTOCOL = 'aeldrune';
const LEGACY_DEEP_LINK_PROTOCOL = 'worldofclaudecraft';
const PRODUCTION_API_ORIGIN = 'https://aeldrune.tibiadepot.com';
const DESKTOP_UPDATE_URL = `${PRODUCTION_API_ORIGIN}/desktop-updates`;
const GAME_PROFILE = 'mir4-gameplay-port';

module.exports = {
  PRODUCT_NAME,
  PACKAGE_NAME,
  APP_ID,
  APP_ORIGIN,
  DEEP_LINK_PROTOCOL,
  LEGACY_DEEP_LINK_PROTOCOL,
  PRODUCTION_API_ORIGIN,
  DESKTOP_UPDATE_URL,
  GAME_PROFILE,
};
