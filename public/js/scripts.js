class ReadMoreToggle {
  constructor(
    paragraphId,
    buttonId,
    expandedText = 'Hide',
    collapsedText = 'Read more'
  ) {
    this.paragraph = document.getElementById(paragraphId);
    this.btn = document.getElementById(buttonId);
    this.expandedText = expandedText;
    this.collapsedText = collapsedText;

    if (this.paragraph && this.btn) {
      this.init();
    }
  }

  init() {
    this.btn.addEventListener('click', () => this.toggle());
  }

  toggle() {
    this.paragraph.classList.toggle('expanded');
    this.btn.textContent = this.paragraph.classList.contains('expanded')
      ? this.expandedText
      : this.collapsedText;
  }
}

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  new ReadMoreToggle('paragraph-text', 'read-more-btn', 'Hide', 'Read more');
});
