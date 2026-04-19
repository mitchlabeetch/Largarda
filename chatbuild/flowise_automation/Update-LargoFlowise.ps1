[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$ApiKey
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-FlowiseJson {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('GET', 'POST', 'PUT', 'DELETE')]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter()]
        $Body
    )

    $headers = @{
        Authorization = "Bearer $ApiKey"
    }

    $uri = '{0}{1}' -f $BaseUrl.TrimEnd('/'), $Path

    if ($null -eq $Body) {
        return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
    }

    $jsonBody = $Body | ConvertTo-Json -Depth 100 -Compress
    $headers['Content-Type'] = 'application/json'

    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $jsonBody
}

function Get-JsonMultipartUploadResponse {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [hashtable]$Fields,

        [Parameter(Mandatory = $true)]
        [string]$FilePath
    )

    $client = New-Object System.Net.Http.HttpClient
    $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $ApiKey)

    $content = New-Object System.Net.Http.MultipartFormDataContent

    foreach ($key in $Fields.Keys) {
        $stringContent = New-Object System.Net.Http.StringContent([string]$Fields[$key])
        [void]$content.Add($stringContent, $key)
    }

    $fileStream = [System.IO.File]::OpenRead($FilePath)
    try {
        $fileContent = New-Object System.Net.Http.StreamContent($fileStream)
        $fileContent.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue('application/json')
        [void]$content.Add($fileContent, 'files', [System.IO.Path]::GetFileName($FilePath))

        $uri = '{0}{1}' -f $BaseUrl.TrimEnd('/'), $Path
        $response = $client.PostAsync($uri, $content).GetAwaiter().GetResult()
        $raw = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()

        if (-not $response.IsSuccessStatusCode) {
            throw "Multipart upload failed: $($response.StatusCode) $raw"
        }

        if ([string]::IsNullOrWhiteSpace($raw)) {
            return $null
        }

        return $raw | ConvertFrom-Json
    }
    finally {
        $fileStream.Dispose()
        $client.Dispose()
    }
}

function Get-AssistantSystemMessage {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    switch ($Name) {
        'Largo Core v1 Draft' {
            return @'
Tu es Largo, le partenaire de travail de Christophe Berthon pour Alecia M&A.

Mission:
- aider Christophe sur les sujets M&A France small-mid cap
- utiliser en priorité les outils et la base de connaissances disponibles
- produire des réponses concrètes, structurées, exploitables
- retenir les préférences de Christophe et les éléments durables des dossiers

Règles de communication:
- avec Christophe: tutoiement, ton jovial, naturel, audacieux mais jamais lourd
- avec les tiers: style professionnel, rigoureux, vouvoiement
- pas de jargon technique inutile
- ne jamais inventer une donnée; si un doute existe, le dire et lancer la recherche adaptée

Priorités métier:
- recherche d'entreprises françaises
- qualification et enrichissement M&A
- analyse documentaire
- préparation de synthèses, mémos, decks et livrables
- suivi des deals, risques, points ouverts et prochaines actions

Mémoire:
- sauvegarde activement les préférences stables de Christophe
- garde la continuité des dossiers
- distingue faits confirmés, hypothèses et recommandations

Méthode:
1. comprendre l'intention
2. décider s'il faut répondre directement, chercher dans le web, calculer, scraper, ou raisonner étape par étape
3. donner une réponse claire avec prochaines actions utiles

Terminologie:
- privilégier EBE, CA, résultat net, capitaux propres, dettes
- rester ancré dans le contexte M&A français
'@
        }
        'Largo Research v1 Draft' {
            return @'
Tu es Largo Research, la variante spécialisée de Largo pour la recherche d'entreprises, la veille M&A et l'analyse de marché.

Mission:
- rechercher des entreprises françaises par nom, SIREN, SIRET ou secteur
- consolider les signaux utiles pour une lecture M&A
- comparer, sourcer et résumer les informations sans extrapoler

Comportement:
- priorité aux données vérifiables
- cite ou mentionne les sources exploitées
- distingue clairement données, interprétation et recommandation
- si l'information n'est pas confirmée, le dire explicitement

Style:
- en échange interne avec Christophe: tutoiement naturel
- format de sortie privilégié: synthèse courte, points clés, risques, opportunités, prochaines vérifications
'@
        }
        'Largo Documents v1 Draft' {
            return @'
Tu es Largo Documents, la variante spécialisée de Largo pour l'analyse documentaire et la préparation de livrables M&A.

Mission:
- lire, structurer et synthétiser des documents
- extraire les éléments utiles à une opération M&A
- préparer des bases de livrables comme teaser, profil, note, synthèse ou trame de deck

Comportement:
- aller à l'essentiel
- signaler ce qui manque dans un document
- séparer faits documentés, points à confirmer et risques
- adopter une structure qui peut être réutilisée dans un livrable client

Style:
- précis, professionnel, orienté action
- avec Christophe: ton direct et fluide
'@
        }
        'Largo DD v1 Draft' {
            return @'
Tu es Largo DD, la variante spécialisée de Largo pour la due diligence.

Mission:
- identifier les zones de risque financières, juridiques, opérationnelles et commerciales
- structurer une checklist de revue
- synthétiser les points d'alerte, points rassurants et demandes complémentaires

Méthode:
- classer les éléments par gravité et impact potentiel
- signaler les documents manquants
- proposer les prochaines questions à poser ou vérifications à lancer
- ne jamais présenter une conclusion ferme sans base documentaire suffisante

Format:
- synthèse exécutive
- tableau mental des risques
- actions de suivi prioritaires
'@
        }
        default {
            throw "Unknown assistant profile: $Name"
        }
    }
}

