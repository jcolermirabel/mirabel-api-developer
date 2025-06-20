/*
 =============================================
 API Documentation
 Description:    Checks for potential duplicate contacts based on provided criteria
 
 Parameters:
   @CustomerName - Optional. Company/Customer name to search
                   Default: NULL
   @FirstName    - Optional. First name to search
                   Default: NULL
   @LastName     - Optional. Last name to search
                   Default: NULL
   @Email        - Optional. Email address to search
                   Default: NULL
 
 Returns:
 Success: Table with columns
   - CustomersID (varchar) - Customer identifier
   - Customer (nvarchar) - Customer/company name
   - FirstName (nvarchar)
   - LastName (nvarchar)
   - Phone (nvarchar)
   - PhoneExt (nvarchar)
   - JobDescription (nvarchar)
   - Rep (nvarchar) - Representative name
   - DateAdded (datetime)
   - Email (nvarchar)
   - InActive (bit)

 Error: Table with columns
   - ResultCode (int) - Status codes: 400 (Bad request), 404 (Not found), 500 (Server error)
   - ResultMessage (nvarchar) - Description of the error

 Example Usage:
 EXEC [mc_ContactDuplicateCheck] @CustomerName = '', @FirstName = 'John', @LastName = 'Smith', @Email = ''
 EXEC [mc_ContactDuplicateCheck] @CustomerName = '', @FirstName = '', @LastName = '', @Email = 'john.smith@email.com'
 =============================================
*/
CREATE OR ALTER PROCEDURE [dbo].[mc_ContactDuplicateCheck]
(
    @CustomerName VARCHAR(100) = NULL,
    @FirstName VARCHAR(100) = NULL,
    @LastName VARCHAR(100) = NULL,
    @Email VARCHAR(100) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    
  
    BEGIN TRY
        
        -- Validate at least one search parameter is provided
        IF (@CustomerName IS NULL OR @CustomerName = '') AND 
           (@FirstName IS NULL OR @FirstName = '') AND 
           (@LastName IS NULL OR @LastName = '') AND 
           (@Email IS NULL OR @Email = '')
        BEGIN
            SELECT 400 AS ResultCode, 'At least one search parameter must be provided.' AS ResultMessage;
            RETURN;
        END
        
        -- Clean input parameters
        SET @CustomerName = ISNULL(LTRIM(RTRIM(@CustomerName)), '');
        SET @FirstName = ISNULL(LTRIM(RTRIM(@FirstName)), '');
        SET @LastName = ISNULL(LTRIM(RTRIM(@LastName)), '');
        SET @Email = ISNULL(LTRIM(RTRIM(@Email)), '');
        
        -- Normalize search parameters by removing spaces
        DECLARE @CustomerName_norm VARCHAR(100) = REPLACE(@CustomerName, ' ', '');
        DECLARE @FirstName_norm VARCHAR(100) = REPLACE(@FirstName, ' ', '');
        DECLARE @LastName_norm VARCHAR(100) = REPLACE(@LastName, ' ', '');
        DECLARE @Email_norm VARCHAR(100) = REPLACE(@Email, ' ', '');
        
        -- Build the base query with CTE
        WITH ContactCTE AS (
            SELECT DISTINCT 
                CONVERT(VARCHAR, a.gscustomersid) AS CustomersID,
                a.customer AS Customer,
                a.FirstName,
                a.LastName,
                a.Phone,
                a.phonextn AS PhoneExt,
                a.JobDescription,
                b.firstname + ' ' + b.lastname AS Rep,
                a.DateAdded,
                a.Email,
                ISNULL(a.InActive, 0) AS InActive,
                ROW_NUMBER() OVER (ORDER BY a.customer, a.lastname, a.firstname) AS RowNum
            FROM gscustomers a 
            INNER JOIN gsemployees b ON a.gsrepid = b.gsemployeesid
            WHERE 1=0 -- Default no results, will be overridden by OR conditions below
                -- CustomerName + FirstName + LastName search
                OR (@CustomerName_norm <> '' AND @FirstName_norm <> '' AND @LastName_norm <> '' AND (
                    (REPLACE(REPLACE(REPLACE(a.customer, ' ', ''), ' the', ''), 'the ', '') LIKE '%' + @CustomerName_norm + '%' 
                        AND REPLACE(a.firstname, ' ', '') LIKE '%' + @FirstName_norm + '%')
                    OR (REPLACE(REPLACE(REPLACE(a.customer, ' ', ''), ' the', ''), 'the ', '') LIKE '%' + @CustomerName_norm + '%' 
                        AND REPLACE(a.lastname, ' ', '') LIKE '%' + @LastName_norm + '%')
                    OR (REPLACE(a.firstname, ' ', '') LIKE '%' + @FirstName_norm + '%' 
                        AND REPLACE(a.lastname, ' ', '') LIKE '%' + @LastName_norm + '%')
                ))
                -- FirstName + LastName search
                OR (@FirstName_norm <> '' AND @LastName_norm <> '' AND @CustomerName_norm = '' AND
                    REPLACE(a.firstname, ' ', '') LIKE '%' + @FirstName_norm + '%' 
                    AND REPLACE(a.lastname, ' ', '') LIKE '%' + @LastName_norm + '%')
                -- CustomerName + FirstName search
                OR (@CustomerName_norm <> '' AND @FirstName_norm <> '' AND @LastName_norm = '' AND
                    REPLACE(REPLACE(REPLACE(a.customer, ' ', ''), ' the', ''), 'the ', '') LIKE '%' + @CustomerName_norm + '%' 
                    AND REPLACE(a.firstname, ' ', '') LIKE '%' + @FirstName_norm + '%')
                -- CustomerName + LastName search
                OR (@CustomerName_norm <> '' AND @LastName_norm <> '' AND @FirstName_norm = '' AND
                    REPLACE(REPLACE(REPLACE(a.customer, ' ', ''), ' the', ''), 'the ', '') LIKE '%' + @CustomerName_norm + '%' 
                    AND REPLACE(a.lastname, ' ', '') LIKE '%' + @LastName_norm + '%')
                -- CustomerName only search
                OR (@CustomerName_norm <> '' AND @FirstName_norm = '' AND @LastName_norm = '' AND @Email_norm = '' AND
                    REPLACE(REPLACE(REPLACE(a.customer, ' ', ''), ' the', ''), 'the ', '') LIKE '%' + @CustomerName_norm + '%')
                -- FirstName only search
                OR (@FirstName_norm <> '' AND @CustomerName_norm = '' AND @LastName_norm = '' AND @Email_norm = '' AND
                    REPLACE(a.firstname, ' ', '') LIKE '%' + @FirstName_norm + '%')
                -- LastName only search
                OR (@LastName_norm <> '' AND @CustomerName_norm = '' AND @FirstName_norm = '' AND @Email_norm = '' AND
                    REPLACE(a.lastname, ' ', '') LIKE '%' + @LastName_norm + '%')
                -- Email only search
                OR (@Email_norm <> '' AND @CustomerName_norm = '' AND @FirstName_norm = '' AND @LastName_norm = '' AND
                    REPLACE(a.email, ' ', '') LIKE '%' + @Email_norm + '%')
        )
        SELECT 
            CustomersID,
            Customer,
            FirstName,
            LastName,
            Phone,
            PhoneExt,
            JobDescription,
            Rep,
            DateAdded,
            Email,
            InActive
        FROM ContactCTE
        
        -- If no records found, return appropriate message
        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 404 AS ResultCode, 'No matching contacts found.' AS ResultMessage;
            RETURN;
        END
        
    END TRY
    BEGIN CATCH
        SELECT 500 AS ResultCode, ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;