const http = require('http');

http.get('http://localhost:3000', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        if (data.includes('googletagmanager')) {
            console.log('FOUND: Analytics script present');
            // Extract the ID
            const match = data.match(/id=(G-[A-Z0-9]+)/);
            if (match) {
                console.log('ID:', match[1]);
            }
        } else {
            console.log('NOT FOUND: Analytics script missing');
        }
    });
}).on('error', (err) => {
    console.log('Error:', err.message);
});
