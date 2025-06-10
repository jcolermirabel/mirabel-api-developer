/*
Procedure: mc_RateCardsGet
Description: Retrieves rate cards based on provided filtering criteria with pagination support.

Parameters:
    @ProductID VARCHAR(20) - Product identifier 
        - Optional (Default = NULL retrieves rate cards for all products)
        - Must be a positive integer when provided
        - Must reference an existing product in gspublications table
    
    @ProductTypeID VARCHAR(20) - IsActive identifier 
        - Optional (Default = NULL retrieves all rate cards, 1 = Active Rate Cards, 0 = InActive Rate Cards)
        - Must be a positive integer when provided

    @IsActiveID VARCHAR(20) - Product Type identifier 
        - Optional (Default = NULL retrieves rate cards for all product types)
        - Must be a positive integer when provided
        - Must reference an existing product type in tblProductType table
    
    @PageNumber VARCHAR(20) - Page number for pagination results 
        - Optional (Default = 1)
        - Must be a positive integer
        - Used with fixed page size of 1000 records per page

Return Format:
    Success (200): 
        Table with columns:
        - ratecardID (INT)
        - RateCard (VARCHAR)
        - isActive (TINYINT)
        - SubProductType (VARCHAR)
    
    Error (400, 404, 500):
        Table with columns:
        - ResultCode (INT): Status code indicating error type
        - ResultMessage (VARCHAR): Human-readable error description

Example Usage:
    -- Get rate cards for a specific product
    EXEC mc_RateCardsGet @ProductID = '4', @IsActive = 0
    
    -- Get rate cards for a specific product type, page 2
    EXEC mc_RateCardsGet @ProductTypeID = '3', @PageNumber = '2'
    
    -- Get all rate cards (first page)
    EXEC mc_RateCardsGet
    
    -- Get all rate cards (specific page)
    EXEC mc_RateCardsGet @PageNumber = '5'

Response Examples:
    -- Successful response:
    ratecardID | RateCard           | isActive | SubProductType
    ---------- | ------------------ | -------- | --------------
    1          | Standard Rate Card | 1        | Print
    2          | Website Rate Card  | 1        | Digital
    
    -- Error response:
    ResultCode | ResultMessage
    ---------- | ------------------------------
    400        | Invalid Product ID format. Must be numeric.
    404        | Product does not exist.
    404        | No rate cards found matching the specified criteria.
    500        | An error occurred: [Error details]
*/

CREATE OR ALTER PROCEDURE mc_RateCardsGet
(
    @ProductID VARCHAR(20) = NULL,
    @ProductTypeID VARCHAR(20) = NULL,
	@IsActive VARCHAR(20) = NULL,
    @PageNumber VARCHAR(20) = NULL
) 
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Constants
    DECLARE @RowsPerPage INT = 1000;
    
    BEGIN TRY
        DECLARE @ProductID_int INT,
                @ProductTypeID_int INT,
				@IsActive_int INT,
                @PageNumber_int INT;
        
        -- Convert and validate ProductID
        IF @ProductID IS NULL OR @ProductID = ''
            SET @ProductID_int = NULL
        ELSE IF ISNUMERIC(@ProductID) = 1
        BEGIN
            SET @ProductID_int = CAST(@ProductID AS INT);
            IF @ProductID_int < 1
            BEGIN
                SELECT 400 AS ResultCode, 'Product ID must be greater than 0.' AS ResultMessage;
                RETURN;
            END
            
            -- Check if the product exists
            IF NOT EXISTS (SELECT 1 FROM gspublications WHERE gspublicationID = @ProductID_int)
            BEGIN
                SELECT 404 AS ResultCode, 'Product does not exist.' AS ResultMessage;
                RETURN;
            END
        END
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid Product ID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Convert and validate ProductTypeID
        IF @ProductTypeID IS NULL OR @ProductTypeID = ''
            SET @ProductTypeID_int = NULL
        ELSE IF ISNUMERIC(@ProductTypeID) = 1
        BEGIN
            SET @ProductTypeID_int = CAST(@ProductTypeID AS INT);
            IF @ProductTypeID_int < 1
            BEGIN
                SELECT 400 AS ResultCode, 'Product Type ID must be greater than 0.' AS ResultMessage;
                RETURN;
            END
            
            -- Check if the product type exists
            IF NOT EXISTS (SELECT 1 FROM tblProductType WHERE subproducttypeID = @ProductTypeID_int)
            BEGIN
                SELECT 404 AS ResultCode, 'Product Type does not exist.' AS ResultMessage;
                RETURN;
            END
        END
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid Product Type ID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Convert and validate isActive
        IF @IsActive IS NULL OR @IsActive = ''
            SET @IsActive_int = NULL
        ELSE IF ISNUMERIC(@IsActive) = 1
        BEGIN
            SET @IsActive_int = CAST(@ProductTypeID AS INT);
            IF @IsActive_int < 1
            BEGIN
                SELECT 400 AS ResultCode, 'IsActive must be greater than or equal to 0.' AS ResultMessage;
                RETURN;
            END
            
            -- Check if the product type exists
            IF NOT EXISTS (SELECT 1 FROM tblRateCard WHERE IsActive = @IsActive_int)
            BEGIN
                SELECT 404 AS ResultCode, 'No active rate cards exist.' AS ResultMessage;
                RETURN;
            END
        END
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid IsActive format. Must be numeric.' AS ResultMessage;
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

        -- Query rate cards with parameterized query (no dynamic SQL)
        ;WITH RateCardResults AS (
            SELECT 
                a.ratecardID,
                Name AS RateCard,
                isActive,
                e.SubProductType,
                ROW_NUMBER() OVER (ORDER BY a.ratecardID) AS RowNum
            FROM tblratecard a
            INNER JOIN tblProductType e ON a.subproducttypeID = e.subproducttypeID
            LEFT OUTER JOIN tblratecard2publication r2p ON r2p.RateCardID = a.ratecardid
            WHERE 1=1
			and e.IsEnabled = 1
			and (@ProductID_int IS NULL OR r2p.pubid = @ProductID_int)
            AND (@ProductTypeID_int IS NULL OR e.subproducttypeID = @ProductTypeID_int)
			AND (@IsActive_int IS NULL OR a.IsActive = @IsActive_int)
        )
        SELECT 
            ratecardID,
            RateCard,
            isActive,
            SubProductType
        FROM RateCardResults
        WHERE RowNum BETWEEN ((@PageNumber_int - 1) * @RowsPerPage) + 1 
            AND (@PageNumber_int * @RowsPerPage)
        ORDER BY ratecardID;

        -- Check if any results were returned
        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 404 AS ResultCode, 'No rate cards found matching the specified criteria.' AS ResultMessage;
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


