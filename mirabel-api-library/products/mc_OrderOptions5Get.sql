/*
 =============================================
 API Documentation
 Description:    Retrieves publication section information with optional filtering
 
 Parameters:
   @RateCardID  - Optional. Filter by rate card ID
                  Values: NULL/Empty (All), > 0 (Specific rate card)
                  Default: NULL
   @ProductID   - Optional. Filter by product ID
                  Values: NULL/Empty (All), > 0 (Specific product)
                  Default: NULL
   @PageNumber  - Optional. Page number for pagination
                  Values: > 0
                  Default: 1
                  Page size: 1000 records
 
 Returns:
 Success: Table with columns
   - ID (int) - Publication Section ID
   - Value (nvarchar) - Section Name
   - ProductType (nvarchar)
   - Label (nvarchar)

 Error: Table with columns
   - ResultCode (int) - Status codes: 400 (Bad request), 404 (Not found), 500 (Server error)
   - ResultMessage (nvarchar) - Description of the error

 Example Usage:
 EXEC [mc_OrderOptions5Get] @RateCardID = '', @ProductID = '', @PageNumber = '1'
 EXEC [mc_OrderOptions5Get] @RateCardID = '7', @ProductID = '', @PageNumber = '1'
 EXEC [mc_OrderOptions5Get] @RateCardID = '', @ProductID = '25', @PageNumber = '1'
 =============================================
*/

CREATE OR ALTER PROCEDURE [dbo].[mc_OrderOptions5Get]
(
    @RateCardID VARCHAR(10) = NULL,
    @ProductID VARCHAR(10) = NULL,
    @PageNumber VARCHAR(10) = NULL
)
AS
BEGIN
    -- Returns publication section options with the correct label
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        DECLARE @RateCardID_int INT,
                @ProductID_int INT,
                @PageNumber_int INT;

        -- Convert and validate RateCardID
        IF @RateCardID IS NULL OR @RateCardID = ''
            SET @RateCardID_int = NULL
        ELSE IF ISNUMERIC(@RateCardID) = 1
            SET @RateCardID_int = CAST(@RateCardID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid Rate Card ID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Convert and validate ProductID
        IF @ProductID IS NULL OR @ProductID = ''
            SET @ProductID_int = NULL
        ELSE IF ISNUMERIC(@ProductID) = 1
            SET @ProductID_int = CAST(@ProductID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid Product ID format. Must be numeric.' AS ResultMessage;
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
            SELECT 400 AS ResultCode, 'Invalid Page Number format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Validate RateCardID exists if specified
        IF @RateCardID_int IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM tblratecard WHERE ratecardID = @RateCardID_int)
        BEGIN
            SELECT 404 AS ResultCode, 'Rate card not found.' AS ResultMessage;
            RETURN;
        END

        -- Validate ProductID exists if specified
        IF @ProductID_int IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM gspublications WHERE gspublicationID = @ProductID_int)
        BEGIN
            SELECT 404 AS ResultCode, 'Product not found.' AS ResultMessage;
            RETURN;
        END

        -- Return filtered results with pagination
        SELECT DISTINCT 
            a.gsPubSectionsID AS ID,
            a.SectionName AS [Value],
            e.SubProductType AS ProductType,
            f.Label
        FROM gsPubSections a
        LEFT OUTER JOIN tblratecard2adSection c ON a.gsPubSectionsID = c.AdSectionID
        LEFT OUTER JOIN tblratecard2publication d ON c.ratecardID = d.ratecardID
        INNER JOIN tblProductType e ON a.subproducttypeID = e.subproducttypeID
        LEFT JOIN tblProductTypeFieldLabel f ON e.subproducttypeID = f.subproducttypeID 
            AND producttypefieldcode = 'SpecialSection'
        WHERE e.isenabled = 1
            AND (@RateCardID_int IS NULL OR c.ratecardID = @RateCardID_int)
            AND (@ProductID_int IS NULL OR d.pubID = @ProductID_int)
        ORDER BY a.gsPubSectionsID
        OFFSET (@PageNumber_int - 1) * @RowsPerPage ROWS
        FETCH NEXT @RowsPerPage ROWS ONLY;

        -- If no records found, return appropriate message
        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 404 AS ResultCode, 'No values found for the specified criteria.' AS ResultMessage;
            RETURN;
        END

    END TRY
    BEGIN CATCH
        SELECT 500 AS ResultCode, ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;