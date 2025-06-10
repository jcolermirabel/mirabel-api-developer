-- =============================================
-- API Documentation
-- Description:    Retrieves deleted contact information with filtering and pagination
-- 
-- Parameters:
--   @customerID  - Optional. Filter by customer ID
--                  Values: -2 (All), > 0 (Specific customer)
--                  Default: -2
--   @fromDate    - Optional. Start date for deletion period
--                  Format: DateTime
--                  Default: '1900-01-01'
--   @toDate      - Optional. End date for deletion period
--                  Format: DateTime 
--                  Default: '9999-12-31'
--   @pageNumber  - Optional. Page number for pagination
--                  Values: > 0
--                  Default: 1
--                  Page size: 1000 records
-- 
-- Returns:
-- Success: Table with columns
--   - gsCustomersID (int)
--   - Customer (varchar)
--   - Prefix (varchar) 
--   - FirstName (varchar)
--   - LastName (varchar)
--   - Suffix (varchar)
--   - Title (varchar)
--   - Address1 (varchar)
--   - Address2 (varchar)
--   - City (varchar)
--   - State (varchar)
--   - Zip (varchar)
--   - Country (varchar)
--   - Email (varchar)
--   - Phone (varchar)
--   - PhoneXtn (varchar)
--   - Phone2 (varchar)
--   - URL (varchar)
--   - ContactType (varchar)
--   - LastContract (datetime)
--   - LastContact (datetime)
--   - TwitterHandle (varchar)
--   - FacebookID (varchar)
--   - LinkedIn (varchar)
--   - DateAdded (datetime)
--   - ParentID (int)
--   - Rep (varchar)
--
-- Error: Table with columns
--   - ResultCode (int)
--   - ResultMessage (varchar)
--
-- Status Codes:
--   200 - Success (implicit for data return)
--   400 - Bad request (invalid parameters)
--   404 - Resource not found
--   500 - Server error
--
-- Example Usage:
-- EXEC mc_ContactsDeletedGet @customerID = 35, @fromDate = '2023-01-01'
-- EXEC mc_ContactsDeletedGet @fromDate = '2023-09-01', @toDate = '2023-09-30'
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[mc_ContactsDeletedGet]
    @CustomerID VARCHAR(10) = '-2',
    @FromDate VARCHAR(50) = '',
    @ToDate VARCHAR(50) = '',
    @PageNumber VARCHAR(10) = ''
AS
BEGIN
    SET NOCOUNT ON;

    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        DECLARE @customerID_int INT,
                @fromDate_dt DATETIME,
                @toDate_dt DATETIME,
                @pageNumber_int INT;
        
        -- Convert and validate CustomerID
        IF @customerID = '' OR @customerID IS NULL
            SET @customerID_int = -2
        ELSE IF ISNUMERIC(@customerID) = 1
            SET @customerID_int = CAST(@customerID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid customerID parameter format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Handle date parameters with proper error checking
        IF @fromDate = '' OR @fromDate IS NULL
            SET @fromDate_dt = '1900-01-01'
        ELSE 
        BEGIN
            SET @fromDate_dt = TRY_CAST(@fromDate AS DATETIME)
            IF @fromDate_dt IS NULL 
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid FromDate format. Must be a valid date.' AS ResultMessage;
                RETURN;
            END
        END

        IF @toDate = '' OR @toDate IS NULL
            SET @toDate_dt = '9999-12-31'
        ELSE 
        BEGIN
            SET @toDate_dt = TRY_CAST(@toDate AS DATETIME)
            IF @toDate_dt IS NULL 
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid ToDate format. Must be a valid date.' AS ResultMessage;
                RETURN;
            END
        END

        -- Convert and validate PageNumber
        IF @pageNumber IS NULL OR @pageNumber = ''
            SET @pageNumber_int = 1
        ELSE IF ISNUMERIC(@pageNumber) = 1
        BEGIN
            SET @pageNumber_int = CAST(@pageNumber AS INT);
            IF @pageNumber_int < 1
            BEGIN
                SELECT 400 AS ResultCode, 'Page number must be greater than 0.' AS ResultMessage;
                RETURN;
            END
        END
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid page number format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Validate customer exists if specified
        IF @customerID_int > -2 AND NOT EXISTS (
            SELECT 1 FROM gsCustomers WHERE gsCustomersID = @customerID_int
        )
        BEGIN
            SELECT 404 AS ResultCode, 'CustomerID not found.' AS ResultMessage;
            RETURN;
        END

        -- Validate deleted records exist in date range
        IF NOT EXISTS (
            SELECT 1 
            FROM gsCustomersDeleted 
            WHERE DateDeleted BETWEEN @fromDate_dt AND @toDate_dt
        )
        BEGIN
            SELECT 404 AS ResultCode, 'No deleted contacts found in specified date range.' AS ResultMessage;
            RETURN;
        END

        -- Main query for deleted contacts
        SELECT 
            a.gsCustomersID as CustomerID,
            a.Customer,
            a.Pre AS Prefix,
            a.FirstName,
            a.LastName,
            a.Suffix,
            a.Title,
            a.Street AS Address1,
            a.Street2 AS Address2,
            a.City,
            a.St AS State,
            a.Zip,
            a.International AS Country,
            a.Email,
            a.Phone,
            a.PhoneXtn,
            a.Phone2,
            a.URL,
            a.JobDescription AS ContactType,
            a.LastContract,
            a.LastContact,
            a.TwitterHandle,
            a.FacebookID,
            a.LinkedIn,
            a.DateAdded,
            a.ParentID,
            CONCAT(c.FirstName, ' ', c.LastName) AS Rep,
			a.DateDeleted,
			CONCAT(d.FirstName, ' ', d.LastName) AS [DeletedBy]
        FROM gsCustomersDeleted a
        INNER JOIN gsEmployees c ON a.gsRepID = c.gsEmployeesID
		LEFT JOIN gsemployees d on a.DeletedBy = d.gsEmployeesID
        WHERE a.DateDeleted BETWEEN @fromDate_dt AND @toDate_dt
            AND (@customerID_int = -2 OR a.gsCustomersID = @customerID_int)
        ORDER BY a.gsCustomersID
        OFFSET (@pageNumber_int - 1) * @RowsPerPage ROWS
        FETCH NEXT @RowsPerPage ROWS ONLY;

        -- Check if any records were returned
        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 404 AS ResultCode, 'No records found matching the specified criteria.' AS ResultMessage;
            RETURN;
        END

    END TRY
    BEGIN CATCH
        SELECT 
            500 AS ResultCode,
            ERROR_MESSAGE() AS ResultMessage;
        RETURN;
    END CATCH
END;