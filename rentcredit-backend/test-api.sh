#!/bin/bash

# RentCredit Backend Phase 1 - API Test Script
# This script tests all endpoints and validates the backend is working correctly

BASE_URL="http://localhost:3000"

echo "=========================================="
echo "RentCredit Backend - Phase 1 API Tests"
echo "=========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to pretty-print JSON
pretty_json() {
    echo "$1" | jq '.' 2>/dev/null || echo "$1"
}

# Test 1: Signup as Tenant
echo -e "${BLUE}TEST 1: Sign up as Tenant${NC}"
TENANT_SIGNUP=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tenant@example.com",
    "password": "SecurePass123!",
    "fullName": "John Tenant",
    "role": "tenant",
    "phoneNumber": "555-0001"
  }')

echo "$TENANT_SIGNUP" | jq '.' 2>/dev/null || echo "$TENANT_SIGNUP"
TENANT_TOKEN=$(echo "$TENANT_SIGNUP" | jq -r '.access_token' 2>/dev/null)
TENANT_ID=$(echo "$TENANT_SIGNUP" | jq -r '.user.id' 2>/dev/null)
echo ""

# Test 2: Signup as Landlord
echo -e "${BLUE}TEST 2: Sign up as Landlord${NC}"
LANDLORD_SIGNUP=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "landlord@example.com",
    "password": "SecurePass123!",
    "fullName": "Jane Landlord",
    "role": "landlord",
    "phoneNumber": "555-0002"
  }')

echo "$LANDLORD_SIGNUP" | jq '.' 2>/dev/null || echo "$LANDLORD_SIGNUP"
LANDLORD_TOKEN=$(echo "$LANDLORD_SIGNUP" | jq -r '.access_token' 2>/dev/null)
LANDLORD_ID=$(echo "$LANDLORD_SIGNUP" | jq -r '.user.id' 2>/dev/null)
echo ""

# Test 3: Login as Tenant
echo -e "${BLUE}TEST 3: Login as Tenant${NC}"
LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tenant@example.com",
    "password": "SecurePass123!"
  }')

echo "$LOGIN" | jq '.' 2>/dev/null || echo "$LOGIN"
echo ""

# Test 4: Get Tenant Profile
echo -e "${BLUE}TEST 4: Get Tenant Profile${NC}"
curl -s -X GET "$BASE_URL/users/profile" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.' 2>/dev/null
echo ""

# Test 5: Upload KYC Document
echo -e "${BLUE}TEST 5: Upload KYC Document${NC}"
curl -s -X POST "$BASE_URL/kyc/upload" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "driver_license",
    "documentUrl": "https://example.com/kyc-doc.pdf"
  }' | jq '.' 2>/dev/null
echo ""

# Test 6: Get KYC Status
echo -e "${BLUE}TEST 6: Get KYC Status${NC}"
curl -s -X GET "$BASE_URL/kyc/status" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.' 2>/dev/null
echo ""

# Test 7: Create Property (Landlord)
echo -e "${BLUE}TEST 7: Create Property (Landlord)${NC}"
PROPERTY=$(curl -s -X POST "$BASE_URL/properties" \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sunset Apartments",
    "address": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94105",
    "monthlyRent": 2500,
    "unitCount": 4
  }')

echo "$PROPERTY" | jq '.' 2>/dev/null || echo "$PROPERTY"
PROPERTY_ID=$(echo "$PROPERTY" | jq -r '.property.id' 2>/dev/null)
echo ""

# Test 8: Get Landlord Properties
echo -e "${BLUE}TEST 8: Get Landlord Properties${NC}"
curl -s -X GET "$BASE_URL/properties" \
  -H "Authorization: Bearer $LANDLORD_TOKEN" | jq '.' 2>/dev/null
echo ""

# Test 9: Get Property Details
echo -e "${BLUE}TEST 9: Get Property Details${NC}"
curl -s -X GET "$BASE_URL/properties/$PROPERTY_ID" \
  -H "Authorization: Bearer $LANDLORD_TOKEN" | jq '.' 2>/dev/null
echo ""

# Test 10: Create Payment (Landlord creates payment for tenant)
echo -e "${BLUE}TEST 10: Create Payment${NC}"
PAYMENT=$(curl -s -X POST "$BASE_URL/payments" \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"propertyId\": \"$PROPERTY_ID\",
    \"amount\": 2500,
    \"dueDate\": \"2026-04-04T23:59:59Z\"
  }")

echo "$PAYMENT" | jq '.' 2>/dev/null || echo "$PAYMENT"
PAYMENT_ID=$(echo "$PAYMENT" | jq -r '.payment.id' 2>/dev/null)
echo ""

# Test 11: Get Tenant Payments
echo -e "${BLUE}TEST 11: Get Tenant Payments (should be empty - not linked yet)${NC}"
curl -s -X GET "$BASE_URL/payments/tenant" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.' 2>/dev/null
echo ""

# Test 12: Get Payment Details
echo -e "${BLUE}TEST 12: Get Payment Details${NC}"
curl -s -X GET "$BASE_URL/payments/$PAYMENT_ID" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.' 2>/dev/null
echo ""

# Test 13: Switch Role (Tenant to Landlord)
echo -e "${BLUE}TEST 13: Switch Role (Tenant to Landlord)${NC}"
curl -s -X POST "$BASE_URL/auth/switch-role" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "landlord"
  }' | jq '.' 2>/dev/null
echo ""

# Test 14: Get Tenant Profile Info
echo -e "${BLUE}TEST 14: Get Tenant Reliability Score${NC}"
curl -s -X GET "$BASE_URL/tenants/$TENANT_ID/reliability" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.' 2>/dev/null
echo ""

echo -e "${GREEN}=========================================="
echo "API Tests Complete!"
echo "==========================================${NC}"
echo ""
echo "Next Steps:"
echo "1. Verify all endpoints return 200 OK"
echo "2. Check JWT tokens are generated correctly"
echo "3. Validate database records are created"
echo "4. Test authorization guards (try accessing endpoints without tokens)"
echo ""
echo "Tenant ID: $TENANT_ID"
echo "Landlord ID: $LANDLORD_ID"
echo "Property ID: $PROPERTY_ID"
echo "Payment ID: $PAYMENT_ID"
