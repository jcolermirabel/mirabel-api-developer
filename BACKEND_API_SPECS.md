# Backend API Specification for Universal Endpoints

This document outlines the required backend changes to support the new universal endpoint and API key management system.

## 1. New Data Models

Two new MongoDB collections are required: `endpoints` and `apikeys`.

### 1.1. `Endpoint` Model

This model stores the definition of a universal endpoint.

-   **Collection Name:** `endpoints`
-   **Schema:**
    -   `name` (String, required, unique): The name of the endpoint, which should correspond to a stored procedure name (e.g., `usp_GetUserDetails`).
    -   `description` (String, required): A brief description of the endpoint's purpose.
    -   `createdAt` (Date, default: `Date.now`): Timestamp of creation.
    -   `updatedAt` (Date, default: `Date.now`): Timestamp of last update.

### 1.2. `ApiKey` Model

This model stores the API keys associated with each endpoint.

-   **Collection Name:** `apikeys`
-   **Schema:**
    -   `key` (String, required, unique): The generated API key value. This should be a securely generated random string.
    -   `endpoint` (ObjectId, ref: 'Endpoint', required): A reference to the `Endpoint` this key grants access to.
    -   `isActive` (Boolean, default: `true`): A flag to enable or disable the key.
    -   `createdAt` (Date, default: `Date.now`): Timestamp of creation.

---

## 2. API Endpoints

The following RESTful API endpoints need to be created.

### 2.1. Endpoints API (`/api/endpoints`)

-   **`POST /api/endpoints`**: Creates a new universal endpoint.
    -   **Body:** `{ "name": "...", "description": "..." }`
    -   **Response:** The newly created endpoint object.

-   **`GET /api/endpoints`**: Retrieves a list of all universal endpoints.
    -   **Response:** An array of endpoint objects.

-   **`PUT /api/endpoints/:id`**: Updates an existing endpoint.
    -   **Body:** `{ "name": "...", "description": "..." }`
    -   **Response:** The updated endpoint object.

-   **`DELETE /api/endpoints/:id`**: Deletes an endpoint.
    -   **Response:** A success message.

### 2.2. API Keys API (`/api/api-keys`)

-   **`POST /api/api-keys`**: Generates a new API key for a specific endpoint.
    -   **Logic:** When called, this should set any existing key for the same `endpointId` to `isActive: false` before creating the new key. This ensures only one active key per endpoint.
    -   **Body:** `{ "endpointId": "..." }`
    -   **Response:** The newly created API key object.

-   **`GET /api/api-keys/endpoint/:endpointId`**: Retrieves all API keys for a given endpoint.
    -   **Response:** An array of API key objects.

-   **`DELETE /api/api-keys/:keyId`**: Revokes (deactivates) an API key.
    -   **Logic:** This should set the `isActive` flag to `false`, not delete the record.
    -   **Response:** A success message.

### 2.3. Database Registry API (`/api/connections`)

-   **`POST /api/connections/refresh-registry`**: Triggers the database registry refresh process.
    -   **Logic:**
        1.  Clear any existing registry cache (e.g., in Redis or in-memory).
        2.  Iterate through all active `Connections` in the database.
        3.  For each connection, fetch the list of databases on its server.
        4.  Populate the cache with `databaseName: connectionId` mappings.
        5.  Log warnings for any duplicate database names found across different connections.
    -   **Response:** `{ "message": "Database registry refreshed successfully. Found X databases across Y connections." }`

---

## 3. Core Authentication Flow (Middleware)

This is the most critical part. A new middleware is required to handle incoming API requests to execute stored procedures.

-   **Request Headers:**
    -   `x-development-key`: The API key value.
    -   `x-database-name`: The name of the target database.
    -   The request body will contain the stored procedure name and its parameters.

-   **Middleware Logic:**
    1.  **Extract Headers:** Get the API key and database name from the headers.
    2.  **Authenticate Key:**
        -   Look up the provided API key in the `apikeys` collection.
        -   Ensure the key exists and is `isActive`.
        -   If valid, retrieve the associated `endpoint._id` and `endpoint.name`. The endpoint name is the stored procedure we are authorized to call.
    3.  **Lookup Connection:**
        -   Use the `x-database-name` to perform a lookup in the cached Database Registry.
        -   Retrieve the `connectionId` for the target database.
    4.  **Execute Procedure:**
        -   If both the key is valid and the database is found in the registry, use the retrieved `connectionId` to get the full connection details.
        -   Establish a connection to the database.
        -   Execute the stored procedure identified in step 2 (`endpoint.name`) with the parameters from the request body.
    5.  **Return Result:** Return the result from the stored procedure to the caller.
    6.  **Error Handling:** Return appropriate 401 (Unauthorized), 403 (Forbidden), or 404 (Not Found) errors if any step fails. 