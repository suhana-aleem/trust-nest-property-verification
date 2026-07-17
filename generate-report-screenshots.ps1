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

function Save-Bitmap {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$Path
    )
    $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $Bitmap.Dispose()
}

function Draw-Rect {
    param(
        [System.Drawing.Graphics]$Graphics,
        [System.Drawing.Brush]$Brush,
        [int]$X,
        [int]$Y,
        [int]$W,
        [int]$H
    )
    $Graphics.FillRectangle($Brush, $X, $Y, $W, $H)
}

function Draw-Border {
    param(
        [System.Drawing.Graphics]$Graphics,
        [System.Drawing.Pen]$Pen,
        [int]$X,
        [int]$Y,
        [int]$W,
        [int]$H
    )
    $Graphics.DrawRectangle($Pen, $X, $Y, $W, $H)
}

function Convert-To-DocumentVariant {
    param(
        [string]$SourcePath,
        [ValidateSet("original", "grayscale", "preprocessed")]
        [string]$Mode
    )

    $sourceBitmap = New-Object System.Drawing.Bitmap($SourcePath)
    try {
        if ($Mode -eq "original") {
            return New-Object System.Drawing.Bitmap($sourceBitmap)
        }

        $variantBitmap = New-Object System.Drawing.Bitmap($sourceBitmap.Width, $sourceBitmap.Height)
        for ($x = 0; $x -lt $sourceBitmap.Width; $x++) {
            for ($y = 0; $y -lt $sourceBitmap.Height; $y++) {
                $pixel = $sourceBitmap.GetPixel($x, $y)
                $gray = [int][math]::Round(($pixel.R * 0.299) + ($pixel.G * 0.587) + ($pixel.B * 0.114))
                if ($Mode -eq "preprocessed") {
                    $gray = if ($gray -gt 168) { 255 } else { 0 }
                }

                $variantBitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($pixel.A, $gray, $gray, $gray))
            }
        }

        return $variantBitmap
    }
    finally {
        $sourceBitmap.Dispose()
    }
}

function Save-DocumentFigure {
    param(
        [string]$SourcePath,
        [string]$OutputPath,
        [string]$Title,
        [string]$Subtitle,
        [ValidateSet("original", "grayscale", "preprocessed")]
        [string]$Mode
    )

    $variantBitmap = Convert-To-DocumentVariant -SourcePath $SourcePath -Mode $Mode
    $w = 1600
    $h = 1000
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
    $g.Clear([System.Drawing.Color]::FromArgb(245, 247, 250))

    $headerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(27, 46, 94))
    $panelBrush = [System.Drawing.Brushes]::White
    $panelBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(216, 222, 232), 2)
    $titleBrush = [System.Drawing.Brushes]::White
    $subtitleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 237, 250))
    $titleFontLocal = New-Font "Arial" 32 ([System.Drawing.FontStyle]::Bold)
    $subtitleFontLocal = New-Font "Arial" 18
    $captionFontLocal = New-Font "Arial" 15
    $captionBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(94, 102, 120))

    $g.FillRectangle($headerBrush, 0, 0, $w, 120)
    $g.DrawString($Title, $titleFontLocal, $titleBrush, 60, 28)
    $g.DrawString($Subtitle, $subtitleFontLocal, $subtitleBrush, 60, 70)

    $frameX = 70
    $frameY = 170
    $frameW = 1460
    $frameH = 760
    $g.FillRectangle($panelBrush, $frameX, $frameY, $frameW, $frameH)
    $g.DrawRectangle($panelBorder, $frameX, $frameY, $frameW, $frameH)

    $maxW = $frameW - 60
    $maxH = $frameH - 60
    $scale = [Math]::Min($maxW / $variantBitmap.Width, $maxH / $variantBitmap.Height)
    $drawW = [int]($variantBitmap.Width * $scale)
    $drawH = [int]($variantBitmap.Height * $scale)
    $drawX = $frameX + [int](($frameW - $drawW) / 2)
    $drawY = $frameY + [int](($frameH - $drawH) / 2)

    $g.DrawImage($variantBitmap, $drawX, $drawY, $drawW, $drawH)
    $g.DrawString("Source: sample-documents/genuine/genuine_01_sale_deed_arjun_priya.png", $captionFontLocal, $captionBrush, 74, 950)

    Save-Bitmap -Bitmap $bmp -Path $OutputPath
    $variantBitmap.Dispose()
    $g.Dispose()
}

