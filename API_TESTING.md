# API Testing Guide

This guide provides examples for testing all API endpoints using curl.

## Prerequisites

Make sure the backend is running on http://localhost:8080

## Authentication

### 1. Register a New User

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "alice",
    "email": "alice@example.com",
    "presence": {
      "status": "offline",
      "last_seen": "2025-12-08T10:00:00Z"
    },
    "created_at": "2025-12-08T10:00:00Z"
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "password123"
  }'
```

**Store the token for subsequent requests:**
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## User Management

### 3. Get Current User

```bash
curl -X GET http://localhost:8080/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Update User Profile

```bash
curl -X PUT http://localhost:8080/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status_message": "Hey there! Using this awesome messenger",
    "profile_picture": "https://example.com/avatar.jpg"
  }'
```

### 5. Search Users

```bash
curl -X GET "http://localhost:8080/api/users/search?q=bob" \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Get User by ID

```bash
curl -X GET http://localhost:8080/api/users/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer $TOKEN"
```

## Contact Management

### 7. Get Contacts

```bash
curl -X GET http://localhost:8080/api/contacts \
  -H "Authorization: Bearer $TOKEN"
```

### 8. Add Contact

```bash
curl -X POST http://localhost:8080/api/contacts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "507f1f77bcf86cd799439012"
  }'
```

### 9. Remove Contact

```bash
curl -X DELETE http://localhost:8080/api/contacts/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer $TOKEN"
```

## Messaging

### 10. Send Message (REST)

```bash
curl -X POST http://localhost:8080/api/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "507f1f77bcf86cd799439012",
    "content": "Hello, how are you?",
    "type": "text"
  }'
```

### 11. Get Conversations

```bash
curl -X GET http://localhost:8080/api/messages/conversations \
  -H "Authorization: Bearer $TOKEN"
```

### 12. Get Messages in Conversation

```bash
curl -X GET http://localhost:8080/api/messages/conversations/507f1f77bcf86cd799439013 \
  -H "Authorization: Bearer $TOKEN"
```

### 13. Update Message Status

```bash
curl -X PUT http://localhost:8080/api/messages/507f1f77bcf86cd799439014/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "read"
  }'
```

## WebSocket Testing

### Using websocat (Install: `brew install websocat`)

```bash
# Connect to WebSocket
websocat "ws://localhost:8080/ws?token=$TOKEN"
```

**Send a message:**
```json
{"type":"send_message","data":{"recipient_id":"507f1f77bcf86cd799439012","content":"Hello via WebSocket!","type":"text"}}
```

**Send typing indicator:**
```json
{"type":"typing","data":{"recipient_id":"507f1f77bcf86cd799439012","is_typing":true}}
```

**Send read receipt:**
```json
{"type":"read_receipt","data":{"message_id":"507f1f77bcf86cd799439014"}}
```

## Complete Testing Workflow

### Step 1: Create Two Users

```bash
# Create Alice
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@test.com","password":"pass123"}'

# Save Alice's token
export TOKEN_ALICE="<alice_token>"

# Create Bob
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","email":"bob@test.com","password":"pass123"}'

# Save Bob's token and ID
export TOKEN_BOB="<bob_token>"
export BOB_ID="<bob_user_id>"
```

### Step 2: Alice Adds Bob as Contact

```bash
curl -X POST http://localhost:8080/api/contacts \
  -H "Authorization: Bearer $TOKEN_ALICE" \
  -H "Content-Type: application/json" \
  -d "{\"contact_id\":\"$BOB_ID\"}"
```

### Step 3: Alice Sends Message to Bob

```bash
curl -X POST http://localhost:8080/api/messages \
  -H "Authorization: Bearer $TOKEN_ALICE" \
  -H "Content-Type: application/json" \
  -d "{
    \"recipient_id\":\"$BOB_ID\",
    \"content\":\"Hey Bob, how are you?\",
    \"type\":\"text\"
  }"
```

### Step 4: Bob Retrieves Conversations

```bash
curl -X GET http://localhost:8080/api/messages/conversations \
  -H "Authorization: Bearer $TOKEN_BOB"
```

### Step 5: Bob Retrieves Messages

```bash
# Get conversation ID from previous response
export CONV_ID="<conversation_id>"

curl -X GET http://localhost:8080/api/messages/conversations/$CONV_ID \
  -H "Authorization: Bearer $TOKEN_BOB"
```

## Error Handling

### Invalid Token

```bash
curl -X GET http://localhost:8080/api/users/me \
  -H "Authorization: Bearer invalid_token"
