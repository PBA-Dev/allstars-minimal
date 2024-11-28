// Initialize Quill editor
let quill = null;

function initializeQuill() {
    const options = {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                ['blockquote', 'code-block'],
                ['link', 'image'],
                ['clean']
            ]
        }
    };

    // Only initialize if editor container exists
    const container = document.getElementById('editor-container');
    if (container) {
        quill = new Quill('#editor-container', options);
        return quill;
    }
    return null;
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

// Initialize edit form
function initializeEditForm(articleId) {
    const quill = initializeQuill();
    const form = document.getElementById('editForm');

    // Add image upload handler
    quill.getModule('toolbar').addHandler('image', () => {
        handleImageUpload(quill);
    });

    // Load article data
    fetch(`/api/articles/${articleId}`)
        .then(response => response.json())
        .then(article => {
            document.getElementById('title').value = article.title || '';
            document.getElementById('editor-name').value = article.author || '';
            quill.root.innerHTML = article.content || '';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Fehler beim Laden des Artikels');
        });

    form.onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const author = document.getElementById('editor-name').value;
        const content = quill.root.innerHTML;

        try {
            const response = await fetch(`/api/articles/${articleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title, author, content })
            });

            if (response.ok) {
                window.location.href = `/article/${articleId}`;
            } else {
                alert('Fehler beim Speichern des Artikels');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Fehler beim Speichern des Artikels');
        }
    };
}

// Initialize create form
function initializeCreateForm() {
    const quill = initializeQuill();
    const form = document.getElementById('createForm');

    // Add image upload handler
    quill.getModule('toolbar').addHandler('image', () => {
        handleImageUpload(quill);
    });

    form.onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const author = document.getElementById('author').value;
        const content = quill.root.innerHTML;

        try {
            const response = await fetch('/api/articles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title, author, content })
            });

            if (response.ok) {
                const article = await response.json();
                window.location.href = `/article/${article.id}`;
            } else {
                alert('Fehler beim Speichern des Artikels');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Fehler beim Speichern des Artikels');
        }
    };
}

// Load articles for index page
function loadArticles() {
    const articleList = document.getElementById('articles');
    if (!articleList) return;

    fetch('/api/articles')
        .then(response => response.json())
        .then(articles => {
            if (articles.length === 0) {
                articleList.innerHTML = '<p>Keine Artikel vorhanden.</p>';
                return;
            }
            
            articleList.innerHTML = articles.map(article => `
                <article class="article-preview">
                    <h2><a href="/article/${article.id}">${article.title}</a></h2>
                    <div class="article-meta">
                        <span>Autor: ${article.author || 'Unbekannt'}</span>
                        <span>Erstellt: ${new Date(article.createdAt).toLocaleDateString('de-DE')}</span>
                    </div>
                    <div class="article-actions">
                        <a href="/article/${article.id}" class="read-button"><i class="fas fa-book-open"></i> Lesen</a>
                    </div>
                </article>
            `).join('');
        })
        .catch(error => {
            console.error('Error:', error);
            articleList.innerHTML = '<p>Fehler beim Laden der Artikel</p>';
        });
}

// Load single article
function loadArticle(articleId) {
    const container = document.getElementById('article-content');
    if (!container) return;

    fetch(`/api/articles/${articleId}`)
        .then(response => response.json())
        .then(article => {
            document.title = `AllstarsWiki - ${article.title}`;
            container.innerHTML = `
                <article class="article-full">
                    <header class="article-header">
                        <h1>${article.title}</h1>
                        <div class="article-meta">
                            <span>Autor: ${article.author || 'Unbekannt'}</span>
                            <span>Erstellt: ${new Date(article.createdAt).toLocaleDateString('de-DE')}</span>
                            ${article.updatedAt ? `<span>Zuletzt bearbeitet: ${new Date(article.updatedAt).toLocaleDateString('de-DE')}</span>` : ''}
                        </div>
                    </header>
                    <div class="article-content ql-editor">
                        ${article.content || ''}
                    </div>
                    <div class="article-actions">
                        <a href="/edit/${article.id}" class="edit-button">Bearbeiten</a>
                        <a href="/" class="back-button">Zurück zur Übersicht</a>
                    </div>
                </article>
            `;
        })
        .catch(error => {
            console.error('Error:', error);
            container.innerHTML = '<p>Fehler beim Laden des Artikels</p>';
        });
}

// Load random article
async function loadRandomArticle() {
    try {
        const response = await fetch('/api/articles/random');
        if (response.ok) {
            const article = await response.json();
            window.location.href = `/article/${article.id}`;
        } else {
            alert('Fehler beim Laden eines zufälligen Artikels');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Fehler beim Laden eines zufälligen Artikels');
    }
}

// Load recent articles
async function loadRecentArticles() {
    try {
        const response = await fetch('/api/articles/recent');
        if (response.ok) {
            const articles = await response.json();
            displayArticles(articles);
        } else {
            alert('Fehler beim Laden der letzten Artikel');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Fehler beim Laden der letzten Artikel');
    }
}

// Search articles
async function searchArticles() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (!query) {
        alert('Bitte geben Sie einen Suchbegriff ein');
        return;
    }

    try {
        const response = await fetch(`/api/articles/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
            const articles = await response.json();
            displayArticles(articles);
        } else {
            alert('Fehler bei der Suche');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Fehler bei der Suche');
    }
}

// Display articles in the grid
function displayArticles(articles) {
    const container = document.getElementById('articles');
    if (!container) return;

    if (articles.length === 0) {
        container.innerHTML = '<p>Keine Artikel gefunden.</p>';
        return;
    }

    container.innerHTML = articles.map(article => `
        <article class="article-preview">
            <h2>${article.title}</h2>
            <div class="article-meta">
                <span>Autor: ${article.author || 'Unbekannt'}</span>
                <span>Erstellt: ${new Date(article.createdAt).toLocaleDateString('de-DE')}</span>
            </div>
            <div class="article-actions">
                <a href="/article/${article.id}" class="read-button"><i class="fas fa-book-open"></i> Lesen</a>
            </div>
        </article>
    `).join('');
}

// Initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    if (path === '/') {
        loadArticles();
    } else if (path.startsWith('/article/')) {
        const articleId = path.split('/').pop();
        loadArticle(articleId);
    } else if (path.startsWith('/edit/')) {
        const articleId = path.split('/').pop();
        initializeEditForm(articleId);
    } else if (path === '/create') {
        initializeCreateForm();
    }
});
