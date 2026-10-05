$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
Push-Location $project
try {
 $version = (Get-Content package.json -Raw | ConvertFrom-Json).version
 $out = Join-Path $project 'release'
 $stage = Join-Path $out ('staging-' + [guid]::NewGuid().ToString('N'))
 $appDir = Join-Path $stage "Thae's Replay Explorer"
 New-Item -ItemType Directory -Force -Path $out | Out-Null
 & node scripts/stage-release.cjs $appDir
 if ($LASTEXITCODE -ne 0) { throw 'Runtime staging failed.' }
 $rcedit = Join-Path $project 'tools/rcedit-x64.exe'
 if (!(Test-Path -LiteralPath $rcedit)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $rcedit -Parent) | Out-Null
  Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe' -OutFile $rcedit
 }
 if ((Get-FileHash -LiteralPath $rcedit -Algorithm SHA256).Hash -ne '3e7801db1a5edbec91b49a24a094aad776cb4515488ea5a4ca2289c400eade2a') { throw 'rcedit checksum mismatch.' }
 $exe = Join-Path $appDir "Thae's Replay Explorer.exe"
 & $rcedit $exe --set-icon (Join-Path $project 'ui/artwork/rexxar.ico') --set-version-string ProductName "Thae's Replay Explorer" --set-version-string FileDescription "Thae's Replay Explorer" --set-version-string CompanyName 'Thaedalius' --set-version-string LegalCopyright 'Copyright (c) 2026 Thaedalius' --set-file-version $version --set-product-version $version
 if ($LASTEXITCODE -ne 0) { throw 'Executable branding failed.' }
 $compiler = $env:INNO_ISCC
 if (!$compiler) {
  foreach ($candidate in @((Join-Path $project 'tools/inno/ISCC.exe'), (Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'Inno Setup 7/ISCC.exe'), "$env:ProgramFiles\Inno Setup 7\ISCC.exe")) { if (Test-Path -LiteralPath $candidate) { $compiler = $candidate; break } }
 }
 if (!$compiler) { throw 'Install Inno Setup 7, or set INNO_ISCC to ISCC.exe.' }
 & $compiler "/DAppVersion=$version" "/DSourceDir=$appDir" "/DOutputDir=$out" packaging/installer.iss
 if ($LASTEXITCODE -ne 0) { throw 'Installer build failed.' }
 $zip = Join-Path $out ("Thae-Replay-Explorer-$version-Portable-x64.zip")
 Add-Type -AssemblyName System.IO.Compression.FileSystem
 if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
 [IO.Compression.ZipFile]::CreateFromDirectory($stage,$zip,[IO.Compression.CompressionLevel]::Optimal,$false)
 $setup = Join-Path $out ("Thae-Replay-Explorer-$version-Setup-x64.exe")
 $checksums = foreach ($file in @($setup,$zip)) { $hash=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLower(); "$hash  $([IO.Path]::GetFileName($file))" }
 $checksums | Set-Content -LiteralPath (Join-Path $out 'SHA256SUMS.txt') -Encoding ASCII
 Write-Output "Installer: $setup"
 Write-Output "Portable: $zip"
} finally { Pop-Location }
