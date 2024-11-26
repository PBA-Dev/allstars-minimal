// Initialize Quill editor
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

// Load articles on page load
window.onload = loadArticles;

function loadArticles() {
    fetch('/api/articles')
        .then(response => response.json())
        .then(articles => {
            const articlesDiv = document.getElementById('articles');
            articlesDiv.innerHTML = '';
            articles.forEach(article => {
                const date = new Date(article.createdAt).toLocaleDateString('de-DE');
                articlesDiv.innerHTML += `
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
            });
        })
        .catch(error => console.error('Error loading articles:', error));
}

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

// Handle form submission
document.getElementById('articleForm').onsubmit = function(e) {
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
        loadArticles();
        document.getElementById('articleForm').reset();
        quill.setContents([]);
    })
    .catch(error => console.error('Error:', error));
};
