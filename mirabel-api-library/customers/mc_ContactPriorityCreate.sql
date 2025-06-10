 /*
 =============================================
 API - mc_ContactPriorityCreate
 Description: Creates a new contact priority if it doesn't already exist
 
 Parameters:
   @PriorityName  - Required. Name of the priority to create
                  Values: Non-empty string, maximum 50 characters
                  Default: NULL
 
 Returns:
 Success: Table with columns
   - PriorityID (int) - ID of created or existing priority
   - Priority (nvarchar) - Name of the priority
   - IsNew (bit) - 1 if newly created, 0 if already existed

 Error: Table with columns
   - ResultCode (int) - Status codes: 400 (Bad request), 500 (Server error)
   - ResultMessage (nvarchar) - Description of the error

 Example Usage:
 EXEC [mc_ContactPriorityCreate] @PriorityName='Critical'
 EXEC [mc_ContactPriorityCreate] @PriorityName='PIF'

$headers = @{
    "x-mirabel-api-key" = "<apikeyvalue>"
    "Content-Type"      = "application/json" # Tell the server we're sending JSON
}

$body = @{
    "PriorityName" = "Testing" # Parameter to be sent in the body
} | ConvertTo-Json # Convert the PowerShell hashtable to a JSON string

$uri = "https://mirabelconnect.mirabeltechnologies.com/api/v2/<databasename>/_proc/mc_ContactPriorityCreate" # URI without query parameters

$response = Invoke-RestMethod -Method POST -Uri $uri -Headers $headers -Body $body
$response | ConvertTo-Json -Depth 100

Write-Host "Response: $($response | ConvertTo-Json -Depth 100)"
 =============================================
 */

CREATE OR ALTER PROCEDURE [dbo].[mc_ContactPriorityCreate] (
    @PriorityName NVARCHAR(50) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        DECLARE @ExistingPriorityID INT;
        
        -- Validate PriorityName is provided
        IF @PriorityName IS NULL OR LTRIM(RTRIM(@PriorityName)) = ''
        BEGIN
            SELECT 400 AS ResultCode, 'Priority name cannot be empty.' AS ResultMessage;
            RETURN;
        END
        
        -- Check if priority name exceeds maximum length
        IF LEN(@PriorityName) > 50
        BEGIN
            SELECT 400 AS ResultCode, 'Priority name exceeds maximum length of 50 characters.' AS ResultMessage;
            RETURN;
        END
        
        -- Check if priority name already exists
        SELECT @ExistingPriorityID = gsPriorityID 
        FROM gsPriority 
        WHERE gsPriorityName = @PriorityName;
        
        -- If priority already exists, return existing record
        IF @ExistingPriorityID IS NOT NULL
        BEGIN
            SELECT 
                gsPriorityID AS PriorityID,
                gsPriorityName AS Priority,
                0 AS IsNew -- Indicates this was an existing record
            FROM gsPriority 
            WHERE gsPriorityID = @ExistingPriorityID;
            
            RETURN;
        END
        
        -- Insert new priority
        INSERT INTO gsPriority (gsPriorityName)
        VALUES (@PriorityName);
        
        -- Get the new priority ID
        DECLARE @NewPriorityID INT = SCOPE_IDENTITY();
        
        -- Return the newly created priority
        SELECT 
            @NewPriorityID AS PriorityID,
            @PriorityName AS Priority,
            1 AS IsNew; -- Indicates this is a new record
            
    END TRY
    BEGIN CATCH
        SELECT 
            500 AS ResultCode, 
            'Error creating priority: ' + ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;