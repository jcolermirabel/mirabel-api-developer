-- =============================================
-- API Documentation
-- Description:    Retrieves contact categories with optional filtering and pagination
-- 
-- Parameters:
--   @CategoryID  - Optional. Filter by category ID
--                  Values: NULL/Empty (All), > 0 (Specific category)
--                  Default: NULL
--   @Enabled     - Optional. Filter by enabled status
--                  Values: NULL/Empty (All), 0 (Disabled), 1 (Enabled)
--                  Default: NULL
--   @PageNumber  - Optional. Page number for pagination
--                  Values: > 0
--                  Default: 1
--                  Page size: 1000 records
-- 
-- Returns:
-- Success (200): Table with columns
--   - CategoryID (int)
--   - Category (nvarchar)
--   - DateAdded (datetime)
--   - IsEnabled (nvarchar) - "Yes" or "No"
--
-- Error: Table with columns
--   - ResultCode (int) - Status codes: 400 (Bad request), 404 (Not found), 500 (Server error)
--   - ResultMessage (nvarchar) - Description of the error
--
-- Example Usage:
-- EXEC [mc_ContactCategoryGet] @CategoryID='', @Enabled='', @PageNumber='1'
-- EXEC [mc_ContactCategoryGet] @CategoryID='2', @Enabled='1', @PageNumber='1'
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[mc_ContactCategoryGet] (
    @CategoryID VARCHAR(10) = NULL,
    @Enabled VARCHAR(10) = NULL,
    @PageNumber VARCHAR(10) = '1'
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        DECLARE @CategoryID_int INT,
                @Enabled_bit BIT,
                @PageNumber_int INT;

        -- Convert and validate CategoryID
        IF @CategoryID IS NULL OR @CategoryID = ''
            SET @CategoryID_int = NULL
        ELSE IF ISNUMERIC(@CategoryID) = 1
            SET @CategoryID_int = CAST(@CategoryID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid CategoryID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Convert and validate Enabled status
        IF @Enabled IS NULL OR @Enabled = ''
            SET @Enabled_bit = NULL
        ELSE IF @Enabled IN ('0', '1')
            SET @Enabled_bit = CAST(@Enabled AS BIT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid Enabled parameter. Must be 0 or 1.' AS ResultMessage;
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
            SELECT 400 AS ResultCode, 'Invalid Page Number format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Validate CategoryID exists if specified
        IF @CategoryID_int IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM gsCustomersType WHERE gsCustomersTypeID = @CategoryID_int)
        BEGIN
            SELECT 404 AS ResultCode, 'Category not found.' AS ResultMessage;
            RETURN;
        END

        -- Return filtered results with pagination
        SELECT 
            gsCustomersTypeID AS CategoryID,
            Type AS Category,
            DateAdded,
            CASE WHEN enabled = 1 THEN 'Yes' ELSE 'No' END AS IsEnabled
        FROM gsCustomersType
        WHERE (@CategoryID_int IS NULL OR gsCustomersTypeID = @CategoryID_int)
            AND (@Enabled_bit IS NULL OR enabled = @Enabled_bit)
        ORDER BY Type
        OFFSET (@PageNumber_int - 1) * @RowsPerPage ROWS
        FETCH NEXT @RowsPerPage ROWS ONLY;

        -- If no records found, return appropriate message
        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 404 AS ResultCode, 'No categories found matching the specified criteria.' AS ResultMessage;
            RETURN;
        END

    END TRY
    BEGIN CATCH
        SELECT 500 AS ResultCode, ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;