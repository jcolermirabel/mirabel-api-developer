/*
Procedure: mc_ProductionStagesGet
Description: Retrieves production stages with optional filtering by product type

Parameters:
    @ProductTypeID VARCHAR(20) - Product Type identifier
        - Optional (Default = NULL retrieves stages for all product types)
        - Must be a positive integer when provided
        - Must reference an existing and enabled product type in tblProductType table

Return Format:
    Success (200): 
        Table with production stage information including:
        - StageID (INT)
        - Stage (VARCHAR)
        - Description (VARCHAR)
        - ProductType (VARCHAR)
    
    Error (400, 404, 500):
        Table with columns:
        - ResultCode (INT): Status code indicating error type
        - ResultMessage (VARCHAR): Human-readable error description

Example Usage:
    -- Get all production stages
    EXEC mc_ProductionStagesGet
    
    -- Get production stages for a specific product type
    EXEC mc_ProductionStagesGet @ProductTypeID = '3'

Response Examples:
    -- Successful response:
    StageID | Stage         | Description                  | ProductType
    ------- | ------------- | ---------------------------- | --------------------
    1       | Ad Arrived    | Initial project proposal     | Print
    2       | Ad Arrived    | In production/development    | Digital
    
    -- Error response:
    ResultCode | ResultMessage
    ---------- | ------------------------------
    400        | Invalid ProductTypeID format. Must be numeric.
    404        | Product Type not found or is disabled.
    500        | An error occurred: [Error details]
*/

CREATE OR ALTER PROCEDURE mc_ProductionStagesGet
(
    @ProductTypeID VARCHAR(20) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        DECLARE @ProductTypeID_int INT;
        
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
            
            -- Check if the product type exists and is enabled
            IF NOT EXISTS (SELECT 1 FROM tblProductType WHERE SubProductTypeID = @ProductTypeID_int AND IsEnabled = 1)
            BEGIN
                SELECT 404 AS ResultCode, 'Product Type not found or is disabled.' AS ResultMessage;
                RETURN;
            END
        END
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid ProductTypeID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END

        -- Query production stages using parameterized query
        SELECT 
            a.StageID AS StageID,
            a.Name AS Stage,
            a.Description,
            b.SubProductType AS ProductType
        FROM tblProductionOrderStages a
        LEFT JOIN tblProductType b ON a.ProductTypeID = b.SubProductTypeID
        WHERE (@ProductTypeID_int IS NULL OR a.ProductTypeID = @ProductTypeID_int)
        ORDER BY a.StageID;

        -- Check if any results were returned
        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 404 AS ResultCode, 'No production stages found for the specified criteria.' AS ResultMessage;
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