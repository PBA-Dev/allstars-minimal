const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route handlers for HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/create', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create.html'));
});

app.get('/help', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'help.html'));
});

app.get('/article/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'article.html'));
});

app.get('/edit/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'edit.html'));
});

// Temporary API endpoints for preview
app.get('/api/articles', (req, res) => {
    res.json([
        {
            _id: '1',
            title: 'Beispielartikel 1',
            content: 'Dies ist ein Beispielinhalt.',
            author: 'Max Mustermann',
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            _id: '2',
            title: 'Beispielartikel 2',
            content: 'Dies ist ein weiterer Beispielinhalt.',
            author: 'Erika Musterfrau',
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ]);
});

app.get('/api/articles/:id', (req, res) => {
    res.json({
        _id: req.params.id,
        title: 'Beispielartikel',
        content: 'Dies ist ein Beispielinhalt.',
        author: 'Max Mustermann',
        createdAt: new Date(),
        updatedAt: new Date()
    });
});

app.post('/api/articles', (req, res) => {
    res.status(201).json({
        _id: '3',
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
    });
});

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;

app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});
