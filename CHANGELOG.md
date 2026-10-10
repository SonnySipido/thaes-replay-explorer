# Changelog

## 0.8.0

- Refreshed the app and website with bundled Inter and Cinzel fonts. Chat keeps its adjustable font size and spacing.
- Hero abilities use equal-height vertical rank bars, with one full bar for ultimates, and follow the game's ability order. Hero levels appear in purple bars under their names; exact experience progress is not available from replay data.
- Group unit types by their first recorded training order. Unknown heroes are hidden, and empty unit and chat sections no longer show placeholder messages.
- Classic explorer view shows replay scroll icons. Empty folder branches are greyed out and cannot expand, with an optional Hide empty folders setting available only in Classic view.
- Race colored names can be turned off for white player names in detailed view. The setting is disabled in Classic explorer view while preserving the saved preference.
- Added Longest first and Shortest first sorting in both replay list views, with remembered selections.
- Added Rexxar to the aligned banner and website links on the app title and external-link icon. Updated Any race badges and fixed the default Anywhere globe and dropdown focus styling.
- Added copy/export button icons, refined number spacing and favorite/notes alignment, and corrected the Classic Paladin Divine Shield icon.
- Updated website features, illustrated guides and screenshots for version 0.8.

## 0.7.0

- Classic explorer view replaces the compact list: browse separate configured roots, expand nested folders, and right-click folders to open File Explorer. Empty folders stay compact.
- Up/Down arrows select replays in both list views, including across pages and lazy-loaded rows.
- Rename replay files from the Match Analysis pencil, Classic-view right-click, or F2. The extension, favorites and notes are preserved; filename conflicts do not overwrite files.
- Copy replay files to the Windows clipboard or drag them from either list view or the match-header filename into Discord and other apps that accept files.
- Dropping an existing library file back into the app does nothing; delayed imports no longer override a newer selection.
- Hide suspected duplicate orders is enabled by default in Settings and applies to build orders plus unit, building and upgrade analysis. Raw orders remain available by disabling it.
- Favorites and Notes filters together include matches satisfying either filter. Advanced replay-folder paths are clickable.
- Batched indexing and reused replay cards keep the library more responsive while new replays arrive. Fixed the old selection border when navigating with arrow keys.
- Refreshed website features and guides for opening, organizing, renaming and sharing Warcraft III replays.

## 0.6.0

- Control groups show all identified unit, hero and building types assigned throughout the match, rather than only the final membership.
- Improved responsive Match Analysis headers so map names have more space.
- Notes headings and arrows turn yellow when a replay has notes; enabling the notes filter expands notes once while preserving manual collapse afterward.
- Clearer annotation backup instructions and improved note/favorite icon placement.

- Notes and Favorites library filters now use clickable icons. Compact replay rows include a right-aligned favorite star and a notes indicator when applicable.

- Added a persistent Notes toggle beside Favorites to show only replays with nonempty notes.

- Added a persistent Compact replay list switch in Settings for single-line, filename-only rows.

## 0.5.0

- Build Order includes researched upgrades and FE/T2/T3 tags. Each player has separate text and PNG exports named after the map and player. Removed the five-minute label and increased Match Analysis date/time text by two points.

- Added a compact Build Order tab showing each player’s first five minutes of unit, hero and building orders chronologically, with text and full-length PNG exports. Rapid repeat orders for the same hero and singleton buildings are collapsed.

- Hide identical replay files across indexed folders by default. Settings remembers the Hide duplicates switch and shows duplicate counts. Files remain untouched; hovering a replay lists its identical copies.

- Library search includes in-game chat and replay notes. Chat text is cached in lightweight summaries and existing libraries upgrade automatically.

- Favorite replays with a star and filter the library to favorites. Add autosaved notes below the match header, search their contents, and export or import annotation backups in Advanced settings. Identical replay files share annotations even after a rename or move.

- Drop .w3g files onto the window to copy them into the primary folder and select their analysis. Existing identical replays are selected without copying; filename conflicts keep both files.

- Advanced settings can manage multiple replay folders, with independent enabled and subfolder switches, removal without deleting files, and a combined library that deduplicates overlapping locations. Folder settings persist across restarts; unavailable locations do not stop other folders from indexing.


## 0.4.3

- Buildings now have individual chronological rows, responsive names, and T2/T3 badges. Early expansions started before 6:00 and before T2 receive a green FE badge. Rapid repeat orders for altars, research buildings, shops, and town halls are hidden within three seconds; production and supply buildings keep separate entries.
- Hero names fit beside their icons and levels. Larger analysis text and timestamps improve readability without changing chat's font controls.
- Compact library filters include race and platform icons, an Anywhere globe, and side-by-side Team size/matchup and Platform/Version controls.
- Chat timestamps follow the selected font size and use two-digit minutes, including copied and exported chat.
- Black dividers separate opposing teams in the header and analysis tabs; allied-player separators are thin gray lines. Removed redundant heading borders and unavailable-winner text.
- Added minimap previews for Nomad Isles 1.2, Centaur Grove, Furbolg Mountain, Swamped Temple, and both classic Moonglade editions.


