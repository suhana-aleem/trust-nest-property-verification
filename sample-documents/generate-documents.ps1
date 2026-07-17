Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$genuineDir = Join-Path $root "genuine"
$fakeDir = Join-Path $root "fake"
$pdfDir = Join-Path $root "pdf"

New-Item -ItemType Directory -Force -Path $genuineDir | Out-Null
New-Item -ItemType Directory -Force -Path $fakeDir | Out-Null
New-Item -ItemType Directory -Force -Path $pdfDir | Out-Null

$manifestRows = @()
$demoRows = @()

function New-PropertyDocumentImage {
  param(
    [string]$OutputPath,
    [string]$Title,
    [string[]]$Lines,
    [string]$Footer,
    [string]$StampText = "VERIFIED COPY",
    [string]$StampColor = "DarkGreen"
  )

  $bmp = New-Object System.Drawing.Bitmap 1600, 1100
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.Color]::WhiteSmoke)

  $titleFont = New-Object System.Drawing.Font("Georgia", 26, [System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font("Georgia", 16, [System.Drawing.FontStyle]::Regular)
  $smallFont = New-Object System.Drawing.Font("Arial", 13, [System.Drawing.FontStyle]::Italic)
  $stampFont = New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Bold)

  $blackBrush = [System.Drawing.Brushes]::Black
  $grayBrush = [System.Drawing.Brushes]::DimGray
  $stampBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromName($StampColor))
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::DarkSlateGray, 2)

  $graphics.DrawRectangle($pen, 40, 40, 1520, 1020)
  $graphics.DrawString("PROPERTY RECORD OFFICE", $smallFont, $grayBrush, 70, 70)
  $graphics.DrawString($Title, $titleFont, $blackBrush, 70, 120)
  $graphics.DrawLine($pen, 70, 175, 1520, 175)

  $y = 220
  foreach ($line in $Lines) {
    $graphics.DrawString($line, $bodyFont, $blackBrush, 90, $y)
    $y += 58
  }

  $graphics.DrawLine($pen, 90, 900, 530, 900)
  $graphics.DrawString("Seller Signature", $smallFont, $grayBrush, 160, 910)

  $graphics.DrawLine($pen, 1030, 900, 1470, 900)
  $graphics.DrawString("Buyer Signature", $smallFont, $grayBrush, 1105, 910)

  $graphics.DrawString($Footer, $smallFont, $grayBrush, 90, 980)
  $graphics.TranslateTransform(1230, 320)
  $graphics.RotateTransform(-18)
  $graphics.DrawString($StampText, $stampFont, $stampBrush, 0, 0)
  $graphics.ResetTransform()

  $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $stampBrush.Dispose()
  $pen.Dispose()
  $titleFont.Dispose()
  $bodyFont.Dispose()
  $smallFont.Dispose()
  $stampFont.Dispose()
  $graphics.Dispose()
  $bmp.Dispose()
}

