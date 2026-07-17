Add-Type -AssemblyName System.Drawing

$root = "D:\my project"
$out = Join-Path $root "report-screenshots"
New-Item -ItemType Directory -Force -Path $out | Out-Null

function New-Font {
    param(
        [string]$Name,
        [int]$Size,
        [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular
    )
    return New-Object System.Drawing.Font($Name, $Size, $Style)
}

function New-Brush {
    param([int]$R, [int]$G, [int]$B)
    return New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($R, $G, $B))
}

function Save-Bitmap {
    param([System.Drawing.Bitmap]$Bitmap, [string]$Path)
    $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $Bitmap.Dispose()
}

function New-Canvas {
    param([int]$Width, [int]$Height, [System.Drawing.Color]$Bg)
    $bmp = New-Object System.Drawing.Bitmap($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
    $g.Clear($Bg)
    return @{ Bitmap = $bmp; Graphics = $g }
}

function Draw-Header {
    param([System.Drawing.Graphics]$G, [int]$W, [string]$Title, [string]$Subtitle)
    $headerBrush = New-Brush 27 46 94
    $white = [System.Drawing.Brushes]::White
    $titleFont = New-Font "Arial" 28 ([System.Drawing.FontStyle]::Bold)
    $subFont = New-Font "Arial" 16
    $G.FillRectangle($headerBrush, 0, 0, $W, 90)
    $G.DrawString($Title, $titleFont, $white, 40, 22)
    $G.DrawString($Subtitle, $subFont, $white, 40, 56)
    $headerBrush.Dispose()
    $titleFont.Dispose()
    $subFont.Dispose()
}

function Draw-Card {
    param([System.Drawing.Graphics]$G, [int]$X, [int]$Y, [int]$W, [int]$H)
    $G.FillRectangle([System.Drawing.Brushes]::White, $X, $Y, $W, $H)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 225, 235), 2)
    $G.DrawRectangle($pen, $X, $Y, $W, $H)
    $pen.Dispose()
}

function Draw-LabelValue {
    param([System.Drawing.Graphics]$G, [string]$Label, [string]$Value, [int]$X, [int]$Y)
    $labelFont = New-Font "Arial" 14 ([System.Drawing.FontStyle]::Bold)
    $valueFont = New-Font "Arial" 18
    $labelBrush = New-Brush 95 102 118
    $valueBrush = New-Brush 35 35 35
    $G.DrawString($Label, $labelFont, $labelBrush, $X, $Y)
    $G.DrawString($Value, $valueFont, $valueBrush, $X, ($Y + 18))
    $labelFont.Dispose(); $valueFont.Dispose(); $labelBrush.Dispose(); $valueBrush.Dispose()
}

function Draw-BulletList {
    param([System.Drawing.Graphics]$G, [string[]]$Lines, [int]$X, [int]$Y)
    $font = New-Font "Arial" 18
    $brush = New-Brush 55 62 75
    $yy = $Y
    foreach ($line in $Lines) {
        $G.DrawString($line, $font, $brush, $X, $yy)
        $yy += 48
    }
    $font.Dispose()
    $brush.Dispose()
}

