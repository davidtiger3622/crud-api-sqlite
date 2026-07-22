# Task API

A simple Express CRUD API for managing tasks.

## Getting started

Install dependencies:

    npm install

Start the server:

    npm start

The API runs at http://localhost:3000.

OpenAPI docs (Swagger UI) are at http://localhost:3000/docs. The spec lives in openapi.json.

## Endpoints

### GET /

Returns metadata about the API.

Response:

    {
      "name": "Task API",
      "version": "1.0",
      "endpoints": ["/tasks", "/stats", "/reset"]
    }

### GET /health

Health check endpoint.

Response:

    { "status": "ok" }

### GET /tasks

Returns all tasks. Optional query parameters filter the list.

| Query  | Example        | Effect                                     |
|--------|----------------|---------------------------------------------|
| done   | ?done=true     | Only finished tasks                        |
| done   | ?done=false    | Only open tasks                            |
| search | ?search=milk   | Title contains the word (case-insensitive) |

Filters can be combined: ?done=false&search=book

Example:

    curl http://localhost:3000/tasks
    curl "http://localhost:3000/tasks?done=true"
    curl "http://localhost:3000/tasks?search=milk"

### GET /tasks/:id

Returns a single task by id.

Response (200):

    { "id": 1, "title": "Buy groceries", "done": false }

Response (404):

    { "error": "Task 99 not found" }

### POST /tasks

Creates a new task.

Request body:

    { "title": "Buy milk" }

Response (201):

    { "id": 4, "title": "Buy milk", "done": false }

Response (400):

    { "error": "title is required and cannot be empty" }

### PUT /tasks/:id

Updates a task's title and/or done. Send one or both fields; omitted fields stay unchanged.

Request body:

    { "title": "Buy oat milk", "done": true }

Response (200):

    { "id": 1, "title": "Buy oat milk", "done": true }

Response (400):

    { "error": "request body must include title and/or done" }

Response (404):

    { "error": "Task 99 not found" }

### DELETE /tasks/:id

Deletes a task.

Response (204): Empty body — success, nothing to return.

Response (404):

    { "error": "Task 99 not found" }

### GET /stats

Returns computed counts for the current task list.

Response:

    { "total": 7, "done": 3, "open": 4 }

### POST /reset

Restores the three seed example tasks. Useful for demos and testing.

## License

MIT — see LICENSE.
