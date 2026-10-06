#ifndef AppVersion
 #define AppVersion "0.1.0"
#endif
[Setup]
AppId={{CA09A9EA-19B1-4A66-95E3-752F328667B1}
AppName=Thae's Replay Explorer
AppVersion={#AppVersion}
AppPublisher=Thaedalius
DefaultDirName={localappdata}\Programs\ThaesReplayExplorer
DefaultGroupName=Thae's Replay Explorer
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#OutputDir}
OutputBaseFilename=Thae-Replay-Explorer-{#AppVersion}-Setup-x64
SetupIconFile={#SourceDir}\resources\app\ui\artwork\rexxar.ico
UninstallDisplayIcon={app}\Thae's Replay Explorer.exe
LicenseFile=..\LICENSE
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: unchecked
[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{autoprograms}\Thae's Replay Explorer"; Filename: "{app}\Thae's Replay Explorer.exe"; WorkingDir: "{app}"; IconFilename: "{app}\Thae's Replay Explorer.exe"; AppUserModelID: "Thae.ReplayExplorer"
Name: "{autodesktop}\Thae's Replay Explorer"; Filename: "{app}\Thae's Replay Explorer.exe"; WorkingDir: "{app}"; IconFilename: "{app}\Thae's Replay Explorer.exe"; AppUserModelID: "Thae.ReplayExplorer"; Tasks: desktopicon
[Run]
Filename: "{app}\Thae's Replay Explorer.exe"; Description: "Launch Thae's Replay Explorer"; Flags: nowait postinstall skipifsilent
; an update started from the app's "Check for updates" (silent, /RELAUNCH=1) opens the app again
Filename: "{app}\Thae's Replay Explorer.exe"; Flags: nowait; Check: RelaunchAfterUpdate
[Code]
function RelaunchAfterUpdate: Boolean;
begin
  Result := ExpandConstant('{param:RELAUNCH|0}') = '1';
end;
