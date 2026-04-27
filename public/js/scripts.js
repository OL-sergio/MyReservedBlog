class ReadMoreToggle {
  constructor(
    paragraphId,
    buttonId,
    expandedText = 'Hide',
    collapsedText = 'Read more'
  ) {
    this.paragraphId = paragraphId;
    this.paragraph = document.getElementById(paragraphId);
    this.btn = document.getElementById(buttonId);
    this.expandedText = expandedText;
    this.collapsedText = collapsedText;

    if (this.paragraph && this.btn) {
      console.log(`✓ Found: ${paragraphId} and button ${buttonId}`);
      this.init();
    } else {
      console.warn(`✗ Missing: ${paragraphId} or button ${buttonId}`);
    }
  }

  init() {
    this.btn.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggle();
    });
  }

  toggle() {
    this.paragraph.classList.toggle('expanded');
    const isExpanded = this.paragraph.classList.contains('expanded');
    this.btn.textContent = isExpanded ? this.expandedText : this.collapsedText;
    console.log(`Toggled: ${this.paragraphId}, Expanded: ${isExpanded}`);
  }
}

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  const togglePairs = [
    ['card-hero-text', 'card-hero-btn'],
    ['featured-post-text', 'featured-post-btn'],
    ['card-text-1', 'card-btn-1'],
    ['card-text-2', 'card-btn-2'],
    ['card-text-3', 'card-btn-3'],
    ['card-text-4', 'card-btn-4'],
  ];

  togglePairs.forEach(([paragraphId, buttonId]) => {
    new ReadMoreToggle(paragraphId, buttonId);
  });
});
