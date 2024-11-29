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

    console.log('Saving article:', { title, author, category, contentLength: content.length });

    if (!title || !author || !category || !content) {
        alert('Bitte füllen Sie alle Pflichtfelder aus.');
        return;
    }

    try {
        const url = `/api/articles${isNewArticle ? '' : '/' + articleId}`;
        console.log('Making request to:', url);
        
        const requestData = { title, author, category, content };
        console.log('Request data:', requestData);

        const response = await fetch(url, {
            method: isNewArticle ? 'POST' : 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const responseText = await response.text();
        console.log('Raw response:', responseText);

        let responseData;
        try {
            responseData = JSON.parse(responseText);
            console.log('Parsed response data:', responseData);
        } catch (e) {
            console.error('Failed to parse response as JSON:', e);
            throw new Error('Server returned invalid JSON');
        }

        if (!response.ok) {
            throw new Error(responseData.error || 'Failed to save article');
        }

        // Handle both id and _id formats
        const articleID = responseData._id || responseData.id;
        if (!articleID) {
            console.error('Response missing both id and _id:', responseData);
            throw new Error('Invalid server response: missing article ID');
        }

        console.log('Successfully saved article. Redirecting to:', `/article/${articleID}`);
        window.location.href = `/article/${articleID}`;
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
        if (!article || !article._id) {
            console.error('Invalid article data received:', article);
            throw new Error('Invalid article data received');
        }
        window.location.href = `/article/${article._id}`;
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

    container.innerHTML = articles
        .filter(article => article && article._id && article.title) // Filter out invalid articles
        .map(article => `
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
    console.log('Loading article:', articleId);
    try {
        const response = await fetch(`/api/articles/${articleId}`);
        const responseText = await response.text();
        console.log('Raw article response:', responseText);

        let article;
        try {
            article = JSON.parse(responseText);
            console.log('Parsed article data:', article);
        } catch (e) {
            console.error('Failed to parse article response as JSON:', e);
            throw new Error('Server returned invalid JSON');
        }

        if (!response.ok) {
            throw new Error(article.error || 'Article not found');
        }

        // Handle both id and _id formats
        const id = article._id || article.id;
        if (!id) {
            console.error('Article response missing both id and _id:', article);
            throw new Error('Invalid article data: missing ID');
        }

        document.getElementById('article-title').textContent = article.title;
        document.getElementById('article-author').textContent = article.author;
        document.getElementById('article-date').textContent = new Date(article.createdAt).toLocaleDateString('de-DE');
        document.getElementById('article-content').innerHTML = article.content;

        // Update edit link
        const editLink = document.getElementById('edit-link');
        if (editLink) {
            editLink.href = `/edit/${id}`;
        }

    } catch (error) {
        console.error('Error loading article:', error);
        document.getElementById('article-container').innerHTML = `
            <div class="error-message">
                <h2>Fehler beim Laden des Artikels</h2>
                <p>${error.message}</p>
                <a href="/" class="btn btn-primary">Zurück zur Übersicht</a>
            </div>
        `;
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
async function handleImageUpload(quill) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to upload image');
            }

            const result = await response.json();
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', result.url);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Bildupload fehlgeschlagen. Bitte versuchen Sie es erneut.');
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
