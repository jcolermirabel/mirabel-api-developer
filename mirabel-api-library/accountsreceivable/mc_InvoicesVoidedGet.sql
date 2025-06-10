/*
Procedure: mc_InvoicesVoidedGet
Description: Retrieves voided/deleted invoices with filtering options and pagination

Parameters:
    @FromDate VARCHAR(50) - Start date for invoice deletion filtering
        - Optional (Default = '01/01/1900' if not provided)
        - Must be a valid date format
        - Used to filter invoices deleted on or after this date
    
    @ToDate VARCHAR(50) - End date for invoice deletion filtering
        - Optional (Default = current date + 100 years if not provided)
        - Must be a valid date format
        - Used to filter invoices deleted on or before this date
    
    @CustomerID VARCHAR(20) - Customer identifier 
        - Optional (Default = NULL retrieves invoices for all customers)
        - Must be a positive integer when provided
        - Must reference an existing customer in gsCustomers table
    
    @InvoiceNumber VARCHAR(50) - Invoice number for specific invoice lookup
        - Optional (Default = NULL)
        - Used to filter by specific invoice number
    
    @PageNumber VARCHAR(20) - Page number for pagination results 
        - Optional (Default = 1)
        - Must be a positive integer
        - Used with fixed page size of 1000 records per page

Return Format:
    Success (200): 
        Table with voided invoice information including:
        - CustomerID (INT)
        - InvoiceID (INT)
        - InvoiceNumber (VARCHAR)
        - InvoiceDate (DATETIME)
        - DueDate (DATETIME)
        - OrderID (INT)
        - ProductID (INT)
        - Product (VARCHAR)
        - IssueID (INT)
        - IssueName (VARCHAR)
        - IssueYear (INT)
        - IssueDate (DATETIME)
        - Amount (DECIMAL)
        - BarterAmount (DECIMAL)
        - DeleteReason (VARCHAR)
        - DateDeleted (DATETIME)
        - DeletedBy (VARCHAR)
    
    Error (400, 404, 500):
        Table with columns:
        - ResultCode (INT): Status code indicating error type
        - ResultMessage (VARCHAR): Human-readable error description

Example Usage:
    -- Get all voided invoices
    EXEC mc_InvoicesVoidedGet
    
    -- Get voided invoices for a specific date range
    EXEC mc_InvoicesVoidedGet @FromDate = '1/1/2023', @ToDate = '6/1/2023'
    
    -- Get voided invoices for a specific customer
    EXEC mc_InvoicesVoidedGet @CustomerID = '42'
    
    -- Get a specific voided invoice by number
    EXEC mc_InvoicesVoidedGet @InvoiceNumber = 'INV-12345'
    
    -- Get voided invoices with pagination
    EXEC mc_InvoicesVoidedGet @PageNumber = '3'

Response Examples:
    -- Successful response (abbreviated):
    CustomerID | InvoiceID | InvoiceNumber  | InvoiceDate | ... | DeleteReason | DateDeleted | DeletedBy
    ---------- | --------- | -------------  | ----------- | --- | ------------ | ----------- | ---------
    42         | 12345     | 2025-12345     | 2025-01-15  | ... | Duplicate    | 2025-01-16  | John Smith
    
    -- Error response:
    ResultCode | ResultMessage
    ---------- | ------------------------------
    400        | Invalid CustomerID format. Must be numeric.
    404        | Customer does not exist.
    404        | No invoices found.
    500        | An error occurred: [Error details]
*/

CREATE OR ALTER PROCEDURE mc_InvoicesVoidedGet
(
    @FromDate VARCHAR(50) = NULL,
    @ToDate VARCHAR(50) = NULL,
    @CustomerID VARCHAR(20) = NULL,
    @InvoiceNumber VARCHAR(50) = NULL,
    @PageNumber VARCHAR(20) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        DECLARE @FromDate_dt DATETIME,
                @ToDate_dt DATETIME,
                @CustomerID_int INT,
                @PageNumber_int INT;
        
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
        END
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid Customer ID format. Must be numeric.' AS ResultMessage;
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
        
        -- Check if invoices exist in the date range
        IF NOT EXISTS (SELECT 1 FROM [dbo].[tblInvoiceDeleted] WHERE DeleteDate BETWEEN @FromDate_dt AND @ToDate_dt)
        BEGIN
            SELECT 404 AS ResultCode, 'No invoices deleted for this date range.' AS ResultMessage;
            RETURN;
        END

        -- Query voided invoices with parameterized query (no dynamic SQL)
        ;WITH InvoiceResults AS (
            SELECT 
                a.gsCustomersID AS CustomerID,
                ABS(a.InvoiceID) AS InvoiceID,
                a.InvoiceNumber,
                a.InvoiceDate,
                a.DueDate,
                f.gsContractsID AS OrderID,
                g.gsPublicationID AS ProductID,
                g.PubName AS Product,
                h.ID AS IssueID,
                h.IssueName,
                h.IssueYear,
                h.IssueDate,
                a.Total AS Amount,
                a.BarterTotal AS BarterAmount,
                a.DeleteReason,
                a.DeleteDate AS DateDeleted,
                i.firstname + ' ' + i.lastname AS DeletedBy,
                ROW_NUMBER() OVER (ORDER BY ABS(a.InvoiceID)) AS RowNum
            FROM [dbo].[tblInvoiceDeleted] a WITH(NOLOCK)
            LEFT OUTER JOIN gscustomers b ON a.gsCustomersID = b.gsCustomersID
            LEFT OUTER JOIN tblinvoicelineitem e ON ABS(a.InvoiceID) = e.InvoiceID
            LEFT OUTER JOIN gsContracts f ON e.gsContractsID = f.gsContractsID
			LEFT JOIN tblInvoice2Zone j on a.invoiceID = j.InvoiceID
            LEFT OUTER JOIN gsPublications g ON isnull(f.PubID, j.zoneID) = g.gsPublicationID
            LEFT OUTER JOIN tblmagfrequency h ON f.mnth = h.ID
            LEFT JOIN gsEmployees i ON a.DeletedByUserID = i.gsEmployeesID
            WHERE a.DeleteDate BETWEEN @FromDate_dt AND @ToDate_dt
            AND (@CustomerID_int IS NULL OR a.gsCustomersID = @CustomerID_int)
            AND (@InvoiceNumber IS NULL OR a.InvoiceNumber = @InvoiceNumber)
        )
        SELECT 
            CustomerID,
            InvoiceID,
            InvoiceNumber,
            InvoiceDate,
            DueDate,
            OrderID,
            ProductID,
            Product,
            IssueID,
            IssueName,
            IssueYear,
            IssueDate,
            Amount,
            BarterAmount,
            DeleteReason,
            DateDeleted,
            DeletedBy
        FROM InvoiceResults
        WHERE RowNum BETWEEN ((@PageNumber_int - 1) * @RowsPerPage) + 1 
            AND (@PageNumber_int * @RowsPerPage)
        ORDER BY InvoiceID;

        -- Check if any results were returned
        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 404 AS ResultCode, 'No invoices found matching the specified criteria.' AS ResultMessage;
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