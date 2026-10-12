param([Parameter(Mandatory=$true)][string]$SourceDir, [string]$OutputDir, [string]$AppVersion)
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
if (!$AppVersion) { $AppVersion = (Get-Content (Join-Path $project 'package.json') -Raw | ConvertFrom-Json).version }
if (!$OutputDir) { $OutputDir = Join-Path $project 'release' }
$SourceDir = (Resolve-Path -LiteralPath $SourceDir).Path
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$OutputDir = (Resolve-Path -LiteralPath $OutputDir).Path
$work = Join-Path $OutputDir ('msi-build-' + [guid]::NewGuid().ToString('N'))
$wixRoot = Join-Path $project 'tools/wix4'
$wix = Join-Path $wixRoot 'bin/wix.exe'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
if (!(Test-Path -LiteralPath $wix)) { throw 'Install WiX 4.0.6 using the commands in README.md before building.' }
if ((& $wix --version) -notmatch '^4\.0\.6\+') { throw 'The MSI build requires the pinned WiX 4.0.6 tool.' }
$extensions = @('UI','Util') | ForEach-Object {
 $file = Join-Path $wixRoot ".wix/extensions/WixToolset.$_.wixext/4.0.6/wixext4/WixToolset.$_.wixext.dll"
 if (!(Test-Path -LiteralPath $file)) { throw "Missing WiX $_ 4.0.6 extension; see README.md." }
 $file
}
& node (Join-Path $PSScriptRoot 'msi-payload.cjs') $SourceDir $work
if ($LASTEXITCODE -ne 0) { throw 'MSI payload generation failed.' }
$payload = Get-Content (Join-Path $work 'payload.json') -Raw | ConvertFrom-Json
$msi = Join-Path $OutputDir "Thae-Replay-Explorer-$AppVersion-Setup-x64.msi"
& $wix build (Join-Path $project 'packaging/installer.wxs') (Join-Path $work 'payload.wxs') -arch x64 -d "AppVersion=$AppVersion" -d "SourceDir=$SourceDir" -d "ProjectDir=$project" -d "AppDirectoryId=$($payload.appDirectoryId)" -d "LicenseRtf=$(Join-Path $work 'license.rtf')" -ext $extensions[0] -ext $extensions[1] -intermediatefolder (Join-Path $work 'obj') -pdbtype none -out $msi
if ($LASTEXITCODE -ne 0) { throw 'Native MSI build failed.' }
Write-Output "MSI installer: $msi"
