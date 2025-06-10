/*
 =============================================
 API Documentation - mc_InvoicePaymentsGet
 Description: Retrieves invoice payment information with optional filtering and pagination
 
 Parameters:
   @PaymentDateFrom  - Optional. Start date for payment date filtering
                      Format: DateTime (YYYY-MM-DD)
                      Values: NULL/Empty ('1900-01-01'), Valid date
                      Default: '1900-01-01'
   @PaymentDateTo    - Optional. End date for payment date filtering
                      Format: DateTime (YYYY-MM-DD)
                      Values: NULL/Empty ('9999-12-31'), Valid date
                      Default: '9999-12-31'
   @CreateDateFrom   - Optional. Start date for creation date filtering
                      Format: DateTime (YYYY-MM-DD)
                      Values: NULL/Empty ('1900-01-01'), Valid date
                      Default: '1900-01-01'
   @CreateDateTo     - Optional. End date for creation date filtering
                      Format: DateTime (YYYY-MM-DD)
                      Values: NULL/Empty ('9999-12-31'), Valid date
                      Default: '9999-12-31'
   @ProductID        - Optional. Filter by product ID
                      Values: NULL/Empty (All), > 0 (Specific product)
                      Default: NULL
   @IssueID          - Optional. Filter by issue ID
                      Values: NULL/Empty (All), > 0 (Specific issue)
                      Default: NULL
   @InvoiceID         - Optional. Filter by invoice ID
                      Values: NULL/Empty (All), > 0 (Specific invoice)
                      Default: NULL
   @CustomerID        - Optional. Filter by Customer ID
                      Values: NULL/Empty (All), > 0 (Specific customer)
                      Default: NULL
   @PageNumber       - Optional. Page number for pagination
                      Values: NULL/Empty (1), > 0 (Specific page)
                      Default: 1
                      Page size: 1000 records
 
 Returns:
 Success: Table with columns
   CustomerID        - Customer identifier
   InvoiceID         - Invoice identifier
   InvoiceNumber     - Invoice number
   PaymentDate       - Date the payment was made
   CreateDate        - Date the payment was created
   OrderID           - Order/Contract identifier
   ProductID         - Product identifier
   Product           - Product name
   IssueID           - Issue identifier
   IssueName         - Issue name
   IssueYear         - Issue year
   IssueDate         - Issue date
   AmountPaid        - Payment amount
   CheckNumber       - Check number
   PaymentMethod     - Method of payment
   Memo              - Payment memo
   PaymentNumber     - Payment identifier

 Error: Table with columns
   ResultCode        - Status code (400, 404, 500)
   ResultMessage     - Description of the error

 Status Codes:
   200 - Success (implicit for data return)
   400 - Bad request (invalid parameters)
   404 - Resource not found
   500 - Server error

 Example Usage:
 EXEC mc_InvoicePaymentsGet @PaymentDateFrom = '2023-01-01', @PaymentDateTo = '2023-12-31', @customerID = 116
 EXEC mc_InvoicePaymentsGet @ProductID = '5', @PageNumber = '2'
 EXEC mc_InvoicePaymentsGet @IssueID = '10', @CreateDateFrom = '2023-06-01', @CreateDateTo = '2023-12-31'
 
 Example Success Response:
 CustomerID  InvoiceID  InvoiceNumber  PaymentDate  CreateDate  OrderID  ProductID  Product  ...
 ----------  ---------  -------------  -----------  ----------  -------  ---------  -------  ...
 1001        5001       INV-5001       2023-06-15   2023-06-15  1234     10         Magazine ...
 1002        5002       INV-5002       2023-06-20   2023-06-20  1235     10         Magazine ...

 Example Error Response:
 ResultCode  ResultMessage
 ----------  -------------
 400         Invalid PaymentDateFrom format. Use YYYY-MM-DD.
 404         No payments found matching the specified criteria.
 =============================================

*/
CREATE OR ALTER PROCEDURE [dbo].[mc_InvoicePaymentsGet]
(
    @PaymentDateFrom VARCHAR(50) = NULL,
    @PaymentDateTo VARCHAR(50) = NULL,
    @CreateDateFrom VARCHAR(50) = NULL,
    @CreateDateTo VARCHAR(50) = NULL,
    @ProductID VARCHAR(10) = NULL,
    @IssueID VARCHAR(10) = NULL,
    @PageNumber VARCHAR(10) = NULL,
	@CustomerID VARCHAR(10) = NULL,
	@InvoiceID VARCHAR(10) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        -- Variable declarations
        DECLARE @PaymentDateFrom_dt DATETIME,
                @PaymentDateTo_dt DATETIME,
                @CreateDateFrom_dt DATETIME,
                @CreateDateTo_dt DATETIME,
                @ProductID_int INT,
                @IssueID_int INT,
                @PageNumber_int INT,
				@CustomerID_int INT,
				@InvoiceID_int INT;

        -- Convert and validate PaymentDateFrom
        IF @PaymentDateFrom IS NULL OR @PaymentDateFrom = ''
            SET @PaymentDateFrom_dt = '1900-01-01'
        ELSE
        BEGIN
            SET @PaymentDateFrom_dt = TRY_CAST(@PaymentDateFrom AS DATETIME)
            IF @PaymentDateFrom_dt IS NULL
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid PaymentDateFrom format. Use YYYY-MM-DD.' AS ResultMessage;
                RETURN;
            END
        END

        -- Convert and validate PaymentDateTo
        IF @PaymentDateTo IS NULL OR @PaymentDateTo = ''
            SET @PaymentDateTo_dt = '9999-12-31'
        ELSE
        BEGIN
            SET @PaymentDateTo_dt = TRY_CAST(@PaymentDateTo AS DATETIME)
            IF @PaymentDateTo_dt IS NULL
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid PaymentDateTo format. Use YYYY-MM-DD.' AS ResultMessage;
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
        IF @PaymentDateFrom_dt > @PaymentDateTo_dt
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid payment date range: PaymentDateFrom must be less than or equal to PaymentDateTo.' AS ResultMessage;
            RETURN;
        END

        IF @CreateDateFrom_dt > @CreateDateTo_dt
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid create date range: CreateDateFrom must be less than or equal to CreateDateTo.' AS ResultMessage;
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

	       -- Convert and validate InvoiceID
        IF @InvoiceID IS NULL OR @InvoiceID = ''
            SET @InvoiceID_int = NULL
        ELSE IF ISNUMERIC(@InvoiceID) = 1
            SET @CustomerID_int = CAST(@InvoiceID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid InvoiceID format. Must be numeric.' AS ResultMessage;
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

        -- Validate invoiceID exists if specified
        IF @InvoiceID_int IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tblinvoicepayment WHERE ID = @InvoiceID_int)
        BEGIN
            SELECT 404 AS ResultCode, 'Invoice ID not found.' AS ResultMessage;
            RETURN;
        END

        -- Validate customerID exists if specified
        IF @CustomerID_int IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tblInvoicePayment WHERE gsCustomersID = @CustomerID_int)
        BEGIN
            SELECT 404 AS ResultCode, 'Customer ID not found.' AS ResultMessage;
            RETURN;
        END

        -- Check if any payments exist in the specified date range
        IF NOT EXISTS (
            SELECT 1 
            FROM tblInvoicePayment 
            WHERE PaymentDate BETWEEN @PaymentDateFrom_dt AND @PaymentDateTo_dt
            AND CreateDate BETWEEN @CreateDateFrom_dt AND @CreateDateTo_dt
        )
        BEGIN
            SELECT 404 AS ResultCode, 'No payments exist for the specified date range.' AS ResultMessage;
            RETURN;
        END

        -- Check if any matching records exist with all filters
        IF NOT EXISTS (
            SELECT 1
            FROM tblInvoicePayment pay
            LEFT JOIN tblInvoice a ON pay.InvoiceID = a.InvoiceID
            INNER JOIN gsCustomers b ON pay.gsCustomersID = b.gsCustomersID
            LEFT JOIN tblInvoiceLineItem e ON pay.InvoiceID = e.InvoiceID
            LEFT JOIN gsContracts f ON e.gsContractsID = f.gsContractsID
            LEFT JOIN gsPublications g ON f.PubID = g.gsPublicationID
            LEFT JOIN tblmagfrequency h ON f.mnth = h.ID
            WHERE pay.PaymentDate BETWEEN @PaymentDateFrom_dt AND @PaymentDateTo_dt
            AND pay.CreateDate BETWEEN @CreateDateFrom_dt AND @CreateDateTo_dt
            AND (@ProductID_int IS NULL OR g.gsPublicationID = @ProductID_int)
            AND (@IssueID_int IS NULL OR h.ID = @IssueID_int)
			AND (@CustomerID_int IS NULL OR pay.gsCustomersID = @CustomerID_int)
			AND (@InvoiceID_int IS NULL OR pay.invoiceID = @InvoiceID_int)
        )
        BEGIN
            SELECT 404 AS ResultCode, 'No payments found matching the specified criteria.' AS ResultMessage;
            RETURN;
        END

        -- Return the payment data
        SELECT 
            pay.gsCustomersID AS CustomerID,
            pay.InvoiceID,
            a.InvoiceNumber,
            pay.PaymentDate,
            pay.CreateDate,
            f.gsContractsID AS OrderID,
            f.PubID AS ProductID,
            g.PubName AS Product,
            h.ID AS IssueID,
            h.IssueName,
            h.IssueYear,
            h.IssueDate,
            pay.AmountPaid,
            pay.CheckNumber,
            pay.PaymentMethod,
            pay.Memo,
            pay.PaymentNumber
        FROM tblInvoicePayment pay
        LEFT JOIN tblInvoice a ON pay.InvoiceID = a.InvoiceID
        INNER JOIN gsCustomers b ON pay.gsCustomersID = b.gsCustomersID
        LEFT JOIN tblInvoiceLineItem e ON pay.InvoiceID = e.InvoiceID
        LEFT JOIN gsContracts f ON e.gsContractsID = f.gsContractsID
        LEFT JOIN gsPublications g ON f.PubID = g.gsPublicationID
        LEFT JOIN tblmagfrequency h ON f.mnth = h.ID
        WHERE pay.PaymentDate BETWEEN @PaymentDateFrom_dt AND @PaymentDateTo_dt
        AND pay.CreateDate BETWEEN @CreateDateFrom_dt AND @CreateDateTo_dt
        AND (@ProductID_int IS NULL OR g.gsPublicationID = @ProductID_int)
        AND (@IssueID_int IS NULL OR h.ID = @IssueID_int)
		AND (@CustomerID_int IS NULL OR pay.gsCustomersID = @CustomerID_int)
		AND (@InvoiceID_int IS NULL OR pay.invoiceID = @InvoiceID_int)
        ORDER BY pay.ID
        OFFSET (@PageNumber_int - 1) * @RowsPerPage ROWS
        FETCH NEXT @RowsPerPage ROWS ONLY;

    END TRY
    BEGIN CATCH
        SELECT 500 AS ResultCode, ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;