# Thae's Replay Explorer

A Windows Warcraft III replay library and match analyzer by **Thaedalius**.

## Download and install

Download the Windows x64 Setup executable from this repository's Releases page and run it. The installer adds **Thae's Replay Explorer** to the Windows Start menu (search for **Replay**) and offers a desktop shortcut. No administrator rights are required. A portable ZIP is also available: extract the entire folder and run **Thae's Replay Explorer.exe**. Keep the accompanying files with the executable.

Windows 10 or 11, 64-bit, is required. Electron, Node.js and the replay parser are included; users do not need to install development tools, Java, Python or Node.js. Warcraft III and the matching local map are needed to watch a replay in the game, but not to browse replay analysis. Replay launching uses Windows' .w3g file association.

The initial release is unsigned; Windows may display an unknown-publisher or reputation warning. Only download builds from the author's repository.

## Use

On first launch, choose a replay folder. The app suggests your Documents/Warcraft III/BattleNet/<account>/Replays folder when available. Enable or disable subfolders beside Choose folder. The app remembers your choice and checks for changes automatically.

Browse maps, player races, matchups and team sizes. Select a replay to compare teams, heroes and learned abilities, units, buildings, research, items, APM, control groups and chat. Double-click a replay or use Watch replay to open it in Warcraft III. Watch replay is enabled only when the map can be found locally. Click the replay filename or map title to locate the corresponding file in Explorer.

Initial indexing can take time with a large library. Summaries and analysis are cached locally; only a bounded number of full replay records are held in memory. Filters and winner visibility are remembered.

Replays record commands, not a complete simulation: production and research entries represent orders, hero levels are inferred minimums, and unsupported or damaged replays may fail to parse. Compatibility depends on the included w3gjs parser and replay format; future game updates may require an app update. Missing map previews use a placeholder.

## Local data and privacy

Replays stay on your computer. The app has no telemetry or replay upload feature. It stores settings and its analysis cache in %APPDATA%/Warcraft Replay Explorer (the original data directory is retained for upgrade compatibility). These files can include player names and replay chat. The uninstaller preserves these settings and your replays. The W3Champions profile link opens your browser only when clicked.

## Build from source

Use Windows x64 with Node.js 22.12 or newer, npm, and Inno Setup 7. Install dependencies with npm ci, run npm test, then npm run build:release. The build script finds ISCC.exe in the standard Inno Setup location; alternatively set INNO_ISCC to its full path. It downloads a pinned, checksum-verified Electron rcedit tool to set the executable icon. Output is written to release/. Each build uses a new staging directory. Run npm start for development.

## Author and license

Original application code: Copyright (c) 2026 **Thaedalius**. Licensed under the **PolyForm Noncommercial License 1.0.0**; see LICENSE and NOTICE. Noncommercial use, modification and sharing are permitted subject to the license. This is source-available software with a noncommercial restriction.

Third-party code retains its own licenses. Warcraft artwork, map previews and third-party branding are excluded from the application's license; see THIRD_PARTY_NOTICES.md and asset provenance files. This is an unofficial fan application, not endorsed by Blizzard Entertainment, W3Champions or Discord. Inclusion or attribution of an asset does not establish redistribution permission from its rights holder.

W3Champions profile: https://w3champions.com/player/Thaedalius%231362
Discord: Thaedalius
