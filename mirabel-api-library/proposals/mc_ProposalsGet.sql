-- =============================================
-- API Documentation - mc_ProposalsGet
-- Description:    Retrieves proposal information with filtering and pagination
-- 
-- Parameters:
--   @FromDate    - Optional. Start date for filtering proposals
--                  Format: DateTime (YYYY-MM-DD)
--                  Default: '1900-01-01'
--   @ToDate      - Optional. End date for filtering proposals
--                  Format: DateTime (YYYY-MM-DD)
--                  Default: '9999-12-31'
--   @DateType    - Optional. Type of date to filter by
--                  Values: 'DateCreated', 'IssueDate'
--                  Default: 'DateCreated'
--   @PageNumber  - Optional. Page number for pagination
--                  Values: > 0
--                  Default: 1
--                  Page size: 1000 records
--   @ProductTypeID - Optional. Filter by product type ID
--                  Values: NULL/Empty/-2 (All), > 0 (Specific product type)
--                  Default: -2
--   @ProductID   - Optional. Filter by product ID
--                  Values: NULL/Empty/-2 (All), > 0 (Specific product)
--                  Default: -2
--   @IssueID     - Optional. Filter by issue ID
--                  Values: NULL/Empty/-2 (All), > 0 (Specific issue)
--                  Default: -2
-- 
-- Returns:
-- Success: Table with proposal data columns including:
--   - InsertionID, ProposalID, OrderID, Issue, IssueDate, IssueYear, Product
--   - Net, Barter, AdSize, AdSection, AdPosition, DateCreated, DateLastModified
--   - PremiumPosition, AdColor, AdFrequency
--   - Customer information (CustomerID, CompanyName, etc.)
--   - Billing information (BillingCompanyID, BillingCompany, etc.)
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
-- EXEC mc_ProposalsGet @FromDate = '2024-01-01', @ToDate = '2024-12-31', @DateType = 'DateCreated', @PageNumber = 1
-- EXEC mc_ProposalsGet @FromDate = '2024-01-01', @ToDate = '2024-12-31', @ProductTypeID = 1, @ProductID = 5, @IssueID = 10
-- EXEC mc_ProposalsGet @DateType = 'IssueDate', @ProductID = 5
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[mc_ProposalsGet]
(
    @FromDate VARCHAR(50) = NULL,
    @ToDate VARCHAR(50) = NULL,
    @DateType VARCHAR(20) = NULL,
    @PageNumber VARCHAR(10) = NULL,
    @ProductID VARCHAR(10) = NULL,
    @IssueID VARCHAR(10) = NULL,
    @ProductTypeID VARCHAR(10) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        -- Variable declarations
        DECLARE @FromDate_dt DATETIME,
                @ToDate_dt DATETIME,
                @DateType_str VARCHAR(20),
                @PageNumber_int INT,
                @ProductID_int INT,
                @IssueID_int INT,
                @ProductTypeID_int INT;

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

        -- Convert and validate DateType
        IF @DateType IS NULL OR @DateType = ''
            SET @DateType_str = 'DateCreated'
        ELSE IF @DateType IN ('DateCreated', 'IssueDate')
            SET @DateType_str = @DateType
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid DateType parameter. Must be "DateCreated" or "IssueDate".' AS ResultMessage;
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

        -- Check if any orders exist within the date range and with the specified filters
        IF NOT EXISTS (
            SELECT 1 
            FROM tblproposalinsertion cont
            INNER JOIN tblMagFrequency freq ON cont.Mnth = freq.ID
            INNER JOIN gsPublications pub ON cont.PubID = pub.gsPublicationID
            WHERE ((@DateType_str = 'DateCreated' AND cont.dateadded BETWEEN @FromDate_dt AND @ToDate_dt)
                  OR (@DateType_str = 'IssueDate' AND freq.IssueDate BETWEEN @FromDate_dt AND @ToDate_dt))
                AND (@ProductTypeID_int = -2 OR pub.subproducttypeID = @ProductTypeID_int)
                AND (@ProductID_int = -2 OR pub.gsPublicationID = @ProductID_int)
                AND (@IssueID_int = -2 OR freq.ID = @IssueID_int)
        )
        BEGIN
            SELECT 404 AS ResultCode, 'No proposals found matching the specified criteria.' AS ResultMessage;
            RETURN;
        END

        -- Main query to retrieve proposal data
        IF @DateType_str = 'DateCreated'
        BEGIN
            SELECT 
                cont.InsertionID,
                cont.ProposalID,
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
                cont.updatedon AS DateLastModified,
                REPLACE(ISNULL(cont.PosReq1, ''), -1, '') AS PremiumPosition,
                REPLACE(cont.Color, '-1', '') AS AdColor,
                REPLACE(cont.Frequency, '-1', '') AS AdFrequency,
                cont.CustomerID AS CustomerID,
                cust.customer AS CompanyName,
                cust.firstName AS CustomerFirstName,
                cust.lastName AS CustomerLastName,

		 case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.gsCustomersID, '') ELSE isnull(agencybilling.gsCustomersID, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.gsCustomersID, '''') 
				ELSE isnull(customerbilling.gsCustomersID, '''') 
			END
				END else billto.gsCustomersID --when billing contact != -1
			end AS [BillingCompanyID]
	
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.customer, '') ELSE isnull(agencybilling.customer, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.customer, '''') 
				ELSE isnull(customerbilling.customer, '''') 
			END
				END else billto.customer --when billing contact != -1
			end AS [BillingCompany]

		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.FirstName, '') ELSE isnull(agencybilling.FirstName, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.FirstName, '''') 
				ELSE isnull(customerbilling.FirstName, '''') 
			END
				END else billto.firstName --when billing contact != -1
			end AS [BillingFirstName]

		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.lastName, '') ELSE isnull(agencybilling.lastName, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.lastName, '''') 
				ELSE isnull(customerbilling.lastName, '''') 
			END
				END else billto.lastName --when billing contact != -1
			end AS [BillingLastName]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.phone, '') ELSE isnull(agencybilling.phone, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.phone, '''') 
				ELSE isnull(customerbilling.phone, '''') 
			END
				END else billto.phone --when billing contact != -1
			end AS [BillingPhone]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.fax, '') ELSE isnull(agencybilling.fax, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.fax, '''') 
				ELSE isnull(customerbilling.fax, '''') 
			END
				END else billto.fax --when billing contact != -1
			end AS [BillingFax]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.email, '') ELSE isnull(agencybilling.email, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.email, '''') 
				ELSE isnull(customerbilling.email, '''') 
			END
				END else billto.email --when billing contact != -1
			end AS [BillingEmail]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.street, '') ELSE isnull(agencybilling.street, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.street, '''') 
				ELSE isnull(customerbilling.street, '''') 
			END
				END else billto.street --when billing contact != -1
			end AS [BillingAddress1]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.street2, '') ELSE isnull(agencybilling.street2, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.street2, '''') 
				ELSE isnull(customerbilling.street2, '''') 
			END
				END else billto.street2 --when billing contact != -1
			end AS [BillingAddress2]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.city, '') ELSE isnull(agencybilling.city, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.city, '''') 
				ELSE isnull(customerbilling.city, '''') 
			END
				END else billto.city --when billing contact != -1
			end AS [BillingCity]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.st, '') ELSE isnull(agencybilling.st, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.st, '''') 
				ELSE isnull(customerbilling.st, '''') 
			END
				END else billto.st --when billing contact != -1
			end AS [BillingState]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.zip, '') ELSE isnull(agencybilling.zip, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.zip, '''') 
				ELSE isnull(customerbilling.zip, '''') 
			END
				END else billto.zip --when billing contact != -1
			end AS [BillingZip]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.county, '') ELSE isnull(agencybilling.county, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.county, '''') 
				ELSE isnull(customerbilling.county, '''') 
			END
				END else billto.county --when billing contact != -1
			end AS [BillingCounty]
		, case when cont.billingcontacts = '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.international, '') ELSE isnull(agencybilling.international, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.international, '''') 
				ELSE isnull(customerbilling.international, '''') 
			END
				END else billto.international --when billing contact != -1
			end AS [BillingCountry]

            FROM tblproposalinsertion cont WITH(NOLOCK)
            INNER JOIN tblMagFrequency freq ON cont.Mnth = freq.ID 
            INNER JOIN gsPublications pub ON cont.PubID = pub.gsPublicationID 
            INNER JOIN gsCustomers cust ON cont.CustomerID = cust.gsCustomersID 
            INNER JOIN tblSplitReps ON cont.insertionID = tblSplitReps.insertionID 
            INNER JOIN gsEmployees ON tblSplitReps.gsEmployeesID = gsEmployees.gsEmployeesID 
            LEFT OUTER JOIN gsPubSections sections ON cont.AdSection = sections.gsPubSectionsID 
            LEFT OUTER JOIN gsAdSize adsize ON cont.AdSize = adsize.gsAdSizeID 
            INNER JOIN gsContractsInstallment ON cont.insertionID = gsContractsInstallment.insertionID
            LEFT OUTER JOIN gsCustomers agency ON cust.gsadagencyID = agency.gsCustomersID
            LEFT OUTER JOIN gsCustomers agencybilling ON cust.gsAdAgencyID = agencybilling.parentID 
                                                     AND agencybilling.JobDescription = 'billing contact'
            LEFT OUTER JOIN gsCustomers customerbilling ON cust.gsCustomersID = customerbilling.parentID 
                                                       AND customerbilling.JobDescription = 'billing contact'
            LEFT OUTER JOIN gsCustomers billto ON ABS(gsContractsInstallment.BillingContactID) = billto.gsCustomersID
            WHERE cont.dateadded BETWEEN @FromDate_dt AND @ToDate_dt
              AND (@ProductTypeID_int = -2 OR pub.subproducttypeID = @ProductTypeID_int)
              AND (@ProductID_int = -2 OR pub.gsPublicationID = @ProductID_int)
              AND (@IssueID_int = -2 OR freq.ID = @IssueID_int)
            ORDER BY cont.insertionID
            OFFSET (@PageNumber_int - 1) * @RowsPerPage ROWS
            FETCH NEXT @RowsPerPage ROWS ONLY;
        END
        ELSE -- @DateType_str = 'IssueDate'
        BEGIN
            SELECT 
                cont.InsertionID,
                cont.ProposalID,
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
                cont.updatedon AS DateLastModified,
                REPLACE(ISNULL(cont.PosReq1, ''), -1, '') AS PremiumPosition,
                REPLACE(cont.Color, '-1', '') AS AdColor,
                REPLACE(cont.Frequency, '-1', '') AS AdFrequency,
                cont.CustomerID AS CustomerID,
                cust.customer AS CompanyName,
                cust.firstName AS CustomerFirstName,
                cust.lastName AS CustomerLastName,

		case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.gsCustomersID, '') ELSE isnull(agencybilling.gsCustomersID, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.gsCustomersID, '''') 
				ELSE isnull(customerbilling.gsCustomersID, '''') 
			END
				END else billto.gsCustomersID --when billing contact != -1
			end AS [BillingCompanyID]
	
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.customer, '') ELSE isnull(agencybilling.customer, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.customer, '''') 
				ELSE isnull(customerbilling.customer, '''') 
			END
				END else billto.customer --when billing contact != -1
			end AS [BillingCompany]

		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.FirstName, '') ELSE isnull(agencybilling.FirstName, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.FirstName, '''') 
				ELSE isnull(customerbilling.FirstName, '''') 
			END
				END else billto.firstName --when billing contact != -1
			end AS [BillingFirstName]

		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.lastName, '') ELSE isnull(agencybilling.lastName, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.lastName, '''') 
				ELSE isnull(customerbilling.lastName, '''') 
			END
				END else billto.lastName --when billing contact != -1
			end AS [BillingLastName]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.phone, '') ELSE isnull(agencybilling.phone, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.phone, '''') 
				ELSE isnull(customerbilling.phone, '''') 
			END
				END else billto.phone --when billing contact != -1
			end AS [BillingPhone]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.fax, '') ELSE isnull(agencybilling.fax, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.fax, '''') 
				ELSE isnull(customerbilling.fax, '''') 
			END
				END else billto.fax --when billing contact != -1
			end AS [BillingFax]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.email, '') ELSE isnull(agencybilling.email, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.email, '''') 
				ELSE isnull(customerbilling.email, '''') 
			END
				END else billto.email --when billing contact != -1
			end AS [BillingEmail]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.street, '') ELSE isnull(agencybilling.street, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.street, '''') 
				ELSE isnull(customerbilling.street, '''') 
			END
				END else billto.street --when billing contact != -1
			end AS [BillingAddress1]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.street2, '') ELSE isnull(agencybilling.street2, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.street2, '''') 
				ELSE isnull(customerbilling.street2, '''') 
			END
				END else billto.street2 --when billing contact != -1
			end AS [BillingAddress2]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.city, '') ELSE isnull(agencybilling.city, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.city, '''') 
				ELSE isnull(customerbilling.city, '''') 
			END
				END else billto.city --when billing contact != -1
			end AS [BillingCity]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.st, '') ELSE isnull(agencybilling.st, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.st, '''') 
				ELSE isnull(customerbilling.st, '''') 
			END
				END else billto.st --when billing contact != -1
			end AS [BillingState]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.zip, '') ELSE isnull(agencybilling.zip, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.zip, '''') 
				ELSE isnull(customerbilling.zip, '''') 
			END
				END else billto.zip --when billing contact != -1
			end AS [BillingZip]
		, case when cont.billingcontacts like '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.county, '') ELSE isnull(agencybilling.county, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.county, '''') 
				ELSE isnull(customerbilling.county, '''') 
			END
				END else billto.county --when billing contact != -1
			end AS [BillingCounty]
		, case when cont.billingcontacts = '%-%' then --when billing contact = -1
				CASE isnull(cust.acctbillto, 0) WHEN 1 --when billto = 1
					THEN CASE isnull(agencybilling.gsCustomersID, 0) WHEN 0 THEN isnull(agency.international, '') ELSE isnull(agencybilling.international, '') 
				END 
			ELSE 
				CASE isnull(customerbilling.gsCustomersID, 0) WHEN 0 --when billto = 0
						THEN isnull(cust.international, '''') 
				ELSE isnull(customerbilling.international, '''') 
			END
				END else billto.international --when billing contact != -1
			end AS [BillingCountry]

            FROM tblproposalinsertion cont WITH(NOLOCK)
            INNER JOIN tblMagFrequency freq ON cont.Mnth = freq.ID 
            INNER JOIN gsPublications pub ON cont.PubID = pub.gsPublicationID 
            INNER JOIN gsCustomers cust ON cont.CustomerID = cust.gsCustomersID 
            INNER JOIN tblSplitReps ON cont.insertionID = tblSplitReps.insertionID 
            INNER JOIN gsEmployees ON tblSplitReps.gsEmployeesID = gsEmployees.gsEmployeesID 
            LEFT OUTER JOIN gsPubSections sections ON cont.AdSection = sections.gsPubSectionsID 
            LEFT OUTER JOIN gsAdSize adsize ON cont.AdSize = adsize.gsAdSizeID 
            INNER JOIN gsContractsInstallment ON cont.insertionID = gsContractsInstallment.insertionID
            LEFT OUTER JOIN gsCustomers agency ON cust.gsadagencyID = agency.gsCustomersID
            LEFT OUTER JOIN gsCustomers agencybilling ON cust.gsAdAgencyID = agencybilling.parentID 
                                                     AND agencybilling.JobDescription = 'billing contact'
            LEFT OUTER JOIN gsCustomers customerbilling ON cust.gsCustomersID = customerbilling.parentID 
                                                       AND customerbilling.JobDescription = 'billing contact'
            LEFT OUTER JOIN gsCustomers billto ON ABS(gsContractsInstallment.BillingContactID) = billto.gsCustomersID
            WHERE freq.IssueDate BETWEEN @FromDate_dt AND @ToDate_dt
              AND (@ProductTypeID_int = -2 OR pub.subproducttypeID = @ProductTypeID_int)
              AND (@ProductID_int = -2 OR pub.gsPublicationID = @ProductID_int)
              AND (@IssueID_int = -2 OR freq.ID = @IssueID_int)
            ORDER BY cont.insertionID
            OFFSET (@PageNumber_int - 1) * @RowsPerPage ROWS
            FETCH NEXT @RowsPerPage ROWS ONLY;
        END

        -- Check if any records were returned (this is handled in the TRY block)
        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 404 AS ResultCode, 'No proposals found matching the specified criteria.' AS ResultMessage;
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