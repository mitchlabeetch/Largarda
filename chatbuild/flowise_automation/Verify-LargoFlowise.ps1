<#
.SYNOPSIS
  Read-only verifier: asserts the live Flowise state matches the
  repo-authored catalogue and credential expectations.

.DESCRIPTION
  This script performs NO mutations. It is the counterpart to
  Sync-LargoFlowise.ps1 and is intended to be run:

    * after a sync, to confirm idempotency;
    * as a regression check after rotating keys or upgrading Flowise;
    * as a smoke test in CI (exits non-zero on any drift).

  Checks performed:

    1. Ping reachability (GET /api/v1/ping, no auth).
    2. Auth sanity (GET /api/v1/chatflows, with bearer).
    3. Every Flowise flow id referenced by
       `src/common/ma/flowise/catalog.ts` MUST exist live.
    4. Every entry in `chatbuild/flowise_automation/flows/*.json`
       MUST exist live (superset or equal to the catalogue).
    5. Every rename target in `credentials-rename.json` MUST exist
       on the live credential pool under its new name; no stale
       `currentName` rows may remain.

.PARAMETER BaseUrl
  Target Flowise base URL.

.PARAMETER ApiKey
  Flowise bearer token (read-only key is sufficient).

.EXAMPLE
  pwsh ./Verify-LargoFlowise.ps1 -BaseUrl https://filo.manuora.fr -ApiKey $env:FLOWISE_KEY

.NOTES
  Exit codes:
    0 = all checks passed
    1 = drift detected (see report)
    2 = cannot reach Flowise / auth failed
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$ApiKey
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir   = Split-Path -Parent $PSCommandPath
$repoRoot    = Resolve-Path (Join-Path $scriptDir '..\..')
$catalogPath = Join-Path $repoRoot 'src\common\ma\flowise\catalog.ts'
$flowsDir    = Join-Path $scriptDir 'flows'
$renameMap   = Join-Path $scriptDir 'credentials-rename.json'

Write-Host "[Verify-LargoFlowise] target=$BaseUrl"

# ---------------------------------------------------------------------------
# HTTP helper (UTF-8 safe; mirrors Sync-LargoFlowise.ps1)
# ---------------------------------------------------------------------------

function Invoke-Flowise {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('GET')]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$Path,

        [switch]$NoThrow
    )

    $headers = @{ Authorization = "Bearer $ApiKey" }
    $uri = '{0}{1}' -f $BaseUrl.TrimEnd('/'), $Path

    try {
        return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
    }
    catch {
        if ($NoThrow) { return $null }
        throw
    }
}

# ---------------------------------------------------------------------------
# Catalogue id extraction (regex; avoids a TS parser dependency)
# ---------------------------------------------------------------------------

function Get-CatalogueIds {
    if (-not (Test-Path $catalogPath)) {
        throw "Catalogue not found at $catalogPath"
    }
    $content = Get-Content -Raw -Path $catalogPath
    # Match FlowSpec entries: a quoted flowKey followed by object body
    # containing `id: '<uuid>'`. UUID-4 shape, 36 chars with dashes.
    $uuidPattern = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    $pattern = "key:\s*'(?<key>[^']+)'[\s\S]*?id:\s*'(?<id>$uuidPattern)'"
    $regexMatches = [regex]::Matches($content, $pattern, 'IgnoreCase')
    $result = @{}
    foreach ($m in $regexMatches) {
        $result[$m.Groups['key'].Value] = $m.Groups['id'].Value
    }
    return $result
}

# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

$errors  = @()
$checked = 0

# (1) Ping
try {
    $headers = @{ Authorization = "Bearer $ApiKey" }
    $ping = Invoke-RestMethod -Method GET -Uri ($BaseUrl.TrimEnd('/') + '/api/v1/ping') -Headers $headers -ErrorAction Stop
    Write-Host ("  [{0}] ping reachable: {1}" -f ([char]0x2713), $ping)
}
catch {
    Write-Host ("[Verify-LargoFlowise] FAILED to reach ${BaseUrl}: $_")
    exit 2
}