$documents = @(
  @{
    FileName = "genuine_01_sale_deed_arjun_priya.png"
    Class = "genuine"
    Reason = "Consistent names, property ID, and registered amount."
    Title = "SALE DEED"
    Footer = "Registrar Office Ref: REG-2026-0518-01"
    Lines = @(
      "Document Type: Registered Sale Deed",
      "Seller Name: Arjun Mehta",
      "Buyer Name: Priya Nair",
      "Property ID: PROP-TN-1001",
      "Survey Number: 44/2B",
      "Property Address: 12 Lake View Road, Chennai",
      "Sale Amount: INR 58,00,000",
      "Date of Execution: 08 April 2026",
      "Witness 1: Karan Das",
      "Witness 2: Lavanya Iyer"
    )
  },
  @{
    FileName = "genuine_02_lease_agreement_ravi_maya.png"
    Class = "genuine"
    Reason = "Clean lease document with matching tenant and owner information."
    Title = "LEASE AGREEMENT"
    Footer = "Municipal Lease Archive Ref: LEASE-2026-014"
    Lines = @(
      "Document Type: Residential Lease Agreement",
      "Owner Name: Ravi Menon",
      "Tenant Name: Maya Joseph",
      "Property ID: PROP-KL-2045",
      "Lease Term: 11 Months",
      "Monthly Rent: INR 22,000",
      "Security Deposit: INR 66,000",
      "Property Address: 18 Green Park, Kochi",
      "Date of Agreement: 14 March 2026",
      "Registration Status: Completed"
    )
  },
  @{
    FileName = "genuine_03_gift_deed_sunita_amit.png"
    Class = "genuine"
    Reason = "Gift deed with consistent donor, donee, and parcel references."
    Title = "GIFT DEED"
    Footer = "District Record Reference: GIFT-2026-031"
    Lines = @(
      "Document Type: Registered Gift Deed",
      "Donor Name: Sunita Rao",
      "Donee Name: Amit Rao",
      "Property ID: PROP-KA-3310",
      "Plot Area: 1800 sq.ft.",
      "Property Address: 55 Temple Street, Mysuru",
      "Relationship: Mother to Son",
      "Date of Registration: 02 February 2026",
      "Sub-Registrar Office: Mysuru South",
      "Encumbrance Status: Nil"
    )
  },
  @{
    FileName = "genuine_04_property_tax_receipt_harish.png"
    Class = "genuine"
    Reason = "Tax receipt with valid assessment and payment details."
    Title = "PROPERTY TAX RECEIPT"
    Footer = "City Corporation Receipt No: TAX-2026-8821"
    Lines = @(
      "Document Type: Annual Property Tax Receipt",
      "Owner Name: Harish Patel",
      "Property ID: PROP-GJ-4452",
      "Assessment Number: AMC-2026-4452",
      "Financial Year: 2025-2026",
      "Tax Amount Paid: INR 18,450",
      "Property Address: 90 Riverfront Lane, Ahmedabad",
      "Date of Payment: 29 January 2026",
      "Payment Mode: Online Banking",
      "Status: Paid in Full"
    )
  },
  @{
    FileName = "genuine_05_encumbrance_certificate_neha.png"
    Class = "genuine"
    Reason = "Encumbrance certificate with no conflicting entries."
    Title = "ENCUMBRANCE CERTIFICATE"
    Footer = "EC Search Ref: EC-2026-077"
    Lines = @(
      "Document Type: Encumbrance Certificate",
      "Applicant Name: Neha Sharma",
      "Property ID: PROP-DL-5109",
      "Search Period: 01 January 2015 to 31 December 2025",
      "Property Address: 7 Ashoka Enclave, New Delhi",
      "Encumbrance Status: No Registered Liability Found",
      "Sub-Registrar Office: Delhi Central",
      "Date of Issue: 11 April 2026",
      "Certified By: Records Division Officer",
      "Digital Reference: ECREF-5109-APR26"
    )
  },
  @{
    FileName = "fake_01_sale_deed_owner_mismatch.png"
    Class = "fake"
    Reason = "Seller name conflicts with owner declaration at the bottom."
    Title = "SALE DEED"
    Footer = "Owner Declaration: Document submitted by Mahesh Nair"
    StampText = "SUSPICIOUS COPY"
    StampColor = "Firebrick"
    Lines = @(
      "Document Type: Registered Sale Deed",
      "Seller Name: Arjun Mehta",
      "Buyer Name: Priya Nair",
      "Property ID: PROP-TN-1001",
      "Survey Number: 44/2B",
      "Property Address: 12 Lake View Road, Chennai",
      "Sale Amount: INR 58,00,000",
      "Date of Execution: 08 April 2026",
      "Witness 1: Karan Das",
      "Witness 2: Lavanya Iyer"
    )
  },
  @{
    FileName = "fake_02_property_id_conflict.png"
    Class = "fake"
    Reason = "Property ID and municipal assessment number do not match."
    Title = "PROPERTY TAX RECEIPT"
    Footer = "City Corporation Receipt No: TAX-2026-8821"
    StampText = "ID CONFLICT"
    StampColor = "Crimson"
    Lines = @(
      "Document Type: Annual Property Tax Receipt",
      "Owner Name: Harish Patel",
      "Property ID: PROP-GJ-4452",
      "Assessment Number: AMC-2026-9918",
      "Financial Year: 2025-2026",
      "Tax Amount Paid: INR 18,450",
      "Property Address: 90 Riverfront Lane, Ahmedabad",
      "Date of Payment: 29 January 2026",
      "Payment Mode: Online Banking",
      "Status: Paid in Full"
    )
  },
  @{
    FileName = "fake_03_overwritten_sale_amount.png"
    Class = "fake"
    Reason = "Sale amount line shows a suspicious overwritten figure."
    Title = "SALE DEED"
    Footer = "Registrar Office Ref: REG-2026-0518-22"
    StampText = "AMOUNT ALTERED"
    StampColor = "DarkRed"
    Lines = @(
      "Document Type: Registered Sale Deed",
      "Seller Name: Imran Khan",
      "Buyer Name: Nisha Verma",
      "Property ID: PROP-MH-2207",
      "Survey Number: 109/4A",
      "Property Address: 44 Palm Residency, Pune",
      "Sale Amount: INR 48,00,000   ->   INR 84,00,000",
      "Date of Execution: 17 March 2026",
      "Witness 1: Ritu Sen",
      "Witness 2: Manoj Kale"
    )
  },
  @{
    FileName = "fake_04_missing_registration_status.png"
    Class = "fake"
    Reason = "Lease document claims registration but shows status pending."
    Title = "LEASE AGREEMENT"
    Footer = "Municipal Lease Archive Ref: LEASE-2026-055"
    StampText = "UNVERIFIED"
    StampColor = "DarkOrange"
    Lines = @(
      "Document Type: Residential Lease Agreement",
      "Owner Name: Ravi Menon",
      "Tenant Name: Maya Joseph",
      "Property ID: PROP-KL-2045",
      "Lease Term: 11 Months",
      "Monthly Rent: INR 22,000",
      "Security Deposit: INR 66,000",
      "Property Address: 18 Green Park, Kochi",
      "Date of Agreement: 14 March 2026",
      "Registration Status: Pending but stamped as Completed"
    )
  },
  @{
    FileName = "fake_05_encumbrance_liability_hidden.png"
    Class = "fake"
    Reason = "Encumbrance section contradicts mortgage note in the last line."
    Title = "ENCUMBRANCE CERTIFICATE"
    Footer = "Mortgage Note: Existing loan entry found under file LOAN-44A"
    StampText = "LIABILITY FOUND"
    StampColor = "Brown"
    Lines = @(
      "Document Type: Encumbrance Certificate",
      "Applicant Name: Neha Sharma",
      "Property ID: PROP-DL-5109",
      "Search Period: 01 January 2015 to 31 December 2025",
      "Property Address: 7 Ashoka Enclave, New Delhi",
      "Encumbrance Status: No Registered Liability Found",
      "Sub-Registrar Office: Delhi Central",
      "Date of Issue: 11 April 2026",
      "Certified By: Records Division Officer",
      "Digital Reference: ECREF-5109-APR26"
    )
  },
  @{
    FileName = "fake_06_date_mismatch_partition_deed.png"
    Class = "fake"
    Reason = "Execution date conflicts with footer registry reference date."
    Title = "PARTITION DEED"
    Footer = "Registry Footer Date: 03 January 2026"
    StampText = "DATE MISMATCH"
    StampColor = "Maroon"
    Lines = @(
      "Document Type: Registered Partition Deed",
      "Primary Holder: Venkatesh Rao",
      "Co-owner: Charu Rao",
      "Property ID: PROP-AP-7011",
      "Partition Share: East Wing - 50%",
      "Property Address: 19 Lotus Colony, Vijayawada",
      "Execution Date: 30 March 2026",
      "Survey Record: 88/1C",
      "Witness 1: Prakash Teja",
      "Witness 2: Keerthi Rao"
    )
  },
  @{
    FileName = "fake_07_area_value_mismatch.png"
    Class = "fake"
    Reason = "Property area is too small for the declared valuation and category."
    Title = "VALUATION CERTIFICATE"
    Footer = "Municipal Category: Premium Villa Plot"
    StampText = "VALUE ANOMALY"
    StampColor = "DarkRed"
    Lines = @(
      "Document Type: Market Valuation Certificate",
      "Owner Name: Suresh Babu",
      "Property ID: PROP-TS-6114",
      "Plot Area: 220 sq.ft.",
      "Declared Value: INR 2,40,00,000",
      "Property Address: 8 Hill Crest, Hyderabad",
      "Survey Number: 140/9B",
      "Valuation Date: 05 May 2026",
      "Valuer Name: K. Srinath",
      "Risk Flag: None"
    )
  },
  @{
    FileName = "fake_08_signature_panel_missing.png"
    Class = "fake"
    Reason = "Signature line is present for seller but buyer confirmation text says signature unavailable."
    Title = "SALE AGREEMENT"
    Footer = "Buyer Confirmation: Signature unavailable at verification scan"
    StampText = "SIGNATURE GAP"
    StampColor = "IndianRed"
    Lines = @(
      "Document Type: Sale Agreement",
      "Seller Name: Joseph Mathew",
      "Buyer Name: Leena Das",
      "Property ID: PROP-KL-8891",
      "Property Address: 41 Sea Breeze Avenue, Kozhikode",
      "Advance Amount: INR 7,50,000",
      "Balance Amount: INR 42,50,000",
      "Agreement Date: 21 April 2026",
      "Witness 1: Dinesh Varma",
      "Witness 2: Sajin Thomas"
    )
  },
  @{
    FileName = "fake_09_duplicate_registry_reference.png"
    Class = "fake"
    Reason = "Footer registry reference duplicates another known document identifier."
    Title = "SALE DEED"
    Footer = "Registrar Office Ref: REG-2026-0518-01"
    StampText = "DUPLICATE REF"
    StampColor = "Brown"
    Lines = @(
      "Document Type: Registered Sale Deed",
      "Seller Name: Farah Ali",
      "Buyer Name: Nikhil Jain",
      "Property ID: PROP-RJ-3327",
      "Survey Number: 15/6D",
      "Property Address: 63 Garden Square, Jaipur",
      "Sale Amount: INR 76,00,000",
      "Date of Execution: 12 April 2026",
      "Witness 1: Harsh Vardhan",
      "Witness 2: Pooja Sethi"
    )
  },
  @{
    FileName = "fake_10_buyer_name_variation.png"
    Class = "fake"
    Reason = "Buyer name in body differs from footer confirmation line."
    Title = "LEASE AGREEMENT"
    Footer = "Tenant Confirmation: Maya Joesph verified the document"
    StampText = "NAME VARIATION"
    StampColor = "Chocolate"
    Lines = @(
      "Document Type: Residential Lease Agreement",
      "Owner Name: Ravi Menon",
      "Tenant Name: Maya Joseph",
      "Property ID: PROP-KL-2045",
      "Lease Term: 11 Months",
      "Monthly Rent: INR 22,000",
      "Security Deposit: INR 66,000",
      "Property Address: 18 Green Park, Kochi",
      "Date of Agreement: 14 March 2026",
      "Registration Status: Completed"
    )
  }
)

