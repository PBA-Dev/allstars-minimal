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

// Load articles on the main page
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
async function loadRecentArticles() {
    try {
        const response = await fetch('/api/recent-articles');
        if (!response.ok) throw new Error('Failed to load recent articles');
        const articles = await response.json();
        displayArticles(articles);
    } catch (error) {
        console.error('Error loading recent articles:', error);
    }
}

// Load a random article
async function loadRandomArticle() {
    try {
        const response = await fetch('/api/random-article');
        if (!response.ok) throw new Error('Failed to load random article');
        const article = await response.json();
        history.pushState(null, '', `/article/${article._id}`);
        handleNavigation();
    } catch (error) {
        console.error('Error loading random article:', error);
    }
}

// Load an article
async function loadArticle(articleId) {
    try {
        const response = await fetch(`/api/articles/${articleId}`);
        if (!response.ok) throw new Error('Failed to load article');
        const article = await response.json();
        
        const mainContent = document.querySelector('.container');
        mainContent.innerHTML = `
            <article class="article-view">
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
            </article>
        `;
    } catch (error) {
        console.error('Error loading article:', error);
        const mainContent = document.querySelector('.container');
        mainContent.innerHTML = '<div class="error">Artikel konnte nicht geladen werden.</div>';
    }
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
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = article.content;
        
        const textContent = tempDiv.textContent || tempDiv.innerText;
        const preview = textContent.length > 150 ? 
            textContent.substring(0, 150) + '...' : 
            textContent;

        const articleElement = document.createElement('div');
        articleElement.className = 'article-tile';
        
        const date = new Date(article.updatedAt).toLocaleDateString('de-DE');
        
        articleElement.innerHTML = `
            <div class="article-header">
                <h2>${article.title}</h2>
            </div>
            <p class="article-preview">${preview}</p>
            <div class="article-footer">
                <div class="article-meta">
                    <span class="article-author">Von: ${article.author}</span>
                    ${article.lastEditor ? 
                        `<span class="article-editor">Bearbeitet von: ${article.lastEditor}</span>` : 
                        ''}
                </div>
                <div class="article-actions">
                    <button onclick="window.location.href='/edit/${article._id}'" class="edit-button">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="window.location.href='/article/${article._id}'" class="read-more-button">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
        
        articlesContainer.appendChild(articleElement);
    });
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
    } else {
        loadArticles();
    }
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    handleNavigation();
    
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
});

// Handle browser back/forward buttons
window.addEventListener('popstate', handleNavigation);
