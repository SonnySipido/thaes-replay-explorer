$ErrorActionPreference='Stop'
# Only the current user's Search UI needs to reload its decoded app icons.
$sessionId=[Diagnostics.Process]::GetCurrentProcess().SessionId
$systemAppsRoot=[IO.Path]::GetFullPath((Join-Path $env:WINDIR 'SystemApps'))+'\'
$candidates=@(Get-CimInstance Win32_Process | Where-Object {$_.SessionId -eq $sessionId -and $_.Name -in @('SearchApp.exe','SearchHost.exe')})
foreach($candidate in $candidates){
 if(!$candidate.ExecutablePath -or !$candidate.ExecutablePath.StartsWith($systemAppsRoot,[StringComparison]::OrdinalIgnoreCase)){throw 'Unexpected Search process location.'}
 Stop-Process -Id $candidate.ProcessId -Force -ErrorAction SilentlyContinue
}
