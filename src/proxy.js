const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');

// Загрузка SSL-сертификата и ключа
const privateKey = fs.readFileSync('private-key.pem', 'utf8');
const certificate = fs.readFileSync('certificate.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const server = http.createServer((clientReq, clientRes) => {
    console.log(clientReq.method, clientReq.url);

    // Парсим URL запроса клиента
    const parsedUrl = url.parse(clientReq.url);

    // Формируем опции для HTTP(S) запроса к целевому серверу
    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.path,
        method: clientReq.method,
        headers: clientReq.headers
    };

    // Удаляем заголовок "Proxy-Connection"
    delete options.headers['proxy-connection'];

    // Выбираем протокол (HTTP или HTTPS) для создания запроса
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    // Создаем HTTP(S) запрос к целевому серверу
    const proxyReq = protocol.request(options, (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(clientRes, { end: true });
    });

    // Пересылаем тело запроса клиента, если оно есть
    clientReq.pipe(proxyReq, { end: true });

    // Обработка ошибок
    proxyReq.on('error', (err) => {
        console.error('Proxy request error:', err);
        clientRes.statusCode = 500;
        clientRes.end('Proxy request failed');
    });
});

// Создаем HTTPS сервер с использованием SSL-сертификата и ключа
const httpsServer = https.createServer(credentials, server);

// Запускаем сервер на порту 4433 (стандартный порт HTTPS)
httpsServer.listen(4433);

console.log('Proxy server listening on port 4433 for HTTPS requests');