foreach ($doc in $documents) {
  $targetDir = if ($doc.Class -eq "genuine") { $genuineDir } else { $fakeDir }
  $outputPath = Join-Path $targetDir $doc.FileName
  $stampText = if ($doc.ContainsKey("StampText")) { $doc.StampText } else { "VERIFIED COPY" }
  $stampColor = if ($doc.ContainsKey("StampColor")) { $doc.StampColor } else { "DarkGreen" }

  New-PropertyDocumentImage `
    -OutputPath $outputPath `
    -Title $doc.Title `
    -Lines $doc.Lines `
    -Footer $doc.Footer `
    -StampText $stampText `
    -StampColor $stampColor

  $manifestRows += [PSCustomObject]@{
    file_name = $doc.FileName
    class = $doc.Class
    reason = $doc.Reason
    title = $doc.Title
    pdf_version = if ($doc.FileName -match "^(genuine_0[1-5]|fake_0[1-5])_") { [System.IO.Path]::ChangeExtension($doc.FileName, ".pdf") } else { "" }
  }

  $demoRows += [PSCustomObject]@{
    file_name = $doc.FileName
    category = $doc.Class.ToUpper()
    explanation = $doc.Reason
    demo_note = if ($doc.Class -eq "genuine") {
      "Explain that the names, property identifiers, and closing reference are internally consistent, so this is expected to behave like a genuine upload."
    } else {
      "Explain the contradiction or anomaly shown in this file and say the AI/OCR + human review should flag it as suspicious during verification."
    }
  }
}

