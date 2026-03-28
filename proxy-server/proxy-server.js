/**
 * Proxy Server for Abair.ie STT API
 * 
 * This server acts as a proxy between your frontend and the Abair.ie API
 * to bypass CORS restrictions that prevent direct browser calls.
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'running', service: 'Abair STT Proxy', version: '1.0.0' });
});

// STT Proxy
app.post('/api/stt', async (req, res) => {
    try {
        console.log('📥 STT request received, forwarding to Abair.ie...');
        
        const abairResponse = await fetch('https://api.abair.ie/v3/recognition/recognise', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        if (!abairResponse.ok) {
            const errorText = await abairResponse.text();
            console.error('❌ Abair API error:', abairResponse.status);
            return res.status(abairResponse.status).json({ error: errorText });
        }
        
        const data = await abairResponse.json();
        console.log('✅ STT request successful');
        res.json(data);
    } catch (error) {
        console.error('❌ Proxy error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║     Abair.ie STT Proxy Server - RUNNING              ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log(`\n🚀 Server: http://localhost:${PORT}`);
    console.log(`📍 STT Endpoint: POST http://localhost:${PORT}/api/stt\n`);
});