# Copy the real sample images
Copy-Item (Join-Path $root "sample-documents\genuine\genuine_01_sale_deed_arjun_priya.png") (Join-Path $out "figure_2_genuine_sample.png") -Force
Copy-Item (Join-Path $root "sample-documents\fake\fake_01_sale_deed_owner_mismatch.png") (Join-Path $out "figure_3_forged_sample.png") -Force

# Figure 4 - dataset folder structure
$w = 1600
$h = 1000
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.Color]::White)

$headerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, 39, 75))
$whiteBrush = [System.Drawing.Brushes]::White
$darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 30, 30))
$mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 90, 90))
$panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(250, 250, 252))
$borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, 200, 200), 2)

$titleFont = New-Font "Arial" 32 ([System.Drawing.FontStyle]::Bold)
$monoFont = New-Font "Consolas" 24
$smallFont = New-Font "Arial" 18

$g.FillRectangle($headerBrush, 0, 0, $w, 110)
$g.DrawString("Dataset Folder Structure - TRUST NEST", $titleFont, $whiteBrush, 50, 28)
$g.FillRectangle($panelBrush, 45, 135, 1510, 820)
$g.DrawRectangle($borderPen, 45, 135, 1510, 820)

$tree = @(
    "sample-documents/",
    "|-- genuine/   (5 images)",
    "|   |-- genuine_01_sale_deed_arjun_priya.png",
    "|   |-- genuine_02_lease_agreement_ravi_maya.png",
    "|   |-- genuine_03_gift_deed_sunita_amit.png",
    "|   |-- genuine_04_property_tax_receipt_harish.png",
    "|   `-- genuine_05_encumbrance_certificate_neha.png",
    "|-- fake/      (10 images)",
    "|   |-- fake_01_sale_deed_owner_mismatch.png",
    "|   |-- fake_02_property_id_conflict.png",
    "|   |-- fake_03_overwritten_sale_amount.png",
    "|   |-- fake_04_missing_registration_status.png",
    "|   |-- fake_05_encumbrance_liability_hidden.png",
    "|   |-- fake_06_date_mismatch_partition_deed.png",
    "|   |-- fake_07_area_value_mismatch.png",
    "|   |-- fake_08_signature_panel_missing.png",
    "|   |-- fake_09_duplicate_registry_reference.png",
    "|   `-- fake_10_buyer_name_variation.png",
    "|-- pdf/       (10 PDF versions)",
    "|   |-- genuine_01_sale_deed_arjun_priya.pdf",
    "|   |-- genuine_02_lease_agreement_ravi_maya.pdf",
    "|   `-- ...",
    "|-- manifest.csv",
    "`-- VIVA_DEMO_SHEET.md"
)

$y = 165
foreach ($line in $tree) {
    $g.DrawString($line, $monoFont, $darkBrush, 90, $y)
    $y += 42
}
$g.DrawString("Dataset created for the TRUST NEST academic project using generate-documents.ps1", $smallFont, $mutedBrush, 90, 900)

Save-Bitmap -Bitmap $bmp -Path (Join-Path $out "figure_4_dataset_structure.png")
$g.Dispose()

# Figure 1 - upload interface mockup
$w = 1600
$h = 1050
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.Color]::FromArgb(244, 246, 248))

$topBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(27, 46, 94))
$cardBrush = [System.Drawing.Brushes]::White
$fieldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248, 250, 253))
$accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(242, 247, 255))
$buttonBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(43, 108, 176))
$borderPen2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 225, 235), 2)
$fieldPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, 207, 220), 2)
$accentPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(195, 212, 244), 2)

$titleFont2 = New-Font "Arial" 32 ([System.Drawing.FontStyle]::Bold)
$bigFont = New-Font "Arial" 30 ([System.Drawing.FontStyle]::Bold)
$labelFont = New-Font "Arial" 20
$fieldFont = New-Font "Arial" 20
$buttonFont = New-Font "Arial" 22 ([System.Drawing.FontStyle]::Bold)
$hintFont = New-Font "Arial" 16

$g.FillRectangle($topBrush, 0, 0, $w, 120)
$g.DrawString("TRUST NEST", $titleFont2, $whiteBrush, 60, 35)
$g.DrawString("Registrar / Buyer Upload", $labelFont, $whiteBrush, 1240, 42)

