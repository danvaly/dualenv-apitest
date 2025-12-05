const cors_anywhere = require('cors-anywhere');

const host = 'localhost';
const port = 8080;

cors_anywhere.createServer({
    originWhitelist: [], // Allow all origins
    requireHeader: ['origin', 'x-requested-with'],
    removeHeaders: ['cookie', 'cookie2']
}).listen(port, host, () => {
    console.log('CORS Anywhere running on ' + host + ':' + port);
});