## 0.4.2

- Check for updates on startup: on the first start the app asks whether it should look for a newer version each time it starts (a **Check on startup** switch in Settings changes this later). When it is on and a newer version is found, the app asks whether to install it now. These questions appear in the app's own style instead of Windows dialogs.
- First start: instead of opening the Windows folder picker straight away, the app suggests the replay folder it found (Documents\Warcraft III\BattleNet, covering every account) with **Use this folder** and **Choose another folder…**. The update question follows once the folder is settled, so the two never overlap.


## 0.4.1

- Chat: **Hide duplicates** switch (on by default). Battle.net replays since Reforged record the saving player's own messages twice, a few milliseconds apart; the copy is hidden when the same player sends the same text in the same channel within a second.
- Chat: **Copy chat** puts the messages shown (after search, player filter and Hide duplicates) on the clipboard, and **Export chat** saves them as a text file named after the replay. Both start with the map, date and replay file name, then one line per message: time, channel, player and text.
- Replay list: the match header's clock icon before each game's duration.


## 0.4.0

- Patch filter: tick one or more patches (listed from your own library, newest first, with their builds and replay counts) to show only games from those patches.
- More reliable winners: checked against over 8,000 real results. In Battle.net replays the side still in the game beats the side that left (the old reading picked the wrong winner in about a quarter of Battle.net 1v1s). Replays already in the library are worked out again when opened.
- Settings panel behind the gear at the top right (the header keeps only the gear), with the replay folder (click it to open it in File Explorer), Choose folder, the Include subfolders and Reforged HD icons switches, and Check for updates (with the version and the date it last checked). Up to date / Check failed return to the normal button after a few seconds.
- The status line shows how many replays are indexed.


## 0.3.0

- Check for updates: a button in the header looks for a newer version on GitHub (only when pressed) and, when there is one, downloads it, checks it against the release checksums and installs it; the app restarts by itself.
- Show each player's Battle.net MMR in the match header ("5610 MMR" with the Battle.net icon, styled like the APM beside it) (Battle.net ladder replays; W3Champions replays do not record MMR).
- Player names without a full BattleTag, such as pre-Reforged accounts, are plain text instead of a link that could only show an error.
- Show where a game was played with the W3Champions or Battle.net icon (named on hover) in the match header and after the map name in the replay list, and filter the list by it ("Played on"). Read from the game's host recorded in the replay, so it also works for W3Champions games saved under Warcraft III's own Replay_… file names.
- Show the date and time of the game in the match header, and a clock icon before its duration.
- Show the winner of team games too (worked out from the players' leave records; only 1v1 games had one before). Decided for about 97% of team games; replays without leave records stay unknown.
- No more freezes every 30 seconds with large libraries: the replay folder is watched for new and changed replays, a background check runs every 5 minutes, and only changed rows are sent to the list instead of the whole library.
- Open a replay from another app: `--select "<replay.w3g>"` selects it in the library and shows its analysis.
- Only one window runs at a time; launching the app again brings the open window to the front.


## 0.2.0

- Resize the replay list by dragging its divider to see more player names in team matches. The chosen width is saved between launches.
- Double-click the divider to reset its width; keyboard arrows also adjust it.
- Add the World Editor Scroll icon beside the Match Analysis replay filename.
- Includes all improvements from 0.1.3 and the updated download website.


## 0.1.3

- Restore the selected replay after restarting; Escape clears the analysis and saved selection.
- Align opposing teammates in shared rows across analysis tabs.
- Hide repeated headings in two-player matches; place race icons beside names in larger matches.
- Group replay-card names by team with VS only between teams.
- Refine replay-card race icon sizes, team-card spacing and date/time labels.
- Add the Reveal spyglass to Watch replay, reduce duration text, and add copyright branding.
- Remove the unit training timeline and rename the unit summary to Units Produced.


## 0.1.2

- Click match-header player names to open W3Champions profiles.
- Remember window dimensions, position and maximized state, with safe placement after monitor changes.
- Align the graphics switch to the right of the Replays heading.


## 0.1.1

- Reduce the default window height by 150 pixels, while keeping it within the screen.
- Add a saved Classic / Reforged HD icon switch for game objects.
- Replace checkbox visuals with accessible switches for graphics, subfolders and winner visibility.


## 0.1.0

First packaged Windows release: cached replay library, team comparisons, hero abilities, production, upgrades, items, APM charts, control groups and chat; race/matchup/team filters; local map discovery; persistent settings; Start menu installer and portable distribution.