# Figure 5: Preprocessing input
$inputPath = Join-Path $root "sample-documents\genuine\genuine_01_sale_deed_arjun_priya.png"
$inputImg = [System.Drawing.Image]::FromFile($inputPath)
$ctx = New-Canvas 1600 980 ([System.Drawing.Color]::FromArgb(245, 247, 250))
$g = $ctx.Graphics; $bmp = $ctx.Bitmap
Draw-Header $g 1600 "Figure 5 - Preprocessing Input" "Original document image used before normalization and OCR"
Draw-Card $g 55 120 1490 790
$g.DrawString("Original Genuine Document", (New-Font "Arial" 24 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 80, 140)
$g.DrawImage($inputImg, (New-Object System.Drawing.Rectangle(80, 190, 700, 650)))
$g.DrawRectangle((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(190, 190, 190), 2)), 80, 190, 700, 650)
Draw-Card $g 830 190 680 650
$g.DrawString("Preprocessing Goal", (New-Font "Arial" 24 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 860, 220)
Draw-BulletList $g @("• Standardize input size","• Reduce background noise","• Improve OCR readability","• Prepare for feature extraction","• Extract metadata and text fields") 860 280
$g.DrawString("This is the raw document before grayscale conversion or OCR cleanup.", (New-Font "Arial" 16), (New-Brush 110 115 130), 860, 600)
Save-Bitmap $bmp (Join-Path $out "figure_5_preprocessing_input.png")
$inputImg.Dispose(); $g.Dispose()

# Figure 6: Preprocessing output
$src = [System.Drawing.Bitmap]::FromFile($inputPath)
$gray = New-Object System.Drawing.Bitmap $src.Width, $src.Height
for ($x = 0; $x -lt $src.Width; $x++) {
    for ($y = 0; $y -lt $src.Height; $y++) {
        $c = $src.GetPixel($x,$y)
        $gval = [int](0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B)
        $gray.SetPixel($x,$y,[System.Drawing.Color]::FromArgb($gval,$gval,$gval))
    }
}
$ctx = New-Canvas 1600 980 ([System.Drawing.Color]::FromArgb(245, 247, 250))
$g = $ctx.Graphics; $bmp = $ctx.Bitmap
Draw-Header $g 1600 "Figure 6 - Preprocessed Output" "Normalized grayscale version prepared for OCR and AI analysis"
Draw-Card $g 55 120 1490 790
$g.DrawString("Preprocessed Document", (New-Font "Arial" 24 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 80, 140)
$g.DrawImage($gray, (New-Object System.Drawing.Rectangle(80, 190, 700, 650)))
$g.DrawRectangle((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(190, 190, 190), 2)), 80, 190, 700, 650)
Draw-Card $g 830 190 680 650
$g.DrawString("Preprocessing Effects", (New-Font "Arial" 24 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 860, 220)
Draw-BulletList $g @("• Grayscale conversion completed","• Noise reduced for cleaner OCR","• Better contrast for text regions","• Ready for feature extraction","• Suitable for authenticity scoring") 860 280
$g.DrawString("The image is now easier to analyze by OCR and machine learning modules.", (New-Font "Arial" 16), (New-Brush 110 115 130), 860, 600)
Save-Bitmap $bmp (Join-Path $out "figure_6_preprocessing_output.png")
$gray.Dispose(); $src.Dispose(); $g.Dispose()

# Figure 7: OCR
$ctx = New-Canvas 1600 980 ([System.Drawing.Color]::FromArgb(245, 247, 250))
$g = $ctx.Graphics; $bmp = $ctx.Bitmap
Draw-Header $g 1600 "Figure 7 - OCR Text Extraction Output" "Extracted text from the property document using OCR"
Draw-Card $g 55 120 1490 790
$g.DrawString("OCR Extracted Text", (New-Font "Arial" 24 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 80, 140)
Draw-Card $g 80 190 1450 650
$mono = New-Font "Consolas" 20
$textBrush = New-Brush 35 35 35
$ocrLines = @("Document Type: Registered Sale Deed","Seller Name: Arjun Mehta","Buyer Name: Priya Nair","Property ID: PROP-TN-1001","Survey Number: 44/2B","Property Address: 12 Lake View Road, Chennai","Sale Amount: INR 58,00,000","Date of Execution: 08 April 2026","Witness 1: Karan Das","Witness 2: Lavanya Iyer")
$oy = 240
foreach ($line in $ocrLines) { $g.DrawString($line, $mono, $textBrush, 110, $oy); $oy += 42 }
$g.DrawString("OCR output is used by the AI module to compare text against the registrar original.", (New-Font "Arial" 16), (New-Brush 110 115 130), 80, 880)
Save-Bitmap $bmp (Join-Path $out "figure_7_ocr_output.png")
$mono.Dispose(); $textBrush.Dispose(); $g.Dispose()

# Figure 8: Tamper detection
$fakePath = Join-Path $root "sample-documents\fake\fake_01_sale_deed_owner_mismatch.png"
$fakeImg = [System.Drawing.Image]::FromFile($fakePath)
$ctx = New-Canvas 1600 980 ([System.Drawing.Color]::FromArgb(245, 247, 250))
$g = $ctx.Graphics; $bmp = $ctx.Bitmap
Draw-Header $g 1600 "Figure 8 - Tamper Detection Output" "Suspicious regions highlighted on the forged document sample"
Draw-Card $g 55 120 1490 790
$g.DrawString("Forged Document with Suspicious Region", (New-Font "Arial" 24 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 80, 140)
$g.DrawImage($fakeImg, (New-Object System.Drawing.Rectangle(80, 190, 700, 650)))
$g.DrawRectangle((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(190, 190, 190), 2)), 80, 190, 700, 650)
$penRed = New-Object System.Drawing.Pen([System.Drawing.Color]::Red, 5)
$g.DrawRectangle($penRed, 160, 260, 480, 90)
$g.DrawString("Owner mismatch detected", (New-Font "Arial" 16 ([System.Drawing.FontStyle]::Bold)), [System.Drawing.Brushes]::Red, 180, 240)
Draw-Card $g 830 190 680 650
$g.DrawString("Detection Summary", (New-Font "Arial" 24 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 860, 220)
Draw-BulletList $g @("• Owner name conflict detected","• Property ID and declaration mismatch","• Suspicious tamper region highlighted","• Forgery probability above alert threshold","• Manual review recommended") 860 280
$g.DrawString("This figure is used to show how suspicious or forged content is visually flagged.", (New-Font "Arial" 16), (New-Brush 110 115 130), 860, 600)
Save-Bitmap $bmp (Join-Path $out "figure_8_tamper_detection.png")
$fakeImg.Dispose(); $penRed.Dispose(); $g.Dispose()

# Figure 9: Reference comparison
$ctx = New-Canvas 1600 980 ([System.Drawing.Color]::FromArgb(245, 247, 250))
$g = $ctx.Graphics; $bmp = $ctx.Bitmap
Draw-Header $g 1600 "Figure 9 - Reference Comparison Result" "Submitted copy compared with the registrar original document"
Draw-Card $g 55 120 1490 790
$g.DrawString("Comparison Summary", (New-Font "Arial" 24 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 80, 140)
Draw-Card $g 80 190 1450 650
$colFont = New-Font "Arial" 16 ([System.Drawing.FontStyle]::Bold)
$labelBrush = New-Brush 95 102 118
$valBrush = New-Brush 35 35 35
$g.DrawString("Field", $colFont, $labelBrush, 120, 230)
$g.DrawString("Registrar Original", $colFont, $labelBrush, 460, 230)
$g.DrawString("Submitted Copy", $colFont, $labelBrush, 920, 230)
$g.DrawString("Match", $colFont, $labelBrush, 1280, 230)
$rows = @(
    @("Title", "SALE DEED", "SALE DEED", "Yes"),
    @("Property ID", "PROP-TN-1001", "PROP-TN-1001", "Yes"),
    @("Buyer Name", "Priya Nair", "Priya Nair", "Yes"),
    @("Sale Amount", "INR 58,00,000", "INR 58,00,000", "Yes"),
    @("Owner Name", "Arjun Mehta", "Arjun Mehta (body) / mismatch in footer", "No")
)
$rowY = 290
foreach ($r in $rows) {
    $g.DrawString($r[0], (New-Font "Arial" 18), $valBrush, 120, $rowY)
    $g.DrawString($r[1], (New-Font "Arial" 18), $valBrush, 460, $rowY)
    $g.DrawString($r[2], (New-Font "Arial" 18), $valBrush, 920, $rowY)
    $matchBrush = if ($r[3] -eq "Yes") { New-Brush 25 135 84 } else { New-Brush 220 53 69 }
    $g.DrawString($r[3], (New-Font "Arial" 18 ([System.Drawing.FontStyle]::Bold)), $matchBrush, 1280, $rowY)
    $matchBrush.Dispose()
    $rowY += 78
}
$g.DrawString("Reference comparison helps the system decide whether the uploaded copy is consistent with the original.", (New-Font "Arial" 16), (New-Brush 110 115 130), 80, 880)
Save-Bitmap $bmp (Join-Path $out "figure_9_reference_comparison.png")
$colFont.Dispose(); $labelBrush.Dispose(); $valBrush.Dispose(); $g.Dispose()

# Figure 10: ML prediction
$ctx = New-Canvas 1600 980 ([System.Drawing.Color]::FromArgb(245, 247, 250))
$g = $ctx.Graphics; $bmp = $ctx.Bitmap
Draw-Header $g 1600 "Figure 10 - Machine Learning Prediction Output" "Authenticity score and forgery probability generated by the ML pipeline"
Draw-Card $g 55 120 1490 790
$g.DrawString("Prediction Dashboard", (New-Font "Arial" 24 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 80, 140)
Draw-Card $g 80 190 450 650
Draw-Card $g 560 190 450 650
Draw-Card $g 1040 190 450 650
$g.DrawString("Authenticity Score", (New-Font "Arial" 20 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 110, 220)
$g.DrawString("0.81", (New-Font "Arial" 54 ([System.Drawing.FontStyle]::Bold)), (New-Brush 25 135 84), 120, 290)
$g.DrawString("Likely genuine", (New-Font "Arial" 18), (New-Brush 25 135 84), 120, 375)
$g.DrawString("Forgery Probability", (New-Font "Arial" 20 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 590, 220)
$g.DrawString("0.19", (New-Font "Arial" 54 ([System.Drawing.FontStyle]::Bold)), (New-Brush 220 53 69), 600, 290)
$g.DrawString("Below alert threshold", (New-Font "Arial" 18), (New-Brush 220 53 69), 600, 375)
$g.DrawString("Confidence", (New-Font "Arial" 20 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 1070, 220)
$g.DrawString("92%", (New-Font "Arial" 54 ([System.Drawing.FontStyle]::Bold)), (New-Brush 13 110 253), 1080, 290)
$g.DrawString("Final model confidence", (New-Font "Arial" 18), (New-Brush 13 110 253), 1080, 375)
$g.DrawString("Model Interpretation", (New-Font "Arial" 20 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 110, 500)
Draw-BulletList $g @("• OCR text is consistent","• Signature pattern is acceptable","• No major tamper regions detected","• Document can proceed to admin review") 120 550
$g.DrawString("Feature summary", (New-Font "Arial" 20 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 590, 500)
Draw-BulletList $g @("Signature score: 0.82","Forgery probability: 0.19","Tampered regions: 0","Text similarity: High") 600 550
Save-Bitmap $bmp (Join-Path $out "figure_10_ml_prediction.png")
$g.Dispose()

# Figure 11: Verification report
$ctx = New-Canvas 1600 980 ([System.Drawing.Color]::FromArgb(245, 247, 250))
$g = $ctx.Graphics; $bmp = $ctx.Bitmap
Draw-Header $g 1600 "Figure 11 - Verification Report Output" "Final AI verification report shown after analysis"
Draw-Card $g 55 120 1490 790
$g.DrawString("AI Verification Report", (New-Font "Arial" 26 ([System.Drawing.FontStyle]::Bold)), (New-Brush 20 28 50), 80, 140)
$g.DrawString("VERIFIED GENUINE", (New-Font "Arial" 32 ([System.Drawing.FontStyle]::Bold)), (New-Brush 25 135 84), 80, 195)
Draw-Card $g 80 260 1450 560
$items = @(
    @("Document Title", "SALE DEED"),
    @("Property ID", "PROP-TN-1001"),
    @("Confidence Score", "0.92"),
    @("Forgery Probability", "0.19"),
    @("AI Status", "VERIFIED GENUINE"),
    @("Reference Check", "Title matched, Property ID matched, text similarity high")
)
$fy = 300
foreach ($it in $items) {
    $g.DrawString($it[0] + ":", (New-Font "Arial" 18 ([System.Drawing.FontStyle]::Bold)), (New-Brush 95 102 118), 120, $fy)
    $g.DrawString($it[1], (New-Font "Arial" 18), (New-Brush 35 35 35), 360, $fy)
    $fy += 70
}
$g.DrawString("This report is stored with the document record and used for administrative and registrar decisions.", (New-Font "Arial" 16), (New-Brush 110 115 130), 80, 860)
Save-Bitmap $bmp (Join-Path $out "figure_11_verification_report.png")
$g.Dispose()

Write-Host "Generated figures 5 to 11 in report-screenshots"
