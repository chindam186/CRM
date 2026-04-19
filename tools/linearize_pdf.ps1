param(
    [string]$input = "PDF",
    [string]$outputSuffix = ".linearized.pdf",
    [int]$parallel = 1
)

function Run-Linearize($inFile, $outFile) {
    Write-Host "Linearizing:`n  $inFile -> $outFile"
    $qpdf = Get-Command qpdf -ErrorAction SilentlyContinue
    if (-not $qpdf) {
        Write-Error "qpdf not found. Install qpdf and ensure it's on PATH: https://qpdf.sourceforge.io/"
        return 1
    }
    & qpdf --linearize "$inFile" "$outFile"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "qpdf failed for $inFile"
        return 1
    }
    Write-Host "Done: $outFile"
    return 0
}

if (Test-Path $input -PathType Container) {
    $files = Get-ChildItem -Path $input -Filter *.pdf | Sort-Object Name
    foreach ($f in $files) {
        $in = $f.FullName
        $out = Join-Path $f.DirectoryName ($f.BaseName + $outputSuffix)
        Run-Linearize $in $out
    }
} elseif (Test-Path $input -PathType Leaf) {
    $in = (Resolve-Path $input).Path
    $dir = Split-Path $in -Parent
    $base = [System.IO.Path]::GetFileNameWithoutExtension($in)
    $out = Join-Path $dir ($base + $outputSuffix)
    Run-Linearize $in $out
} else {
    Write-Error "Input path not found: $input"
    exit 1
}
