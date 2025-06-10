 
 /*
 =============================================
 API Documentation - mc_InvoicesGet
 Description:    Retrieves invoice information with optional filtering and pagination
 
 Parameters:
   @InvoiceDateFrom  - Optional. Start date for invoice date filtering
                      Format: DateTime (YYYY-MM-DD)
                      Default: '1900-01-01'
   @InvoiceDateTo    - Optional. End date for invoice date filtering
                      Format: DateTime (YYYY-MM-DD)
                      Default: '9999-12-31'
   @CreateDateFrom   - Optional. Start date for creation date filtering
                      Format: DateTime (YYYY-MM-DD)
                      Default: '1900-01-01'
   @CreateDateTo     - Optional. End date for creation date filtering
                      Format: DateTime (YYYY-MM-DD)
                      Default: '9999-12-31'
   @ProductID        - Optional. Filter by product ID
                      Values: NULL (All), > 0 (Specific product)
                      Default: NULL
   @IssueID          - Optional. Filter by issue ID
                      Values: NULL (All), > 0 (Specific issue)
                      Default: NULL
   @PageNumber       - Optional. Page number for pagination
                      Values: > 0
                      Default: 1
                      Page size: 1000 records
 
 Returns:
 Success: Table with columns
   CustomerID        - Customer identifier
   InvoiceID         - Invoice identifier
   InvoiceNumber     - Invoice number
   InvoiceDate       - Date the invoice was issued
   CreateDate        - Date the invoice was created
   DateLastModified  - Date the invoice was last modified
   DueDate           - Invoice due date
   OrderID           - Order/Contract identifier
   ProductID         - Product identifier
   Product           - Product name
   IssueID           - Issue identifier
   IssueName         - Issue name
   IssueYear         - Issue year
   IssueDate         - Issue date
   Amount            - Invoice amount
   BarterAmount      - Barter amount

 Error: Table with columns
   ResultCode        - Status code (400, 404, 500, etc.)
   ResultMessage     - Description of the error

 Status Codes:
   200 - Success (implicit for data return)
   400 - Bad request (invalid parameters)
   404 - Resource not found
   500 - Server error

 Example Usage:
 EXEC mc_InvoicesGet @InvoiceDateFrom = '2023-01-01', @InvoiceDateTo = '2023-12-31'
 EXEC mc_InvoicesGet @ProductID = 5, @PageNumber = 2
 EXEC mc_InvoicesGet @IssueID = 10, @CreateDateFrom = '2023-06-01'
 =============================================

*/
CREATE OR ALTER PROCEDURE [dbo].[mc_InvoicesGet]
(
    @InvoiceDateFrom VARCHAR(50) = NULL,
    @InvoiceDateTo VARCHAR(50) = NULL,
    @CreateDateFrom VARCHAR(50) = NULL,
    @CreateDateTo VARCHAR(50) = NULL,
    @ProductID VARCHAR(10) = NULL,
    @IssueID VARCHAR(10) = NULL,
    @PageNumber VARCHAR(10) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        -- Variable declarations
        DECLARE @InvoiceDateFrom_dt DATETIME,
                @InvoiceDateTo_dt DATETIME,
                @CreateDateFrom_dt DATETIME,
                @CreateDateTo_dt DATETIME,
                @ProductID_int INT,
                @IssueID_int INT,
                @PageNumber_int INT;

        -- Convert and validate InvoiceDateFrom
        IF @InvoiceDateFrom IS NULL OR @InvoiceDateFrom = ''
            SET @InvoiceDateFrom_dt = '1900-01-01'
        ELSE
        BEGIN
            SET @InvoiceDateFrom_dt = TRY_CAST(@InvoiceDateFrom AS DATETIME)
            IF @InvoiceDateFrom_dt IS NULL
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid InvoiceDateFrom format. Use YYYY-MM-DD.' AS ResultMessage;
                RETURN;
            END
        END

        -- Convert and validate InvoiceDateTo
        IF @InvoiceDateTo IS NULL OR @InvoiceDateTo = ''
            SET @InvoiceDateTo_dt = '9999-12-31'
        ELSE
        BEGIN
            SET @InvoiceDateTo_dt = TRY_CAST(@InvoiceDateTo AS DATETIME)
            IF @InvoiceDateTo_dt IS NULL
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid InvoiceDateTo format. Use YYYY-MM-DD.' AS ResultMessage;
                RETURN;
            END
        END

        -- Convert and validate CreateDateFrom
        IF @CreateDateFrom IS NULL OR @CreateDateFrom = ''
            SET @CreateDateFrom_dt = '1900-01-01'
        ELSE
        BEGIN
            SET @CreateDateFrom_dt = TRY_CAST(@CreateDateFrom AS DATETIME)
            IF @CreateDateFrom_dt IS NULL
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid CreateDateFrom format. Use YYYY-MM-DD.' AS ResultMessage;
                RETURN;
            END
        END

        -- Convert and validate CreateDateTo
        IF @CreateDateTo IS NULL OR @CreateDateTo = ''
            SET @CreateDateTo_dt = '9999-12-31'
        ELSE
        BEGIN
            SET @CreateDateTo_dt = TRY_CAST(@CreateDateTo AS DATETIME)
            IF @CreateDateTo_dt IS NULL
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid CreateDateTo format. Use YYYY-MM-DD.' AS ResultMessage;
                RETURN;
            END
        END

        -- Validate date ranges
        IF @InvoiceDateFrom_dt > @InvoiceDateTo_dt
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid invoice date range: FromDate must be less than or equal to ToDate.' AS ResultMessage;
            RETURN;
        END

        IF @CreateDateFrom_dt > @CreateDateTo_dt
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid create date range: FromDate must be less than or equal to ToDate.' AS ResultMessage;
            RETURN;
        END

        -- Convert and validate ProductID
        IF @ProductID IS NULL OR @ProductID = ''
            SET @ProductID_int = NULL
        ELSE IF ISNUMERIC(@ProductID) = 1
            SET @ProductID_int = CAST(@ProductID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid ProductID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Convert and validate IssueID
        IF @IssueID IS NULL OR @IssueID = ''
            SET @IssueID_int = NULL
        ELSE IF ISNUMERIC(@IssueID) = 1
            SET @IssueID_int = CAST(@IssueID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid IssueID format. Must be numeric.' AS ResultMessage;
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

        -- Validate ProductID exists if specified
        IF @ProductID_int IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gsPublications WHERE gsPublicationID = @ProductID_int)
        BEGIN
            SELECT 404 AS ResultCode, 'Product ID not found.' AS ResultMessage;
            RETURN;
        END

        -- Validate IssueID exists if specified
        IF @IssueID_int IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tblmagfrequency WHERE ID = @IssueID_int)
        BEGIN
            SELECT 404 AS ResultCode, 'Issue ID not found.' AS ResultMessage;
            RETURN;
        END

        -- Check if any invoices exist in the specified date range
        IF NOT EXISTS (
            SELECT 1 
            FROM tblInvoice 
            WHERE InvoiceDate BETWEEN @InvoiceDateFrom_dt AND @InvoiceDateTo_dt
            AND ISNULL(UpdateDate, CreateDate) BETWEEN @CreateDateFrom_dt AND @CreateDateTo_dt
        )
        BEGIN
            SELECT 404 AS ResultCode, 'No invoices exist for the specified date range.' AS ResultMessage;
            RETURN;
        END

        -- Main query to retrieve invoices
        -- First check if any matching records exist with all filters
        IF NOT EXISTS (
            SELECT 1
            FROM tblInvoice a
            INNER JOIN gsCustomers b ON a.gsCustomersID = b.gsCustomersID
            LEFT JOIN tblInvoiceLineItem e ON a.InvoiceID = e.InvoiceID
            LEFT JOIN gsContracts f ON e.gsContractsID = f.gsContractsID
            INNER JOIN gsPublications g ON f.PubID = g.gsPublicationID
            INNER JOIN tblmagfrequency h ON f.mnth = h.ID
            WHERE a.InvoiceDate BETWEEN @InvoiceDateFrom_dt AND @InvoiceDateTo_dt
            AND ISNULL(a.UpdateDate, a.CreateDate) BETWEEN @CreateDateFrom_dt AND @CreateDateTo_dt
            AND (@ProductID_int IS NULL OR g.gsPublicationID = @ProductID_int)
            AND (@IssueID_int IS NULL OR h.ID = @IssueID_int)
        )
        BEGIN
            SELECT 404 AS ResultCode, 'No invoices found matching the specified criteria.' AS ResultMessage;
            RETURN;
        END

        -- Return the invoice data
        SELECT 
            a.gsCustomersID AS CustomerID,
            a.InvoiceID,
            a.InvoiceNumber,
            a.InvoiceDate,
            a.CreateDate,
            a.UpdateDate AS DateLastModified,
            a.DueDate,
            f.gsContractsID AS OrderID,
            f.PubID AS ProductID,
            g.PubName AS Product,
            h.ID AS IssueID,
            h.IssueName,
            h.IssueYear,
            h.IssueDate,
            a.Total AS Amount,
            a.BarterTotal AS BarterAmount
        FROM tblInvoice a
        INNER JOIN gsCustomers b ON a.gsCustomersID = b.gsCustomersID
        LEFT JOIN tblInvoiceLineItem e ON a.InvoiceID = e.InvoiceID
        LEFT JOIN gsContracts f ON e.gsContractsID = f.gsContractsID
        INNER JOIN gsPublications g ON f.PubID = g.gsPublicationID
        INNER JOIN tblmagfrequency h ON f.mnth = h.ID
        WHERE a.InvoiceDate BETWEEN @InvoiceDateFrom_dt AND @InvoiceDateTo_dt
        AND ISNULL(a.UpdateDate, a.CreateDate) BETWEEN @CreateDateFrom_dt AND @CreateDateTo_dt
        AND (@ProductID_int IS NULL OR g.gsPublicationID = @ProductID_int)
        AND (@IssueID_int IS NULL OR h.ID = @IssueID_int)
        ORDER BY a.InvoiceID
        OFFSET (@PageNumber_int - 1) * @RowsPerPage ROWS
        FETCH NEXT @RowsPerPage ROWS ONLY;

    END TRY
    BEGIN CATCH
        SELECT 500 AS ResultCode, ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;