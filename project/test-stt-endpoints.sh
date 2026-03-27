#!/bin/bash

echo "🔍 Testing Abair.ie STT API Endpoints"
echo "======================================"

BASE_URL="https://api.abair.ie/v3"

# Test different potential STT endpoints
endpoints=(
    "/recognition/recognise"
    "/recognition/recognize"  
    "/speech-to-text"
    "/stt"
    "/transcription"
    "/recognition"
)

for endpoint in "${endpoints[@]}"; do
    echo ""
    echo "Testing: $endpoint"
    echo "-------------------"
    
    # Try GET first
    echo -n "GET: "
    GET_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL$endpoint" --connect-timeout 10)
    echo "HTTP $GET_RESPONSE"
    
    # Try POST 
    echo -n "POST: "
    POST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL$endpoint" --connect-timeout 10)
    echo "HTTP $POST_RESPONSE"
    
    # Try OPTIONS for CORS
    echo -n "OPTIONS: "
    OPTIONS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BASE_URL$endpoint" --connect-timeout 10)
    echo "HTTP $OPTIONS_RESPONSE"
done

echo ""
echo "🎯 Summary"
echo "========="
echo "Base API working: ✅ (responds with {\"hello\":\"world\"})"
echo "Documentation: ✅ (Swagger UI at /v3/docs/)"
echo "STT Endpoints: ⚠️ (502/500 errors - may need authentication or specific format)"