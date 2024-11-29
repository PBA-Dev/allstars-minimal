// Global variable for Quill editor
let quill;

// Initialize Quill editor with default options
function initializeQuill(containerId) {
    quill = new Quill(containerId, {
        theme: 'snow',
        placeholder: 'Schreiben Sie hier Ihren Artikel...',
        modules: {
            toolbar: [
                // Text formatting
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'font': [] }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                
                // Text styling
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                
                // Text alignment
                [{ 'align': [] }],
                
                // Lists and indentation
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                
                // Special formatting
                [{ 'script': 'sub'}, { 'script': 'super' }],
                ['blockquote', 'code-block'],
                
                // Media and links
                ['link', 'image', 'video'],
                
                // Clear formatting
                ['clean']
            ]
        }
    });
    
    // Add image upload handler
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', () => {
        handleImageUpload(quill);
    });
    
    return quill;
}

// Save article (create or update)
async function saveArticle() {
    const articleId = window.location.pathname.split('/').pop();
    const isNewArticle = articleId === 'create';
    const form = document.getElementById('article-form');

    const title = document.getElementById('title').value.trim();
    const author = document.getElementById('editor-name').value.trim();
    const category = document.getElementById('category').value;
    const content = quill.root.innerHTML.trim();

    if (!title || !author || !category || !content) {
        alert('Bitte füllen Sie alle Pflichtfelder aus.');
        return;
    }

    try {
        const response = await fetch(`/api/articles${isNewArticle ? '' : '/' + articleId}`, {
            method: isNewArticle ? 'POST' : 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, author, category, content })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save article');
        }

        const result = await response.json();
        window.location.href = `/article/${result._id}`;
    } catch (error) {
        console.error('Error saving article:', error);
        alert('Fehler beim Speichern des Artikels: ' + error.message);
    }
}

// Load random article
async function loadRandomArticle() {
    try {
        const response = await fetch('/api/random');
        if (!response.ok) {
            throw new Error('Failed to get random article');
        }
        const article = await response.json();
        if (article && article._id) {
            window.location.href = `/article/${article._id}`;
        } else {
            throw new Error('Invalid article data received');
        }
    } catch (error) {
        console.error('Error loading random article:', error);
        alert('Fehler beim Laden eines zufälligen Artikels');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Quill editor if we're on a page with an editor
    const editorContainer = document.querySelector('#editor-container') || document.querySelector('#editor');
    if (editorContainer) {
        initializeQuill('#' + editorContainer.id);
    }

    // Check if we're on an article page
    const path = window.location.pathname;
    if (path.startsWith('/article/')) {
        const articleId = path.split('/').pop();
        loadArticle(articleId);
    }
    // Load articles on home page
    else if (path === '/') {
        loadArticles();

        // Initialize category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput.value.trim()) {
                    searchArticles(searchInput.value);
                } else {
                    loadArticles();
                }
            });
        }
    }

    // Initialize event listeners
    const randomArticleBtn = document.getElementById('randomArticle');
    if (randomArticleBtn) {
        randomArticleBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await loadRandomArticle();
        });
    }

    // Initialize search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let debounceTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                searchArticles(e.target.value);
            }, 300);
        });
    }

    // Initialize recent articles
    const recentArticlesBtn = document.getElementById('recentArticles');
    if (recentArticlesBtn) {
        recentArticlesBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/api/recent');
                if (!response.ok) throw new Error('Failed to get recent articles');
                const articles = await response.json();
                displayArticles(articles);
            } catch (error) {
                console.error('Error getting recent articles:', error);
                alert('Fehler beim Laden der neuesten Artikel');
            }
        });
    }

    // Load article data if editing
    const articleId = window.location.pathname.split('/').pop();
    if (articleId !== 'create' && editorContainer) {
        fetch(`/api/articles/${articleId}`)
            .then(response => response.json())
            .then(article => {
                document.getElementById('title').value = article.title || '';
                document.getElementById('editor-name').value = article.author || '';
                document.getElementById('category').value = article.category || '';
                quill.root.innerHTML = article.content || '';
            })
            .catch(error => {
                console.error('Error loading article:', error);
                alert('Fehler beim Laden des Artikels');
            });
    }
});

// Display articles in the grid
async function displayArticles(articles) {
    const container = document.querySelector('.container');
    if (!container) return;

    if (!Array.isArray(articles)) {
        console.error('Expected articles to be an array, got:', typeof articles);
        articles = [];
    }

    if (articles.length === 0) {
        container.innerHTML = '<div class="no-articles">Keine Artikel gefunden.</div>';
        return;
    }

    container.innerHTML = articles.map(article => `
        <article class="article-preview">
            <h2><a href="/article/${article._id}">${article.title}</a></h2>
            <div class="article-meta">
                <span>Autor: ${article.author || 'Unbekannt'}</span>
                <span class="category-tag">${article.category || 'Keine Kategorie'}</span>
                <span>Erstellt: ${new Date(article.createdAt).toLocaleDateString('de-DE')}</span>
            </div>
        </article>
    `).join('');
}

// Load all articles
async function loadArticles(category = '') {
    try {
        const categoryFilter = document.getElementById('categoryFilter');
        const selectedCategory = categoryFilter ? categoryFilter.value : '';
        
        const response = await fetch('/api/articles');
        if (!response.ok) {
            throw new Error('Failed to load articles');
        }
        
        let articles = await response.json();
        
        // Filter by category if selected
        if (selectedCategory) {
            articles = articles.filter(article => article.category === selectedCategory);
        }
        
        displayArticles(articles);
    } catch (error) {
        console.error('Error loading articles:', error);
        alert('Fehler beim Laden der Artikel');
    }
}

