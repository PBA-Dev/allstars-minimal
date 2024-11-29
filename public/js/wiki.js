// Global variable for Quill editor
let quill;

// Initialize Quill editor with default options
function initializeQuill(containerId) {
    // Add video handler to Quill
    const VideoBlot = Quill.import('formats/video');
    class CustomVideo extends VideoBlot {
        static create(value) {
            const node = super.create(value);
            node.setAttribute('controls', true);
            node.setAttribute('width', '100%');
            return node;
        }
    }
    Quill.register('formats/video', CustomVideo);

    quill = new Quill(containerId, {
        theme: 'snow',
        placeholder: 'Schreiben Sie hier Ihren Artikel...',
        modules: {
            toolbar: {
                container: [
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
                ],
                handlers: {
                    'image': function() {
                        handleMediaUpload(quill, 'image');
                    },
                    'video': function() {
                        handleMediaUpload(quill, 'video');
                    }
                }
            }
        }
    });
    
    // Add media upload handler
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', () => {
        handleMediaUpload(quill, 'image');
    });
    toolbar.addHandler('video', () => {
        handleMediaUpload(quill, 'video');
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

        // For updates, use the existing article ID
        const articleID = isNewArticle ? (responseData._id || responseData.id) : articleId;
        if (!articleID) {
            console.error('No article ID available:', { isNewArticle, responseData, articleId });
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
        const responseText = await response.text();
        console.log('Raw random article response:', responseText);

        let article;
        try {
            article = JSON.parse(responseText);
            console.log('Parsed random article data:', article);
        } catch (e) {
            console.error('Failed to parse random article response as JSON:', e);
            throw new Error('Server returned invalid JSON');
        }

        if (!response.ok) {
            throw new Error(article.error || 'Failed to get random article');
        }

        const id = article._id || article.id;
        if (!id) {
            console.error('Random article missing ID:', article);
            throw new Error('Invalid article data: missing ID');
        }

        window.location.href = `/article/${id}`;
    } catch (error) {
        console.error('Error loading random article:', error);
        alert('Fehler beim Laden eines zufälligen Artikels: ' + error.message);
    }
}

// Load all articles
async function loadArticles(category = '') {
    try {
        const categoryFilter = document.getElementById('categoryFilter');
        const selectedCategory = category || (categoryFilter ? categoryFilter.value : '');
        
        const response = await fetch('/api/articles');
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load articles');
        }
        
        let articles = await response.json();
        console.log('Loaded articles:', articles);
        
        // Filter by category if selected
        if (selectedCategory) {
            articles = articles.filter(article => article.category === selectedCategory);
            console.log('Filtered by category:', selectedCategory, articles);
        }
        
        displayArticles(articles);
    } catch (error) {
        console.error('Error loading articles:', error);
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h2>Fehler beim Laden der Artikel</h2>
                    <p>${error.message}</p>
                    <button onclick="loadArticles()" class="btn btn-primary">Erneut versuchen</button>
                </div>
            `;
        }
    }
}

// Display articles in the grid
async function displayArticles(articles) {
    const container = document.querySelector('.container');
    if (!container) {
        console.error('Container element not found');
        return;
    }

    if (!Array.isArray(articles)) {
        console.error('Expected articles to be an array, got:', typeof articles);
        articles = [];
    }

    console.log('Displaying articles:', articles);

    if (articles.length === 0) {
        container.innerHTML = '<div class="no-articles">Keine Artikel gefunden.</div>';
        return;
    }

    container.innerHTML = articles
        .filter(article => article && (article._id || article.id) && article.title)
        .map(article => {
            const id = article._id || article.id;
            return `
                <article class="article-preview">
                    <h2><a href="/article/${id}">${article.title}</a></h2>
                    <div class="article-meta">
                        <span>Autor: ${article.author || 'Unbekannt'}</span>
                        <span class="category-tag">${article.category || 'Keine Kategorie'}</span>
                        <span>Erstellt: ${new Date(article.createdAt).toLocaleDateString('de-DE')}</span>
                    </div>
                </article>
            `;
        })
        .join('');
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

        // Get container and create article content
        const container = document.querySelector('.container');
        if (!container) {
            throw new Error('Container element not found');
        }

        container.innerHTML = `
            <article class="article-full">
                <div class="article-header">
                    <h1>${article.title}</h1>
                </div>
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
                    <a href="/edit/${id}" class="btn btn-primary">Bearbeiten</a>
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
                    <a href="/" class="btn btn-primary">Zurück zur Übersicht</a>
                </div>
            `;
        }
    }
}

// Load recent articles
async function loadRecentArticles() {
    try {
        const response = await fetch('/api/recent');
        const responseText = await response.text();
        console.log('Raw recent articles response:', responseText);

        let articles;
        try {
            articles = JSON.parse(responseText);
            console.log('Parsed recent articles data:', articles);
        } catch (e) {
            console.error('Failed to parse recent articles response as JSON:', e);
            throw new Error('Server returned invalid JSON');
        }

        if (!response.ok) {
            throw new Error(articles.error || 'Failed to get recent articles');
        }

        if (!Array.isArray(articles)) {
            console.error('Expected articles to be an array:', articles);
            throw new Error('Invalid response: expected array of articles');
        }

        displayArticles(articles);
    } catch (error) {
        console.error('Error loading recent articles:', error);
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h2>Fehler beim Laden der neuesten Artikel</h2>
                    <p>${error.message}</p>
                    <button onclick="loadArticles()" class="btn btn-primary">Alle Artikel anzeigen</button>
                </div>
            `;
        }
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

// Handle media upload (images and videos)
async function handleMediaUpload(quill, type) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    
    // Set accept attribute based on type
    if (type === 'image') {
        input.setAttribute('accept', 'image/jpeg,image/png,image/gif');
    } else if (type === 'video') {
        input.setAttribute('accept', 'video/mp4,video/webm,video/ogg');
    }
    
    input.click();

    input.onchange = async () => {
        try {
            const file = input.files[0];
            if (!file) {
                throw new Error('Keine Datei ausgewählt');
            }

            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');

            // Validate file type matches requested type
            if (type === 'image' && !isImage) {
                throw new Error('Bitte wählen Sie eine Bilddatei aus');
            }
            if (type === 'video' && !isVideo) {
                throw new Error('Bitte wählen Sie eine Videodatei aus');
            }

            // Check file size
            if (isImage && file.size > 10 * 1024 * 1024) {
                throw new Error('Bilder dürfen maximal 10MB groß sein');
            }
            if (isVideo && file.size > 25 * 1024 * 1024) {
                throw new Error('Videos dürfen maximal 25MB groß sein');
            }

            // Show upload progress
            const range = quill.getSelection(true);
            const placeholder = type === 'image' ? '⌛ Bild wird hochgeladen...' : '⌛ Video wird hochgeladen...';
            quill.insertText(range.index, placeholder);

            // Prepare form data
            const formData = new FormData();
            formData.append('file', file);

            console.log(`Uploading ${type}:`, file.name);
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Upload error response:', errorText);
                if (response.status === 413) {
                    throw new Error('Die Datei ist zu groß. Maximale Größe: 10MB für Bilder, 25MB für Videos.');
                }
                throw new Error(`Upload fehlgeschlagen: ${response.statusText}`);
            }

            const responseText = await response.text();
            console.log('Raw upload response:', responseText);

            let result;
            try {
                result = JSON.parse(responseText);
                console.log('Parsed upload response:', result);
            } catch (e) {
                console.error('Failed to parse upload response as JSON:', e);
                throw new Error('Server-Antwort konnte nicht verarbeitet werden');
            }

            if (!result.url || !result.type) {
                console.error('Upload response missing URL or type:', result);
                throw new Error('Ungültige Server-Antwort: Dateiinformationen fehlen');
            }

            // Remove placeholder if it exists
            if (range && placeholder) {
                quill.deleteText(range.index, placeholder.length);
            }

            // Insert the appropriate embed based on file type
            if (result.type === 'image') {
                quill.insertEmbed(range.index, 'image', result.url);
            } else if (result.type === 'video') {
                quill.insertEmbed(range.index, 'video', result.url);
            }

            // Move cursor to next line
            quill.setSelection(range.index + 1);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Fehler beim Hochladen der Datei: ' + error.message);
        }
    };
}

