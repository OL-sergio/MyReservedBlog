class Article {
  constructor(data = {}) {
    this.id = data.id || null;
    this.userID = data.userID || null;
    this.title = data.title || '';
    this.excerpt = data.excerpt || '';
    this.content = data.content || '';
    this.published = Boolean(data.published);
    this.author = data.author || null;
    this.tags = Array.isArray(data.tags) ? data.tags : [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      userID: this.userID,
      title: this.title,
      excerpt: this.excerpt,
      content: this.content,
      published: this.published,
      author: this.author,
      tags: this.tags,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  isPublished() {
    return this.published === true;
  }

  getExcerpt(maxLength = 150) {
    if (this.excerpt) return this.excerpt;
    if (!this.content) return '';
    return this.content.length > maxLength 
      ? this.content.substring(0, maxLength).trim() + '...'
      : this.content;
  }

  update(fields) {
    const allowed = ['title', 'excerpt', 'content', 'published', 'tags'];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        this[key] = fields[key];
      }
    }
    this.updatedAt = new Date().toISOString();
    return this;
  }

  validate() {
    const errors = [];
    if (!this.title || this.title.trim() === '') {
      errors.push('Title is required');
    }
    if (!this.content || this.content.trim() === '') {
      errors.push('Content is required');
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default Article;
export { Article };