function Get-StarterPrompts {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    switch ($Name) {
        'Largo Core v1 Draft' {
            return [ordered]@{
                followUpPrompts = @{ status = $true }
                starterPrompts = [ordered]@{
                    '0' = @{ prompt = 'Recherche une entreprise française et fais-moi une lecture M&A' }
                    '1' = @{ prompt = 'Prépare une synthèse de deal et les prochaines actions' }
                    '2' = @{ prompt = 'Aide-moi à structurer un teaser ou un profil société' }
                    '3' = @{ prompt = 'Quelles sont les actualités M&A France importantes du moment ?' }
                    '4' = @{ prompt = 'Analyse ce sujet comme si tu préparais Christophe à un rendez-vous' }
                }
                fullFileUpload = @{
                    status = $true
                    allowedUploadFileTypes = 'text/css,text/csv,text/html,application/json,text/markdown,application/x-yaml,application/pdf,application/sql,text/plain,application/xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation'
                    pdfFile = @{
                        usage = 'perPage'
                        legacyBuild = $false
                    }
                }
            }
        }
        'Largo Research v1 Draft' {
            return [ordered]@{
                followUpPrompts = @{ status = $true }
                starterPrompts = [ordered]@{
                    '0' = @{ prompt = 'Recherche une entreprise par nom ou SIREN' }
                    '1' = @{ prompt = 'Fais une veille M&A sur un secteur en France' }
                    '2' = @{ prompt = 'Trouve des comparables utiles pour une valorisation' }
                    '3' = @{ prompt = 'Résume les actualités récentes sur une cible' }
                }
            }
        }
        'Largo Documents v1 Draft' {
            return [ordered]@{
                followUpPrompts = @{ status = $true }
                starterPrompts = [ordered]@{
                    '0' = @{ prompt = 'Résume ce document pour Christophe' }
                    '1' = @{ prompt = 'Extrais les points de risque et les éléments manquants' }
                    '2' = @{ prompt = 'Transforme ce contenu en base de teaser ou de note' }
                    '3' = @{ prompt = 'Prépare une synthèse client claire et concise' }
                }
                fullFileUpload = @{
                    status = $true
                    allowedUploadFileTypes = 'text/csv,application/json,text/markdown,application/pdf,text/plain,application/xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation'
                    pdfFile = @{
                        usage = 'perPage'
                        legacyBuild = $false
                    }
                }
            }
        }
        'Largo DD v1 Draft' {
            return [ordered]@{
                followUpPrompts = @{ status = $true }
                starterPrompts = [ordered]@{
                    '0' = @{ prompt = 'Fais une première lecture due diligence de ce dossier' }
                    '1' = @{ prompt = 'Liste les risques majeurs et les documents manquants' }
                    '2' = @{ prompt = 'Prépare une checklist DD structurée' }
                    '3' = @{ prompt = 'Classe les points par criticité et impact' }
                }
                fullFileUpload = @{
                    status = $true
                    allowedUploadFileTypes = 'text/csv,application/json,text/markdown,application/pdf,text/plain,application/xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation'
                    pdfFile = @{
                        usage = 'perPage'
                        legacyBuild = $false
                    }
                }
            }
        }
        default {
            throw "Unknown assistant profile: $Name"
        }
    }
}

