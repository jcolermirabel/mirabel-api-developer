-- =============================================
-- API Documentation
-- Description:    Retrieves user information with optional filtering and pagination
-- 
-- Parameters:
--   @Enabled     - Optional. Filter by user enabled status
--                  Values: -2 (All), 0 (Disabled), 1 (Enabled)
--                  Default: -2
--   @DeptID      - Optional. Filter by department ID
--                  Values: -2 (All), > 0 (Specific department)
--                  Default: -2
--   @UserID	  - Optional. Filter by User ID
--                  Values: -2 (All), > 0 (Specific User)
--                  Default: -2
--   @PageNumber  - Optional. Page number for pagination
--                  Values: > 0
--                  Default: 1
--                  Page size: 100 records
-- 
-- Returns: JSON object
--   {
--     "StatusCode": int,    // HTTP status code
--     "Message": string,    // Status message
--     "Data": [            // Array of user objects
--       {
--         "UserID": int,
--         "FirstName": string,
--         "LastName": string,
--         "Email": string,
--         "Title": string,
--         "Phone": string,
--         "Phone2": string,
--         "Street": string,
--         "City": string,
--         "St": string,
--         "Zip": string,
--         "IsAdmin": string,
--         "IsEnabled": string,
--         "Department": string,
--         "DateAdded": datetime
--       }
--     ]
--   }
--
-- Status Codes:
--   200 - Success
--   400 - Bad request (invalid parameters)
--   404 - Resource not found
--   500 - Server error


--EXEC [mc_UsersGet] @enabled = '', @deptID = '0', @UserID = '', @pagenumber = ''
--EXEC [mc_UsersGet] @enabled = '', @deptID = '', @UserID = 2, @pagenumber = ''
--EXEC [mc_UsersGet] @enabled = '', @deptID = '', @UserID = '6', @pagenumber = ''
--EXEC [mc_UsersGet] @enabled = '1', @deptID = '', @UserID = '', @pagenumber = ''

-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[mc_UsersGet]
    @Enabled VARCHAR(10) = '-2',
    @DeptID VARCHAR(10) = '-2',
    @UserID VARCHAR(10) = '-2',
    @PageNumber VARCHAR(10) = '-2'
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        DECLARE @RowsOfPage INT = 100,
                @enabled_int INT,
                @deptID_int INT,
                @UserID_int INT,
                @PageNumber_int INT;

        -- Handle conversions
        IF @enabled = '' OR @enabled IS NULL
            SET @enabled_int = -2
        ELSE IF ISNUMERIC(@enabled) = 1
            SET @enabled_int = CAST(@enabled AS INT)
        ELSE
        BEGIN
            SELECT -1 AS ResultCode, 'Invalid enabled parameter format' AS ResultMessage;
            RETURN;
        END

        IF @deptID = '' OR @deptID IS NULL
            SET @deptID_int = -2
        ELSE IF ISNUMERIC(@deptID) = 1
            SET @deptID_int = CAST(@deptID AS INT)
        ELSE 
        BEGIN
            SELECT -1 AS ResultCode, 'Invalid deptID parameter format' AS ResultMessage;
            RETURN;
        END

        IF @UserID = '' OR @UserID IS NULL
            SET @UserID_int = -2
        ELSE IF ISNUMERIC(@UserID) = 1
            SET @UserID_int = CAST(@UserID AS INT)
        ELSE
        BEGIN
            SELECT -1 AS ResultCode, 'Invalid UserID parameter format' AS ResultMessage;
            RETURN;
        END

        IF @PageNumber = '' OR @PageNumber IS NULL OR @PageNumber = '-2'
            SET @PageNumber_int = 1
        ELSE IF ISNUMERIC(@PageNumber) = 1
            SET @PageNumber_int = CAST(@PageNumber AS INT)
        ELSE
        BEGIN
            SELECT -1 AS ResultCode, 'Invalid PageNumber parameter format' AS ResultMessage;
            RETURN;
        END

        -- Validate values
        IF @enabled_int NOT IN (-2, 0, 1)
        BEGIN
            SELECT -1 AS ResultCode, 'Invalid enabled parameter. Must be -2, 0, or 1.' AS ResultMessage;
            RETURN;
        END

        IF @deptID_int <> -2 AND NOT EXISTS (SELECT 1 FROM gsDept WHERE gsDeptID = @deptID_int)
        BEGIN
            SELECT -1 AS ResultCode, 'Department not found.' AS ResultMessage;
            RETURN;
        END

        IF @UserID_int <> -2 AND NOT EXISTS (SELECT 1 FROM gsEmployees WHERE gsEmployeesID = @UserID_int)
        BEGIN
            SELECT -1 AS ResultCode, 'User not found.' AS ResultMessage;
            RETURN;
        END

        IF @PageNumber_int < 1
        BEGIN
            SELECT -1 AS ResultCode, 'Page number must be greater than 0.' AS ResultMessage;
            RETURN;
        END

        -- Success case returns data
        SELECT 
            gsEmployeesID AS UserID,
            FirstName,
            LastName,
            Email,
            a.jobtitle AS Title,
            Phone,
            Phone2,
            Street,
            City,
            St,
            Zip,
            CASE WHEN ISNULL(admin, 0) = 1 THEN 'Yes' ELSE 'No' END AS IsAdmin,
            CASE WHEN ISNULL(enabled, 0) = 1 THEN 'Yes' ELSE 'No' END AS IsEnabled,
            b.dept AS Department,
            a.DateAdded
        FROM gsEmployees a
        LEFT OUTER JOIN gsDept b ON a.gsdeptID = b.gsDeptID
        WHERE issystem = 0
            AND (@enabled_int = -2 OR a.enabled = @enabled_int)
            AND (@deptID_int = -2 OR a.gsDeptID = @deptID_int)
            AND (@UserID_int = -2 OR a.gsEmployeesID = @UserID_int)
        ORDER BY gsEmployeesID
        OFFSET (@PageNumber_int - 1) * @RowsOfPage ROWS
        FETCH NEXT @RowsOfPage ROWS ONLY;

    END TRY
    BEGIN CATCH
        SELECT -1 AS ResultCode, ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;