// Search articles
async function searchArticles(query) {
    if (!query.trim()) {
        return loadArticles();
    }

    try {
        const categoryFilter = document.getElementById('categoryFilter');
        const selectedCategory = categoryFilter ? categoryFilter.value : '';
        
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Failed to search articles');
        }
        
        let articles = await response.json();
        
        // Filter by category if selected
        if (selectedCategory) {
            articles = articles.filter(article => article.category === selectedCategory);
        }
        
        displayArticles(articles);
    } catch (error) {
        console.error('Error searching articles:', error);
        alert('Fehler bei der Suche');
    }
}

// Load single article
async function loadArticle(articleId) {
    try {
        console.log('Loading article:', articleId);
        const response = await fetch(`/api/articles/${articleId}`);
        if (!response.ok) {
            throw new Error('Article not found');
        }
        const article = await response.json();
        console.log('Article loaded:', article);
        
        const container = document.querySelector('.container');
        if (!container) {
            console.error('Container not found');
            return;
        }

        container.innerHTML = `
            <article class="article-full">
                <h1>${article.title}</h1>
                <div class="article-meta">
                    <span>Autor: ${article.author || 'Unbekannt'}</span>
                    <span class="category-tag">${article.category || 'Keine Kategorie'}</span>
                    <span>Erstellt: ${new Date(article.createdAt).toLocaleDateString('de-DE')}</span>
                    ${article.updatedAt ? `<span>Zuletzt bearbeitet: ${new Date(article.updatedAt).toLocaleDateString('de-DE')}</span>` : ''}
                </div>
                <div class="article-content">
                    ${article.content}
                </div>
                <div class="article-actions">
                    <a href="/edit/${article._id}" class="btn btn-primary">Bearbeiten</a>
                    <a href="/" class="btn btn-secondary">Zurück zur Übersicht</a>
                </div>
            </article>
        `;
    } catch (error) {
        console.error('Error loading article:', error);
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h2>Fehler beim Laden des Artikels</h2>
                    <p>${error.message}</p>
                    <a href="/" class="btn btn-secondary">Zurück zur Übersicht</a>
                </div>
            `;
        }
    }
}

// Load recent articles
async function loadRecentArticles() {
    try {
        const response = await fetch('/api/recent');
        const articles = await response.json();
        displayArticles(articles);
    } catch (error) {
        console.error('Error loading recent articles:', error);
    }
}

// Initialize edit form
function initializeEditForm(articleId) {
    const form = document.getElementById('edit-article-form');
    if (!form) return;

    quill = initializeQuill('#editor');
    if (!quill) {
        console.error('Failed to initialize Quill editor');
        return;
    }

    // Load the article data
    fetch(`/api/articles/${articleId}`)
        .then(response => response.json())
        .then(article => {
            form.querySelector('#title').value = article.title || '';
            form.querySelector('#author').value = article.author || '';
            form.querySelector('#category').value = article.category || '';
            quill.root.innerHTML = article.content || '';
        })
        .catch(error => {
            console.error('Error loading article:', error);
            alert('Fehler beim Laden des Artikels');
        });

    form.onsubmit = async (event) => {
        event.preventDefault();
        
        const title = form.querySelector('#title').value.trim();
        const author = form.querySelector('#author').value.trim();
        const category = form.querySelector('#category').value;
        const content = quill.root.innerHTML.trim();

        if (!title || !author || !category || !content) {
            alert('Bitte füllen Sie alle Pflichtfelder aus.');
            return;
        }

        try {
            const response = await fetch(`/api/articles/${articleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    content,
                    author,
                    category
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update article');
            }

            const article = await response.json();
            window.location.href = `/article/${article._id}`;
        } catch (error) {
            console.error('Error updating article:', error);
            alert('Fehler beim Aktualisieren des Artikels: ' + error.message);
        }
    };
}

// Initialize create form
function initializeCreateForm() {
    const form = document.getElementById('create-article-form');
    if (!form) return;

    quill = initializeQuill('#editor');
    if (!quill) {
        console.error('Failed to initialize Quill editor');
        return;
    }

    form.onsubmit = async (event) => {
        event.preventDefault();
        
        const title = form.querySelector('#title').value.trim();
        const author = form.querySelector('#author').value.trim();
        const category = form.querySelector('#category').value;
        const content = quill.root.innerHTML.trim();

        if (!title || !author || !category || !content) {
            alert('Bitte füllen Sie alle Pflichtfelder aus.');
            return;
        }

        try {
            const response = await fetch('/api/articles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    content,
                    author,
                    category
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create article');
            }

            const article = await response.json();
            window.location.href = `/article/${article._id}`;
        } catch (error) {
            console.error('Error creating article:', error);
            alert('Fehler beim Erstellen des Artikels: ' + error.message);
        }
    };
}

// Handle image upload
function handleImageUpload(quill) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
        const file = input.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const { url } = await response.json();
                    const range = quill.getSelection(true);
                    quill.insertEmbed(range.index, 'image', url);
                } else {
                    console.error('Upload failed:', await response.text());
                    alert('Bildupload fehlgeschlagen. Bitte versuchen Sie es erneut.');
                }
            } catch (error) {
                console.error('Upload error:', error);
                alert('Bildupload fehlgeschlagen. Bitte versuchen Sie es erneut.');
            }
        }
    };
}

// Add styles for category elements
const style = document.createElement('style');
style.textContent = `
    .category-tag {
        background: #e9ecef;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.9em;
        margin: 0 8px;
    }
    #category {
        width: 100%;
        padding: 8px;
        margin-bottom: 16px;
        border: 1px solid #ddd;
        border-radius: 4px;
    }
    #categoryFilter {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        min-width: 200px;
    }
`;
document.head.appendChild(style);