$manifestPath = Join-Path $root "manifest.csv"
$manifestRows | Export-Csv -Path $manifestPath -NoTypeInformation

$readmePath = Join-Path $root "README.md"
@"
# Sample Property Documents

This folder contains upload-ready sample property documents for TRUST NEST.

- `genuine/` contains 5 consistent sample documents
- `fake/` contains 10 intentionally suspicious documents
- `pdf/` contains PDF versions of the original 10 files
- `manifest.csv` lists the class and reason for each file
- `VIVA_DEMO_SHEET.md` gives a one-line explanation for each file during demo

Recommended use:

1. Upload genuine and fake samples as Buyer/Seller
2. Run AI verification
3. Use the files in `fake/` to explain mismatch or tampering scenarios during demo
"@ | Set-Content -Path $readmePath

$demoSheetPath = Join-Path $root "VIVA_DEMO_SHEET.md"
$demoLines = @(
  "# Viva Demo Sheet",
  "",
  "Use this as a quick explanation guide while uploading each file in TRUST NEST.",
  ""
)

foreach ($row in $demoRows) {
  $demoLines += "## $($row.file_name)"
  $demoLines += "- Category: $($row.category)"
  $demoLines += "- Why it is classified this way: $($row.explanation)"
  $demoLines += "- What to say in viva: $($row.demo_note)"
  $demoLines += ""
}

$demoLines | Set-Content -Path $demoSheetPath

Write-Output "Generated sample documents in $root"