```

**Response (401):**
```json
{
  "error": "invalid token"
}
```

### Missing Required Fields

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice"}'
```

**Response (400):**
```json
{
  "error": "username and password are required"
}
```

### Resource Not Found

```bash
curl -X GET http://localhost:8080/api/users/invalidid \
  -H "Authorization: Bearer $TOKEN"
```

**Response (404):**
```json
{
  "error": "user not found"
}
```

## Testing with Postman

### Import Collection

1. Create a new collection in Postman
2. Add an environment variable `baseUrl` = `http://localhost:8080/api`
3. Add an environment variable `token` (will be set after login)

### Sample Requests

**Login Request:**
- Method: POST
- URL: `{{baseUrl}}/auth/login`
- Body (JSON):
  ```json
  {
    "username": "alice",
    "password": "password123"
  }
  ```
- Tests (auto-save token):
  ```javascript
  pm.environment.set("token", pm.response.json().token);
  ```

**Protected Request:**
- Method: GET
- URL: `{{baseUrl}}/users/me`
- Headers:
  - `Authorization`: `Bearer {{token}}`

## Load Testing with Apache Bench

### Test Registration Endpoint

```bash
# Create a file with registration data
cat > register.json << EOF
{"username":"testuser","email":"test@test.com","password":"pass123"}
EOF

# Run 100 requests with 10 concurrent connections
ab -n 100 -c 10 -T application/json -p register.json \
  http://localhost:8080/api/auth/register
```

### Test Protected Endpoint

```bash
# Test with authentication
ab -n 1000 -c 50 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/users/me
```

## Automated Testing Script

Save this as `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:8080/api"

echo "🧪 Starting API Tests..."

# Test 1: Register Alice
echo "Test 1: Register Alice"
ALICE_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@test.com","password":"pass123"}')

ALICE_TOKEN=$(echo $ALICE_RESPONSE | jq -r '.token')
ALICE_ID=$(echo $ALICE_RESPONSE | jq -r '.user.id')

if [ "$ALICE_TOKEN" != "null" ]; then
  echo "✅ Alice registered successfully"
else
  echo "❌ Failed to register Alice"
  exit 1
fi

# Test 2: Register Bob
echo "Test 2: Register Bob"
BOB_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","email":"bob@test.com","password":"pass123"}')

BOB_TOKEN=$(echo $BOB_RESPONSE | jq -r '.token')
BOB_ID=$(echo $BOB_RESPONSE | jq -r '.user.id')

if [ "$BOB_TOKEN" != "null" ]; then
  echo "✅ Bob registered successfully"
else
  echo "❌ Failed to register Bob"
  exit 1
fi

# Test 3: Alice adds Bob as contact
echo "Test 3: Alice adds Bob as contact"
ADD_CONTACT=$(curl -s -X POST $BASE_URL/contacts \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"contact_id\":\"$BOB_ID\"}")

if echo $ADD_CONTACT | jq -e '.message' > /dev/null; then
  echo "✅ Contact added successfully"
else
  echo "❌ Failed to add contact"
fi

# Test 4: Alice sends message to Bob
echo "Test 4: Alice sends message to Bob"
SEND_MSG=$(curl -s -X POST $BASE_URL/messages \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"recipient_id\":\"$BOB_ID\",\"content\":\"Hello Bob!\",\"type\":\"text\"}")

if echo $SEND_MSG | jq -e '.id' > /dev/null; then
  echo "✅ Message sent successfully"
else
  echo "❌ Failed to send message"
fi

# Test 5: Bob gets conversations
echo "Test 5: Bob gets conversations"
CONVERSATIONS=$(curl -s -X GET $BASE_URL/messages/conversations \
  -H "Authorization: Bearer $BOB_TOKEN")

CONV_COUNT=$(echo $CONVERSATIONS | jq '. | length')
if [ "$CONV_COUNT" -gt 0 ]; then
  echo "✅ Bob has $CONV_COUNT conversation(s)"
else
  echo "❌ No conversations found"
fi

echo ""
echo "🎉 All tests completed!"
```

Make it executable and run:
```bash
chmod +x test-api.sh
./test-api.sh
```

## Troubleshooting

### Connection Refused
```bash
# Check if backend is running
curl http://localhost:8080/health
```

### Invalid JSON
```bash
# Validate JSON before sending
echo '{"username":"alice"}' | jq .
```

### Token Expired
```bash
# Login again to get a new token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}'
```

---

For more details, see [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md).
