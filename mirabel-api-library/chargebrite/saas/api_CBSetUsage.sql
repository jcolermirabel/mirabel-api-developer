
/*
 =============================================
 API Documentation
 Description:    Updates quantity for a subscription
 
 Parameters:
   @SubscriptionID - Required. The subscription identifier
                     Values: > 0
                     Format: Numeric
   @QTY            - Required. The new quantity value
                     Values: >= 0
                     Format: Integer
 
 Returns:
 Success (200): Table with columns
   - Result (int) - 1 indicating success
   - Message (varchar) - Success message with details
   - RowsAffected (int) - Number of rows updated

 Error: Table with columns
   - ResultCode (int) - Status codes: 400 (Bad request), 404 (Not found), 500 (Server error)
   - ResultMessage (varchar) - Description of the error

 Example Usage:
 EXEC api_CBQuantityUpdate @SubscriptionID='12345', @QTY=5
 =============================================
 */

CREATE OR ALTER PROCEDURE [dbo].[api_CBQuantityUpdate]
(
    @SubscriptionID VARCHAR(20) = NULL,
    @QTY INT = NULL
) 
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        DECLARE @SubscriptionID_int INT,
                @QTY_int INT,
                @RowsAffected INT;
        
        -- Validate SubscriptionID parameter
        IF @SubscriptionID IS NULL OR @SubscriptionID = ''
        BEGIN
            SELECT 400 AS ResultCode, 'SubscriptionID is required.' AS ResultMessage;
            RETURN;
        END
        ELSE IF ISNUMERIC(@SubscriptionID) = 1
            SET @SubscriptionID_int = CAST(@SubscriptionID AS INT)
        ELSE
        BEGIN
            SELECT 400 AS ResultCode, 'Invalid SubscriptionID format. Must be numeric.' AS ResultMessage;
            RETURN;
        END
        
        -- Validate QTY parameter
        IF @QTY IS NULL
        BEGIN
            SELECT 400 AS ResultCode, 'Quantity (QTY) is required.' AS ResultMessage;
            RETURN;
        END
        ELSE IF @QTY < 0
        BEGIN
            SELECT 400 AS ResultCode, 'Quantity (QTY) must be greater than or equal to 0.' AS ResultMessage;
            RETURN;
        END
        ELSE
            SET @QTY_int = @QTY;
        
        -- Verify SubscriptionID exists
        IF NOT EXISTS (SELECT 1 FROM tblplansubscription WHERE subscriptionID = @SubscriptionID_int)
        BEGIN
            SELECT 404 AS ResultCode, 'Subscription not found.' AS ResultMessage;
            RETURN;
        END
        
        -- Perform the update
        UPDATE tblplansubscription 
        SET quantity = @QTY_int
        WHERE subscriptionID = @SubscriptionID_int;
        
        SET @RowsAffected = @@ROWCOUNT;
        
        -- Return success result
        IF @RowsAffected > 0
            SELECT 1 AS Result, 'Subscription quantity updated successfully.' AS Message, @RowsAffected AS RowsAffected;
        ELSE
            SELECT 404 AS ResultCode, 'Subscription found but update failed.' AS ResultMessage;
    
    END TRY
    BEGIN CATCH
        SELECT 500 AS ResultCode, ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;