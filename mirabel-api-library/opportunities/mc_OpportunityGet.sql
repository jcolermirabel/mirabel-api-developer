-- =============================================
-- Description: Retrieves opportunity information with optional filtering and pagination
-- 
-- Parameters:
--   @OpportunityID - Optional. Filter by opportunity ID
--                   Values: -2 (All), > 0 (Specific opportunity)
--                   Default: -2
--   @FromDate     - Optional. Start date for filtering opportunities
--                   Format: DateTime (YYYY-MM-DD)
--                   Default: '1900-01-01'
--   @ToDate       - Optional. End date for filtering opportunities
--                   Format: DateTime (YYYY-MM-DD)
--                   Default: '9999-12-31'
--   @PageNumber   - Optional. Page number for pagination
--                   Values: > 0
--                   Default: 1
--                   Page size: 1000 records
-- 
-- Returns:
-- Success: Table with opportunity details including:
--   CustomerID, Customer, OpportunityID, Stage, PercentClosed, ContactID, Contact,
--   ContactEmail, ContactPhone, Amount, Product, Description, Close Date, NextStep,
--   OpportunityName, AssignedRep, OpportunityType, Primary Campaign Source, Loss Reason,
--   Notes, CreateDate, DateLastModified, IsWon, IsLost, ProposalID
--
-- Error: Table with columns:
--   ResultCode (int), ResultMessage (varchar)
--
-- Status Codes:
--   200 - Success (implicit for data return)
--   400 - Bad request (invalid parameters)
--   404 - Resource not found
--   500 - Server error
--
-- Example Usage:
-- EXEC mc_OpportunityGet @OpportunityID = 8
-- EXEC mc_OpportunityGet @OpportunityID = -2, @FromDate = '2023-01-01', @ToDate = '2023-12-31'
-- EXEC mc_OpportunityGet @OpportunityID = -2, @PageNumber = 2
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[mc_OpportunityGet]
(
    @OpportunityID VARCHAR(10) = '-2',
    @FromDate VARCHAR(50) = '',
    @ToDate VARCHAR(50) = '',
    @PageNumber VARCHAR(10) = ''
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        DECLARE @OpportunityID_int INT,
                @FromDate_dt DATETIME,
                @ToDate_dt DATETIME,
                @PageNumber_int INT;

        -- Convert and validate OpportunityID
        IF @OpportunityID IS NULL OR @OpportunityID = ''
            SET @OpportunityID_int = -2
        ELSE IF ISNUMERIC(@OpportunityID) = 1
            SET @OpportunityID_int = CAST(@OpportunityID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid OpportunityID format. Must be numeric.' AS ResultMessage;
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

        -- Validate specific opportunity exists if ID provided
        IF @OpportunityID_int > -2 AND NOT EXISTS (
            SELECT 1 FROM tblSalesOpportunity WHERE ID = @OpportunityID_int
        )
        BEGIN
            SELECT 404 AS ResultCode, 'Opportunity ID not found.' AS ResultMessage;
            RETURN;
        END

        -- Check if any records match criteria before running main query
        IF NOT EXISTS (
            SELECT 1
            FROM tblSalesOpportunity a
            WHERE (@OpportunityID_int = -2 OR a.ID = @OpportunityID_int)
            AND ISNULL(a.ModifiedDate, a.CreatedDate) BETWEEN @FromDate_dt AND @ToDate_dt
        )
        BEGIN
            SELECT 404 AS ResultCode, 'No opportunities match the specified criteria.' AS ResultMessage;
            RETURN;
        END

        -- Main query to retrieve opportunities
        SELECT  
            cus.gsCustomersID AS CustomerID,
            cus.Customer,
            a.ID AS OpportunityID,
            b.Stage,
            ISNULL(b.PercentClosed, 0) AS PercentClosed,
            a.Contact AS ContactID,
            CASE   
                WHEN (c.Customer IS NULL OR c.Customer = '')   
                    THEN RTRIM(LTRIM(c.FirstName + ' ' + c.LastName))   
                ELSE REPLACE(c.Customer + ' (' + RTRIM(LTRIM(c.FirstName + ' ' + c.LastName)) + ')', '()', '')  
            END AS Contact,
            c.Email AS ContactEmail,
            c.Phone AS ContactPhone,
            a.Amount,
            p.PubName AS Product,
            a.[Description],
            a.CloseDate AS [Close Date],
            ISNULL(a.NextStep, '') AS NextStep,
            a.Name AS OpportunityName,
            LTRIM(RTRIM(ISNULL(e1.firstName,'') + ' '+ ISNULL(e1.lastName,''))) AS AssignedRep,
            ISNULL(t.OPPTYPE, '') AS OpportunityType,
            ISNULL(a.Source, '') AS [Primary Campaign Source],
            (CASE ISWON WHEN 0 THEN ISNULL(r.LossReason,'Not Mentioned') ELSE ISNULL(r.LossReason,'') END) AS [Loss Reason],
            a.Notes,
            a.CreatedDate AS CreateDate,
            ISNULL(a.ModifiedDate, a.CreatedDate) AS DateLastModified,
            (CASE ISNULL(a.isWon,-1) WHEN -1 THEN '' WHEN 0 THEN 'Lost' WHEN 1 THEN 'Won' END) AS IsWon,
            CASE WHEN a.LossReason IS NULL THEN 'No' ELSE 'Yes' END AS IsLost,
            so.ProposalID
        FROM tblSalesOpportunity a  
        LEFT JOIN tblOpportunityTypes t ON a.Type = t.ID
        LEFT JOIN tblOpportunityLossReason r ON r.ID = a.LossReason
        LEFT JOIN tblSalesPipeline b ON a.PipelineStageID = b.ID  
        LEFT JOIN gsCustomers c ON a.Contact = c.gsCustomersID  
        LEFT JOIN [tblSalesOpportunityToOrders] so ON a.ID = so.OpportunityID
        LEFT JOIN gsPublications p ON a.ProductID = p.gsPublicationID  
        INNER JOIN gsCustomers cus ON a.gsCustomersID = cus.gsCustomersID  
        LEFT JOIN gsEmployees e1 ON a.AssignedTo = e1.gsEmployeesID  
        WHERE (@OpportunityID_int = -2 OR a.ID = @OpportunityID_int)
            AND ISNULL(a.ModifiedDate, a.CreatedDate) BETWEEN @FromDate_dt AND @ToDate_dt
        ORDER BY a.ID
        OFFSET (@PageNumber_int - 1) * @RowsPerPage ROWS
        FETCH NEXT @RowsPerPage ROWS ONLY;

    END TRY
    BEGIN CATCH
        SELECT 500 AS ResultCode, ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;