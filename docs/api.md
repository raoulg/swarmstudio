# SwarmCraft API Documentation

This document describes the RESTful API for the SwarmCraft server. The API allows for the creation, management, and interaction with swarm intelligence sessions.

## Base URL

All API endpoints are prefixed with `/api`.

## Authentication

Admin-only endpoints require an `X-Admin-Key` header. This key is set in the `.env` file on the server.

```
X-Admin-Key: <your_admin_key>
```

---

## Admin Endpoints

These endpoints are for managing sessions and require admin authentication.

### 1. Create Session

Creates a new game session.

- **Endpoint:** `POST /admin/create-session`
- **Auth:** Admin key required.
- **Description:** Initializes a new session with a specific configuration. A unique `session_id` and a user-friendly `session_code` are generated.
- **Request Body:**
  ```json
  {
    "landscape_type": "rastrigin",
    "landscape_params": {},
    "grid_size": 25,
    "max_participants": 30,
    "exploration_probability": 0.15,
    "min_exploration_probability": 0.01,
    "max_iterations": 20
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "session_id": "UNIQUE_SESSION_ID",
    "session_code": "EASYCODE",
    "message": "Session created! Share code 'EASYCODE' with participants"
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: Invalid admin key.
  - `500 Internal Server Error`: Admin key is not configured on the server.

### 2. Start Session

Starts a session, initializes the swarm, and assigns starting positions to all joined participants.

- **Endpoint:** `POST /admin/session/{session_id}/start`
- **Auth:** Admin key required.
- **Description:** This moves the session from the `WAITING` state to the `ACTIVE` state. It creates the persistent `SwarmState` in Redis.
- **Success Response (200 OK):**
  ```json
  {
    "message": "Session started and swarm state initialized."
  }
  ```
- **Error Responses:**
  - `404 Not Found`: Session ID does not exist.
  - `400 Bad Request`: Cannot start a session with zero participants.

### 3. Trigger Swarm Step

Executes one full, synchronous step of the optimization algorithm for all particles in the swarm.

- **Endpoint:** `POST /admin/session/{session_id}/step`
- **Auth:** Admin key required.
- **Description:** This advances the simulation by one iteration, updates all particle positions and fitnesses, and broadcasts the new state via WebSockets.
- **Success Response (200 OK):**
  ```json
  {
    "message": "Swarm step {iteration_number} executed successfully."
  }
  ```
- **Error Responses:**
  - `404 Not Found`: Session or its associated swarm state does not exist.

### 4. Reset Session

Resets a session to its pre-start (`WAITING`) state.

- **Endpoint:** `POST /admin/session/{session_id}/reset`
- **Auth:** Admin key required.
- **Description:** Keeps all participants but clears their positions and fitness data. Deletes the `SwarmState` and sets the iteration count to 0.
- **Success Response (200 OK):**
  ```json
  {
    "message": "Session {session_id} has been reset."
  }
  ```
- **Error Responses:**
  - `404 Not Found`: Session ID does not exist.

### 5. List All Sessions

Retrieves a summary of all currently active sessions on the server.

- **Endpoint:** `GET /admin/sessions`
- **Auth:** Admin key required.
- **Description:** Useful for admin dashboards to monitor server activity.
- **Success Response (200 OK):**
  ```json
  [
    {
      "session_id": "UNIQUE_SESSION_ID",
      "session_code": "EASYCODE",
      "status": "waiting",
      "participant_count": 5,
      "created_at": "2023-10-27T10:00:00.000Z"
    }
  ]
  ```

### 6. Close Session

Closes a session and deletes all associated data.

- **Endpoint:** `DELETE /admin/session/{session_id}`
- **Auth:** Admin key required.
- **Description:** This is a destructive action that removes the session, its swarm state, and its session code from Redis. It also disconnects all WebSocket clients.
- **Success Response (200 OK):**
  ```json
  {
    "message": "Session {session_id} has been closed and all data deleted."
  }
  ```
- **Error Responses:**
  - `404 Not Found`: Session ID does not exist.

---

## Public Endpoints

These endpoints are for participants and do not require admin authentication.

### 1. Join Session

Allows a participant to join a session using a session code.

- **Endpoint:** `POST /join/{session_code}`
- **Auth:** None.
- **Description:** Adds a new participant to the session with a randomly generated name.
- **Success Response (200 OK):**
  ```json
  {
    "session_id": "UNIQUE_SESSION_ID",
    "participant_id": "p_1",
    "participant_name": "vibrant-wolf-42",
    "message": "Welcome, vibrant-wolf-42!"
  }
  ```
- **Error Responses:**
  - `404 Not Found`: The session code is invalid or has expired.
  - `400 Bad Request`: The session is full or no longer accepting participants.

### 2. Get Session Status

Retrieves the public status of a specific session.

- **Endpoint:** `GET /session/{session_id}/status`
- **Auth:** None.
- **Description:** Provides a summary of the session's current state.
- **Success Response (200 OK):**
  ```json
  {
    "status": "active",
    "participants": 15,
    "max_participants": 30,
    "landscape_type": "ecological",
    "grid_size": 25,
    "iteration": 12
  }
  ```
- **Error Responses:**
  - `404 Not Found`: Session ID does not exist.

### 3. Make a Move (Asynchronous)

Allows a participant to trigger a rule-based move for their own particle.

- **Endpoint:** `POST /session/{session_id}/move`
- **Auth:** None.
- **Description:** This is an *asynchronous* move. It calculates a suggested next position for a single particle based on the current swarm state without executing a full swarm step.
- **Request Body:**
  ```json
  {
    "participant_id": "p_1"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "position": [15, 12],
    "fitness": 25.7,
    "velocity_magnitude": 1.23,
    "color": "#ffaa00",
    "frequency": 450.5,
    "description": "Good progress, but there's room for improvement."
  }
  ```
- **Error Responses:**
  - `404 Not Found`: Session or swarm state not found.
  - `400 Bad Request`: Session is not currently active.

