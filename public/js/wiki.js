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
function initializeEditForm() {
    const editForm = document.getElementById('editForm');
    if (!editForm) return;

    const articleId = window.location.pathname.split('/').pop();
    
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
    fetch('/api/random-article')
        .then(response => response.json())
        .then(article => {
            if (article) {
                window.location.href = `/article/${article._id}`;
            } else {
                alert('Keine Artikel verfügbar');
            }
        })
        .catch(error => console.error('Error loading random article:', error));
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

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeQuill();
    initializeCreateForm();
    initializeEditForm();
    loadArticles();
});
