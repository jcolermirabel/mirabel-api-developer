# API Provisioning Script
# Usage: 
#   .\testprovision.ps1 -database "dbname" [-tier 1] [-action enable|disable|newkey|tierchange|log]

param (
    [Parameter(Mandatory=$true)]
    [string]$database,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("enable", "disable", "newkey", "tierchange", "log")]
    [string]$action = "enable",
    
    [Parameter(Mandatory=$false)]
    [int]$tier = 1,
    
    [Parameter(Mandatory=$false)]
    [int]$logLimit = 10
)

# Configuration
$baseUrl = "http://localhost:3001"
$apiUrl = "$baseUrl/api/provisioning"
$toggleUrl = "$baseUrl/api/provisioning/toggle"
$logsUrl = "$baseUrl/api/provisioning/logs"
$statusUrl = "$baseUrl/api/provisioning/status"
$loginUrl = "$baseUrl/api/auth/login"
$email = "jcoler@mirabeltechnologies.com"
$password = Read-Host -Prompt "Enter your password for $email" -AsSecureString
$connectionId = "6803a52986e6dbc91b5e7098"
$userId = "6741517be060d76e29fec53e"
$hostDatabase = "AWSSQL4"

Write-Host "=== API Provisioning Tool ===" -ForegroundColor Cyan
Write-Host "Database: $database" -ForegroundColor White
Write-Host "Action: $action" -ForegroundColor White
Write-Host "Tier: $tier" -ForegroundColor White

# Authenticate
try {
    Write-Host "Authenticating to local server..." -ForegroundColor Gray
    $authBody = @{ email = $email; password = ([System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))) } | ConvertTo-Json
    $authResponse = Invoke-RestMethod -Uri $loginUrl -Method Post -ContentType "application/json" -Body $authBody
    $jwtToken = $authResponse.token
    Write-Host "Authentication successful!" -ForegroundColor Green

    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $jwtToken"
    }
} catch {
    Write-Host "Authentication failed: $_" -ForegroundColor Red
    exit 1
}

# Function to check if a service exists by name
function Test-ServiceExists {
    param (
        [string]$dbName
    )
    
    $serviceExists = $false
    $isActive = $false
    $serviceInfo = $null
    
    try {
        Write-Host "Checking service status directly..." -ForegroundColor Gray
        $serviceStatus = Invoke-RestMethod -Uri "$statusUrl/$dbName" -Method Get -ErrorAction SilentlyContinue
        
        if ($serviceStatus -and $serviceStatus.success) {
            $serviceExists = $true
            $isActive = $serviceStatus.data.isActive
            $serviceInfo = $serviceStatus.data
            
            Write-Host "Service found: $($serviceStatus.data.name)" -ForegroundColor Green
            Write-Host "Current status: $(if($isActive){'ACTIVE'}else{'INACTIVE'})" -ForegroundColor $(if($isActive){'Green'}else{'Yellow'})
        }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "Service not found for database: $dbName" -ForegroundColor Yellow
            $serviceExists = $false
        } else {
            Write-Host "Error checking service status: $_" -ForegroundColor Gray
            $serviceExists = $false
        }
    }
    
    return @{
        Exists = $serviceExists
        IsActive = $isActive
        Info = $serviceInfo
    }
}

