import { WebSocket } from 'ws';

function testEndpoint(name, url) {
  return new Promise((resolve) => {
    console.log(`[TEST] Testing ${name} at ${url}...`);
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      console.log(`[FAIL] ${name} timed out after 4000ms`);
      ws.terminate();
      resolve(false);
    }, 4000);

    ws.on('open', () => {
      console.log(`[PASS] ${name} connected successfully. Sending ROOM_JOIN handshake...`);
      ws.send(
        JSON.stringify({
          type: 'ROOM_JOIN',
          roomId: 'test-room-verify',
          senderId: 'client-' + Math.random().toString(36).slice(2, 7),
          timestamp: Date.now(),
          payload: {
            userName: 'VerifyBot',
            userColor: '#10b981',
          },
        })
      );
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        console.log(`[PASS] ${name} received message: ${msg.type}`);
        if (msg.type === 'ROOM_STATE') {
          console.log(`[SUCCESS] ${name} received authoritative ROOM_STATE! RoomId: ${msg.payload.roomId}`);
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
      } catch (err) {
        console.error(`[FAIL] ${name} parse error:`, err);
        clearTimeout(timeout);
        ws.close();
        resolve(false);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      console.log(`[FAIL] ${name} error:`, err.message);
      resolve(false);
    });
  });
}

async function main() {
  console.log('--- 1. Direct Backend Tests (Port 4000) ---');
  const direct127 = await testEndpoint('Direct Backend (127.0.0.1:4000)', 'ws://127.0.0.1:4000/ws');
  
  console.log('\n--- 2. Vite Dev Server Proxy Tests (Port 5173) ---');
  const proxyLocal = await testEndpoint('Vite Proxy (localhost:5173)', 'ws://localhost:5173/ws');
  const proxy127 = await testEndpoint('Vite Proxy (127.0.0.1:5173)', 'ws://127.0.0.1:5173/ws');

  console.log('\n--- Summary ---');
  console.log(`Direct (127.0.0.1:4000): ${direct127 ? 'PASS' : 'FAIL'}`);
  console.log(`Vite Proxy (localhost:5173): ${proxyLocal ? 'PASS' : 'FAIL'}`);
  console.log(`Vite Proxy (127.0.0.1:5173): ${proxy127 ? 'PASS' : 'FAIL'}`);
  process.exit(direct127 && (proxyLocal || proxy127) ? 0 : 1);
}

main();