# (2) Auth sanity + flow list
$liveFlows = Invoke-Flowise -Method GET -Path '/api/v1/chatflows' -NoThrow
if ($null -eq $liveFlows) {
    Write-Host "[Verify-LargoFlowise] FAILED to list flows (auth?)."
    exit 2
}
$liveFlowIds = @{}
foreach ($f in $liveFlows) { $liveFlowIds[$f.id] = $f }
Write-Host ("  [{0}] auth ok, {1} flows live" -f ([char]0x2713), $liveFlows.Count)

# (3) Catalogue ids
$catalogue = Get-CatalogueIds
$checked += $catalogue.Count
$missingFromCatalogue = @()
foreach ($key in $catalogue.Keys) {
    $id = $catalogue[$key]
    if (-not $liveFlowIds.ContainsKey($id)) {
        $missingFromCatalogue += "$key ($id)"
    }
}
if ($missingFromCatalogue.Count -gt 0) {
    $errors += "Catalogue ids missing on Flowise: $($missingFromCatalogue -join ', ')"
} else {
    Write-Host ("  [{0}] all {1} catalogue ids live on Flowise" -f ([char]0x2713), $catalogue.Count)
}

# (4) Repo-authored flow files
$fileFlowIds = @()
if (Test-Path $flowsDir) {
    foreach ($file in Get-ChildItem $flowsDir -Filter *.json) {
        $env = Get-Content -Raw -Path $file.FullName | ConvertFrom-Json
        if ($env.id) { $fileFlowIds += $env.id }
    }
}
$checked += $fileFlowIds.Count
$missingFromFiles = @($fileFlowIds | Where-Object { -not $liveFlowIds.ContainsKey($_) })
if ($missingFromFiles.Count -gt 0) {
    $errors += "Repo flow files missing on Flowise: $($missingFromFiles -join ', ')"
} else {
    Write-Host ("  [{0}] all {1} repo flow files live on Flowise" -f ([char]0x2713), $fileFlowIds.Count)
}

# (5) Credential renames
$liveCreds = Invoke-Flowise -Method GET -Path '/api/v1/credentials' -NoThrow
if ($null -eq $liveCreds) {
    $errors += 'Could not list credentials on Flowise.'
} elseif (Test-Path $renameMap) {
    $spec = Get-Content -Raw -Path $renameMap | ConvertFrom-Json
    $renames = @($spec.renames)
    $checked += $renames.Count
    $missingNewNames = @()
    $staleOldNames   = @()
    foreach ($r in $renames) {
        $hasNew = $liveCreds | Where-Object { $_.name -eq $r.newName -and $_.credentialName -eq $r.credentialType }
        $hasOld = $liveCreds | Where-Object { $_.name -eq $r.currentName -and $_.credentialName -eq $r.credentialType }
        if (@($hasNew).Count -eq 0) {
            $missingNewNames += "$($r.credentialType)/$($r.newName)"
        }
        if (@($hasOld).Count -gt 0) {
            $staleOldNames += "$($r.credentialType)/$($r.currentName)"
        }
    }
    if ($missingNewNames.Count -gt 0) {
        $errors += "Credentials missing new name: $($missingNewNames -join ', ')"
    }
    if ($staleOldNames.Count -gt 0) {
        $errors += "Credentials still present under old name: $($staleOldNames -join ', ')"
    }
    if ($missingNewNames.Count -eq 0 -and $staleOldNames.Count -eq 0) {
        Write-Host ("  [{0}] all {1} credential renames applied" -f ([char]0x2713), $renames.Count)
    }
}

# ---------------------------------------------------------------------------
# Verdict
# ---------------------------------------------------------------------------

Write-Host ''
if ($errors.Count -gt 0) {
    Write-Host ("[Verify-LargoFlowise] DRIFT ({0} error(s), {1} checks):" -f $errors.Count, $checked)
    foreach ($e in $errors) { Write-Host "  - $e" }
    exit 1
}

Write-Host ("[Verify-LargoFlowise] ok ({0} checks passed)" -f $checked)
exit 0
