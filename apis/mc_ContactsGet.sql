-- =============================================
-- Description: Retrieves customer contact information with various filtering options
-- 
-- Parameters:
--   @CustomerID (varchar(10)): Optional. Filter by customer ID
--                  Values: Empty/NULL (All), > 0 (Specific customer)
--                  Default: NULL
--   @RepID (varchar(10)): Optional. Filter by representative ID
--                  Values: Empty/NULL (All), > 0 (Specific representative)
--                  Default: NULL  
--   @FromDate (varchar(50)): Optional. Start date for filtering
--                  Format: YYYY-MM-DD
--                  Default: '1900-01-01'
--   @ToDate (varchar(50)): Optional. End date for filtering
--                  Format: YYYY-MM-DD
--                  Default: '9999-12-31'
--   @ContactGroup (varchar(100)): Optional. Filter by contact group name
--                  Default: NULL
--   @Category (varchar(100)): Optional. Filter by customer category
--                  Default: NULL
--   @Priority (varchar(100)): Optional. Filter by priority name
--                  Default: NULL
--   @PageNumber (varchar(10)): Optional. Page number for pagination
--                  Values: > 0
--                  Default: 1
--                  Page size: 1000 records
-- 
-- Returns:
-- Success (200): Table with columns:
--   CustomerID, Customer, FirstName, LastName, Address1, Address2, City, 
--   State, Zip, Country, Phone, Phone2, Email, URL, DateAdded, Rep
--
-- Error: Table with columns:
--   ResultCode (int), ResultMessage (nvarchar)
--
-- Example Usage:
-- EXEC mc_ContactsGet @CustomerID = '12', @RepID = ''
-- EXEC mc_ContactsGet @RepID = '5', @FromDate = '2023-01-01', @ToDate = '2023-12-31'
-- EXEC mc_ContactsGet @ContactGroup = 'Distributor', @PageNumber = '2'
-- 
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[mc_ContactsGet]
(
    @CustomerID VARCHAR(10) = NULL,
    @RepID VARCHAR(10) = NULL,
    @FromDate VARCHAR(50) = NULL,
    @ToDate VARCHAR(50) = NULL,
    @ContactGroup VARCHAR(100) = NULL,
    @Category VARCHAR(100) = NULL,
    @Priority VARCHAR(100) = NULL,
    @PageNumber VARCHAR(10) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        -- Variable declarations
        DECLARE @CustomerID_int INT,
                @RepID_int INT,
                @FromDate_dt DATETIME,
                @ToDate_dt DATETIME,
                @PageNumber_int INT;

        -- Convert and validate CustomerID
        IF @CustomerID IS NULL OR @CustomerID = ''
            SET @CustomerID_int = NULL
        ELSE IF ISNUMERIC(@CustomerID) = 1
            SET @CustomerID_int = CAST(@CustomerID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid CustomerID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Convert and validate RepID
        IF @RepID IS NULL OR @RepID = ''
            SET @RepID_int = NULL
        ELSE IF ISNUMERIC(@RepID) = 1
            SET @RepID_int = CAST(@RepID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid RepID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Convert and validate FromDate
        IF @FromDate IS NULL OR @FromDate = ''
            SET @FromDate_dt = '1900-01-01'
        ELSE
        BEGIN
            SET @FromDate_dt = TRY_CAST(@FromDate AS DATETIME)
            IF @FromDate_dt IS NULL
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid FromDate format. Use YYYY-MM-DD.' AS ResultMessage;
                RETURN;
            END
        END

        -- Convert and validate ToDate
        IF @ToDate IS NULL OR @ToDate = ''
            SET @ToDate_dt = '9999-12-31'
        ELSE
        BEGIN
            SET @ToDate_dt = TRY_CAST(@ToDate AS DATETIME)
            IF @ToDate_dt IS NULL
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid ToDate format. Use YYYY-MM-DD.' AS ResultMessage;
                RETURN;
            END
        END

        -- Validate date range
        IF @FromDate_dt > @ToDate_dt
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid date range: FromDate must be less than or equal to ToDate.' AS ResultMessage;
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

        -- Validate CustomerID exists if specified
        IF @CustomerID_int IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gsCustomers WHERE gsCustomersID = @CustomerID_int)
        BEGIN
            SELECT 404 AS ResultCode, 'Customer ID not found.' AS ResultMessage;
            RETURN;
        END

        -- Validate RepID exists if specified
        IF @RepID_int IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gsEmployees WHERE gsEmployeesID = @RepID_int)
        BEGIN
            SELECT 404 AS ResultCode, 'Representative ID not found.' AS ResultMessage;
            RETURN;
        END

        -- Validate ContactGroup exists if specified
        IF @ContactGroup IS NOT NULL AND @ContactGroup <> '' AND NOT EXISTS (SELECT 1 FROM gsContactType WHERE Name = @ContactGroup)
        BEGIN
            SELECT 404 AS ResultCode, 'Contact Group not found.' AS ResultMessage;
            RETURN;
        END

        -- Validate Category exists if specified
        IF @Category IS NOT NULL AND @Category <> '' AND NOT EXISTS (SELECT 1 FROM gsCustomersType WHERE Type = @Category)
        BEGIN
            SELECT 404 AS ResultCode, 'Category not found.' AS ResultMessage;
            RETURN;
        END

        -- Validate Priority exists if specified
        IF @Priority IS NOT NULL AND @Priority <> '' AND NOT EXISTS (SELECT 1 FROM gsPriority WHERE gsPriorityName = @Priority)
        BEGIN
            SELECT 404 AS ResultCode, 'Priority not found.' AS ResultMessage;
            RETURN;
        END

        -- Main query to retrieve contacts
        -- First check if any matching records exist
        IF NOT EXISTS (
            SELECT 1
            FROM gsCustomers a
            INNER JOIN gsEmployees f ON a.gsrepID = f.gsEmployeesID
            LEFT JOIN gsContactTypeDetails g ON a.gscustomersID = g.gsCustomersID
            LEFT JOIN gsContactType h ON g.gsContactTypeID = h.gsContactTypeID
            LEFT JOIN tblCustomer2Category i ON a.gscustomersID = i.contactID
            LEFT JOIN gscustomersType j ON i.categoryID = j.gscustomersTypeID
            LEFT JOIN tblCustomer2Priority k ON a.gscustomersID = k.customerID
            LEFT JOIN gsPriority l ON k.prioritYID = l.gspriorityID
            WHERE (@CustomerID_int IS NULL OR a.gsCustomersID = @CustomerID_int)
            AND (@RepID_int IS NULL OR a.gsrepID = @RepID_int)
            AND a.DateAdded BETWEEN @FromDate_dt AND @ToDate_dt
            AND (@ContactGroup IS NULL OR @ContactGroup = '' OR h.Name = @ContactGroup)
            AND (@Category IS NULL OR @Category = '' OR j.Type = @Category)
            AND (@Priority IS NULL OR @Priority = '' OR l.gsPriorityName = @Priority)
        )
        BEGIN
            SELECT 404 AS ResultCode, 'No records found matching the specified criteria.' AS ResultMessage;
            RETURN;
        END

        -- Return the actual data
        SELECT 
            a.gscustomersID AS CustomerID,
            a.Customer, 
            a.FirstName, 
            a.LastName, 
            a.street AS Address1,
            a.street2 AS Address2,
            a.city AS City,
            a.st AS [State],
            a.Zip,
            a.International AS Country,
            a.Phone,
            a.Phone2,
            a.Email,
            a.URL,
            a.DateAdded, 
            f.Firstname + ' ' + f.lastname AS Rep
        FROM gsCustomers a
        INNER JOIN gsEmployees f ON a.gsrepID = f.gsEmployeesID
        LEFT JOIN gsContactTypeDetails g ON a.gscustomersID = g.gsCustomersID
        LEFT JOIN gsContactType h ON g.gsContactTypeID = h.gsContactTypeID
        LEFT JOIN tblCustomer2Category i ON a.gscustomersID = i.contactID
        LEFT JOIN gscustomersType j ON i.categoryID = j.gscustomersTypeID
        LEFT JOIN tblCustomer2Priority k ON a.gscustomersID = k.customerID
        LEFT JOIN gsPriority l ON k.prioritYID = l.gspriorityID
        WHERE (@CustomerID_int IS NULL OR a.gsCustomersID = @CustomerID_int)
        AND (@RepID_int IS NULL OR a.gsrepID = @RepID_int)
        AND a.DateAdded BETWEEN @FromDate_dt AND @ToDate_dt
        AND (@ContactGroup IS NULL OR @ContactGroup = '' OR h.Name = @ContactGroup)
        AND (@Category IS NULL OR @Category = '' OR j.Type = @Category)
        AND (@Priority IS NULL OR @Priority = '' OR l.gsPriorityName = @Priority)
        ORDER BY a.gsCustomersID
        OFFSET (@PageNumber_int - 1) * @RowsPerPage ROWS
        FETCH NEXT @RowsPerPage ROWS ONLY;

    END TRY
    BEGIN CATCH
        SELECT 500 AS ResultCode, ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;