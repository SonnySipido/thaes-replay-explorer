# Changelog

## 0.4.1 (not yet released)

- Chat: **Hide duplicates** switch (on by default). Battle.net replays since Reforged record the saving player's own messages twice, a few milliseconds apart; the copy is hidden when the same player sends the same text in the same channel within a second.
- Chat: **Copy chat** puts the messages shown (after search, player filter and Hide duplicates) on the clipboard, and **Export chat** saves them as a text file named after the replay. Both start with the map, date and replay file name, then one line per message: time, channel, player and text.


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
