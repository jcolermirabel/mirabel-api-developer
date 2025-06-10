
-- =============================================
-- API Documentation
-- Description:    Retrieves product type information with optional filtering
-- 
-- Parameters:
--   @ProductTypeID - Optional. Filter by product type
--                   Values: -2 (All), > 0 (Specific product type)
--                   Default: -2
-- 
-- Returns:
-- Success: Table with columns
--   ProductTypeID  - Product type identifier
--   ProductType    - Product type name
--
-- Error: Table with columns
--   ResultCode    - Integer error code
--   ResultMessage - Error description
--
-- Status Codes:
--   200 - Success
--   400 - Bad request (invalid parameters)
--   404 - Resource not found
--   500 - Server error
--
-- Notes:
--   - Only returns enabled product types
--   - Returns all enabled types when no filter specified
--

-- Examples:
-- EXEC [mc_ProductTypesGet] @ProductTypeID = '-2'  -- Get active product types
-- EXEC [mc_ProductTypesGet] @ProductTypeID = '8' -- Get active products of type 8

-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[mc_ProductTypesGet]
    @ProductTypeID VARCHAR(10) = -2
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        DECLARE @ProductTypeID_int INT,
                @IsActive_int INT;

        -- Handle ProductTypeID conversion
        IF @ProductTypeID = '' OR @ProductTypeID IS NULL
            SET @ProductTypeID_int = -2
        ELSE IF ISNUMERIC(@ProductTypeID) = 1
            SET @ProductTypeID_int = CAST(@ProductTypeID AS INT)
        ELSE
        BEGIN
            SELECT -1 AS ResultCode, 'Invalid ProductTypeID parameter format' AS ResultMessage;
            RETURN;
        END

        -- Validate ProductType exists if specified
        IF @ProductTypeID_int > -2 AND NOT EXISTS (
            SELECT 1 
            FROM tblProductType 
            WHERE subproducttypeID = @ProductTypeID_int
        )
        BEGIN
            SELECT -1 AS ResultCode, 'Product type not found.' AS ResultMessage;
            RETURN;
        END

        -- Return product data
        SELECT 
            p.SubProductTypeID AS ProductTypeID,
            p.SubProductType AS ProductType
        FROM [tblProductType] p
        WHERE (@ProductTypeID_int = -2 OR p.SubProductTypeID = @ProductTypeID_int)
            AND isenabled = 1

    END TRY
    BEGIN CATCH
        SELECT -1 AS ResultCode, ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;