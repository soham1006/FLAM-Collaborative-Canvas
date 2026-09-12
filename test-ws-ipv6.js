import { WebSocket } from 'ws';

console.log('Testing connection to ws://[::1]:4000/ws ...');
const wsIPv6 = new WebSocket('ws://[::1]:4000/ws');

wsIPv6.on('open', () => {
  console.log('SUCCESS IPv6: Connected to ws://[::1]:4000/ws');
  wsIPv6.close();
});

wsIPv6.on('error', (err) => {
  console.log('FAILED IPv6:', err.message);
});
