Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# ── Background ───────────────────────────────────────────────────────────────
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42))
$g.FillRectangle($bgBrush, 0, 0, $size, $size)

# ── Blue rounded square (main badge) ─────────────────────────────────────────
$badgeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(37, 99, 235))
$radius = 36
$bx = 20; $by = 20; $bw = 216; $bh = 216
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc($bx,            $by,            $radius*2, $radius*2, 180, 90)
$path.AddArc($bx+$bw-$radius*2, $by,        $radius*2, $radius*2, 270, 90)
$path.AddArc($bx+$bw-$radius*2, $by+$bh-$radius*2, $radius*2, $radius*2, 0, 90)
$path.AddArc($bx,            $by+$bh-$radius*2, $radius*2, $radius*2, 90, 90)
$path.CloseFigure()
$g.FillPath($badgeBrush, $path)

# ── Inner highlight (top half, subtle) ───────────────────────────────────────
$highlightBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 255, 255, 255))
$hPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$hPath.AddArc($bx,            $by,            $radius*2, $radius*2, 180, 90)
$hPath.AddArc($bx+$bw-$radius*2, $by,        $radius*2, $radius*2, 270, 90)
$hPath.AddLine($bx+$bw, $by+$bh/2, $bx, $by+$bh/2)
$hPath.CloseFigure()
$g.FillPath($highlightBrush, $hPath)

# ── "Q" letter (large, bold, white) ──────────────────────────────────────────
$font = New-Object System.Drawing.Font("Segoe UI", 118, [System.Drawing.FontStyle]::Bold)
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255))
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$textRect = New-Object System.Drawing.RectangleF($bx, ($by - 12), $bw, $bh)
$g.DrawString("Q", $font, $whiteBrush, $textRect, $sf)

# ── Three quota bars bottom-right (accent) ───────────────────────────────────
$accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 147, 197, 253))
$barW = 14
$g.FillRectangle($accentBrush, 148, 186, $barW, 28)
$g.FillRectangle($accentBrush, 167, 176, $barW, 38)
$g.FillRectangle($accentBrush, 186, 163, $barW, 51)

$g.Dispose()

# ── Save PNG ──────────────────────────────────────────────────────────────────
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot "..\build") -Force | Out-Null
$pngPath = Join-Path $PSScriptRoot "..\build\icon.png"
$icoPath = Join-Path $PSScriptRoot "..\build\icon.ico"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "✓ icon.png saved"

# ── Wrap PNG in ICO (PNG-in-ICO, supported on Vista+) ────────────────────────
$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
$dataOffset = 6 + 16   # header(6) + one directory entry(16)
$icoBytes = New-Object byte[] ($dataOffset + $pngBytes.Length)

# Header
$icoBytes[0] = 0; $icoBytes[1] = 0   # reserved
$icoBytes[2] = 1; $icoBytes[3] = 0   # type 1 = ICO
$icoBytes[4] = 1; $icoBytes[5] = 0   # image count = 1

# Directory entry (16 bytes)
$icoBytes[6]  = 0    # width  (0 = 256)
$icoBytes[7]  = 0    # height (0 = 256)
$icoBytes[8]  = 0    # color count
$icoBytes[9]  = 0    # reserved
$icoBytes[10] = 1    # color planes
$icoBytes[11] = 0
$icoBytes[12] = 32   # bits per pixel
$icoBytes[13] = 0
# image data size (little-endian)
$s = $pngBytes.Length
$icoBytes[14] = [byte]($s -band 0xFF)
$icoBytes[15] = [byte](($s -shr 8) -band 0xFF)
$icoBytes[16] = [byte](($s -shr 16) -band 0xFF)
$icoBytes[17] = [byte](($s -shr 24) -band 0xFF)
# image data offset (little-endian) = 22
$icoBytes[18] = [byte]($dataOffset -band 0xFF)
$icoBytes[19] = 0; $icoBytes[20] = 0; $icoBytes[21] = 0

# Copy PNG data
[System.Array]::Copy($pngBytes, 0, $icoBytes, $dataOffset, $pngBytes.Length)
[System.IO.File]::WriteAllBytes($icoPath, $icoBytes)
Write-Host "✓ icon.ico saved"
Write-Host ""
Write-Host "Agora rode: npm run electron:build"