# Handle different actions
switch ($action) {
    "log" {
        # Show activity logs for the database
        try {
            Write-Host "Fetching activity logs for database: $database" -ForegroundColor Gray
            $logsResponse = Invoke-RestMethod -Uri "$logsUrl/$database?limit=$logLimit" -Method Get -Headers $headers
            
            Write-Host "`nActivity Logs for $database" -ForegroundColor Cyan
            Write-Host "Current Status: $(if($logsResponse.data.currentStatus -eq $true){'Active'}elseif($logsResponse.data.currentStatus -eq $false){'Inactive'}else{'Unknown'})" -ForegroundColor $(if($logsResponse.data.currentStatus -eq $true){'Green'}elseif($logsResponse.data.currentStatus -eq $false){'Yellow'}else{'Gray'})
            Write-Host "Total Log Entries: $($logsResponse.data.total)" -ForegroundColor White
            Write-Host "-----------------------------------------" -ForegroundColor Gray
            
            foreach($log in $logsResponse.data.logs) {
                $actionColor = switch ($log.action) {
                    "provision" { "Green" }
                    "enable" { "Green" }
                    "disable" { "Yellow" }
                    "key_rotation" { "Cyan" }
                    default { "White" }
                }
                
                $timestamp = [DateTime]::Parse($log.createdAt).ToString("yyyy-MM-dd HH:mm:ss")
                $userName = if ($log.userId -and $log.userId.name) { "$($log.userId.name) ($($log.userId.email))" } else { "Unknown User" }
                
                Write-Host "$timestamp - " -NoNewline -ForegroundColor Gray
                Write-Host "$($log.action.ToUpper())" -NoNewline -ForegroundColor $actionColor
                Write-Host " by $userName" -ForegroundColor White
                
                if ($log.tier) {
                    Write-Host "   > Tier: $($log.tier) $(if($log.tier -eq 1){'(GET-only)'}else{'(Full Access)'})" -ForegroundColor White
                }
                
                if ($log.tierChange) {
                    Write-Host "   > Tier Change: $($log.tierChange)" -ForegroundColor Magenta
                }
                
                if ($log.keyGenerated) {
                    Write-Host "   > API Key Generated" -ForegroundColor Cyan
                }
                
                if ($null -ne $log.previousStatus -and $null -ne $log.newStatus) {
                    Write-Host "   > Status changed from $(if($log.previousStatus){'Active'}else{'Inactive'}) to $(if($log.newStatus){'Active'}else{'Inactive'})" -ForegroundColor White
                }
            }
            
            Write-Host "-----------------------------------------" -ForegroundColor Gray
            Write-Host "To see more logs, run with: -logLimit <number>" -ForegroundColor Gray
        } catch {
            Write-Host "Failed to fetch logs: $_" -ForegroundColor Red
            exit 1
        }
    }
    
    "newkey" {
        # Generate a new API key
        try {
            Write-Host "Requesting new API key for database: $database with tier: $tier" -ForegroundColor Gray
            $provisionBody = @{
                databaseName = $database
                tier = $tier
                connectionId = $connectionId
                userId = $userId
                hostDatabase = $hostDatabase
            } | ConvertTo-Json
            
            $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $provisionBody
            
            Write-Host "`nAPI Key Regenerated Successfully!" -ForegroundColor Green
            Write-Host "Service: $($response.data.serviceName)" -ForegroundColor White
            Write-Host "Role: $($response.data.roleName)" -ForegroundColor White
            Write-Host "Application: $($response.data.applicationName)" -ForegroundColor White
            Write-Host "Tier: $($response.data.tier)" -ForegroundColor White
            
            Write-Host "`nNew API Key:" -ForegroundColor Yellow
            Write-Host "$($response.data.apiKey)" -ForegroundColor Yellow
            
            Write-Host "`nNote: This action has been logged in the API activity log" -ForegroundColor Gray
            Write-Host "Run with '-action log' to view the activity history" -ForegroundColor Gray
        } catch {
            Write-Host "Failed to generate new API key: $_" -ForegroundColor Red
            exit 1
        }
    }
    
    "tierchange" {
        # Change tier without generating a new API key
        try {
            Write-Host "Changing tier for database: $database to tier: $tier (without key regeneration)" -ForegroundColor Gray
            
            # First get the existing service/role/application to update
            $serviceInfo = Test-ServiceExists -dbName $database
            if (-not $serviceInfo.Exists) {
                Write-Host "Service not found for $database. Cannot change tier." -ForegroundColor Red
                exit 1
            }
            
            $existingService = $serviceInfo.Info
            
            # Check if service is disabled - if so, enable it first
            if (-not $serviceInfo.IsActive) {
                Write-Host "Service is currently disabled. Enabling first..." -ForegroundColor Yellow
                $toggleBody = @{
                    databaseName = $database
                    isActive = $true
                } | ConvertTo-Json
                
                $toggleResponse = Invoke-RestMethod -Uri $toggleUrl -Method Put -Headers $headers -Body $toggleBody
                Write-Host "Service enabled: $($toggleResponse.data.serviceName)" -ForegroundColor Green
            }
            
            # Get the role associated with this service
            $rolesUrl = "$baseUrl/api/roles?serviceId=$($existingService.serviceId)"
            $roles = Invoke-RestMethod -Uri $rolesUrl -Method Get -Headers $headers
            $role = $roles | Where-Object { $_.serviceId -eq $existingService.serviceId }
            
            if (-not $role) {
                Write-Host "Role not found for service $database. Cannot change tier." -ForegroundColor Red
                exit 1
            }
            
            # Get the application associated with this service
            $applicationsUrl = "$baseUrl/api/applications?serviceId=$($existingService.serviceId)"
            $applications = Invoke-RestMethod -Uri $applicationsUrl -Method Get -Headers $headers
            $application = $applications | Where-Object { $_.serviceId -eq $existingService.serviceId }
            
            if (-not $application) {
                Write-Host "Application not found for service $database. Cannot change tier." -ForegroundColor Red
                exit 1
            }
            
            # Update the role's permissions based on tier
            $roleUpdateUrl = "$baseUrl/api/roles/$($role._id)"
            
            # Get database objects to know what permissions to set
            $dbObjectsUrl = "$baseUrl/api/database-objects?serviceId=$($existingService.serviceId)"
            $dbObjects = Invoke-RestMethod -Uri $dbObjectsUrl -Method Get -Headers $headers
            
            $permissions = @()
            
            # Find all mc_ procedures
            $mcProcedures = $dbObjects.objects | Where-Object { $_.path -and $_.path.StartsWith('/proc/mc_') }
            
            if ($mcProcedures -and $mcProcedures.Count -gt 0) {
                foreach ($proc in $mcProcedures) {
                    $permissions += @{
                        serviceId = $existingService.serviceId
                        objectName = $proc.path
                        actions = @{
                            GET = $true              # Both tiers have GET access
                            POST = $tier -eq 2       # Only tier 2 has POST, PUT, DELETE access
                            PUT = $tier -eq 2
                            DELETE = $tier -eq 2
                        }
                    }
                }
            }
            
            $roleUpdateBody = @{
                description = if ($tier -eq 1) { "Read-only API access" } else { "Full API access" }
                permissions = $permissions
            } | ConvertTo-Json -Depth 4
            
            # Store the response but we don't need to use it
            Invoke-RestMethod -Uri $roleUpdateUrl -Method Put -Headers $headers -Body $roleUpdateBody | Out-Null
            
            # Update the application description to match the role description
            $applicationUpdateUrl = "$baseUrl/api/applications/$($application._id)"
            $applicationUpdateBody = @{
                description = if ($tier -eq 1) { "Read-only API access" } else { "Full API access" }
            } | ConvertTo-Json
            
            Invoke-RestMethod -Uri $applicationUpdateUrl -Method Put -Headers $headers -Body $applicationUpdateBody | Out-Null
            
            Write-Host "`nTier Changed Successfully!" -ForegroundColor Green
            Write-Host "Service: $($existingService.name)" -ForegroundColor White
            Write-Host "New Tier: $tier $(if($tier -eq 1){'(GET-only)'}else{'(Full Access)'})" -ForegroundColor White
            Write-Host "Total permissions updated: $($permissions.Count)" -ForegroundColor White
            Write-Host "Updated application description to match tier" -ForegroundColor White
            
            Write-Host "`nNote: This action has been logged in the API activity log" -ForegroundColor Gray
            Write-Host "Run with '-action log' to view the activity history" -ForegroundColor Gray
        } catch {
            Write-Host "Failed to change tier: $_" -ForegroundColor Red
            exit 1
        }
    }
    
    "disable" {
        # Disable API access
        try {
            Write-Host "Disabling API access for database: $database" -ForegroundColor Gray
            $toggleBody = @{
                databaseName = $database
                isActive = $false
            } | ConvertTo-Json
            
            $response = Invoke-RestMethod -Uri $toggleUrl -Method Put -Headers $headers -Body $toggleBody
            
            Write-Host "`nAPI Access Disabled Successfully!" -ForegroundColor Yellow
            Write-Host "Service: $($response.data.serviceName)" -ForegroundColor White
            Write-Host "Role: $($response.data.roleName)" -ForegroundColor White
            Write-Host "Application: $($response.data.applicationName)" -ForegroundColor White
            
            Write-Host "`nComponents updated: " -NoNewline -ForegroundColor White
            if ($response.data.updatedComponents.Count -gt 0) {
                Write-Host "$($response.data.updatedComponents -join ', ')" -ForegroundColor Cyan
            } else {
                Write-Host "None (already disabled)" -ForegroundColor Gray
            }
            
            Write-Host "`nNote: This action has been logged in the API activity log" -ForegroundColor Gray
            Write-Host "Run with '-action log' to view the activity history" -ForegroundColor Gray
        } catch {
            Write-Host "Failed to disable API access: $_" -ForegroundColor Red
            exit 1
        }
    }
    
    default {
        # Default - enable or provision
        try {
            # Check if service exists
            $serviceInfo = Test-ServiceExists -dbName $database
            
            if ($serviceInfo.Exists) {
                Write-Host "`nRefreshing existing service for $database..." -ForegroundColor Cyan
                
                # Step 1: Always enable the service regardless of current status
                Write-Host "Step 1: Enabling service via toggle endpoint..." -ForegroundColor White
                $toggleBody = @{
                    databaseName = $database
                    isActive = $true
                } | ConvertTo-Json
                
                $toggleResponse = Invoke-RestMethod -Uri $toggleUrl -Method Put -Headers $headers -Body $toggleBody -ErrorAction Stop
                
                Write-Host "Service enabled: $($toggleResponse.data.serviceName)" -ForegroundColor Green
                Write-Host "Components updated: $($toggleResponse.data.updatedComponents -join ', ')" -ForegroundColor Gray
                
                # Step 2: Update schema and permissions with provisioning endpoint
                Write-Host "`nStep 2: Updating schema and permissions..." -ForegroundColor White
                $provisionBody = @{
                    databaseName = $database
                    tier = $tier
                    connectionId = $connectionId
                    userId = $userId
                    hostDatabase = $hostDatabase
                } | ConvertTo-Json
                
                $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $provisionBody -ErrorAction Stop
                
                Write-Host "`nAPI Access Refreshed Successfully!" -ForegroundColor Green
                Write-Host "Service: $($response.data.serviceName)" -ForegroundColor White
                Write-Host "Role: $($response.data.roleName)" -ForegroundColor White
                Write-Host "Application: $($response.data.applicationName)" -ForegroundColor White
                Write-Host "Tier: $($response.data.tier)" -ForegroundColor White
                
                Write-Host "`nNew API Key:" -ForegroundColor Yellow
                Write-Host "$($response.data.apiKey)" -ForegroundColor Yellow
            } else {
                # Create new service
                Write-Host "`nNo existing service found - creating new API access" -ForegroundColor Yellow
                
                $provisionBody = @{
                    databaseName = $database
                    tier = $tier
                    connectionId = $connectionId
                    userId = $userId
                    hostDatabase = $hostDatabase
                } | ConvertTo-Json
                
                $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $provisionBody -ErrorAction Stop
                
                Write-Host "`nAPI Access Provisioned Successfully!" -ForegroundColor Green
                Write-Host "Service: $($response.data.serviceName)" -ForegroundColor White
                Write-Host "Role: $($response.data.roleName)" -ForegroundColor White
                Write-Host "Application: $($response.data.applicationName)" -ForegroundColor White
                Write-Host "Tier: $($response.data.tier)" -ForegroundColor White
                
                Write-Host "`nAPI Key:" -ForegroundColor Yellow
                Write-Host "$($response.data.apiKey)" -ForegroundColor Yellow
            }
            
            Write-Host "`nNote: This action has been logged in the API activity log" -ForegroundColor Gray
            Write-Host "Run with '-action log' to view the activity history" -ForegroundColor Gray
        } catch {
            Write-Host "Operation failed: $_" -ForegroundColor Red
            exit 1
        }
    }
}