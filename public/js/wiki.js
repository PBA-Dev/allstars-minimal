// Initialize Quill editor only on pages that need it
let quill = null;
function initializeQuill(containerId = 'editor') {
    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'font': [] }],
        [{ 'align': [] }],
        ['clean']
    ];

    return new Quill('#' + containerId, {
        theme: 'snow',
        modules: {
            toolbar: toolbarOptions
        }
    });
}

// Handle article creation
function initializeCreateForm() {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="create-form">
            <h1>Neuer Artikel</h1>
            <form id="createForm">
                <div class="form-group">
                    <label for="title">Titel:</label>
                    <input type="text" id="title" name="title" required>
                </div>
                <div class="form-group">
                    <label for="author">Autor:</label>
                    <input type="text" id="author" name="author" required>
                </div>
                <div class="form-group">
                    <label for="editor">Inhalt:</label>
                    <div id="editor" style="height: 300px;"></div>
                </div>
                <button type="submit" class="btn">Artikel erstellen</button>
            </form>
        </div>
    `;

    // Initialize Quill
    quill = initializeQuill();

    // Handle form submission
    const form = document.getElementById('createForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const article = {
            title: document.getElementById('title').value,
            author: document.getElementById('author').value,
            content: quill.root.innerHTML,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        fetch('/api/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(article)
        })
        .then(response => response.json())
        .then(savedArticle => {
            window.location.href = `/article/${savedArticle._id}`;
        })
        .catch(error => {
            console.error('Error creating article:', error);
            alert('Fehler beim Erstellen des Artikels');
        });
    });
}

// Handle article editing
function initializeEditForm(articleId) {
    fetch(`/api/articles/${articleId}`)
        .then(response => response.json())
        .then(article => {
            const container = document.querySelector('.container');
            container.innerHTML = `
                <div class="create-form">
                    <h1>Artikel bearbeiten</h1>
                    <form id="editForm">
                        <div class="form-group">
                            <label for="title">Titel:</label>
                            <input type="text" id="title" name="title" value="${article.title}" required>
                        </div>
                        <div class="form-group">
                            <label for="editor">Inhalt:</label>
                            <div id="editor" style="height: 300px;"></div>
                        </div>
                        <button type="submit" class="btn">Änderungen speichern</button>
                    </form>
                </div>
            `;

            // Initialize Quill and set content
            quill = initializeQuill();
            quill.root.innerHTML = article.content;

            // Handle form submission
            const form = document.getElementById('editForm');
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const updatedArticle = {
                    ...article,
                    title: document.getElementById('title').value,
                    content: quill.root.innerHTML,
                    lastEditor: article.author,
                    updatedAt: new Date().toISOString()
                };

                fetch(`/api/articles/${articleId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedArticle)
                })
                .then(response => response.json())
                .then(savedArticle => {
                    window.location.href = `/article/${savedArticle._id}`;
                })
                .catch(error => {
                    console.error('Error updating article:', error);
                    alert('Fehler beim Speichern der Änderungen');
                });
            });
        })
        .catch(error => {
            console.error('Error loading article for editing:', error);
            container.innerHTML = '<div class="error">Artikel konnte nicht geladen werden.</div>';
        });
}

// Function to edit article
function editArticle(articleId) {
    window.location.href = `/edit/${articleId}`;
}

// Load articles for the homepage
function loadArticles() {
    const articlesContainer = document.getElementById('articles');
    if (!articlesContainer) return;

    fetch('/api/articles')
        .then(response => response.json())
        .then(articles => {
            displayArticles(articles);
        })
        .catch(error => console.error('Error loading articles:', error));
}

// Load recent articles
function loadRecentArticles() {
    const articlesContainer = document.getElementById('articles');
    if (!articlesContainer) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    fetch('/api/articles')
        .then(response => response.json())
        .then(articles => {
            const recentArticles = articles.filter(article => 
                new Date(article.createdAt) >= thirtyDaysAgo ||
                new Date(article.updatedAt) >= thirtyDaysAgo
            );
            displayArticles(recentArticles);
        })
        .catch(error => console.error('Error loading recent articles:', error));
}

// Load a random article
function loadRandomArticle() {
    fetch('/api/articles')
        .then(response => response.json())
        .then(articles => {
            if (articles.length === 0) {
                alert('Keine Artikel verfügbar');
                return;
            }
            const randomIndex = Math.floor(Math.random() * articles.length);
            const article = articles[randomIndex];
            window.location.href = `/article/${article._id}`;
        })
        .catch(error => console.error('Error loading random article:', error));
}

