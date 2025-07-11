-- =============================================
-- API Documentation - mc_ProductSchedulesGet
-- Description:    Retrieves product schedule information with filtering and pagination
-- 
-- Parameters:
--   @IssueSetID   - Optional. Filter by issue set ID
--                  Values: -2 (All), > 0 (Specific issue set)
--                  Default: -2
--   @ProductID    - Optional. Filter by product ID
--                  Values: -2 (All), > 0 (Specific product)
--                  Default: -2
--   @PageNumber   - Optional. Page number for pagination
--                  Values: > 0
--                  Default: 1
--                  Page size: 1000 records
-- 
-- Returns:
-- Success: Table with columns
--   - IssueID (int)
--   - IssueName (varchar)
--   - IssueDate (datetime)
--   - IssueYear (int)
--   - IssueSetID (int)
--
-- Error: Table with columns
--   - ResultCode (int) - Status codes: 400 (Bad request), 404 (Not found), 500 (Server error)
--   - ResultMessage (varchar) - Description of the error
--
-- Status Codes:
--   200 - Success (implicit for data return)
--   400 - Bad request (invalid parameters)
--   404 - Resource not found
--   500 - Server error
--
-- Example Usage:
-- EXEC mc_ProductSchedulesGet @IssueSetID = -2, @ProductID = -2, @PageNumber = 1
-- EXEC mc_ProductSchedulesGet @IssueSetID = 1, @ProductID = -2, @PageNumber = 1
-- EXEC mc_ProductSchedulesGet @IssueSetID = -2, @ProductID = 10, @PageNumber = 2
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[mc_ProductSchedulesGet]
(
    @IssueSetID VARCHAR(10) = '-2',
    @ProductID VARCHAR(10) = '-2',
    @PageNumber VARCHAR(10) = ''
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        DECLARE @IssueSetID_int INT,
                @ProductID_int INT,
                @PageNumber_int INT;

        -- Convert and validate IssueSetID
        IF @IssueSetID IS NULL OR @IssueSetID = ''
            SET @IssueSetID_int = -2
        ELSE IF ISNUMERIC(@IssueSetID) = 1
            SET @IssueSetID_int = CAST(@IssueSetID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid IssueSetID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Convert and validate ProductID
        IF @ProductID IS NULL OR @ProductID = ''
            SET @ProductID_int = -2
        ELSE IF ISNUMERIC(@ProductID) = 1
            SET @ProductID_int = CAST(@ProductID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid ProductID format. Must be numeric.' AS ResultMessage;
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

        -- Check if the issue set exists if specified
        IF @IssueSetID_int > -2 AND NOT EXISTS (
            SELECT 1 FROM tblmagfrequencyissueset WHERE ID = @IssueSetID_int
        )
        BEGIN
            SELECT 404 AS ResultCode, 'Issue set not found.' AS ResultMessage;
            RETURN;
        END

        -- Check if the issue set has issues defined if specified
        IF @IssueSetID_int > -2 AND NOT EXISTS (
            SELECT 1 FROM tblmagfrequency WHERE issueset = @IssueSetID_int
        )
        BEGIN
            SELECT 404 AS ResultCode, 'Issue set has no issues defined.' AS ResultMessage;
            RETURN;
        END

        -- Check if the product exists if specified
        IF @ProductID_int > -2 AND NOT EXISTS (
            SELECT 1 FROM gspublications WHERE gspublicationID = @ProductID_int
        )
        BEGIN
            SELECT 404 AS ResultCode, 'Product not found.' AS ResultMessage;
            RETURN;
        END

        -- Return the filtered data with pagination
        SELECT DISTINCT
            a.ID AS IssueID, 
            a.IssueName, 
            a.IssueDate, 
            a.IssueYear, 
            a.IssueSet AS IssueSetID
        FROM tblmagfrequency a
        LEFT JOIN gspublications b ON a.issueset = b.issueset
        WHERE (@IssueSetID_int = -2 OR a.Issueset = @IssueSetID_int)
            AND (@ProductID_int = -2 OR b.gspublicationID = @ProductID_int)
        ORDER BY a.ID
        OFFSET (@PageNumber_int - 1) * @RowsPerPage ROWS
        FETCH NEXT @RowsPerPage ROWS ONLY;

        -- If no records were found
        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 404 AS ResultCode, 'No records found matching the specified criteria.' AS ResultMessage;
            RETURN;
        END

    END TRY
    BEGIN CATCH
        SELECT 500 AS ResultCode, ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;