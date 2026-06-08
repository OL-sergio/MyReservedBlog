/**
 * StorageManager - Gerencia armazenamento de utilizadores no localStorage
 * Guarda dados de utilizadores registados e do utilizador autenticado
 */
export class StorageManager {
  constructor() {
    this.USERS_KEY = 'registeredUsers';
    this.CURRENT_USER_KEY = 'currentAuthenticatedUser';
  }

  /**
   * Guardar novo utilizador registado
   */
  saveRegisteredUser(userData) {
    const users = this.getAllRegisteredUsers();

    // Evitar duplicados por email
    const exists = users.some((u) => u.email === userData.email);
    if (!exists) {
      users.push(userData);
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
      console.log('✅ Utilizador guardado no localStorage:', userData.username);
    }
  }

  /**
   * Obter todos os utilizadores registados
   */
  getAllRegisteredUsers() {
    const data = localStorage.getItem(this.USERS_KEY);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Procurar utilizador por email
   */
  getUserByEmail(email) {
    const users = this.getAllRegisteredUsers();
    return users.find((u) => u.email === email) || null;
  }

  /**
   * Marcar utilizador como autenticado
   */
  setCurrentUser(userData) {
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(userData));
    console.log('✅ Utilizador marcado como autenticado:', userData.username);
  }

  /**
   * Obter utilizador autenticado
   */
  getCurrentUser() {
    const data = localStorage.getItem(this.CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Verificar se está autenticado
   */
  isAuthenticated() {
    return this.getCurrentUser() !== null;
  }

  /**
   * Fazer logout - limpar utilizador autenticado
   */
  logout() {
    localStorage.removeItem(this.CURRENT_USER_KEY);
    console.log('✅ Logout realizado - utilizador removido do localStorage');
  }

  /**
   * Limpar tudo (para testes)
   */
  clearAll() {
    localStorage.removeItem(this.USERS_KEY);
    localStorage.removeItem(this.CURRENT_USER_KEY);
    console.log('✅ localStorage limpo completamente');
  }
}

// Criar instância global
//const storage = new StorageManager();
