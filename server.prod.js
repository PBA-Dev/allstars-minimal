const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();

// Production configuration
const PORT = process.env.PORT || 3000;
const DOMAIN = 'wiki.optimumpflege.de'; // Replace with your actual domain

// Security middleware
app.use((req, res, next) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Only allow your domain in production
    res.setHeader('Access-Control-Allow-Origin', `https://${DOMAIN}`);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    next();
});

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// In-memory storage (replace with MongoDB later)
let articles = [];
let articleHistory = {};

// Initialize test data if no articles exist
async function initializeTestData() {
    const testArticles = [
        {
            _id: '1',
            title: 'Grundpflege',
            content: '<h2>Grundpflege - Basis der Pflegeversorgung</h2><p>Die Grundpflege umfasst alle grundlegenden pflegerischen Maßnahmen, die für die tägliche Versorgung eines Pflegebedürftigen notwendig sind.</p><h3>Wichtige Aspekte der Grundpflege:</h3><ul><li>Körperpflege</li><li>Ernährung</li><li>Mobilität</li><li>Prophylaxen</li></ul>',
            author: 'Maria Schmidt',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        // ... [Previous test articles remain the same]
    ];

    const testHistory = {};
    testArticles.forEach(article => {
        testHistory[article._id] = [{
            editor: article.author,
            date: article.createdAt,
            action: 'created',
            title: article.title
        }];
    });

    return { articles: testArticles, history: testHistory };
}

// Load articles and history from files
async function loadData() {
    try {
        const articlesData = await fs.readFile('articles.json', 'utf8');
        articles = JSON.parse(articlesData);
    } catch (error) {
        console.log('No existing articles found, initializing with test data...');
        const testData = await initializeTestData();
        articles = testData.articles;
        articleHistory = testData.history;
        await saveData();
    }

    try {
        const historyData = await fs.readFile('article_history.json', 'utf8');
        articleHistory = JSON.parse(historyData);
    } catch (error) {
        console.log('No existing history found, starting with empty object');
        articleHistory = {};
    }
}

// Save articles and history to files
async function saveData() {
    try {
        await fs.writeFile('articles.json', JSON.stringify(articles, null, 2));
        await fs.writeFile('article_history.json', JSON.stringify(articleHistory, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// API Routes
app.get('/api/articles', (req, res) => {
    res.json(articles);
});

app.get('/api/articles/:id', (req, res) => {
    const article = articles.find(a => a._id === req.params.id);
    if (article) {
        res.json(article);
    } else {
        res.status(404).json({ error: 'Article not found' });
    }
});

app.get('/api/articles/:id/history', (req, res) => {
    const history = articleHistory[req.params.id] || [];
    res.json(history);
});

app.post('/api/articles', async (req, res) => {
    const { title, content, author } = req.body;
    const newArticle = {
        _id: Date.now().toString(),
        title,
        content,
        author,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    articles.push(newArticle);
    articleHistory[newArticle._id] = [{
        editor: author,
        date: newArticle.createdAt,
        action: 'created',
        title
    }];

    await saveData();
    res.status(201).json(newArticle);
});

app.put('/api/articles/:id', async (req, res) => {
    const { title, content, editor } = req.body;
    const article = articles.find(a => a._id === req.params.id);

    if (!article) {
        return res.status(404).json({ error: 'Article not found' });
    }

    article.title = title;
    article.content = content;
    article.updatedAt = new Date().toISOString();

    if (!articleHistory[article._id]) {
        articleHistory[article._id] = [];
    }

    articleHistory[article._id].push({
        editor,
        date: article.updatedAt,
        action: 'edited',
        title
    });

    await saveData();
    res.json(article);
});

app.delete('/api/articles/:id', async (req, res) => {
    const index = articles.findIndex(a => a._id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Article not found' });
    }

    articles.splice(index, 1);
    delete articleHistory[req.params.id];
    await saveData();
    res.status(204).send();
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize data and start server
loadData().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log(`Production domain: https://${DOMAIN}`);
    });
}).catch(error => {
    console.error('Failed to initialize server:', error);
});
