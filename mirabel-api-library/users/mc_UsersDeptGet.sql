/*
 =============================================
 API Documentation-mc_UsersDeptGet
 Description:    Retrieves department information with optional filtering
 
 Parameters:
   @DeptID      - Optional. Filter by department ID
                  Values: NULL/Empty (All), > 0 (Specific department)
                  Default: NULL
   @PageNumber  - Optional. Page number for pagination
                  Values: > 0
                  Default: 1
                  Page size: 1000 records
 
 Returns:
 Success: Table with columns
   - DeptID (int)
   - Department (nvarchar)

 Error: Table with columns
   - ResultCode (int) - Status codes: 400 (Bad request), 404 (Not found), 500 (Server error)
   - ResultMessage (nvarchar) - Description of the error

 Example Usage:
 EXEC [mc_UsersDeptGet] @DeptID = '', @PageNumber = '1'
 EXEC [mc_UsersDeptGet] @DeptID = '2', @PageNumber = '1'
 =============================================
*/
CREATE OR ALTER PROCEDURE [dbo].[mc_UsersDeptGet]
(
    @DeptID VARCHAR(10) = NULL,
    @PageNumber VARCHAR(10) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        DECLARE @DeptID_int INT,
                @PageNumber_int INT;

        -- Convert and validate DeptID
        IF @DeptID IS NULL OR @DeptID = ''
            SET @DeptID_int = NULL
        ELSE IF ISNUMERIC(@DeptID) = 1
            SET @DeptID_int = CAST(@DeptID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid Department ID format. Must be numeric.' AS ResultMessage;
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

        -- Validate DeptID exists if specified
        IF @DeptID_int IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM gsDept WHERE gsDeptID = @DeptID_int)
        BEGIN
            SELECT 404 AS ResultCode, 'Department ID not found.' AS ResultMessage;
            RETURN;
        END

        -- Return filtered results with pagination
        SELECT 
            gsDeptID AS DeptID,
            Dept AS Department
        FROM gsDept
        WHERE (@DeptID_int IS NULL OR gsDeptID = @DeptID_int)
        ORDER BY Dept
        OFFSET (@PageNumber_int - 1) * @RowsPerPage ROWS
        FETCH NEXT @RowsPerPage ROWS ONLY;

        -- If no records found, return appropriate message
        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 404 AS ResultCode, 'No departments found matching the specified criteria.' AS ResultMessage;
            RETURN;
        END

    END TRY
    BEGIN CATCH
        SELECT 500 AS ResultCode, ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;