// Load a specific article
function loadArticle(articleId) {
    const articlesContainer = document.getElementById('articles');
    if (!articlesContainer) return;

    fetch(`/api/articles/${articleId}`)
        .then(response => response.json())
        .then(article => {
            articlesContainer.innerHTML = `
                <div class="article-single">
                    <div class="article-header">
                        <h1>${article.title}</h1>
                        <div class="article-actions">
                            <button onclick="editArticle('${article._id}')" class="btn">
                                <i class="fas fa-edit"></i> Bearbeiten
                            </button>
                            <button onclick="showHistory('${article._id}')" class="btn">
                                <i class="fas fa-history"></i> Verlauf
                            </button>
                        </div>
                    </div>
                    <div class="article-content">${article.content}</div>
                    <div class="article-meta">
                        <p>Erstellt von: ${article.author}</p>
                        ${article.lastEditor ? `<p>Zuletzt bearbeitet von: ${article.lastEditor}</p>` : ''}
                        <p>Zuletzt aktualisiert: ${new Date(article.updatedAt).toLocaleDateString('de-DE')}</p>
                    </div>
                </div>
            `;
        })
        .catch(error => {
            console.error('Error loading article:', error);
            articlesContainer.innerHTML = '<div class="error">Artikel konnte nicht geladen werden.</div>';
        });
}

// Display articles in the grid
function displayArticles(articles) {
    const articlesContainer = document.getElementById('articles');
    if (!articlesContainer) return;

    articlesContainer.innerHTML = '';
    
    if (articles.length === 0) {
        articlesContainer.innerHTML = '<p class="no-articles">Keine Artikel gefunden.</p>';
        return;
    }

    articles.forEach(article => {
        const articleElement = document.createElement('div');
        articleElement.className = 'article-tile';
        
        const truncatedContent = article.content.length > 150 
            ? article.content.substring(0, 150) + '...' 
            : article.content;

        articleElement.innerHTML = `
            <div class="article-header">
                <h2>${article.title}</h2>
            </div>
            <div class="article-preview">${truncatedContent}</div>
            <div class="article-footer">
                <div class="article-meta">
                    <span class="article-author"><i class="fas fa-user"></i> ${article.author}</span>
                    <span class="article-date"><i class="fas fa-clock"></i> ${new Date(article.updatedAt).toLocaleDateString('de-DE')}</span>
                </div>
                <button onclick="window.location.href='/article/${article._id}'" class="read-more-button">
                    <i class="fas fa-arrow-right"></i> Weiterlesen
                </button>
            </div>
        `;
        
        // Add click handler to the entire tile
        articleElement.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                window.location.href = `/article/${article._id}`;
            }
        });
        
        articlesContainer.appendChild(articleElement);
    });
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    
    if (path === '/create') {
        initializeCreateForm();
    } else if (path.startsWith('/edit/')) {
        const articleId = path.split('/')[2];
        initializeEditForm(articleId);
    } else if (path.startsWith('/article/')) {
        const articleId = path.split('/')[2];
        loadArticle(articleId);
    } else if (path === '/help') {
        loadHelpPage();
    } else {
        loadArticles();
    }
});

// Function to load help page
function loadHelpPage() {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="help-page">
            <h1>Hilfe & Anleitung</h1>
            <section>
                <h2>Navigation</h2>
                <ul>
                    <li><strong>Startseite:</strong> Zeigt alle verfügbaren Artikel an</li>
                    <li><strong>Neuer Artikel:</strong> Erstellt einen neuen Wiki-Artikel</li>
                    <li><strong>Letzte 30 Tage:</strong> Zeigt kürzlich erstellte oder bearbeitete Artikel</li>
                    <li><strong>Zufälliger Artikel:</strong> Öffnet einen zufälligen Artikel</li>
                </ul>
            </section>
            <section>
                <h2>Artikel bearbeiten</h2>
                <ul>
                    <li>Klicken Sie auf den "Bearbeiten" Button innerhalb eines Artikels</li>
                    <li>Nutzen Sie den Rich-Text-Editor für die Formatierung</li>
                    <li>Speichern Sie Ihre Änderungen mit "Speichern"</li>
                </ul>
            </section>
        </div>
    `;
}

// Handle navigation
function handleNavigation() {
    const path = window.location.pathname;
    
    if (path === '/') {
        loadArticles();
    } else if (path === '/create') {
        initializeCreateForm();
    } else if (path.startsWith('/edit/')) {
        const articleId = path.split('/')[2];
        initializeEditForm(articleId);
    } else if (path.startsWith('/article/')) {
        const articleId = path.split('/')[2];
        loadArticle(articleId);
    } else if (path === '/recent') {
        loadRecentArticles();
    } else if (path === '/random') {
        loadRandomArticle();
    } else if (path === '/help') {
        loadHelpPage();
    } else {
        loadArticles();
    }
}

// Add event listeners for navigation
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        if (!link.getAttribute('href').startsWith('http')) {
            e.preventDefault();
            const href = link.getAttribute('href');
            history.pushState(null, '', href);
            handleNavigation();
        }
    });
});

// Handle browser back/forward buttons
window.addEventListener('popstate', handleNavigation);
