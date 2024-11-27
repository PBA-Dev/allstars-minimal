// Initialize Quill editor only on pages that need it
let quill;
function initializeQuill() {
    const editorContainer = document.getElementById('editor-container');
    if (!editorContainer) return;

    quill = new Quill('#editor-container', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
            ]
        },
        placeholder: 'Schreiben Sie hier Ihren Artikel...'
    });

    return quill;
}

// Handle article creation
function initializeCreateForm() {
    const createForm = document.getElementById('createForm');
    if (!createForm) return;

    createForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const editorName = document.getElementById('editor-name').value;
        if (!editorName.trim()) {
            alert('Bitte geben Sie Ihren Namen ein.');
            return;
        }

        const article = {
            title: document.getElementById('title').value,
            content: quill.root.innerHTML,
            author: editorName
        };

        fetch('/api/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(article)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            window.location.href = '/';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Fehler beim Speichern des Artikels. Bitte versuchen Sie es erneut.');
        });
    });
}

// Handle article editing
function initializeEditForm(articleId) {
    const editForm = document.getElementById('editForm');
    if (!editForm) return;

    // Load article data
    fetch(`/api/articles/${articleId}`)
        .then(response => response.json())
        .then(article => {
            document.getElementById('title').value = article.title;
            if (quill) {
                quill.root.innerHTML = article.content;
            }
        })
        .catch(error => console.error('Error loading article:', error));

    // Handle form submission
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const editorName = document.getElementById('editor-name').value;
        if (!editorName.trim()) {
            alert('Bitte geben Sie Ihren Namen ein.');
            return;
        }

        const article = {
            title: document.getElementById('title').value,
            content: quill.root.innerHTML,
            editor: editorName
        };

        fetch(`/api/articles/${articleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(article)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            window.location.href = `/article/${articleId}`;
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Fehler beim Speichern des Artikels. Bitte versuchen Sie es erneut.');
        });
    });
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
        articleElement.className = 'article-card';
        
        const truncatedContent = article.content.length > 150 
            ? article.content.substring(0, 150) + '...' 
            : article.content;

        articleElement.innerHTML = `
            <h2><a href="/article/${article._id}">${article.title}</a></h2>
            <div class="article-preview">${truncatedContent}</div>
            <div class="article-meta">
                <span><i class="fas fa-user"></i> ${article.author}</span>
                <span><i class="fas fa-clock"></i> ${new Date(article.updatedAt).toLocaleDateString('de-DE')}</span>
            </div>
            <div class="article-actions">
                <button onclick="editArticle('${article._id}')" class="btn">
                    <i class="fas fa-edit"></i> Bearbeiten
                </button>
            </div>
        `;
        
        articlesContainer.appendChild(articleElement);
    });
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    
    if (path.startsWith('/article/')) {
        const articleId = path.split('/')[2];
        loadArticle(articleId);
    } else if (path === '/create') {
        initializeCreateForm();
    } else if (path.startsWith('/edit/')) {
        const articleId = path.split('/')[2];
        initializeEditForm(articleId);
    } else {
        loadArticles();
    }
});

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
