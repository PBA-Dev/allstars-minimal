const express = require('express');
const path = require('path');
const router = express.Router();

let articles = [];
let nextId = 1;

// API Routes
router.get('/api/articles', (req, res) => {
    // Load articles from your data source
    res.json(articles);
});

router.get('/api/articles/:id', (req, res) => {
    const article = articles.find(a => a._id === req.params.id);
    if (article) {
        res.json(article);
    } else {
        res.status(404).json({ error: 'Article not found' });
    }
});

router.post('/api/articles', (req, res) => {
    const article = {
        ...req.body,
        _id: String(nextId++),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    articles.push(article);
    res.json(article);
});

router.put('/api/articles/:id', (req, res) => {
    const index = articles.findIndex(a => a._id === req.params.id);
    if (index !== -1) {
        articles[index] = {
            ...articles[index],
            ...req.body,
            _id: req.params.id,
            updatedAt: new Date().toISOString()
        };
        res.json(articles[index]);
    } else {
        res.status(404).json({ error: 'Article not found' });
    }
});

// HTML Routes - Serve static files
router.use(express.static(path.join(__dirname, 'public')));

// HTML Routes - Serve index.html for client-side routing
router.get(['/', '/create', '/edit/*', '/article/*', '/help', '/recent', '/random'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export router
module.exports = router;
