Write-Host "--- 1. Testing GET /api/health ---"
$health = Invoke-RestMethod -Uri 'http://localhost:8080/api/health'
Write-Host ($health | ConvertTo-Json)

Write-Host "`n--- 2. Testing GET /api/config ---"
$config = Invoke-RestMethod -Uri 'http://localhost:8080/api/config'
Write-Host "Supported capacities count: $($config.supportedCapacities.Count)"
Write-Host "Default timing: Hit $($config.defaultTiming.hitTimeNs)ns, Miss Penalty $($config.defaultTiming.additionalMissPenaltyNs)ns"

Write-Host "`n--- 3. Testing POST /api/simulate (Valid Request) ---"
$validBody = @{
    capacityBytes = 4096
    lineSizeBytes = 64
    mappingStrategy = "SetAssociative"
    associativity = 4
    replacementPolicy = "LRU"
    workloadType = "sequential"
    numberOfAccesses = 100
    randomSeed = 42
} | ConvertTo-Json

$simResult = Invoke-RestMethod -Uri 'http://localhost:8080/api/simulate' -Method Post -Body $validBody -ContentType 'application/json'
Write-Host "Total Accesses: $($simResult.statistics.totalAccesses)"
Write-Host "Hits: $($simResult.statistics.hits), Misses: $($simResult.statistics.misses)"
Write-Host "Hit Rate: $($simResult.statistics.hitRate)%, Miss Rate: $($simResult.statistics.missRate)%"
Write-Host "AMAT: $($simResult.statistics.amatNs) ns"
Write-Host "History Records returned: $($simResult.accessHistory.Count)"
Write-Host "First Access: $($simResult.accessHistory[0].hexAddress) (Hit: $($simResult.accessHistory[0].hit))"

Write-Host "`n--- 4. Testing POST /api/simulate (Invalid Request: capacityBytes=3000) ---"
$invalidBody = @{
    capacityBytes = 3000
    lineSizeBytes = 64
    mappingStrategy = "DirectMapped"
    workloadType = "sequential"
    numberOfAccesses = 100
} | ConvertTo-Json

try {
    $badRes = Invoke-RestMethod -Uri 'http://localhost:8080/api/simulate' -Method Post -Body $invalidBody -ContentType 'application/json'
} catch {
    Write-Host "Caught expected HTTP error: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response body: $responseBody"
}

Write-Host "`n--- 5. Testing POST /api/simulate (Invalid Request: accesses=50) ---"
$invalidAccesses = @{
    capacityBytes = 1024
    lineSizeBytes = 64
    mappingStrategy = "DirectMapped"
    workloadType = "sequential"
    numberOfAccesses = 50
} | ConvertTo-Json

try {
    $badRes2 = Invoke-RestMethod -Uri 'http://localhost:8080/api/simulate' -Method Post -Body $invalidAccesses -ContentType 'application/json'
} catch {
    Write-Host "Caught expected HTTP error: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response body: $responseBody"
}
