const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 8080 : 3000);

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.json': 'application/json',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'text/plain';
}

function serveFile(res, filePath, statusCode = 200) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error(`Erro ao servir arquivo ${filePath}:`, err.message);
            res.writeHead(404, { 
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache'
            });
            res.end(`
                <html>
                    <head>
                        <title>404 - HAX STORE</title>
                        <style>
                            body { 
                                font-family: Arial, sans-serif; 
                                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
                                color: white;
                                text-align: center;
                                padding: 50px;
                                margin: 0;
                                min-height: 100vh;
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                            }
                            h1 { color: #0066ff; margin-bottom: 20px; }
                            p { margin: 10px 0; }
                            a { color: #00aaff; text-decoration: none; }
                            a:hover { text-decoration: underline; }
                            .container { max-width: 600px; margin: 0 auto; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>404 - Arquivo não encontrado</h1>
                            <p>O arquivo que você está procurando não existe no servidor.</p>
                            <p><a href="/">← Voltar ao HAX STORE</a> | <a href="/admin">Painel Admin</a></p>
                        </div>
                    </body>
                </html>
            `);
            return;
        }
        
        const mimeType = getMimeType(filePath);
        const headers = { 
            'Content-Type': mimeType,
            'Cache-Control': mimeType.startsWith('text/') ? 'no-cache' : 'public, max-age=86400'
        };
        
        res.writeHead(statusCode, headers);
        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    // Error handling for request
    req.on('error', (err) => {
        console.error('Erro na requisição:', err);
        res.statusCode = 400;
        res.end();
    });
    
    res.on('error', (err) => {
        console.error('Erro na resposta:', err);
    });
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Log requests for debugging
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Route handling
    if (pathname === '/' || pathname === '/index.html') {
        serveFile(res, path.join(__dirname, 'index.html'));
    } 
    else if (pathname === '/admin' || pathname === '/admin.html') {
        serveFile(res, path.join(__dirname, 'admin.html'));
    }
    else if (pathname === '/styles.css') {
        serveFile(res, path.join(__dirname, 'styles.css'));
    }
    else if (pathname === '/admin-styles.css') {
        serveFile(res, path.join(__dirname, 'admin-styles.css'));
    }
    else if (pathname === '/script.js') {
        serveFile(res, path.join(__dirname, 'script.js'));
    }
    else if (pathname === '/admin-script.js') {
        serveFile(res, path.join(__dirname, 'admin-script.js'));
    }
    else if (pathname.startsWith('/assets/')) {
        const assetPath = pathname.replace('/assets/', '');
        serveFile(res, path.join(__dirname, 'assets', assetPath));
    }
    else {
        // Try to serve static files
        const filePath = path.join(__dirname, pathname);
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                        <head>
                            <title>404 - HAX STORE</title>
                            <style>
                                body { 
                                    font-family: Arial, sans-serif; 
                                    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
                                    color: white;
                                    text-align: center;
                                    padding: 50px;
                                }
                                h1 { color: #0066ff; }
                                a { color: #00aaff; text-decoration: none; }
                                a:hover { text-decoration: underline; }
                            </style>
                        </head>
                        <body>
                            <h1>404 - Página não encontrada</h1>
                            <p>A página que você está procurando não existe.</p>
                            <p><a href="/">Voltar ao início</a> | <a href="/admin">Painel Admin</a></p>
                        </body>
                    </html>
                `);
            } else {
                serveFile(res, filePath);
            }
        });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                        HAX STORE LINKS                       ║
║                      Servidor Iniciado                      ║
╠══════════════════════════════════════════════════════════════╣
║  Porta: ${PORT}                                                ║
║  Endereço: http://localhost:${PORT}                           ║
║  Admin: http://localhost:${PORT}/admin                        ║
║                                                              ║
║  Credenciais Admin:                                          ║
║  Usuário: jhow                                               ║
║  Senha: morder                                               ║
║                                                              ║
║  Desenvolvido por: RodrigoGTyx                               ║
╚══════════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nEncerrando servidor HAX STORE...');
    server.close(() => {
        console.log('Servidor encerrado com sucesso.');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\nEncerrando servidor HAX STORE...');
    server.close(() => {
        console.log('Servidor encerrado com sucesso.');
        process.exit(0);
    });
});