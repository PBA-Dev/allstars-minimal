// Initialize Quill editor if we're on the create page
if (document.getElementById('editor-container')) {
    var quill = new Quill('#editor-container', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'image', 'code-block'],
                ['clean']
            ]
        },
        placeholder: 'Artikelinhalt hier eingeben...'
    });
}

// Load articles on page load if we're on the main page
if (window.location.pathname === '/') {
    window.onload = loadArticles;
}

function loadArticles() {
    fetch('/api/articles')
        .then(response => response.json())
        .then(articles => {
            displayArticles(articles);
        })
        .catch(error => console.error('Error loading articles:', error));
}

function loadRecentArticles() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    fetch('/api/articles')
        .then(response => response.json())
        .then(articles => {
            const recentArticles = articles.filter(article => 
                new Date(article.createdAt) >= thirtyDaysAgo
            );
            displayArticles(recentArticles);
        })
        .catch(error => console.error('Error loading recent articles:', error));
}

function displayArticles(articles) {
    const articlesDiv = document.getElementById('articles');
    if (!articlesDiv) return;

    articlesDiv.innerHTML = '';
    articles.forEach(article => {
        const date = new Date(article.createdAt).toLocaleDateString('de-DE');
        articlesDiv.innerHTML += `
            <div class="article" onclick="viewArticle('${article._id}')">
                <h2>${article.title}</h2>
                <div class="article-meta">
                    Von ${article.author} am ${date}
                </div>
                <div class="article-content">
                    ${article.content}
                </div>
                <div class="article-actions">
                    <button class="button edit" onclick="editArticle('${article._id}'); event.stopPropagation();">
                        <i class="fas fa-edit"></i> Bearbeiten
                    </button>
                </div>
            </div>
        `;
    });
}
                <div class="article-meta">
                    Von ${article.author} am ${date}
                </div>
                <div class="article-content">
                    ${article.content}
                </div>
            </div>
        `;
    });
}

function loadRandomArticle() {
    fetch('/api/random-article')
        .then(response => response.json())
        .then(article => {
            if (!article) {
                alert('Keine Artikel verfügbar');
                return;
            }
            const articlesDiv = document.getElementById('articles');
            const date = new Date(article.createdAt).toLocaleDateString('de-DE');
            articlesDiv.innerHTML = `
                <div class="article">
                    <h2>${article.title}</h2>
                    <div class="article-meta">
                        Von ${article.author} am ${date}
                    </div>
                    <div class="article-content">
                        ${article.content}
                    </div>
                </div>
            `;
        })
        .catch(error => console.error('Error loading random article:', error));
}

// Handle form submission if we're on the create page
const articleForm = document.getElementById('articleForm');
if (articleForm) {
    articleForm.onsubmit = function(e) {
        e.preventDefault();
        
        const article = {
            title: document.getElementById('title').value,
            content: quill.root.innerHTML,
            author: document.getElementById('author').value
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
            window.location.href = '/';  // Redirect to home page after successful creation
        })
        .catch(error => console.error('Error:', error));
    };
}

function viewArticle(id) {
    window.location.href = `/article/${id}`;
}

function editArticle(id) {
    window.location.href = `/edit/${id}`;
}
