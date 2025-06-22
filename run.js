#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando HAX STORE LINKS...\n');

// Start the server
const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit'
});

server.on('close', (code) => {
    console.log(`\n❌ Servidor encerrado com código: ${code}`);
    process.exit(code);
});

server.on('error', (err) => {
    console.error('❌ Erro ao iniciar servidor:', err);
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando HAX STORE LINKS...');
    server.kill('SIGINT');
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Encerrando HAX STORE LINKS...');
    server.kill('SIGTERM');
});