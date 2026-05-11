class User {
  constructor(id, username, email, password, fullName, role = 'user') {
    this.id = id;
    this.username = username;
    this.email = email;
    this.password = password;
    this.fullName = fullName;
    this.role = role;
    this.isActive = true;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }
}

export default User;
