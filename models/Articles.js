class Article {
  constructor(id, userID, title, excerpt, content, published, author, tags) {
    this.id = id;
    this.userID = author ? author.id : null;
    this.title = title;
    this.excerpt = excerpt;
    this.content = content;
    this.published = Boolean(published);
    this.author = author;
    this.tags = tags;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }
}

export default Article;
//const articles = readArticles();
//  const now = new Date().toISOString();
