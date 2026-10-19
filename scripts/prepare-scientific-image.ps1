param(
    [Parameter(Mandatory=$true)][string]$SourcePath,
    [Parameter(Mandatory=$true)][string]$Name
)
$ErrorActionPreference = 'Stop'
if ($Name -notmatch '^[a-z-]+$') { throw 'Use a simple asset name.' }
$workspace = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$directory = Join-Path $workspace 'public\assets\scientific'
New-Item -ItemType Directory -Path $directory -Force | Out-Null
Add-Type -AssemblyName System.Drawing
$bitmap = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $SourcePath).Path)
$parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
$parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]85)
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$destination = Join-Path $directory ($Name + '.jpg')
try { $bitmap.Save($destination, $encoder, $parameters) }
finally { $bitmap.Dispose(); $parameters.Dispose() }
Get-Item -LiteralPath $destination | Select-Object Name, Length
