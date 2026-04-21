<#
.SYNOPSIS
  Idempotent sync of repo-authored Flowise artefacts to a target
  Flowise instance.

.DESCRIPTION
  Reads the following repo-authored state and applies it against
  Flowise at $BaseUrl, with full dry-run support:

    * chatbuild/flowise_automation/flows/*.json
        -> POST /api/v1/chatflows  (or PUT /api/v1/chatflows/{id} if
           the flow id already exists)

    * chatbuild/flowise_automation/credentials-rename.json
        -> PUT /api/v1/credentials/{id}  (rename only; the secret
           plaintext is preserved via an empty plainDataObj merge,
           though the ciphertext is re-encrypted server-side)

    * chatbuild/flowise_automation/collections-retirement.md
        -> NOT EXECUTED by this script; it is a runbook for the
           operator (Qdrant mutations are not performed here).

  All operations are idempotent: running the script twice is a no-op
  if state is already aligned. Dry-run is the default; pass `-Apply`
  to mutate.

.PARAMETER BaseUrl
  Target Flowise base URL (e.g. https://filo.manuora.fr).

.PARAMETER ApiKey
  Flowise bearer token. MUST be a freshly-rotated service key with
  write access. The 2026-04-20 audit key has been rotated.

.PARAMETER Apply
  Apply the planned mutations. Without this flag, the script runs
  in dry-run mode and only prints what it would change.

.PARAMETER FlowsOnly / CredentialsOnly
  Narrow scope. At most one may be specified.

.EXAMPLE
  # Dry-run everything:
  pwsh ./Sync-LargoFlowise.ps1 -BaseUrl https://filo.manuora.fr -ApiKey $env:FLOWISE_KEY

.EXAMPLE
  # Apply flows only:
  pwsh ./Sync-LargoFlowise.ps1 -BaseUrl https://filo.manuora.fr -ApiKey $env:FLOWISE_KEY -FlowsOnly -Apply

.NOTES
  Related documents:
    * docs/audit/2026-04-20-backend-snapshot-findings.md
    * docs/plans/2026-04-20-backend-scaling-plan.md
    * src/common/ma/flowise/catalog.ts
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$ApiKey,

    [switch]$Apply,

    [switch]$FlowsOnly,

    [switch]$CredentialsOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($FlowsOnly -and $CredentialsOnly) {
    throw "Cannot combine -FlowsOnly and -CredentialsOnly."
}

$scriptDir = Split-Path -Parent $PSCommandPath
$flowsDir  = Join-Path $scriptDir 'flows'
$renameMap = Join-Path $scriptDir 'credentials-rename.json'

$mode = if ($Apply) { 'APPLY' } else { 'DRY-RUN' }
Write-Host "[Sync-LargoFlowise] target=$BaseUrl mode=$mode"

# ---------------------------------------------------------------------------
# Flowise HTTP helper
# ---------------------------------------------------------------------------

function Invoke-Flowise {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('GET', 'POST', 'PUT', 'PATCH', 'DELETE')]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter()]
        $Body,

        [switch]$NoThrow
    )

    $headers = @{ Authorization = "Bearer $ApiKey" }
    $uri = '{0}{1}' -f $BaseUrl.TrimEnd('/'), $Path

    try {
        if ($null -eq $Body) {
            return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
        }
        $json = $Body | ConvertTo-Json -Depth 100 -Compress
        # Force UTF-8 on the wire; Windows PowerShell 5.1 otherwise ships
        # the string as ISO-8859-1 and mangles non-ASCII (e.g. em-dash).
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $bytes -ContentType 'application/json; charset=utf-8'
    }
    catch {
        if ($NoThrow) { return $null }
        throw
    }
}

# ---------------------------------------------------------------------------
# Flow sync
# ---------------------------------------------------------------------------

function Sync-LargoFlows {
    Write-Host ""
    Write-Host "=== Flows ==="

    if (-not (Test-Path $flowsDir)) {
        Write-Host "  skipped - $flowsDir does not exist yet."
        return
    }

    $files = Get-ChildItem $flowsDir -Filter *.json
    Write-Host ("  repo has {0} flow file(s)." -f $files.Count)

    $existing = @{}
    try {
        $list = Invoke-Flowise -Method GET -Path '/api/v1/chatflows'
        foreach ($f in $list) { $existing[$f.id] = $f }
        Write-Host ("  Flowise has {0} flow(s)." -f $list.Count)
    }
    catch {
        Write-Host "  could not list flows on Flowise (auth / network issue). Aborting flow sync."
        throw
    }

    $planned = @{
        Create = @()
        Update = @()
        Skip   = @()
    }

    foreach ($file in $files) {
        $envelope = Get-Content -Raw -Path $file.FullName | ConvertFrom-Json
        $id = $envelope.id
        if ([string]::IsNullOrWhiteSpace($id)) {
            Write-Warning "  $($file.Name) has no id - skipping."
            continue
        }

        if ($existing.ContainsKey($id)) {
            # Idempotence check: compare name + flowData + category + type.
            $live = $existing[$id]
            $identical = (
                $live.name -eq $envelope.name -and
                $live.category -eq $envelope.category -and
                $live.type -eq $envelope.type -and
                $live.flowData -eq $envelope.flowData
            )
            if ($identical) {
                $planned.Skip += $envelope.name
            } else {
                $planned.Update += $envelope.name
            }
        } else {
            $planned.Create += $envelope.name
        }
    }

    Write-Host ("  plan: create={0}, update={1}, skip={2}" -f `
        $planned.Create.Count, $planned.Update.Count, $planned.Skip.Count)

    foreach ($n in $planned.Create) { Write-Host "    + $n" }
    foreach ($n in $planned.Update) { Write-Host "    ~ $n" }

    if (-not $Apply) {
        Write-Host "  (dry-run - no mutations performed)"
        return
    }

    foreach ($file in $files) {
        $envelope = Get-Content -Raw -Path $file.FullName | ConvertFrom-Json
        $id = $envelope.id
        if ([string]::IsNullOrWhiteSpace($id)) { continue }

        # Strip the Largo meta field (it is repo-side only).
        $apikeyid = if ($null -ne $envelope.apikeyid) { $envelope.apikeyid } else { '' }
        $body = [ordered]@{
            name            = $envelope.name
            flowData        = $envelope.flowData
            deployed        = $envelope.deployed
            isPublic        = $envelope.isPublic
            apikeyid        = $apikeyid
            chatbotConfig   = $envelope.chatbotConfig
            apiConfig       = $envelope.apiConfig
            analytic        = $envelope.analytic
            speechToText    = $envelope.speechToText
            followUpPrompts = $envelope.followUpPrompts
            category        = $envelope.category
            type            = $envelope.type
        }

        if ($existing.ContainsKey($id)) {
            Write-Host "    ~ PUT /api/v1/chatflows/$id  ($($envelope.name))"
            Invoke-Flowise -Method PUT -Path "/api/v1/chatflows/$id" -Body $body | Out-Null
        } else {
            # Flowise generates ids server-side on POST; send our preferred id via body.
            $body['id'] = $id
            Write-Host "    + POST /api/v1/chatflows   ($($envelope.name))"
            Invoke-Flowise -Method POST -Path '/api/v1/chatflows' -Body $body | Out-Null
        }
    }

    Write-Host "  applied."
}

# ---------------------------------------------------------------------------
# Credential rename
# ---------------------------------------------------------------------------

function Sync-LargoCredentials {
    Write-Host ""
    Write-Host "=== Credentials ==="

    if (-not (Test-Path $renameMap)) {
        Write-Host "  skipped - $renameMap does not exist."
        return
    }

    $spec = Get-Content -Raw -Path $renameMap | ConvertFrom-Json
    $renames = @($spec.renames)
    Write-Host ("  repo declares {0} rename(s)." -f $renames.Count)

    try {
        $live = Invoke-Flowise -Method GET -Path '/api/v1/credentials'
    }
    catch {
        Write-Host "  could not list credentials on Flowise. Aborting credential sync."
        throw
    }

    $planned = @{
        Rename = @()
        Skip   = @()
        Miss   = @()
    }

    foreach ($rename in $renames) {
        # Match on (currentName, credentialType) because the current pool has
        # many `Mitch`-named entries distinguished only by credentialType.
        $match = $live | Where-Object {
            $_.name -eq $rename.currentName -and $_.credentialName -eq $rename.credentialType
        }
        if (@($match).Count -eq 0) {
            # Maybe already renamed.
            $already = $live | Where-Object {
                $_.name -eq $rename.newName -and $_.credentialName -eq $rename.credentialType
            }
            if (@($already).Count -gt 0) {
                $planned.Skip += "$($rename.currentName) ($($rename.credentialType))  already `"$($rename.newName)`""
            } else {
                $planned.Miss += "$($rename.currentName) ($($rename.credentialType))"
            }
            continue
        }
        foreach ($m in @($match)) {
            $planned.Rename += [PSCustomObject]@{
                Id = $m.id
                From = $m.name
                To = $rename.newName
                Type = $rename.credentialType
            }
        }
    }

    Write-Host ("  plan: rename={0}, skip={1}, miss={2}" -f `
        $planned.Rename.Count, $planned.Skip.Count, $planned.Miss.Count)
    foreach ($r in $planned.Rename) { Write-Host "    ~ $($r.Type): '$($r.From)' -> '$($r.To)'" }
    foreach ($s in $planned.Skip)   { Write-Host "    = $s" }
    foreach ($m in $planned.Miss)   { Write-Host "    ! missing on Flowise: $m" }

    if (-not $Apply) {
        Write-Host "  (dry-run - no mutations performed)"
        return
    }

    foreach ($r in $planned.Rename) {
        Write-Host "    ~ PUT /api/v1/credentials/$($r.Id)  (name -> $($r.To))"
        # Flowise requires the full triple on credential update. Sending an
        # empty plainDataObj is a no-op merge against the existing decrypted
        # secret, i.e. the plaintext is unchanged (the ciphertext is simply
        # re-encrypted with the same payload).
        $body = [ordered]@{
            name           = $r.To
            credentialName = $r.Type
            plainDataObj   = @{}
        }
        Invoke-Flowise -Method PUT -Path "/api/v1/credentials/$($r.Id)" -Body $body | Out-Null
    }

    Write-Host "  applied."
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

try {
    # Probe ping first - fail fast if the key is invalid.
    $ping = Invoke-Flowise -Method GET -Path '/api/v1/ping' -NoThrow
    if ($null -eq $ping) {
        throw 'Ping failed - invalid key or unreachable host?'
    }
    Write-Host ("  ping ok ({0})" -f $ping)
}
catch {
    Write-Host "[Sync-LargoFlowise] FAILED to reach ${BaseUrl}: $_"
    exit 2
}

if (-not $CredentialsOnly) { Sync-LargoFlows }
if (-not $FlowsOnly)       { Sync-LargoCredentials }

Write-Host ""
Write-Host "[Sync-LargoFlowise] done."
if (-not $Apply) {
    Write-Host "       pass -Apply to execute the planned mutations."
}
