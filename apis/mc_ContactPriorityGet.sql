-- =============================================
-- Description: Retrieves contact priorities with optional filtering and pagination
-- 
-- Parameters:
--   @PriorityID  - Optional. Filter by priority ID
--                  Values: NULL/Empty (All), > 0 (Specific priority)
--                  Default: NULL
--   @PageNumber  - Optional. Page number for pagination
--                  Values: > 0
--                  Default: 1
--                  Page size: 1000 records
-- 
-- Returns:
-- Success: Table with columns
--   - PriorityID (int)
--   - Priority (nvarchar)
--
-- Error: Table with columns
--   - ResultCode (int) - Status codes: 400 (Bad request), 404 (Not found), 500 (Server error)
--   - ResultMessage (nvarchar) - Description of the error
--
-- Example Usage:
-- EXEC [mc_ContactPriorityGet] @PriorityID = '6', @PageNumber = '1'
-- EXEC [mc_ContactPriorityGet] @PriorityID = '', @PageNumber = '2'
-- =============================================

CREATE OR ALTER PROCEDURE [dbo].[mc_ContactPriorityGet] (
    @PriorityID VARCHAR(10) = NULL,
    @PageNumber VARCHAR(10) = '1'
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        DECLARE @PriorityID_int INT,
                @PageNumber_int INT;

        -- Convert and validate PriorityID
        IF @PriorityID IS NULL OR @PriorityID = ''
            SET @PriorityID_int = NULL
        ELSE IF ISNUMERIC(@PriorityID) = 1
            SET @PriorityID_int = CAST(@PriorityID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid Priority ID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Convert and validate PageNumber
        IF @PageNumber IS NULL OR @PageNumber = ''
            SET @PageNumber_int = 1
        ELSE IF ISNUMERIC(@PageNumber) = 1
        BEGIN
            SET @PageNumber_int = CAST(@PageNumber AS INT);
            IF @PageNumber_int < 1
            BEGIN
                SELECT 400 AS ResultCode, 'Page number must be greater than 0.' AS ResultMessage;
                RETURN;
            END
        END
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid PageNumber format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Validate PriorityID exists if specified
        IF @PriorityID_int IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM gsPriority WHERE gsPriorityID = @PriorityID_int)
        BEGIN
            SELECT 404 AS ResultCode, 'Priority ID not found.' AS ResultMessage;
            RETURN;
        END

        -- Return filtered results with pagination
        SELECT 
            gsPriorityID AS PriorityID,
            gsPriorityName AS Priority
        FROM gsPriority
        WHERE (@PriorityID_int IS NULL OR gsPriorityID = @PriorityID_int)
        ORDER BY gsPriorityName
        OFFSET (@PageNumber_int - 1) * @RowsPerPage ROWS
        FETCH NEXT @RowsPerPage ROWS ONLY;

        -- If no records found, return appropriate message
        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 404 AS ResultCode, 'No priority records found matching the specified criteria.' AS ResultMessage;
            RETURN;
        END

    END TRY
    BEGIN CATCH
        SELECT 500 AS ResultCode, ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;