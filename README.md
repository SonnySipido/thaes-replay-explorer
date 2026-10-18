# Thae's Replay Explorer

**[Download page & installation instructions](https://thaesreplayexplorer.com/)** — a simple page for users, without the source-file list.

A Windows **Warcraft III replay analyzer** and .w3g replay library by **Thaedalius**, supporting **patch 3.0: The Forsaken Kingdom** and local Warcraft III replays, including custom and LAN games. Also works with W3Champions and Battle.net replays. Compare heroes and ability levels, units, buildings, upgrades, items, APM, control groups and chat. Free for non-commercial use.

## [Download for Windows — Installer (.msi)](https://github.com/SonnySipido/thaes-replay-explorer/releases/download/v1.0.3/Thae-Replay-Explorer-1.0.3-Setup-x64.msi)

1. Click **Download for Windows** above.
2. Open the downloaded installer and follow the setup steps.
3. Open **Thae's Replay Explorer** from the Windows Start menu (search for **Replay**).

No GitHub account, source-code download, or development tools are needed. The installer includes everything needed to run the app and adds a Start menu shortcut. For Windows 10/11, 64-bit. It installs for the current Windows user without administrator rights.

If you previously used the EXE installer, uninstall the app in Windows Settings before installing MSI. Your settings, notes, cache and replay files are kept. After switching, the app uses MSI for subsequent updates. Existing EXE installations continue receiving EXE updates.

## Features

- **Match analysis:** hero levels and ability rank bars in game order, grouped units ordered by their first training event, individual building and research start times, FE/T2/T3 tags, items, a shared APM chart and optional winner display. Teammates share a player card.
- **Appearance:** Forsaken Kingdom is the default theme, with metal frames, wooden banners, gold headings, teal buttons and a misty forest backdrop. Updating from a version before 0.9.3 selects this theme once; later theme choices stay saved. Simple, Light (Simple) and Dark (Simple) remain available in Settings, and the theme choice is remembered. A text-size slider adjusts all app text from 80% to 130%, with the existing sizes at 100%.
- **APM:** compare player-colored lines on one chart, toggle each player, and hover over a line to see its time and APM.
- **Control groups:** every identified unit, hero and building type assigned to each group throughout the match.
- **Build orders:** each player's first five minutes of units, heroes, buildings and research, with separate text and image exports named after the map and player.
- **Timeline:** compare each player's full-match orders on four tracks: heroes and units, buildings, upgrades, and purchases. Toggle players or event types, merge tracks into one, and hover over overlapping icons for names and timestamps. Heroes, expansions, and T2/T3 tech have priority until an icon is hovered. In separate tracks, production buildings have priority over ordinary buildings, workers have the lowest priority, and crowded purchases spread apart to overlap by at most half their width. Tracks start separate on a fresh installation. The selected zoom mode, merge setting and event-type checkboxes are remembered across replays and launches. Export the visible players and event types as a full-track PNG named after the map and players.
- **Favorites and notes:** favorite matches, add autosaved notes, filter with clickable icons, and export or import annotation backups. Turning Notes only on expands Match Analysis notes; turning it off collapses them. Identical replay files share their annotations.
- **Library search:** find players, maps, filenames, note contents and in-game chat. Filter by matchup, team size, platform and version. The Advanced filters icon beside Search adds player/race pairs and a map filter; it starts off to keep the library compact.
- **Advanced map choices:** Only Melee starts selected; W3C covers ladder maps and Custom includes all other maps. Category choices are remembered across replays and launches. These checkboxes control the map dropdown's suggestions; leaving all three unchecked shows every known map. Scroll through all matching maps, with maximum player counts shown when the replay records them. Choosing a map filters replays together with player and race searches. Clear filters is available after a selection changes and restores the default categories.
- **Multiple folders:** enable or disable each location and its subfolders in Advanced settings. New replays are indexed automatically.
- **Duplicate management:** optionally hide identical replay files across folders without deleting them.
- **Flexible browsing:** resize the replay list or use Classic explorer view with expandable folders, replay filenames, favorites and notes indicators. Empty folders are greyed out and can optionally be hidden in Classic view. Drag replay files into the app to import and select them.
- **Chat:** search, filter by player, copy or export messages, and adjust font size and spacing.
- **Personalization:** bundled Inter and Cinzel fonts, Classic or Reforged HD icons, optional race-colored player names in detailed view, and remembered filters, window position, selected replay and analysis tab.
- **Convenient links:** watch replays in Warcraft III, locate replay and map files in Explorer, and open eligible W3Champions profiles.

## Use

On first launch, the app suggests the replay folder it found (Documents/Warcraft III/BattleNet, which covers every account with Include subfolders on): press **Use this folder**, or **Choose another folder…** to pick one yourself. Choose folder and the Include subfolders switch are in Settings (the gear at the top right); click the folder path there to open it in File Explorer. The app remembers your choice and picks up new and changed replays automatically (it watches the folder, with a background check every 5 minutes).

  -Clicking on a player's name opens their W3Champions profile page in the browser.
  
  -Clicking on a map name opens the map location in your local file system if found - Makes it easy to find the correct map files!
  
  -Clicking on a replay name opens the explorer with the replay selected - Makes it easy to share!
  
  -You can filter replays to only include matches above 2 minutes so that instant leaves are not shown.
  
  -In the search bar type a map, player, filename, replay notes, game chat, hero, learned hero ability, unit, building or upgrade name to filter the replay list. Partial names and case-insensitive searches work in both list views. Game-object searches use the names recorded in each replay; existing cached analyses gain this search data during indexing.
  
  -You can select match ups, for team games this means that the team has at least that race included in it's team.
  
  -You can select team sizes such as 1v1, 2v2, 3v3, 4v4 or any size.
  
  -The Advanced filters icon beside Search starts collapsed and off; hover over it for its label. Type at least three characters for player dropdown suggestions, then choose the race each player played, including Random (Human), Random (Night Elf), Random (Orc) and Random (Undead). Race options show their game icons; Random outcomes use the race icon with a question mark, as in match analysis. Add player filters and choose a map to combine conditions: every player/race pair and the map must match the same replay. Ordinary race choices include players who rolled that race from Random. Selecting a dropdown entry matches its full name; typing without selecting searches partial names. Clear filters resets the Advanced section; collapsing it disables its player and map filters while keeping your choices for the next time you open it. The original matchup, team size, platform and patch filters stay visible and active.
  -You can filter by patch: the Patch menu lists every patch in your library (with its builds) and any number can be ticked.
  
  -The replay explorer is capable of showing information Heroes, abilities & units used, Buildings & upgrades, Items, APM, Control groups and ingame chat.
  
  -You can toggle Show Winner to show which side won the match.

  
By default the list of replays shown is sorted by newest first. You can also sort by oldest first, longest first, shortest first or map name A-Z. Classic view sorts replays within each folder.

The Reforged HD icons switch in Settings (the gear at the top right) selects HD artwork when enabled and Classic artwork when disabled. It is off by default and remembers your choice. New Forsaken Paladin artwork without a separate Reforged texture uses the shared game icon.

The **Text size** slider under Settings → Appearance scales all app text from 80% to 130%, including chart labels and Chat text. A larger tick marks **Default (100%)**, which retains the original sizes. The choice applies immediately and is remembered across replays and app restarts. Icons retain their sizes, and long map and hero names continue fitting their available space.

The window remembers its size, position and maximized state. If a monitor is disconnected, it restores within a connected screen. Click a player name in the match header to open their W3Champions profile in your browser. Names without a full BattleTag (such as accounts from before Reforged) cannot identify a unique profile and are shown as plain text.

Battle.net ladder replays store each player's MMR; the match header shows it with the Battle.net icon, left of the APM. W3Champions replays do not include MMR.

The W3Champions or Battle.net icon shows where a game was played, in the match header and after the map name in the replay list (hover for the name), and the Platform filter narrows the replay list to one of them (or to custom, LAN and older games). This comes from the game host recorded in the replay, not from the file name.

Your last selected replay is restored after restarting. Press Escape to deselect it and return to the empty analysis screen.

Other apps can open a replay in the explorer: run **Thae's Replay Explorer.exe --select "C:\path\to\replay.w3g"**. If the explorer is already open, that window selects the replay and comes to the front; otherwise it starts with the replay selected. The replay must be inside the chosen replay folder; if the search text hides it, the search is cleared.

Open **Settings** (the gear at the top right) and press **Check for updates** to look for a newer version. If there is one, the button changes to **Update to x.y.z**: it downloads the installer from this repository's latest release, checks it against the release's SHA256SUMS.txt, installs it and restarts the app. Settings and the replay cache are kept. Versions before 0.3.0 have no button; install 0.3.0 once by hand.

With **Check on startup** switched on, the app looks for a newer version each time it starts and asks whether to install it. On the first start it asks whether you want this; the switch in Settings changes it later.

Initial indexing can take time with a large library. Summaries and analysis are cached locally; subsequent launches restore the list from a single saved catalogue and check for file changes in the background. Only a bounded number of full replay records are held in memory. Filters and winner visibility are remembered.

Replays record commands, not a complete simulation: production and research entries represent orders, hero levels are inferred minimums, and unsupported or damaged replays may fail to parse. Compatibility depends on the included w3gjs parser and replay format; future game updates may require an app update. Missing map previews use a placeholder.

## Rename a replay

Click the pencil beside the filename under Match Analysis, or right-click a replay in Classic explorer view. F2 also opens the rename dialog for the focused or selected replay. Enter the name and press Enter. The .w3g extension is kept automatically; existing files are never overwritten. Favorites and notes stay with the replay.

## Share a replay

Select a match and click **Copy replay** beside its filename to put the actual .w3g file on the Windows clipboard. Paste it into a Discord conversation with **Ctrl+V**, review the attachment and send it yourself. You can also drag the filename from the match header directly into Discord, File Explorer or another application that accepts file drops. Clicking the filename still reveals it in Explorer. Copying does not upload the replay; the receiving application handles sharing. Clipboard/file-drop support depends on the receiving app.

## Local data and privacy

Replays stay on your computer. The app has no telemetry or replay upload feature. It stores settings and its analysis cache in %APPDATA%/Warcraft Replay Explorer (the original data directory is retained for upgrade compatibility). These files can include player names and replay chat. The uninstaller preserves these settings and your replays. The W3Champions profile link opens your browser only when clicked, and the app contacts GitHub for updates only when you press Check for updates or, if you switched it on, when it starts.

## Other download options

The MSI is the main installer. The Windows x64 Setup EXE remains on the Releases page for users who keep their EXE installation; it adds a Start menu shortcut and offers an optional desktop shortcut. Updates use the same installer format as the installed app. A portable ZIP is also available: extract the entire folder and run **Thae's Replay Explorer.exe**. Keep the accompanying files with the executable. Portable versions retain the EXE update path.

Windows 10 or 11, 64-bit, is required. Electron, Node.js and the replay parser are included; users do not need to install development tools, Java, Python or Node.js. Warcraft III and the matching local map are needed to watch a replay in the game, but not to browse replay analysis. Replay launching uses Windows' .w3g file association.

The initial release is unsigned; Windows may display an unknown-publisher or reputation warning. Only download builds from the author's repository.

## Build from source

Use Windows x64 with Node.js 22.12 or newer, npm, Inno Setup 7, the .NET SDK and .NET 6 runtime for the pinned WiX 4.0.6 build tool. Install the build tool and its extensions locally once, from the project root:

```powershell
dotnet tool install wix --version 4.0.6 --tool-path tools/wix4/bin
Push-Location tools/wix4
./bin/wix.exe extension add WixToolset.UI.wixext/4.0.6 WixToolset.Util.wixext/4.0.6
Pop-Location
```

Install dependencies with npm ci, run npm test, then npm run build:release. Each release builds a native per-user MSI, the existing Inno EXE, a portable ZIP, and SHA256SUMS.txt covering all three. The build script finds ISCC.exe in the standard Inno Setup location; alternatively set INNO_ISCC to its full path. It downloads a pinned, checksum-verified Electron rcedit tool to set the executable icon. Output is written to release/. Each build uses a new staging directory. Run npm start for development.

## Author and license

Original application code: Copyright (c) 2026 **Thaedalius**. Licensed under the **PolyForm Noncommercial License 1.0.0**; see LICENSE and NOTICE. Noncommercial use, modification and sharing are permitted subject to the license. This is source-available software with a noncommercial restriction.

Third-party code retains its own licenses. Warcraft artwork, map previews and third-party branding are excluded from the application's license; see THIRD_PARTY_NOTICES.md and asset provenance files. This is an unofficial fan application, not endorsed by Blizzard Entertainment, W3Champions or Discord. Inclusion or attribution of an asset does not establish redistribution permission from its rights holder.

W3Champions profile: https://w3champions.com/player/Thaedalius%231362
Discord: Thaedalius