$g.FillRectangle($cardBrush, 60, 170, 700, 740)
$g.DrawRectangle($borderPen2, 60, 170, 700, 740)
$heroBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 28, 50))
$copyBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(72, 78, 92))
$hintDarkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(110, 115, 130))
$fieldLabelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(38, 46, 66))
$fieldPlaceholderBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(143, 149, 165))
$roleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, 39, 75))
$roleTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 70, 96))
$footerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(95, 102, 118))

$g.DrawString("Upload Document", $bigFont, $heroBrush, 100, 220)
$g.DrawString("Use this form to upload a property document with the required metadata.", $labelFont, $copyBrush, 100, 300)
$g.DrawString("Registrar and Admin upload original reference documents, while Buyer and Seller", $labelFont, $copyBrush, 100, 338)
$g.DrawString("upload submitted copies for verification against the registrar original.", $labelFont, $copyBrush, 100, 376)

$g.FillRectangle($cardBrush, 820, 170, 720, 740)
$g.DrawRectangle($borderPen2, 820, 170, 720, 740)
$g.DrawString("Document Submission Form", $bigFont, $heroBrush, 870, 210)
$g.DrawString("All fields marked below are mandatory", $hintFont, $hintDarkBrush, 870, 255)

function Draw-Field {
    param(
        [System.Drawing.Graphics]$Graphics,
        [string]$Label,
        [string]$Placeholder,
        [ref]$YRef
    )
    $y = $YRef.Value
    $Graphics.DrawString($Label, $fieldFont, $fieldLabelBrush, 870, $y)
    $y += 35
    $Graphics.FillRectangle($fieldBrush, 870, $y, 580, 62)
    $Graphics.DrawRectangle($fieldPen, 870, $y, 580, 62)
    $Graphics.DrawString($Placeholder, $hintFont, $fieldPlaceholderBrush, 892, ($y + 18))
    $YRef.Value = $y + 92
}

$yRef = [ref]320
Draw-Field -Graphics $g -Label "Document Title" -Placeholder "Sale Deed / Lease Agreement / Other" -YRef $yRef
Draw-Field -Graphics $g -Label "Property Title" -Placeholder "Green Park Villa / Lake View Plot / Apartment Name" -YRef $yRef
Draw-Field -Graphics $g -Label "Property ID" -Placeholder "PROP-TN-1001" -YRef $yRef
Draw-Field -Graphics $g -Label "File Upload" -Placeholder "Choose PDF, PNG, JPG or JPEG file" -YRef $yRef

$fieldY = $yRef.Value + 6
$g.FillRectangle($accentBrush, 870, $fieldY, 580, 82)
$g.DrawRectangle($accentPen, 870, $fieldY, 580, 82)
$g.DrawString("This interface changes by role:", $fieldFont, $roleBrush, 892, ($fieldY + 14))
$g.DrawString("Admin/Registrar = Original reference upload | Buyer/Seller = Copy upload", $hintFont, $roleTextBrush, 892, ($fieldY + 44))

$g.FillRectangle($buttonBrush, 870, 820, 240, 70)
$g.DrawString("Upload Document", $buttonFont, $whiteBrush, 918, 838)
$g.DrawString("Required: Document title, property title, property ID, and file.", $hintFont, $footerBrush, 870, 920)

Save-Bitmap -Bitmap $bmp -Path (Join-Path $out "figure_1_upload_interface.png")
$g.Dispose()

Save-DocumentFigure `
    -SourcePath (Join-Path $root "sample-documents\genuine\genuine_01_sale_deed_arjun_priya.png") `
    -OutputPath (Join-Path $out "figure_5_original_uploaded_document.png") `
    -Title "Figure 5 - Original Uploaded Document" `
    -Subtitle "Raw document image uploaded into the verification workflow before any preprocessing." `
    -Mode "original"

Save-DocumentFigure `
    -SourcePath (Join-Path $root "sample-documents\genuine\genuine_01_sale_deed_arjun_priya.png") `
    -OutputPath (Join-Path $out "figure_6_grayscale_document_image.png") `
    -Title "Figure 6 - Grayscale Document Image" `
    -Subtitle "The uploaded document converted to grayscale to improve OCR and analysis." `
    -Mode "grayscale"

Save-DocumentFigure `
    -SourcePath (Join-Path $root "sample-documents\genuine\genuine_01_sale_deed_arjun_priya.png") `
    -OutputPath (Join-Path $out "figure_7_preprocessed_output_image.png") `
    -Title "Figure 7 - Preprocessed Output Image" `
    -Subtitle "Thresholded preprocessing output prepared for OCR and tamper analysis." `
    -Mode "preprocessed"

Write-Host "Created screenshots in $out"
