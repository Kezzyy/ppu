
import axios from 'axios';

const API_URL = 'http://localhost:3008/api';

async function testRateLimit() {
    console.log('--- Testing Rate Limiting (Login) ---');
    let successCount = 0;
    let blocked = false;

    for (let i = 0; i < 15; i++) {
        try {
            await axios.post(`${API_URL}/auth/login`, {
                username: 'wronguser',
                password: 'wrongpassword'
            });
            successCount++;
        } catch (error: any) {
            if (error.response?.status === 429) {
                console.log(`✅ Request ${i + 1} blocked by Rate Limiter (429 Too Many Requests)`);
                blocked = true;
                break;
            } else if (error.response?.status === 401) {
                process.stdout.write('.');
            } else {
                console.log(`Unexpected error: ${error.message}`);
            }
        }
    }

    if (blocked) {
        console.log('\n✅ Rate Limiting Verification PASSED');
    } else {
        console.log('\n❌ Rate Limiting Verification FAILED (Did not block after 15 attempts)');
    }
}

async function testAccessControl() {
    console.log('\n--- Testing Access Control (RBAC) ---');

    let token = '';
    try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'browseruser',
            password: 'Pass123!'
        });
        token = loginRes.data.token;
        console.log('Logged in as standard user.');
    } catch (e: any) {
        console.error(`Failed to login as standard user: ${e.message}`, e.response?.data);
        return;
    }

    try {
        await axios.post(`${API_URL}/users`, {
            username: 'hacker',
            email: 'hacker@example.com',
            password: 'Password123!',
            role: 'ADMIN'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('❌ Access Control FAILED: Standard user was able to create a user!');
    } catch (error: any) {
        if (error.response?.status === 403) {
            console.log('✅ Access Control PASSED: Standard user blocked from creating users (403 Forbidden)');
        } else {
            console.log(`❌ Access Control FAILED: Unexpected status code ${error.response?.status}`);
        }
    }
}

async function run() {
    await testAccessControl();
    await testRateLimit();
}

run();
