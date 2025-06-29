// Test script to verify backend connection
const fetch = require('node-fetch');

const API_BASE_URL = 'http://127.0.0.1:3000';

async function testBackendConnection() {
    console.log('🧪 Testing backend connection...\n');
    
    try {
        // Test 1: Health check
        console.log('1. Testing health check...');
        const healthResponse = await fetch(`${API_BASE_URL}/health`);
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ Health check passed:', healthData);
        } else {
            console.log('❌ Health check failed:', healthResponse.status);
        }
        
        // Test 2: Homepage stats
        console.log('\n2. Testing homepage stats...');
        const statsResponse = await fetch(`${API_BASE_URL}/stats/homepage`);
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            console.log('✅ Stats API working:', statsData);
        } else {
            console.log('❌ Stats API failed:', statsResponse.status);
        }
        
        // Test 3: Leaderboard
        console.log('\n3. Testing leaderboard...');
        const leaderboardResponse = await fetch(`${API_BASE_URL}/users/leaderboard`);
        if (leaderboardResponse.ok) {
            const leaderboardData = await leaderboardResponse.json();
            console.log('✅ Leaderboard API working:', leaderboardData);
        } else {
            console.log('❌ Leaderboard API failed:', leaderboardResponse.status);
        }
        
        // Test 4: Metadata
        console.log('\n4. Testing metadata...');
        const metadataResponse = await fetch(`${API_BASE_URL}/metadata`);
        if (metadataResponse.ok) {
            const metadataData = await metadataResponse.json();
            console.log('✅ Metadata API working');
        } else {
            console.log('❌ Metadata API failed:', metadataResponse.status);
        }
        
    } catch (error) {
        console.log('❌ Connection error:', error.message);
        console.log('\n💡 Make sure the backend server is running on port 3000');
        console.log('   Run: cd backend && npm start');
    }
}

// Run the test
testBackendConnection(); 