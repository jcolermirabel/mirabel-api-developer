/*
Procedure: mc_InvoicePaymentsVoidedGet
Description: Retrieves voided/deleted invoice payments with filtering options and pagination

Parameters:
    @PaymentDateFrom VARCHAR(50) - Start date for payment date filtering
        - Optional (Default = '1900-01-01' if not provided)
        - Must be a valid date format (YYYY-MM-DD recommended)
        - Used to filter payments made on or after this date
    
    @PaymentDateTo VARCHAR(50) - End date for payment date filtering
        - Optional (Default = '9999-12-31' if not provided)
        - Must be a valid date format (YYYY-MM-DD recommended)
        - Used to filter payments made on or before this date
    
    @DeleteDateFrom VARCHAR(50) - Start date for deletion date filtering
        - Optional (Default = '1900-01-01' if not provided)
        - Must be a valid date format (YYYY-MM-DD recommended)
        - Used to filter payments deleted on or after this date
    
    @DeleteDateTo VARCHAR(50) - End date for deletion date filtering
        - Optional (Default = '9999-12-31' if not provided)
        - Must be a valid date format (YYYY-MM-DD recommended)
        - Used to filter payments deleted on or before this date
    
    @ProductID VARCHAR(10) - Product identifier
        - Optional (Default = NULL retrieves payments for all products)
        - Must be a positive integer when provided
        - Must reference an existing product in gsPublications table
    
    @IssueID VARCHAR(10) - Issue identifier
        - Optional (Default = NULL retrieves payments for all issues)
        - Must be a positive integer when provided
        - Must reference an existing issue in tblmagfrequency table
    
    @PageNumber VARCHAR(10) - Page number for pagination results
        - Optional (Default = 1)
        - Must be a positive integer
        - Used with fixed page size of 1000 records per page
    
    @CustomerID VARCHAR(10) - Customer identifier
        - Optional (Default = NULL retrieves payments for all customers)
        - Must be a positive integer when provided
        - Must reference an existing customer with payments
    
    @InvoiceID VARCHAR(10) - Invoice identifier
        - Optional (Default = NULL retrieves payments for all invoices)
        - Must be a positive integer when provided
        - Must reference an existing invoice in tblinvoicepayment table

Return Format:
    Success (200): 
        Table with voided payment information including:
        - CustomerID (INT)
        - InvoiceID (INT)
        - InvoiceNumber (VARCHAR)
        - PaymentDate (DATETIME)
        - DeleteDate (DATETIME)
        - OrderID (INT)
        - ProductID (INT)
        - Product (VARCHAR)
        - IssueID (INT)
        - IssueName (VARCHAR)
        - IssueYear (INT)
        - IssueDate (DATETIME)
        - AmountPaid (DECIMAL)
        - CheckNumber (VARCHAR)
        - PaymentMethod (VARCHAR)
        - Memo (VARCHAR)
        - PaymentNumber (VARCHAR)
        - DeletedBy (VARCHAR)
    
    Error (400, 404, 500):
        Table with columns:
        - ResultCode (INT): Status code indicating error type
        - ResultMessage (VARCHAR): Human-readable error description

Example Usage:
    -- Get all voided payments
    EXEC mc_InvoicePaymentsVoidedGet
    
    -- Get voided payments for a specific payment date range
    EXEC mc_InvoicePaymentsVoidedGet @PaymentDateFrom = '2023-01-01', @PaymentDateTo = '2023-06-30'
    
    -- Get voided payments for a specific deletion date range
    EXEC mc_InvoicePaymentsVoidedGet @DeleteDateFrom = '2023-01-01', @DeleteDateTo = '2023-06-30'
    
    -- Get voided payments for a specific product
    EXEC mc_InvoicePaymentsVoidedGet @ProductID = '42'
    
    -- Get voided payments for a specific customer
    EXEC mc_InvoicePaymentsVoidedGet @CustomerID = '123'
    
    -- Get voided payments for a specific invoice
    EXEC mc_InvoicePaymentsVoidedGet @InvoiceID = '456'
    
    -- Get voided payments with pagination
    EXEC mc_InvoicePaymentsVoidedGet @PageNumber = '3'

Response Examples:
    -- Successful response (abbreviated):
    CustomerID | InvoiceID | InvoiceNumber | PaymentDate | DeleteDate | ... | AmountPaid | DeletedBy
    ---------- | --------- | ------------- | ----------- | ---------- | --- | ---------- | ---------
    123        | 456       | INV-456       | 2023-01-15  | 2023-01-16 | ... | 1250.00    | John Smith
    
    -- Error response:
    ResultCode | ResultMessage
    ---------- | ------------------------------
    400        | Invalid PaymentDateFrom format. Use YYYY-MM-DD.
    404        | Product ID not found.
    404        | No payments found matching the specified criteria.
    500        | [Detailed error message from SQL Server]
*/
CREATE OR ALTER PROCEDURE [dbo].[mc_InvoicePaymentsVoidedGet]
(
    @PaymentDateFrom VARCHAR(50) = NULL,
    @PaymentDateTo VARCHAR(50) = NULL,
    @DeleteDateFrom VARCHAR(50) = NULL,
    @DeleteDateTo VARCHAR(50) = NULL,
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
                @DeleteDateFrom_dt DATETIME,
                @DeleteDateTo_dt DATETIME,
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
        IF @DeleteDateFrom IS NULL OR @DeleteDateFrom = ''
            SET @DeleteDateFrom_dt = '1900-01-01'
        ELSE
        BEGIN
            SET @DeleteDateFrom_dt = TRY_CAST(@DeleteDateFrom AS DATETIME)
            IF @DeleteDateFrom_dt IS NULL
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid DeleteDateFrom format. Use YYYY-MM-DD.' AS ResultMessage;
                RETURN;
            END
        END

        -- Convert and validate CreateDateTo
        IF @DeleteDateTo IS NULL OR @DeleteDateTo = ''
            SET @DeleteDateTo_dt = '9999-12-31'
        ELSE
        BEGIN
            SET @DeleteDateTo_dt = TRY_CAST(@DeleteDateTo AS DATETIME)
            IF @DeleteDateTo_dt IS NULL
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid DeleteDateTo format. Use YYYY-MM-DD.' AS ResultMessage;
                RETURN;
            END
        END

        -- Validate date ranges
        IF @PaymentDateFrom_dt > @PaymentDateTo_dt
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid payment date range: PaymentDateFrom must be less than or equal to PaymentDateTo.' AS ResultMessage;
            RETURN;
        END

        IF @DeleteDateFrom_dt > @DeleteDateTo_dt
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid create date range: DeleteDateFrom must be less than or equal to CreateDateTo.' AS ResultMessage;
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
            FROM tblInvoicePaymentDeleted
            WHERE PaymentDate BETWEEN @PaymentDateFrom_dt AND @PaymentDateTo_dt
            AND DeleteDate BETWEEN @DeleteDateFrom_dt AND @DeleteDateTo_dt
        )
        BEGIN
            SELECT 404 AS ResultCode, 'No payments exist for the specified date range.' AS ResultMessage;
            RETURN;
        END

        -- Check if any matching records exist with all filters
        IF NOT EXISTS (
            SELECT 1
            FROM tblInvoicePaymentDeleted pay
            LEFT JOIN tblInvoice a ON pay.InvoiceID = a.InvoiceID
            LEFT JOIN gsCustomers b ON pay.gsCustomersID = b.gsCustomersID
            LEFT JOIN tblInvoiceLineItem e ON pay.InvoiceID = e.InvoiceID
            LEFT JOIN gsContracts f ON e.gsContractsID = f.gsContractsID
            LEFT JOIN gsPublications g ON f.PubID = g.gsPublicationID
            LEFT JOIN tblmagfrequency h ON f.mnth = h.ID
            WHERE pay.PaymentDate BETWEEN @PaymentDateFrom_dt AND @PaymentDateTo_dt
            AND pay.DeleteDate BETWEEN @DeleteDateFrom_dt AND @DeleteDateTo_dt
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
            pay.DeleteDate,
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
            pay.PaymentNumber,
			i.firstname + ' ' + i.lastname as DeletedBy
        FROM tblInvoicePaymentDeleted pay
        LEFT JOIN tblInvoice a ON pay.InvoiceID = a.InvoiceID
        LEFT JOIN gsCustomers b ON pay.gsCustomersID = b.gsCustomersID
        LEFT JOIN tblInvoiceLineItem e ON pay.InvoiceID = e.InvoiceID
        LEFT JOIN gsContracts f ON e.gsContractsID = f.gsContractsID
        LEFT JOIN gsPublications g ON f.PubID = g.gsPublicationID
        LEFT JOIN tblmagfrequency h ON f.mnth = h.ID
		LEFT JOIN gsEmployees i ON pay.DeletedByUserID = i.gsEmployeesID
        WHERE pay.PaymentDate BETWEEN @PaymentDateFrom_dt AND @PaymentDateTo_dt
        AND pay.DeleteDate BETWEEN @DeleteDateFrom_dt AND @DeleteDateTo_dt
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