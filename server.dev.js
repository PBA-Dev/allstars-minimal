const express = require('express');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Configure body-parser with increased limits
app.use(express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            res.status(400).json({ error: 'Invalid JSON' });
            throw new Error('Invalid JSON');
        }
    }
}));

// CORS middleware for development
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage (replace with MongoDB later)
let articles = [];
let articleHistory = {};

// Load articles from individual files
async function loadData() {
    try {
        const articlesDir = path.join(__dirname, 'public', 'articles');
        
        // Create articles directory if it doesn't exist
        await fs.mkdir(articlesDir, { recursive: true });
        
        // Read existing articles
        const files = await fs.readdir(articlesDir);
        const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'article_history.json');
        
        articles = [];
        for (const file of jsonFiles) {
            try {
                const articleData = await fs.readFile(path.join(articlesDir, file), 'utf8');
                const article = JSON.parse(articleData);
                article._id = file.replace('.json', ''); // Use filename as ID
                articles.push(article);
            } catch (error) {
                console.error(`Error reading article file ${file}:`, error);
            }
        }

        // Load article history
        try {
            const historyData = await fs.readFile(path.join(articlesDir, 'article_history.json'), 'utf8');
            articleHistory = JSON.parse(historyData);
        } catch (error) {
            console.log('No existing history found, starting with empty object');
            articleHistory = {};
        }

    } catch (error) {
        console.error('Error loading articles:', error);
        articles = [];
        articleHistory = {};
    }
}

// Save articles to individual files
async function saveData() {
    try {
        const articlesDir = path.join(__dirname, 'public', 'articles');
        await fs.mkdir(articlesDir, { recursive: true });

        // Save each article to its own file
        for (const article of articles) {
            const fileName = `${article._id}.json`;
            await fs.writeFile(
                path.join(articlesDir, fileName),
                JSON.stringify(article, null, 2)
            );
        }

        // Save history
        await fs.writeFile(
            path.join(articlesDir, 'article_history.json'),
            JSON.stringify(articleHistory, null, 2)
        );
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Initialize data
loadData();

// API Routes
app.get('/api/articles', (req, res) => {
    try {
        const category = req.query.category?.toLowerCase();
        if (category) {
            const filteredArticles = articles.filter(article => 
                article.category?.toLowerCase() === category
            );
            return res.json(filteredArticles);
        }
        res.json(articles);
    } catch (error) {
        console.error('Error getting articles:', error);
        res.status(500).json({ error: 'Failed to get articles', details: error.message });
    }
});

app.get('/api/articles/:id', (req, res) => {
    const article = articles.find(a => a._id === req.params.id);
    if (!article) {
        return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);
});

app.get('/api/articles/:id/history', (req, res) => {
    const history = articleHistory[req.params.id];
    if (!history) {
        return res.json([]);
    }
    res.json(history);
});

app.get('/api/random-article', (req, res) => {
    if (articles.length === 0) {
        return res.status(404).json({ error: 'No articles found' });
    }
    const randomIndex = Math.floor(Math.random() * articles.length);
    res.json(articles[randomIndex]);
});

app.get('/api/search', (req, res) => {
    try {
        const query = req.query.q?.toLowerCase() || '';
        if (!query) {
            return res.json(articles);
        }

        const results = articles.filter(article => {
            const titleMatch = article.title?.toLowerCase().includes(query);
            const contentMatch = article.content?.toLowerCase().includes(query);
            return titleMatch || contentMatch;
        });

        res.json(results);
    } catch (error) {
        console.error('Error searching articles:', error);
        res.status(500).json({ error: 'Failed to search articles', details: error.message });
    }
});

app.get('/api/random', (req, res) => {
    try {
        if (articles.length === 0) {
            return res.status(404).json({ error: 'No articles found' });
        }
        const randomIndex = Math.floor(Math.random() * articles.length);
        const article = articles[randomIndex];
        res.json(article);
    } catch (error) {
        console.error('Error getting random article:', error);
        res.status(500).json({ error: 'Failed to get random article' });
    }
});

app.get('/api/recent', (req, res) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentArticles = articles.filter(article => {
        const articleDate = new Date(article.updatedAt || article.createdAt);
        return articleDate >= thirtyDaysAgo;
    });
    
    res.json(recentArticles);
});

app.post('/api/articles', async (req, res) => {
    try {
        const { title, content, author, category } = req.body;
        if (!title || !content || !author || !category) {
            return res.status(400).json({ error: 'Title, content, author, and category are required' });
        }

        const newArticle = {
            _id: Date.now().toString(),
            title,
            content,
            author,
            category,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        articles.push(newArticle);
        await saveData();

        res.status(201).json(newArticle);
    } catch (error) {
        console.error('Error creating article:', error);
        res.status(500).json({ error: 'Failed to create article' });
    }
});

app.put('/api/articles/:id', async (req, res) => {
    try {
        const { title, content, author, category } = req.body;
        if (!title || !content || !author || !category) {
            return res.status(400).json({ error: 'Title, content, author, and category are required' });
        }

        const article = articles.find(a => a._id === req.params.id);
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        // Save the edit in history
        if (!articleHistory[article._id]) {
            articleHistory[article._id] = [];
        }
        
        articleHistory[article._id].push({
            editor: author,
            date: new Date().toISOString(),
            action: 'edited',
            title: title,
            previousTitle: article.title !== title ? article.title : undefined
        });

        // Update the article
        article.title = title;
        article.content = content;
        article.author = author;
        article.category = category;
        article.updatedAt = new Date().toISOString();

        await saveData();
        res.json(article);
    } catch (error) {
        console.error('Error updating article:', error);
        res.status(500).json({ error: 'Failed to update article' });
    }
});

// HTML Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/create', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create.html'));
});

app.get('/article/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'article.html'));
});

app.get('/edit/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'edit.html'));
});

app.get('/help', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'help.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
