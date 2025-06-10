/*
Procedure: mc_ContactActivityGet
Description: Retrieves customer activity notes with filtering and pagination options

Parameters:
    @CustomerID VARCHAR(20) - Customer identifier 
        - Optional (Default = NULL retrieves activities for all customers)
        - Must be a positive integer when provided
        - Must reference an existing customer in gsCustomers table
    
    @FromDate VARCHAR(50) - Start date for activity filtering
        - Optional (Default = '01/01/1900' if not provided)
        - Must be a valid date format
        - Used to filter activities created on or after this date
    
    @ToDate VARCHAR(50) - End date for activity filtering
        - Optional (Default = current date + 100 years if not provided)
        - Must be a valid date format
        - Used to filter activities created on or before this date
    
    @PageNumber VARCHAR(20) - Page number for pagination results 
        - Optional (Default = 1)
        - Must be a positive integer
        - Used with fixed page size of 1000 records per page

Return Format:
    Success (200): 
        Table with customer activity information including:
        - CustomerID (INT)
        - Customer (VARCHAR)
        - FirstName (VARCHAR)
        - LastName (VARCHAR)
        - gsActivitiesID (INT)
        - Notes (VARCHAR)
        - Rep (VARCHAR)
        - DateAdded (DATETIME)
        - CallBack (DATETIME)
        - Meeting (DATETIME)
    
    Error (400, 404, 500):
        Table with columns:
        - ResultCode (INT): Status code indicating error type
        - ResultMessage (VARCHAR): Human-readable error description

Example Usage:
    -- Get activities for a specific customer
    EXEC mc_ContactActivityGet @CustomerID = '67'
    
    -- Get activities for a specific customer within a date range
    EXEC mc_ContactActivityGet @CustomerID = '36', @FromDate = '01/01/2013', @ToDate = '1/1/2017'
    
    -- Get all customer activities (first page)
    EXEC mc_ContactActivityGet
    
    -- Get all customer activities (specific page)
    EXEC mc_ContactActivityGet @PageNumber = '3'

Response Examples:
    -- Successful response (abbreviated):
    CustomerID | ExtID | Customer | FirstName | LastName | gsActivitiesID | Notes | Rep | DateAdded | CallBack | Meeting | IsSystem
    ---------- | ----- | -------- | --------- | -------- | -------------- | ----- | --- | --------- | -------- | ------- | --------
    36         | 123   | ABC Corp | John      | Smith    | 456            | ...   | ... | ...       | ...      | ...     | 0
    
    -- Error response:
    ResultCode | ResultMessage
    ---------- | ------------------------------
    400        | Invalid CustomerID format. Must be numeric.
    404        | Customer does not exist.
    404        | No notes match the criteria.
    500        | An error occurred: [Error details]
*/

CREATE OR ALTER PROCEDURE mc_ContactActivityGet
(
    @CustomerID VARCHAR(20) = NULL,
    @FromDate VARCHAR(50) = NULL,
    @ToDate VARCHAR(50) = NULL,
    @PageNumber VARCHAR(20) = NULL
) 
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        DECLARE @CustomerID_int INT,
                @FromDate_dt DATETIME,
                @ToDate_dt DATETIME,
                @PageNumber_int INT;
        
        -- Convert and validate CustomerID
        IF @CustomerID IS NULL OR @CustomerID = ''
            SET @CustomerID_int = NULL
        ELSE IF ISNUMERIC(@CustomerID) = 1
        BEGIN
            SET @CustomerID_int = CAST(@CustomerID AS INT);
            IF @CustomerID_int < 1
            BEGIN
                SELECT 400 AS ResultCode, 'Customer ID must be greater than 0.' AS ResultMessage;
                RETURN;
            END
            
            -- Check if the customer exists
            IF NOT EXISTS (SELECT 1 FROM gsCustomers WHERE gsCustomersID = @CustomerID_int)
            BEGIN
                SELECT 404 AS ResultCode, 'Customer does not exist.' AS ResultMessage;
                RETURN;
            END
            
            -- Check if the customer has any notes
            IF NOT EXISTS (SELECT 1 FROM gsActivities WHERE gsCustomersID = @CustomerID_int)
            BEGIN
                SELECT 404 AS ResultCode, 'Customer does not have any notes.' AS ResultMessage;
                RETURN;
            END
        END
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid Customer ID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Convert and validate FromDate
        IF @FromDate IS NULL OR @FromDate = ''
            SET @FromDate_dt = '01/01/1900'
        ELSE
        BEGIN
            IF ISDATE(@FromDate) = 0
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid FromDate format. Must be a valid date.' AS ResultMessage;
                RETURN;
            END
            SET @FromDate_dt = CAST(@FromDate AS DATETIME);
        END
        
        -- Convert and validate ToDate
        IF @ToDate IS NULL OR @ToDate = ''
            SET @ToDate_dt = '12/31/9999'
        ELSE
        BEGIN
            IF ISDATE(@ToDate) = 0
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid ToDate format. Must be a valid date.' AS ResultMessage;
                RETURN;
            END
            SET @ToDate_dt = CAST(@ToDate AS DATETIME);
        END
        
        -- Validate date range
        IF @FromDate_dt > @ToDate_dt
        BEGIN
            SELECT 400 AS ResultCode, 'FromDate must be earlier than or equal to ToDate.' AS ResultMessage;
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
        
        -- Check if activities exist in the date range
        IF NOT EXISTS (SELECT 1 FROM gsActivities WHERE DateAdded BETWEEN @FromDate_dt AND @ToDate_dt)
        BEGIN
            SELECT 404 AS ResultCode, 'No activity added in this date range.' AS ResultMessage;
            RETURN;
        END

        -- Query customer activities with parameterized query (no dynamic SQL)
        ;WITH ActivityResults AS (
            SELECT 
                a.gsCustomersID AS CustomerID, 
                c.Customer, 
                c.FirstName, 
                c.LastName, 
                a.gsActivitiesID, 
                a.Notes, 
                b.Firstname + ' ' + b.lastname AS Rep, 
                a.DateAdded, 
                a.CallBack, 
                a.Meeting, 
                a.IsSystem,
                ROW_NUMBER() OVER (ORDER BY a.gsActivitiesID) AS RowNum
            FROM gsActivities a
            INNER JOIN gsEmployees b ON a.gsemployeesID = b.gsemployeesID
            INNER JOIN gsCustomers c ON a.gsCustomersID = c.gsCustomersID
            WHERE a.DateAdded BETWEEN @FromDate_dt AND @ToDate_dt
            AND (@CustomerID_int IS NULL OR a.gsCustomersID = @CustomerID_int)
        )
        SELECT 
            CustomerID, 
            Customer, 
            FirstName, 
            LastName, 
            gsActivitiesID, 
            Notes, 
            Rep, 
            DateAdded, 
            CallBack, 
            Meeting, 
            IsSystem
        FROM ActivityResults
        WHERE RowNum BETWEEN ((@PageNumber_int - 1) * @RowsPerPage) + 1 
            AND (@PageNumber_int * @RowsPerPage)
        ORDER BY gsActivitiesID;

        -- Check if any results were returned
        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 404 AS ResultCode, 'No notes match the criteria.' AS ResultMessage;
            RETURN;
        END
    END TRY
    BEGIN CATCH
        SELECT 
            500 AS ResultCode,
            'An error occurred: ' + ERROR_MESSAGE() AS ResultMessage;
        RETURN;
    END CATCH
END;
