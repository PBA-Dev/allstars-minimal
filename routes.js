const express = require('express');
const path = require('path');
const router = express.Router();

let articles = [];
let articleHistory = {};

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

// HTML Routes - Serve index.html for client-side routing
router.get(['/', '/create', '/edit/*', '/article/*', '/help'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export router
module.exports = router;