function Set-ToolAgentSystemMessage {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FlowData,

        [Parameter(Mandatory = $true)]
        [string]$SystemMessage
    )

    $flow = $FlowData | ConvertFrom-Json
    $toolAgentNode = $flow.nodes | Where-Object { $_.data.name -eq 'toolAgent' } | Select-Object -First 1

    if ($null -eq $toolAgentNode) {
        throw 'Tool Agent node not found in assistant flowData'
    }

    $toolAgentNode.data.inputs.systemMessage = $SystemMessage
    return ($flow | ConvertTo-Json -Depth 100 -Compress)
}

function New-OrUpdateAssistant {
    param(
        [Parameter(Mandatory = $true)]
        $BaseAssistant,

        [Parameter(Mandatory = $true)]
        [string]$TargetName,

        [Parameter(Mandatory = $true)]
        [array]$ExistingChatflows
    )

    $payload = [ordered]@{
        name = $TargetName
        flowData = (Set-ToolAgentSystemMessage -FlowData $BaseAssistant.flowData -SystemMessage (Get-AssistantSystemMessage -Name $TargetName))
        deployed = $false
        isPublic = $false
        apikeyid = ''
        chatbotConfig = ((Get-StarterPrompts -Name $TargetName) | ConvertTo-Json -Compress -Depth 20)
        apiConfig = $BaseAssistant.apiConfig
        analytic = $BaseAssistant.analytic
        speechToText = $BaseAssistant.speechToText
        textToSpeech = $BaseAssistant.textToSpeech
        followUpPrompts = $BaseAssistant.followUpPrompts
        category = $BaseAssistant.category
        type = 'ASSISTANT'
        workspaceId = $BaseAssistant.workspaceId
    }

    $existing = $ExistingChatflows | Where-Object { $_.name -eq $TargetName } | Select-Object -First 1
    if ($null -ne $existing) {
        Write-Host "Updating assistant: $TargetName ($($existing.id))"
        [void](Invoke-FlowiseJson -Method PUT -Path "/api/v1/chatflows/$($existing.id)" -Body $payload)
        return $existing.id
    }

    Write-Host "Creating assistant: $TargetName"
    $created = Invoke-FlowiseJson -Method POST -Path '/api/v1/chatflows' -Body $payload
    return $created.id
}

