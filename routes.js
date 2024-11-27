const express = require('express');
const path = require('path');
const router = express.Router();

let articles = [];
let articleHistory = {};

// API Routes
router.get('/api/articles', (req, res) => {
    res.json(articles);
});

// Get specific article
router.get('/api/articles/:id', (req, res) => {
    const article = articles.find(a => a._id === req.params.id);
    if (article) {
        res.json(article);
    } else {
        res.status(404).json({ error: 'Article not found' });
    }
});

// Get random article
router.get('/api/random-article', (req, res) => {
    if (articles.length === 0) {
        return res.status(404).json({ error: 'No articles found' });
    }
    const randomIndex = Math.floor(Math.random() * articles.length);
    res.json(articles[randomIndex]);
});

// Get recent articles
router.get('/api/recent-articles', (req, res) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentArticles = articles.filter(article => 
        new Date(article.createdAt) >= thirtyDaysAgo ||
        new Date(article.updatedAt) >= thirtyDaysAgo
    );
    res.json(recentArticles);
});

// HTML Routes - Serve index.html for client-side routing
router.get(['/', '/create', '/edit/*', '/article/*', '/random', '/recent'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export both router and data
module.exports = { router, articles, articleHistory };
