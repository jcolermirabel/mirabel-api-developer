-- =============================================
-- API Documentation - mc_OrdersGet
-- Description:    Retrieves order information with filtering and pagination
-- 
-- Parameters:
--   @IssueDateFrom - Start date for issue date filtering
--                  - Optional (Default = NULL, not applied if not provided)
--                  - Must be a valid date format (YYYY-MM-DD recommended)
--                  - Used to filter orders with issue dates on or after this date
--   @IssueDateTo   - End date for issue date filtering
--                  - Optional (Default = NULL, not applied if not provided)
--                  - Must be a valid date format (YYYY-MM-DD recommended)
--                  - Used to filter orders with issue dates on or before this date
--   @CreateDateFrom - Start date for order creation date filtering
--                  - Optional (Default = NULL, not applied if not provided)
--                  - Must be a valid date format (YYYY-MM-DD recommended)
--                  - Used to filter orders created on or after this date
--   @CreateDateTo   - End date for order creation date filtering
--                  - Optional (Default = NULL, not applied if not provided)
--                  - Must be a valid date format (YYYY-MM-DD recommended)
--                  - Used to filter orders created on or before this date
--   @PageNumber     - Page number for pagination results
--                  - Optional (Default = 1)
--                  - Must be a positive integer
--                  - Used with fixed page size of 1000 records per page
--   @ProductID      - Product identifier
--                  - Optional (Default = -2 retrieves orders for all products)
--                  - Must be a positive integer when specified
--                  - Must reference an existing product in gsPublications table
--   @IssueID        - Issue identifier
--                  - Optional (Default = -2 retrieves orders for all issues)
--                  - Must be a positive integer when specified
--                  - Must reference an existing issue in tblMagFrequency table
--   @CustomerID     - Customer identifier
--                  - Optional (Default = -2 retrieves orders for all customers)
--                  - Must be a positive integer when specified
--                  - Must reference an existing customer in gsCustomers table
--   @StageID        - Order stage identifier
--                  - Optional (Default = -2 retrieves orders in all stages)
--                  - Must be a positive integer when specified
--   @BusinessUnitID - Business unit identifier
--                  - Optional (Default = -2 retrieves orders for all business units)
--                  - Must be a positive integer when specified
--   @ProductTypeID  - Product type identifier
--                  - Optional (Default = -2 retrieves orders for all product types)
--                  - Must be a positive integer when specified
--                  - Must reference an existing product type in tblProductType table
-- 
-- Returns:
-- Success: Table with order data columns including:
--   - gsContractsID, orderID, OrderID, Issue, IssueDate, IssueYear, Product
--   - Net, Barter, AdSize, AdSection, AdPosition, DateCreated, DateLastModified
--   - PremiumPosition, AdColor, AdFrequency
--   - Customer information (CustomerID, CompanyName, etc.)
--   - Billing information (BillingCustomerID)
--
-- Error: Table with columns:
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
-- EXEC mc_OrdersGet
-- EXEC mc_OrdersGet @IssueDateFrom = '2023-01-01', @IssueDateTo = '2023-12-31'
-- EXEC mc_OrdersGet @ProductID = '4'
-- EXEC mc_OrdersGet @CustomerID = '30'
-- EXEC mc_OrdersGet @ProductTypeID = '1', @CreateDateFrom = '2024-01-01', @CreateDateTo = '2024-12-31', @IssueID = '10'
-- EXEC mc_OrdersGet @PageNumber = '3'
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[mc_OrdersGet]
(
    @IssueDateFrom VARCHAR(50) = NULL,
    @IssueDateTo VARCHAR(50) = NULL,
    @CreateDateFrom VARCHAR(50) = NULL,
    @CreateDateTo VARCHAR(50) = NULL,
    @PageNumber VARCHAR(10) = NULL,
    @ProductID VARCHAR(10) = NULL,
    @IssueID VARCHAR(10) = NULL,
    @CustomerID VARCHAR(10) = NULL,
    @StageID VARCHAR(10) = NULL,
    @BusinessUnitID VARCHAR(10) = NULL,
    @ProductTypeID VARCHAR(10) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        -- Variable declarations
        DECLARE @IssueDateFrom_dt DATETIME,
                @IssueDateTo_dt DATETIME,
                @CreateDateFrom_dt DATETIME,
                @CreateDateTo_dt DATETIME,
                @PageNumber_int INT,
                @ProductID_int INT,
                @IssueID_int INT,
                @CustomerID_int INT,
                @StageID_int INT,
                @BusinessUnitID_int INT,
                @ProductTypeID_int INT,
                @UseIssueDateFilter BIT = 0,
                @UseCreateDateFilter BIT = 0;

        -- Convert and validate ProductTypeID
        IF @ProductTypeID IS NULL OR @ProductTypeID = ''
            SET @ProductTypeID_int = -2
        ELSE IF ISNUMERIC(@ProductTypeID) = 1
            SET @ProductTypeID_int = CAST(@ProductTypeID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid ProductTypeID format. Must be numeric.' AS ResultMessage;
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

        -- Convert and validate IssueID
        IF @IssueID IS NULL OR @IssueID = ''
            SET @IssueID_int = -2
        ELSE IF ISNUMERIC(@IssueID) = 1
            SET @IssueID_int = CAST(@IssueID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid IssueID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Convert and validate CustomerID
        IF @CustomerID IS NULL OR @CustomerID = ''
            SET @CustomerID_int = -2
        ELSE IF ISNUMERIC(@CustomerID) = 1
            SET @CustomerID_int = CAST(@CustomerID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid CustomerID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Convert and validate StageID
        IF @StageID IS NULL OR @StageID = ''
            SET @StageID_int = -2
        ELSE IF ISNUMERIC(@StageID) = 1
            SET @StageID_int = CAST(@StageID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid StageID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Convert and validate BusinessUnitID
        IF @BusinessUnitID IS NULL OR @BusinessUnitID = ''
            SET @BusinessUnitID_int = -2
        ELSE IF ISNUMERIC(@BusinessUnitID) = 1
            SET @BusinessUnitID_int = CAST(@BusinessUnitID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid BusinessUnitID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Validate ProductTypeID if specified
        IF @ProductTypeID_int > -2 AND NOT EXISTS (
            SELECT 1 FROM tblProductType WHERE subproducttypeID = @ProductTypeID_int AND isenabled = 1
        )
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid product type ID or product type is not enabled.' AS ResultMessage;
            RETURN;
        END

        -- Only check if products exist for this product type if we're filtering by product type
        IF @ProductTypeID_int > -2 AND NOT EXISTS (
            SELECT 1 FROM gsPublications WHERE subproducttypeID = @ProductTypeID_int
        )
        BEGIN
            SELECT 404 AS ResultCode, 'No products exist for this product type.' AS ResultMessage;
            RETURN;
        END

        -- Validate ProductID if specified
        IF @ProductID_int > -2 AND NOT EXISTS (
            SELECT 1 FROM gsPublications WHERE gsPublicationID = @ProductID_int
        )
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid product ID.' AS ResultMessage;
            RETURN;
        END

        -- If both ProductTypeID and ProductID are specified, validate that the product belongs to the product type
        IF @ProductID_int > -2 AND @ProductTypeID_int > -2 AND NOT EXISTS (
            SELECT 1 FROM gsPublications 
            WHERE gsPublicationID = @ProductID_int 
              AND subproducttypeID = @ProductTypeID_int
        )
        BEGIN
            SELECT 400 AS ResultCode, 'The specified product does not belong to the specified product type.' AS ResultMessage;
            RETURN;
        END

        -- Validate IssueID if specified
        IF @IssueID_int > -2 AND NOT EXISTS (
            SELECT 1 FROM tblMagFrequency WHERE ID = @IssueID_int
        )
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid issue ID.' AS ResultMessage;
            RETURN;
        END

        -- Validate CustomerID if specified
        IF @CustomerID_int > -2 AND NOT EXISTS (
            SELECT 1 FROM gsCustomers WHERE gsCustomersID = @CustomerID_int
        )
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid customer ID.' AS ResultMessage;
            RETURN;
        END

        -- Determine if we should use issue date filter
        IF (@IssueDateFrom IS NOT NULL AND @IssueDateFrom <> '') OR 
           (@IssueDateTo IS NOT NULL AND @IssueDateTo <> '')
        BEGIN
            SET @UseIssueDateFilter = 1;
            
            -- Convert and validate IssueDateFrom
            IF @IssueDateFrom IS NULL OR @IssueDateFrom = ''
                SET @IssueDateFrom_dt = '1900-01-01'
            ELSE
            BEGIN
                SET @IssueDateFrom_dt = TRY_CAST(@IssueDateFrom AS DATETIME)
                IF @IssueDateFrom_dt IS NULL
                BEGIN
                    SELECT 400 AS ResultCode, 'Invalid IssueDateFrom format. Use YYYY-MM-DD.' AS ResultMessage;
                    RETURN;
                END
            END

            -- Convert and validate IssueDateTo
            IF @IssueDateTo IS NULL OR @IssueDateTo = ''
                SET @IssueDateTo_dt = '9999-12-31'
            ELSE
            BEGIN
                SET @IssueDateTo_dt = TRY_CAST(@IssueDateTo AS DATETIME)
                IF @IssueDateTo_dt IS NULL
                BEGIN
                    SELECT 400 AS ResultCode, 'Invalid IssueDateTo format. Use YYYY-MM-DD.' AS ResultMessage;
                    RETURN;
                END
            END

            -- Validate issue date range
            IF @IssueDateFrom_dt > @IssueDateTo_dt
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid date range: IssueDateFrom must be less than or equal to IssueDateTo.' AS ResultMessage;
                RETURN;
            END
        END

        -- Determine if we should use create date filter
        IF (@CreateDateFrom IS NOT NULL AND @CreateDateFrom <> '') OR 
           (@CreateDateTo IS NOT NULL AND @CreateDateTo <> '')
        BEGIN
            SET @UseCreateDateFilter = 1;
            
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

            -- Validate create date range
            IF @CreateDateFrom_dt > @CreateDateTo_dt
            BEGIN
                SELECT 400 AS ResultCode, 'Invalid date range: CreateDateFrom must be less than or equal to CreateDateTo.' AS ResultMessage;
                RETURN;
            END
        END

        -- If no date filters are provided, default to all dates
        IF @UseIssueDateFilter = 0 AND @UseCreateDateFilter = 0
        BEGIN
            SET @UseCreateDateFilter = 1;
            SET @CreateDateFrom_dt = '1900-01-01';
            SET @CreateDateTo_dt = '9999-12-31';
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

        -- Check if any orders exist within the date range and with the specified filters
        IF NOT EXISTS (
            SELECT 1 
            FROM gsContracts cont
            INNER JOIN tblMagFrequency freq ON cont.Mnth = freq.ID
            INNER JOIN gsPublications pub ON cont.PubID = pub.gsPublicationID
            LEFT JOIN tblBusinessUnit2Product busunit on pub.gsPublicationID = busunit.ProductID
            WHERE 1=1
            AND (
                (@UseIssueDateFilter = 0) OR
                (@UseIssueDateFilter = 1 AND freq.issuedate BETWEEN @IssueDateFrom_dt AND @IssueDateTo_dt)
            )
            AND (
                (@UseCreateDateFilter = 0) OR
                (@UseCreateDateFilter = 1 AND cont.dateadded BETWEEN @CreateDateFrom_dt AND @CreateDateTo_dt)
            )
            AND (@ProductTypeID_int = -2 OR pub.subproducttypeID = @ProductTypeID_int)
            AND (@ProductID_int = -2 OR pub.gsPublicationID = @ProductID_int)
            AND (@CustomerID_int = -2 OR cont.customerID = @CustomerID_int)
            AND (@StageID_int = -2 OR cont.StageID = @StageID_int)
            AND (@BusinessUnitID_int = -2 OR busunit.BusinessUnitID = @BusinessUnitID_int)
            AND (@IssueID_int = -2 OR freq.ID = @IssueID_int)
        )
        BEGIN
            SELECT 404 AS ResultCode, 'No orders found matching the specified criteria.' AS ResultMessage;
            RETURN;
        END

        SELECT 
            cont.gsContractsID AS OrderID,
            freq.IssueName AS Issue,
            CASE WHEN freq.IssueDate IS NULL THEN cont.startdate ELSE freq.IssueDate END AS IssueDate,
            CASE WHEN cont.mnth = -1 THEN cont.yr ELSE freq.IssueYear END AS IssueYear,
            pub.PubAbbrev AS Product,
            cont.Net,
            cont.Barter,
            adsize.AdSizeName AS AdSize,
            sections.SectionName AS AdSection,
            cont.PosReq1 AS AdPosition,
            cont.DateAdded AS DateCreated,
            cont.datemodified AS DateLastModified,
            REPLACE(ISNULL(cont.PosReq1, ''), -1, '') AS PremiumPosition,
            REPLACE(cont.Color, '-1', '') AS AdColor,
            REPLACE(cont.Frequency, '-1', '') AS AdFrequency,
            cont.StageID,
            cont.CustomerID AS CustomerID,
            cust.customer AS Customer,
            cust.firstName AS CustomerFirstName,
            cust.lastName AS CustomerLastName,
            CASE 
                WHEN cont.billingcontacts LIKE '%-%' THEN 
                    CASE ISNULL(cust.acctbillto, 0) 
                        WHEN 1 THEN 
                            CASE ISNULL(agencybilling.gsCustomersID, 0) 
                                WHEN 0 THEN ISNULL(agency.gsCustomersID, '') 
                                ELSE ISNULL(agencybilling.gsCustomersID, '') 
                            END 
                        ELSE 
                            CASE ISNULL(customerbilling.gsCustomersID, 0) 
                                WHEN 0 THEN ISNULL(cust.gsCustomersID, '') 
                                ELSE ISNULL(customerbilling.gsCustomersID, '') 
                            END
                    END 
                ELSE billto.gsCustomersID 
            END AS [BillingCustomerID]
			, CF.*
        FROM gsContracts cont WITH(NOLOCK)
		INNER JOIN tblCustomFieldDataProduction CF on cont.gsContractsID = CF.gsContractsID
        INNER JOIN tblMagFrequency freq ON cont.Mnth = freq.ID 
        INNER JOIN gsPublications pub ON cont.PubID = pub.gsPublicationID 
        INNER JOIN gsCustomers cust ON cont.CustomerID = cust.gsCustomersID 
        INNER JOIN tblSplitReps ON cont.gsContractsID = tblSplitReps.gsContractsID 
        INNER JOIN gsEmployees ON tblSplitReps.gsEmployeesID = gsEmployees.gsEmployeesID 
        LEFT OUTER JOIN gsPubSections sections ON cont.AdSection = sections.gsPubSectionsID 
        LEFT OUTER JOIN gsAdSize adsize ON cont.AdSize = adsize.gsAdSizeID 
        LEFT JOIN tblBusinessUnit2Product busunit on pub.gsPublicationID = busunit.ProductID
        INNER JOIN gsContractsInstallment ON cont.gsContractsID = gsContractsInstallment.gsContractsID
        LEFT OUTER JOIN gsCustomers agency ON cust.gsadagencyID = agency.gsCustomersID
        LEFT OUTER JOIN gsCustomers agencybilling ON cust.gsAdAgencyID = agencybilling.parentID 
                                                 AND agencybilling.JobDescription = 'billing contact'
        LEFT OUTER JOIN gsCustomers customerbilling ON cust.gsCustomersID = customerbilling.parentID 
                                                   AND customerbilling.JobDescription = 'billing contact'
        LEFT OUTER JOIN gsCustomers billto ON ABS(gsContractsInstallment.BillingContactID) = billto.gsCustomersID
        WHERE 1=1
        AND (
            (@UseIssueDateFilter = 0) OR
            (@UseIssueDateFilter = 1 AND freq.issuedate BETWEEN @IssueDateFrom_dt AND @IssueDateTo_dt)
        )
        AND (
            (@UseCreateDateFilter = 0) OR
            (@UseCreateDateFilter = 1 AND cont.dateadded BETWEEN @CreateDateFrom_dt AND @CreateDateTo_dt)
        )
        AND (@ProductTypeID_int = -2 OR pub.subproducttypeID = @ProductTypeID_int)
        AND (@ProductID_int = -2 OR pub.gsPublicationID = @ProductID_int)
        AND (@CustomerID_int = -2 OR cont.customerID = @CustomerID_int)
        AND (@StageID_int = -2 OR cont.StageID = @StageID_int)
        AND (@BusinessUnitID_int = -2 OR busunit.BusinessUnitID = @BusinessUnitID_int)
        AND (@IssueID_int = -2 OR freq.ID = @IssueID_int)
        ORDER BY cont.gsContractsID
        OFFSET (@PageNumber_int - 1) * @RowsPerPage ROWS
        FETCH NEXT @RowsPerPage ROWS ONLY;

        -- Check if any records were returned
        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 404 AS ResultCode, 'No orders found matching the specified criteria.' AS ResultMessage;
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