function New-KbDocumentJson {
    param(
        [Parameter(Mandatory = $true)]
        [string]$OutputPath
    )

    $kbRoot = Join-Path $PSScriptRoot '..\architecture_repos\largobase-main\largo_v2_knowledge_base'
    $docsToLoad = @(
        'SOUL.md',
        'IDENTITY.md',
        'USER.md',
        'WORKFLOWS.md',
        'MEMORY.md',
        'API_REFERENCE.md',
        'FLOWISE_IMPLEMENTATION.md',
        'flowise_kb\prompts\SYSTEM_PROMPT.md'
    )

    $records = New-Object System.Collections.Generic.List[object]

    foreach ($relativePath in $docsToLoad) {
        $fullPath = [System.IO.Path]::GetFullPath((Join-Path $kbRoot $relativePath))
        if (-not (Test-Path $fullPath)) {
            throw "KB source file not found: $fullPath"
        }

        $records.Add([ordered]@{
            title = [System.IO.Path]::GetFileNameWithoutExtension($fullPath)
            source = $relativePath.Replace('\', '/')
            category = 'largo_local_docs'
            content = (Get-Content -Path $fullPath -Raw)
        })
    }

    $json = $records | ConvertTo-Json -Depth 20
    $dir = Split-Path -Parent $OutputPath
    if (-not (Test-Path $dir)) {
        [void](New-Item -ItemType Directory -Path $dir)
    }
    Set-Content -Path $OutputPath -Value $json -Encoding UTF8
}

Write-Host 'Fetching current Flowise inventory...'
$chatflowsResponse = Invoke-FlowiseJson -Method GET -Path '/api/v1/chatflows'
$chatflows = @($chatflowsResponse | ForEach-Object { $_ })
$baseAssistant = Invoke-FlowiseJson -Method GET -Path '/api/v1/chatflows/2ab0be12-f65c-4c0e-8f4d-7dd36fa599e2'
$docStore = Invoke-FlowiseJson -Method GET -Path '/api/v1/document-store/store/21a729a2-f1af-4aa0-a8a7-b336cac749e8'

$assistantNames = @(
    'Largo Core v1 Draft',
    'Largo Research v1 Draft',
    'Largo Documents v1 Draft',
    'Largo DD v1 Draft'
)

$createdOrUpdated = [ordered]@{}
foreach ($assistantName in $assistantNames) {
    $createdOrUpdated[$assistantName] = New-OrUpdateAssistant -BaseAssistant $baseAssistant -TargetName $assistantName -ExistingChatflows $chatflows
}

$outputDir = Join-Path $PSScriptRoot 'output'
$kbJsonPath = Join-Path $outputDir 'largo_local_kb.json'
Write-Host "Building local KB payload: $kbJsonPath"
New-KbDocumentJson -OutputPath $kbJsonPath

$jsonLoader = $docStore.loaders | Where-Object { $_.loaderId -eq 'jsonFile' -and $_.loaderName -eq 'Config' } | Select-Object -First 1
if ($null -eq $jsonLoader) {
    throw 'Could not find the base jsonFile loader in Largo Knowledge Base'
}

$existingLocalLoader = $docStore.loaders | Where-Object {
    $_.loaderId -eq 'jsonFile' -and $_.source -like '*largo_local_kb.json*'
} | Select-Object -First 1

$uploadFields = [ordered]@{}
if ($null -ne $existingLocalLoader) {
    Write-Host "Refreshing existing KB loader: $($existingLocalLoader.id)"
    $uploadFields['docId'] = $existingLocalLoader.id
    $uploadFields['replaceExisting'] = 'true'
}
else {
    Write-Host "Creating new KB loader from base json loader: $($jsonLoader.id)"
    $uploadFields['docId'] = $jsonLoader.id
}

$uploadResult = Get-JsonMultipartUploadResponse `
    -Path '/api/v1/document-store/upsert/21a729a2-f1af-4aa0-a8a7-b336cac749e8' `
    -Fields $uploadFields `
    -FilePath $kbJsonPath

$finalChatflows = @(Invoke-FlowiseJson -Method GET -Path '/api/v1/chatflows')
$finalDocStore = Invoke-FlowiseJson -Method GET -Path '/api/v1/document-store/store/21a729a2-f1af-4aa0-a8a7-b336cac749e8'

Write-Host ''
Write-Host 'Assistants ready:'
foreach ($assistantName in $assistantNames) {
    $match = $finalChatflows | Where-Object { $_.name -eq $assistantName } | Select-Object -First 1
    if ($null -ne $match) {
        Write-Host "- $assistantName :: $($match.id) :: $($match.type)"
    }
}

$localLoader = $finalDocStore.loaders | Where-Object { $_.source -like '*largo_local_kb.json*' } | Select-Object -First 1
Write-Host ''
Write-Host 'Knowledge base loader:'
if ($null -ne $localLoader) {
    Write-Host "- loaderId=$($localLoader.id) chunks=$($localLoader.totalChunks) chars=$($localLoader.totalChars) status=$($localLoader.status)"
}
else {
    Write-Host '- local KB loader not found after upload'
}

if ($null -ne $uploadResult) {
    Write-Host ''
    Write-Host 'Upload response:'
    $uploadResult | ConvertTo-Json -Depth 20
}
