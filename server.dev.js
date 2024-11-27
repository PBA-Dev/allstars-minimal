const express = require('express');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

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
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

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
        {
            _id: '2',
            title: 'Dekubitusprophylaxe',
            content: '<h2>Dekubitusprophylaxe in der Pflege</h2><p>Die Dekubitusprophylaxe ist eine wichtige präventive Maßnahme zur Vermeidung von Druckgeschwüren.</p><h3>Kernelemente:</h3><ul><li>Regelmäßige Positionswechsel</li><li>Druckentlastung</li><li>Hautpflege</li><li>Ernährungsoptimierung</li></ul>',
            author: 'Thomas Weber',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            _id: '3',
            title: 'Medikamentenmanagement',
            content: '<h2>Sicheres Medikamentenmanagement</h2><p>Das korrekte Management von Medikamenten ist ein kritischer Aspekt der professionellen Pflege.</p><h3>Wichtige Aspekte:</h3><ul><li>Die 5 R-Regel</li><li>Dokumentation</li><li>Nebenwirkungsbeobachtung</li><li>Interaktionskontrolle</li></ul>',
            author: 'Julia Bauer',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            _id: '4',
            title: 'Wundversorgung',
            content: '<h2>Professionelle Wundversorgung</h2><p>Die fachgerechte Wundversorgung ist essentiell für die Heilung und Prävention von Komplikationen.</p><h3>Grundprinzipien:</h3><ul><li>Wundbeurteilung</li><li>Wundreinigung</li><li>Verbandwechsel</li><li>Dokumentation</li></ul>',
            author: 'Stefan Müller',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            _id: '5',
            title: 'Sturzprophylaxe',
            content: '<h2>Sturzprophylaxe im Pflegealltag</h2><p>Die Sturzprophylaxe ist ein wichtiger Bestandteil der präventiven Pflege, besonders bei älteren Menschen.</p><h3>Maßnahmen:</h3><ul><li>Umgebungsanpassung</li><li>Bewegungsförderung</li><li>Hilfsmittelversorgung</li><li>Medikamentenüberprüfung</li></ul>',
            author: 'Anna Koch',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            _id: '6',
            title: 'Palliativpflege',
            content: '<h2>Grundlagen der Palliativpflege</h2><p>Die Palliativpflege fokussiert sich auf die Verbesserung der Lebensqualität von Menschen mit unheilbaren Erkrankungen.</p><h3>Schwerpunkte:</h3><ul><li>Schmerzmanagement</li><li>Symptomkontrolle</li><li>Psychosoziale Betreuung</li><li>Angehörigenbegleitung</li></ul>',
            author: 'Lisa Wagner',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            _id: '7',
            title: 'Ernährungsmanagement',
            content: '<h2>Ernährungsmanagement in der Pflege</h2><p>Eine bedarfsgerechte Ernährung ist fundamental für die Gesundheit und Genesung.</p><h3>Kernaspekte:</h3><ul><li>Ernährungsscreening</li><li>Kostformen</li><li>Unterstützung bei der Nahrungsaufnahme</li><li>Flüssigkeitsmanagement</li></ul>',
            author: 'Michael Schneider',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            _id: '8',
            title: 'Hygiene in der Pflege',
            content: '<h2>Hygienemaßnahmen im Pflegealltag</h2><p>Hygiene ist ein zentraler Aspekt der Pflegequalität und Infektionsprävention.</p><h3>Wichtige Bereiche:</h3><ul><li>Händehygiene</li><li>Flächendesinfektion</li><li>Schutzausrüstung</li><li>Abfallmanagement</li></ul>',
            author: 'Petra Hoffmann',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            _id: '9',
            title: 'Pflegedokumentation',
            content: '<h2>Professionelle Pflegedokumentation</h2><p>Die Pflegedokumentation ist ein wichtiges Instrument zur Qualitätssicherung und rechtlichen Absicherung.</p><h3>Bestandteile:</h3><ul><li>Pflegeanamnese</li><li>Pflegeplanung</li><li>Leistungsnachweis</li><li>Pflegeberichte</li></ul>',
            author: 'Markus Fischer',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            _id: '10',
            title: 'Schmerzmanagement',
            content: '<h2>Professionelles Schmerzmanagement</h2><p>Ein effektives Schmerzmanagement ist essentiell für die Lebensqualität der Patienten.</p><h3>Wichtige Aspekte:</h3><ul><li>Schmerzerfassung</li><li>Schmerztherapie</li><li>Nichtmedikamentöse Maßnahmen</li><li>Dokumentation</li></ul>',
            author: 'Sarah Meyer',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
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

    if (!articles || articles.length === 0) {
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
        if (!articleHistory) {
            articleHistory = {};
        }
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

// Initialize data
loadData();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/articles', (req, res) => {
    res.json(articles);
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

app.post('/api/articles', async (req, res) => {
    try {
        const { title, content, author } = req.body;
        if (!title || !content || !author) {
            return res.status(400).json({ error: 'Title, content, and author are required' });
        }

        const newArticle = {
            _id: Date.now().toString(),
            title,
            content,
            author,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        articles.push(newArticle);
        
        // Initialize history for new article
        articleHistory[newArticle._id] = [{
            editor: author,
            date: new Date().toISOString(),
            action: 'created',
            title: title
        }];

        await saveData();
        res.status(201).json(newArticle);
    } catch (error) {
        console.error('Error creating article:', error);
        res.status(500).json({ error: 'Failed to create article' });
    }
});

app.put('/api/articles/:id', async (req, res) => {
    try {
        const { title, content, editor } = req.body;
        if (!title || !content || !editor) {
            return res.status(400).json({ error: 'Title, content, and editor name are required' });
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
            editor,
            date: new Date().toISOString(),
            action: 'edited',
            title: title,
            previousTitle: article.title !== title ? article.title : undefined
        });

        // Update the article
        article.title = title;
        article.content = content;
        article.updatedAt = new Date().toISOString();
        article.lastEditor = editor;

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
