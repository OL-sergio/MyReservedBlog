import fs from 'fs';
import path from 'path';
import User from './User.js';

export class UserManager {
  constructor(filePath = 'database/users.json') {
    this.filePath = path.resolve(filePath);
    this.users = this.loadUsers();
  }

  // Ler ficheiro JSON
  loadUsers() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Ficheiro não existe - criar um novo vazio
        console.log(
          '📝 Ficheiro de utilizadores não encontrado. Criando novo...'
        );
        this.users = [];
        this.saveUsers();
        return [];
      } else {
        // Outro erro
        console.error('Erro ao ler ficheiro de utilizadores:', error.message);
        return [];
      }
    }
  }

  // Guardar ficheiro JSON
  saveUsers() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.users, null, 2));
  }

  // Adicionar novo utilizador
  addUser(username, email, password) {
    const newUser = new User(this.users.length + 1, username, email, password);
    this.users.push(newUser);
    this.saveUsers();
    return newUser;
  }

  // Obter todos os utilizadores
  getAllUsers() {
    return this.users;
  }

  // Obter utilizador por ID
  getUserById(id) {
    return this.users.find((user) => user.id === id);
  }

  // Obter utilizador por email
  getUserByEmail(email) {
    return this.users.find((user) => user.email === email);
  }

  // Atualizar utilizador
  updateUser(id, updates) {
    const user = this.getUserById(id);
    if (user) {
      Object.assign(user, updates, { updatedAt: new Date().toISOString() });
      this.saveUsers();
      return user;
    }
    return null;
  }

  // Eliminar utilizador
  deleteUser(id) {
    this.users = this.users.filter((user) => user.id !== id);
    this.saveUsers();
  }
}

export default UserManager;
