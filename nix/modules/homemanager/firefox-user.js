// Firefox reads this file at every start and applies these prefs over
// prefs.js, so a change made in about:config lasts until the next restart.

// Fullscreen requests from pages (YouTube's fullscreen button) fill only the
// Firefox window. Native macOS fullscreen blacks out the other displays
// because "Displays have separate Spaces" is off for AeroSpace.
user_pref("full-screen-api.ignore-widgets", true);

user_pref("browser.aboutConfig.showWarning", false);
