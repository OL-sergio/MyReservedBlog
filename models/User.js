class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.username = data.username || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.fullName = data.fullName || '';
    this.role = data.role || 'user';
    this.isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;
    // Aceitar strings ISO vindas da base e sempre garantir formato string
    this.createdAt = data.createdAt
      ? String(data.createdAt)
      : new Date().toISOString();
    this.updatedAt = data.updatedAt
      ? String(data.updatedAt)
      : new Date().toISOString();
  }

  toJSON() {
    // Mantém `password` para que o login atual (comparação simples)
    // continue a funcionar e para que a base JSON tenha a mesma estrutura esperada.
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      password: this.password,
      fullName: this.fullName,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // NOTE: `isActive` is a boolean property.
  // The previous `isActive()` method shadowed that property and can confuse callers.

  hasRole(role) {
    return this.role === role;
  }

  update(fields) {
    const allowed = ['username', 'email', 'fullName', 'role', 'isActive'];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        this[key] = fields[key];
      }
    }
    this.updatedAt = new Date().toISOString();
    return this;
  }

  setPassword(password) {
    // Note: In production, use bcrypt or similar
    this.password = password;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  validate() {
    const errors = [];
    if (!this.username || this.username.trim() === '') {
      errors.push('Username is required');
    }
    if (!this.email || this.email.trim() === '') {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('Invalid email format');
    }
    if (!this.password || this.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default User;
export { User };