// Add styles for category elements and media
const style = document.createElement('style');
style.textContent = `
    .category-tag {
        display: inline-block;
        padding: 4px 8px;
        margin: 4px;
        border-radius: 4px;
        background-color: #e9ecef;
        color: #495057;
        font-size: 0.9em;
    }
    
    /* Limit size of images and videos in editor and article view */
    .ql-editor img, 
    .article-content img {
        max-width: 400px !important;
        max-height: 400px !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain;
    }
    
    .ql-editor video,
    .article-content video {
        max-width: 400px !important;
        max-height: 400px !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain;
    }
    
    /* Ensure media is responsive on smaller screens */
    @media (max-width: 768px) {
        .ql-editor img,
        .ql-editor video,
        .article-content img,
        .article-content video {
            max-width: 100% !important;
        }
    }
`;
document.head.appendChild(style);

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
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            // Debounce search to avoid too many requests
            searchTimeout = setTimeout(() => {
                searchArticles(query);
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

// Search articles
async function searchArticles(query) {
    if (!query || query.length < 2) {
        return loadArticles();
    }

    try {
        console.log('Searching for:', query);
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const responseText = await response.text();
        console.log('Raw search response:', responseText);

        let articles;
        try {
            articles = JSON.parse(responseText);
            console.log('Parsed search results:', articles);
        } catch (e) {
            console.error('Failed to parse search response as JSON:', e);
            throw new Error('Server returned invalid JSON');
        }

        if (!response.ok) {
            throw new Error(articles.error || 'Failed to search articles');
        }

        if (!Array.isArray(articles)) {
            console.error('Expected search results to be an array:', articles);
            throw new Error('Invalid response: expected array of articles');
        }

        displayArticles(articles);

        // Update UI to show search results
        const container = document.querySelector('.container');
        if (container && articles.length > 0) {
            const searchHeader = document.createElement('div');
            searchHeader.className = 'search-header';
            searchHeader.innerHTML = `
                <h2>Suchergebnisse für "${query}"</h2>
                <p>${articles.length} Artikel gefunden</p>
                <button onclick="loadArticles()" class="btn btn-secondary">Alle Artikel anzeigen</button>
            `;
            container.insertBefore(searchHeader, container.firstChild);
        }
    } catch (error) {
        console.error('Error searching articles:', error);
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h2>Fehler bei der Suche</h2>
                    <p>${error.message}</p>
                    <button onclick="loadArticles()" class="btn btn-primary">Alle Artikel anzeigen</button>
                </div>
            `;
        }
    }
}

// Add search event listener
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        // Debounce search to avoid too many requests
        searchTimeout = setTimeout(() => {
            searchArticles(query);
        }, 300);
    });
}
