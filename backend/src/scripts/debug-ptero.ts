import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const baseURL = process.env.PTERODACTYL_URL;
const apiKey = process.env.PTERODACTYL_API_KEY;

console.log('--- Pterodactyl Connection Debugger ---');
console.log('URL:', baseURL);
console.log('API Key:', apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}` : 'MISSING');

if (!baseURL || !apiKey) {
    console.error('ERROR: Missing configuration in .env');
    process.exit(1);
}

const testConnection = async () => {
    try {
        console.log('\nAsserting API Type...');
        const isClientKey = apiKey.startsWith('ptlc_');
        const isAppKey = apiKey.startsWith('ptla_');

        console.log(`Key Type: ${isClientKey ? 'CLIENT (ptlc_)' : isAppKey ? 'APPLICATION (ptla_)' : 'UNKNOWN'}`);

        const client = axios.create({
            baseURL: baseURL,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (isClientKey) {
            console.log('Testing CLIENT API connection (GET /api/client)...');
            const res = await client.get('/api/client');
            console.log('✅ SUCCESS! Found servers:', res.data.data.length);
        } else if (isAppKey) {
            console.log('Testing APPLICATION API connection (GET /api/application/servers)...');
            const res = await client.get('/api/application/servers');
            console.log('✅ SUCCESS! Found servers:', res.data.data.length);
        } else {
            console.log('⚠️ Unknown key format. Trying Client API first...');
            try {
                await client.get('/api/client');
                console.log('✅ It works as a Client Key!');
            } catch (err) {
                console.log('❌ Client API failed. Trying Application API...');
                await client.get('/api/application/servers');
                console.log('✅ It works as an Application Key!');
            }
        }

    } catch (error: any) {
        console.error('\n❌ CONNECTION FAILED');
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
    }
};

testConnection();
