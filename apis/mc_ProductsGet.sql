-- =============================================
-- API Documentation
-- Description:    Retrieves product information with optional filtering
-- 
-- Parameters:
--   @ProductTypeID - Optional. Filter by product type
--                   Values: -2 (All), > 0 (Specific product type)
--                   Default: -2
--   @IsActive     - Optional. Filter by active status
--                   Values: -2 (All), 0 (Inactive), 1 (Active)
--                   Default: -2
--   @PageNumber   - Optional. Page number for pagination
--                   Values: > 0
--                   Default: 1
--                   Page size: 1000 records
-- 
-- Returns:
-- Success: Table with columns
--   ProductID     - Product identifier
--   Product       - Product name
--   SubProductType- Product type description
--   IssueSet      - Issue set identifier
--
-- Error: Table with columns
--   ResultCode    - Integer error code (400, 404, 500)
--   ResultMessage - Error description
--
-- Status Codes:
--   200 - Success (implicit for data return)
--   400 - Bad request (invalid parameters)
--   404 - Resource not found
--   500 - Server error
--
-- Examples:
-- EXEC [mc_ProductsGet] @ProductTypeID = '-2', @IsActive = '-2', @PageNumber = '1'  -- Get all products
-- EXEC [mc_ProductsGet] @ProductTypeID = '1', @IsActive = '1', @PageNumber = '1'    -- Get active products of type 1
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[mc_ProductsGet]
    @ProductTypeID VARCHAR(10) = '-2',
    @IsActive VARCHAR(10) = '-2',
    @PageNumber VARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        DECLARE @ProductTypeID_int INT,
                @IsActive_int INT,
                @PageNumber_int INT;

        -- Handle ProductTypeID conversion
        IF @ProductTypeID IS NULL OR @ProductTypeID = ''
            SET @ProductTypeID_int = -2
        ELSE IF ISNUMERIC(@ProductTypeID) = 1
            SET @ProductTypeID_int = CAST(@ProductTypeID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid Product Type ID parameter format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Handle IsActive conversion
        IF @IsActive IS NULL OR @IsActive = ''
            SET @IsActive_int = -2
        ELSE IF ISNUMERIC(@IsActive) = 1
            SET @IsActive_int = CAST(@IsActive AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid IsActive parameter format. Must be numeric.' AS ResultMessage;
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

        -- Validate IsActive values
        IF @IsActive_int NOT IN (-2, 0, 1)
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid IsActive parameter. Must be -2, 0, or 1.' AS ResultMessage;
            RETURN;
        END

        -- Validate ProductType exists if specified
        IF @ProductTypeID_int > 0 AND NOT EXISTS (
            SELECT 1 
            FROM tblProductType 
            WHERE subproducttypeID = @ProductTypeID_int
        )
        BEGIN
            SELECT 404 AS ResultCode, 'Product type not found.' AS ResultMessage;
            RETURN;
        END

        -- Check if any matching records exist
        IF NOT EXISTS (
            SELECT 1
            FROM gsPublications p
            INNER JOIN tblProductType pt ON p.subproducttypeID = pt.subproducttypeID
            WHERE (@ProductTypeID_int = -2 OR p.SubProductTypeID = @ProductTypeID_int)
                AND (@IsActive_int = -2 OR p.isactive = @IsActive_int)
				and pt.isenabled = 1
        )
        BEGIN
            SELECT 404 AS ResultCode, 'No products found matching the specified criteria.' AS ResultMessage;
            RETURN;
        END
        
        -- Return the filtered and paginated data
        SELECT 
            p.gsPublicationID AS ProductID,
            p.PubName AS Product,
            pt.SubProductType as ProductType,
            p.IssueSet
        FROM gsPublications p
        INNER JOIN tblProductType pt ON p.subproducttypeID = pt.subproducttypeID
        WHERE (@ProductTypeID_int = -2 OR p.SubProductTypeID = @ProductTypeID_int)
            AND (@IsActive_int = -2 OR p.isactive = @IsActive_int)
			and pt.isenabled = 1
        ORDER BY p.gsPublicationID
        OFFSET (@PageNumber_int - 1) * @RowsPerPage ROWS
        FETCH NEXT @RowsPerPage ROWS ONLY;

    END TRY
    BEGIN CATCH
        SELECT 500 AS ResultCode, ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;