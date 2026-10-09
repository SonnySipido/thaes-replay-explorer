# Thae's Replay Explorer

**[Download page & installation instructions](https://thaesreplayexplorer.com/)** — a simple page for users, without the source-file list.

A Windows **Warcraft III replay analyzer** and .w3g replay library by **Thaedalius**, supporting **patch 3.0: The Forsaken Kingdom** and W3Champions replays. Compare heroes and ability levels, units, buildings, upgrades, items, APM, control groups and chat. Free for non-commercial use.

## [Download for Windows — Installer (.exe)](https://github.com/SonnySipido/thaes-replay-explorer/releases/download/v0.6.0/Thae-Replay-Explorer-0.6.0-Setup-x64.exe)

1. Click **Download for Windows** above.
2. Open the downloaded installer and follow the setup steps.
3. Open **Thae's Replay Explorer** from the Windows Start menu (search for **Replay**).

No GitHub account, source-code download, or development tools are needed. The installer includes everything needed to run the app and offers a desktop shortcut. For Windows 10/11, 64-bit.

## Features

- **Match analysis:** heroes and ability levels, units produced, individual building and research start times, FE/T2/T3 tags, items, APM graphs and optional winner display.
- **Control groups:** every identified unit, hero and building type assigned to each group throughout the match.
- **Build orders:** each player's first five minutes of units, heroes, buildings and research, with separate text and image exports named after the map and player.
- **Favorites and notes:** favorite matches, add autosaved notes, filter with clickable icons, and export or import annotation backups. Identical replay files share their annotations.
- **Library search:** find players, maps, filenames, note contents and in-game chat. Filter by matchup, team size, platform and version.
- **Multiple folders:** enable or disable each location and its subfolders in Advanced settings. New replays are indexed automatically.
- **Duplicate management:** optionally hide identical replay files across folders without deleting them.
- **Flexible browsing:** resize the replay list or use compact single-line cards with favorites and notes indicators. Drag replay files into the app to import and select them.
- **Chat:** search, filter by player, copy or export messages, and adjust font size and spacing.
- **Personalization:** Classic or Reforged HD icons; remembered filters, window position, selected replay and analysis tab.
- **Convenient links:** watch replays in Warcraft III, locate replay and map files in Explorer, and open eligible W3Champions profiles.

## Use

On first launch, the app suggests the replay folder it found (Documents/Warcraft III/BattleNet, which covers every account with Include subfolders on): press **Use this folder**, or **Choose another folder…** to pick one yourself. Choose folder and the Include subfolders switch are in Settings (the gear at the top right); click the folder path there to open it in File Explorer. The app remembers your choice and picks up new and changed replays automatically (it watches the folder, with a background check every 5 minutes).

  -Clicking on a player's name opens their W3Champions profile page in the browser.
  
  -Clicking on a map name opens the map location in your local file system if found - Makes it easy to find the correct map files!
  
  -Clicking on a replay name opens the explorer with the replay selected - Makes it easy to share!
  
  -You can filter replays to only include matches above 2 minutes so that instant leaves are not shown.
  
  -In the search bar typing a map name, player name, file name, replay notes or game chat and immediately filter the replay list - Makes finding matches containing certain players really easy!
  
  -You can select match ups, for team games this means that the team has at least that race included in it's team.
  
  -You can select team sizes such as 1v1, 2v2, 3v3, 4v4 or any size.
  
  -You can filter by patch: the Patch menu lists every patch in your library (with its builds) and any number can be ticked.
  
  -The replay explorer is capable of showing information Heroes, abilities & units used, Buildings & upgrades, Items, APM, Control groups and ingame chat.
  
  -You can toggle Show Winner to show which side won the match.

  
By default the list of replays shown is sorted by newest first. Its possible to sort by oldest first as well as sorting by map name A-Z.

The Reforged HD icons switch in Settings (the gear at the top right) selects HD artwork when enabled and Classic artwork when disabled. It is off by default and remembers your choice. New Forsaken Paladin artwork without a separate Reforged texture uses the shared game icon.

The window remembers its size, position and maximized state. If a monitor is disconnected, it restores within a connected screen. Click a player name in the match header to open their W3Champions profile in your browser. Names without a full BattleTag (such as accounts from before Reforged) cannot identify a unique profile and are shown as plain text.

Battle.net ladder replays store each player's MMR; the match header shows it with the Battle.net icon, left of the APM. W3Champions replays do not include MMR.

The W3Champions or Battle.net icon shows where a game was played, in the match header and after the map name in the replay list (hover for the name), and the Platform filter narrows the replay list to one of them (or to custom, LAN and older games). This comes from the game host recorded in the replay, not from the file name.

Your last selected replay is restored after restarting. Press Escape to deselect it and return to the empty analysis screen.

Other apps can open a replay in the explorer: run **Thae's Replay Explorer.exe --select "C:\path\to\replay.w3g"**. If the explorer is already open, that window selects the replay and comes to the front; otherwise it starts with the replay selected. The replay must be inside the chosen replay folder; if the search text hides it, the search is cleared.

Open **Settings** (the gear at the top right) and press **Check for updates** to look for a newer version. If there is one, the button changes to **Update to x.y.z**: it downloads the installer from this repository's latest release, checks it against the release's SHA256SUMS.txt, installs it and restarts the app. Settings and the replay cache are kept. Versions before 0.3.0 have no button; install 0.3.0 once by hand.

With **Check on startup** switched on, the app looks for a newer version each time it starts and asks whether to install it. On the first start it asks whether you want this; the switch in Settings changes it later.

Initial indexing can take time with a large library. Summaries and analysis are cached locally; only a bounded number of full replay records are held in memory. Filters and winner visibility are remembered.

Replays record commands, not a complete simulation: production and research entries represent orders, hero levels are inferred minimums, and unsupported or damaged replays may fail to parse. Compatibility depends on the included w3gjs parser and replay format; future game updates may require an app update. Missing map previews use a placeholder.

## Local data and privacy

Replays stay on your computer. The app has no telemetry or replay upload feature. It stores settings and its analysis cache in %APPDATA%/Warcraft Replay Explorer (the original data directory is retained for upgrade compatibility). These files can include player names and replay chat. The uninstaller preserves these settings and your replays. The W3Champions profile link opens your browser only when clicked, and the app contacts GitHub for updates only when you press Check for updates or, if you switched it on, when it starts.

## Other download options

Download the Windows x64 Setup executable from this repository's Releases page and run it. The installer adds **Thae's Replay Explorer** to the Windows Start menu (search for **Replay**) and offers a desktop shortcut. No administrator rights are required. A portable ZIP is also available: extract the entire folder and run **Thae's Replay Explorer.exe**. Keep the accompanying files with the executable.

Windows 10 or 11, 64-bit, is required. Electron, Node.js and the replay parser are included; users do not need to install development tools, Java, Python or Node.js. Warcraft III and the matching local map are needed to watch a replay in the game, but not to browse replay analysis. Replay launching uses Windows' .w3g file association.

The initial release is unsigned; Windows may display an unknown-publisher or reputation warning. Only download builds from the author's repository.

## Build from source

Use Windows x64 with Node.js 22.12 or newer, npm, and Inno Setup 7. Install dependencies with npm ci, run npm test, then npm run build:release. The build script finds ISCC.exe in the standard Inno Setup location; alternatively set INNO_ISCC to its full path. It downloads a pinned, checksum-verified Electron rcedit tool to set the executable icon. Output is written to release/. Each build uses a new staging directory. Run npm start for development.

## Author and license

Original application code: Copyright (c) 2026 **Thaedalius**. Licensed under the **PolyForm Noncommercial License 1.0.0**; see LICENSE and NOTICE. Noncommercial use, modification and sharing are permitted subject to the license. This is source-available software with a noncommercial restriction.

Third-party code retains its own licenses. Warcraft artwork, map previews and third-party branding are excluded from the application's license; see THIRD_PARTY_NOTICES.md and asset provenance files. This is an unofficial fan application, not endorsed by Blizzard Entertainment, W3Champions or Discord. Inclusion or attribution of an asset does not establish redistribution permission from its rights holder.

W3Champions profile: https://w3champions.com/player/Thaedalius%231362
Discord: Thaedalius
