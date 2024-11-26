const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// Article Schema
const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Article = mongoose.model('Article', articleSchema);

// API routes
app.get('/api/articles', async (req, res) => {
    try {
        const articles = await Article.find().sort({ createdAt: -1 });
        res.json(articles);
    } catch (error) {
        console.error('Error fetching articles:', error);
        res.status(500).json({ error: 'Error fetching articles' });
    }
});

app.get('/api/random-article', async (req, res) => {
    try {
        const count = await Article.countDocuments();
        if (count === 0) {
            return res.status(404).json({ error: 'No articles found' });
        }
        const random = Math.floor(Math.random() * count);
        const article = await Article.findOne().skip(random);
        res.json(article);
    } catch (error) {
        console.error('Error fetching random article:', error);
        res.status(500).json({ error: 'Error fetching random article' });
    }
});

app.post('/api/articles', async (req, res) => {
    try {
        const article = new Article(req.body);
        await article.save();
        res.status(201).json(article);
    } catch (error) {
        console.error('Error creating article:', error);
        res.status(500).json({ error: 'Error creating article' });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const HOST = '0.0.0.0';
const PORT = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://mongodb:27017/allstarswiki', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
    
    // Only start server after MongoDB connection is established
    app.listen(PORT, HOST, () => {
        console.log(`Server is running on http://${HOST}:${PORT}`);
    });
}).catch(err => {
    console.error('MongoDB connection error:', err);
});
