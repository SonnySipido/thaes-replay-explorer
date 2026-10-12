$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$source=Join-Path $project 'ui/artwork/thaes-app-icon.png'
$target=Join-Path $project 'ui/artwork/thaes-app-icon.ico'
Add-Type -AssemblyName System.Drawing
$image=[Drawing.Image]::FromFile($source)
$sizes=@(16,20,24,32,40,48,64,96,128,256)
$frames=@()
try {
 foreach($size in $sizes) {
  $bitmap=New-Object Drawing.Bitmap($size,$size,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics=[Drawing.Graphics]::FromImage($bitmap)
  $stream=New-Object IO.MemoryStream
  $attributes=New-Object Drawing.Imaging.ImageAttributes
  try {
   $graphics.Clear([Drawing.Color]::Transparent)
   $graphics.CompositingMode=[Drawing.Drawing2D.CompositingMode]::SourceCopy
   $graphics.CompositingQuality=[Drawing.Drawing2D.CompositingQuality]::HighQuality
   $graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
   $graphics.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::HighQuality
   $attributes.SetWrapMode([Drawing.Drawing2D.WrapMode]::TileFlipXY)
   $scale=[Math]::Min($size/$image.Width,$size/$image.Height)
   $width=[int][Math]::Round($image.Width*$scale)
   $height=[int][Math]::Round($image.Height*$scale)
   $bounds=New-Object Drawing.Rectangle([int](($size-$width)/2),[int](($size-$height)/2),$width,$height)
   $graphics.DrawImage($image,$bounds,0,0,$image.Width,$image.Height,[Drawing.GraphicsUnit]::Pixel,$attributes)
   $bitmap.Save($stream,[Drawing.Imaging.ImageFormat]::Png)
   $frames+=,@{Size=$size;Data=$stream.ToArray()}
  } finally {$attributes.Dispose();$stream.Dispose();$graphics.Dispose();$bitmap.Dispose()}
 }
} finally {$image.Dispose()}
$output=[IO.File]::Create($target)
$writer=New-Object IO.BinaryWriter($output)
try {
 $writer.Write([uint16]0);$writer.Write([uint16]1);$writer.Write([uint16]$frames.Count)
 $offset=6+16*$frames.Count
 foreach($frame in $frames) {
  $dimension=if($frame.Size -eq 256){0}else{$frame.Size}
  $writer.Write([byte]$dimension);$writer.Write([byte]$dimension)
  $writer.Write([byte]0);$writer.Write([byte]0)
  $writer.Write([uint16]1);$writer.Write([uint16]32)
  $writer.Write([uint32]$frame.Data.Length);$writer.Write([uint32]$offset)
  $offset+=$frame.Data.Length
 }
 foreach($frame in $frames){$writer.Write([byte[]]$frame.Data)}
} finally {$writer.Dispose();$output.Dispose()}
Write-Output ('Generated Windows app icon at '+($sizes -join ', ')+' pixels.')
