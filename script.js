// script.js

// Função para carregar usuários do localStorage
function carregarUsuarios() {
  const usuarios = localStorage.getItem('usuarios');
  return usuarios ? JSON.parse(usuarios) : [];
}

// Função para
