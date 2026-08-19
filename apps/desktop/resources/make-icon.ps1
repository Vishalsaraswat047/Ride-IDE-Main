Add-Type -AssemblyName System.Drawing

$OutDir = "C:\Users\Visha\ride\apps\desktop\resources"
$Master = Join-Path $OutDir "logo-master.png"
$Sizes = @(16, 24, 32, 48, 64, 128, 256)

$masterImg = [System.Drawing.Image]::FromFile($Master)

function Resize-Logo([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($masterImg, 0, 0, $size, $size)
    $g.Dispose()
    return $bmp
}

# PNG (512px master export)
$big = Resize-Logo 512
$pngPath = Join-Path $OutDir "icon.png"
$big.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$big.Dispose()

# ICO (multi-size, 32bpp BGRA + AND mask)
$images = @()
foreach ($sz in $Sizes) { $images += ,(Resize-Logo $sz) }

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$images.Count)

$offsets = @()
$offset = 6 + 16 * $images.Count
foreach ($img in $images) {
    $w = $img.Width; $h = $img.Height
    $bmpData = $img.LockBits((New-Object System.Drawing.Rectangle(0, 0, $w, $h)), [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = $bmpData.Stride
    $pixels = New-Object byte[] ($stride * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($bmpData.Scan0, $pixels, 0, $pixels.Length)
    $img.UnlockBits($bmpData)
    $andRow = [int][Math]::Ceiling($w / 8.0)
    $andStride = ($andRow + 3) -band -bnot 3
    $size = $stride * $h + $andStride * $h
    $offsets += @{w=$w; h=$h; size=$size; offset=$offset; stride=$stride; andStride=$andStride; pixels=$pixels}
    $offset += $size
}

foreach ($o in $offsets) {
    $bw.Write([Byte]($(if ($o.w -ge 256) { 0 } else { $o.w })))
    $bw.Write([Byte]($(if ($o.h -ge 256) { 0 } else { $o.h })))
    $bw.Write([Byte]0)
    $bw.Write([Byte]0)
    $bw.Write([UInt16]1)
    $bw.Write([UInt16]32)
    $bw.Write([UInt32]$o.size)
    $bw.Write([UInt32]$o.offset)
}

foreach ($o in $offsets) {
    $w = $o.w; $h = $o.h
    $pixels = $o.pixels
    for ($row = 0; $row -lt $h; $row++) {
        $bw.Write($pixels, ($o.stride * ($h - 1 - $row)), $o.stride)
    }
    $and = New-Object byte[] ($o.andStride * $h)
    for ($row = 0; $row -lt $h; $row++) {
        for ($x = 0; $x -lt $w; $x++) {
            $alpha = $pixels[$o.stride * $row + $x * 4 + 3]
            if ($alpha -lt 128) {
                $byteIdx = $row * $o.andStride + ($x -shr 3)
                $and[$byteIdx] = $and[$byteIdx] -bor (0x80 -shr ($x -band 7))
            }
        }
    }
    $bw.Write($and)
    $img.Dispose()
}

$bw.Flush()
$bw.Close()
$icoPath = Join-Path $OutDir "icon.ico"
[System.IO.File]::WriteAllBytes($icoPath, $ms.ToArray())
$ms.Close()
$masterImg.Dispose()

Write-Host "Wrote $pngPath and $icoPath"
