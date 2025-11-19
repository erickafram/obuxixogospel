const http = require('http');

http.get('http://localhost:3000', (res) => {
    console.log('CSP Header:', res.headers['content-security-policy']);
}).on('error', (err) => {
    console.log('Error:', err.message);
});
