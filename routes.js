const express = require('express');
const path = require('path');
const router = express.Router();

// API Routes
router.get('/api/articles', (req, res) => {
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

router.get('/api/articles/random', (req, res) => {
    if (articles.length === 0) {
        return res.status(404).json({ error: 'No articles found' });
    }
    const randomIndex = Math.floor(Math.random() * articles.length);
    res.json(articles[randomIndex]);
});

router.get('/api/articles/recent', (req, res) => {
    const sortedArticles = [...articles].sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
    ).slice(0, 30);
    res.json(sortedArticles);
});

// HTML Routes - Always serve index.html for client-side routing
router.get(['/create', '/edit/*', '/article/*', '/recent', '/random'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = router;
