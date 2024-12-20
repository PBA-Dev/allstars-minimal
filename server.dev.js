const express = require('express');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();
const cors = require('cors');
const multer = require('multer');

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

// API Routes

// Get all articles
app.get('/api/articles', async (req, res) => {
    try {
        const { category } = req.query;
        const articlesDir = path.join(__dirname, 'public', 'articles');
        const files = await fs.readdir(articlesDir);
        
        const articles = await Promise.all(
            files
                .filter(file => file.endsWith('.json') && file !== 'article_history.json')
                .map(async file => {
                    const content = await fs.readFile(path.join(articlesDir, file), 'utf8');
                    const article = JSON.parse(content);
                    return {
                        _id: file.replace('.json', ''),
                        ...article
                    };
                })
        );

        // Filter by category if specified
        const filteredArticles = category
            ? articles.filter(article => article.category === category)
            : articles;

        // Sort by creation date (newest first)
        filteredArticles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(filteredArticles);
    } catch (error) {
        console.error('Error getting articles:', error);
        res.status(500).json({ error: 'Failed to get articles' });
    }
});

// Get single article
app.get('/api/articles/:id', async (req, res) => {
    try {
        const articleId = req.params.id;
        console.log('Fetching article:', articleId);
        const articlesDir = path.join(__dirname, 'public', 'articles');
        const articlePath = path.join(articlesDir, `${articleId}.json`);
        
        try {
            await fs.access(articlePath);
        } catch {
            console.error('Article not found:', articleId);
            return res.status(404).json({ error: 'Article not found' });
        }

        console.log('Reading article from:', articlePath);
        const content = await fs.readFile(articlePath, 'utf8');
        const article = JSON.parse(content);
        console.log('Article loaded successfully');
        
        res.json({
            _id: articleId,
            ...article
        });
    } catch (error) {
        console.error('Error getting article:', error);
        res.status(500).json({ error: 'Failed to get article' });
    }
});

// Create new article
app.post('/api/articles', async (req, res) => {
    try {
        console.log('Received article creation request:', req.body);
        const { title, content, author, category } = req.body;
        if (!title || !content || !author || !category) {
            console.log('Missing required fields:', { title, content: !!content, author, category });
            return res.status(400).json({ error: 'Title, content, author, and category are required' });
        }

        const _id = Date.now().toString();
        console.log('Generated article ID:', _id);

        const newArticle = {
            _id,
            title,
            content,
            author,
            category,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        console.log('Created article object:', newArticle);

        // Ensure articles directory exists
        const articlesDir = path.join(__dirname, 'public', 'articles');
        console.log('Articles directory path:', articlesDir);
        try {
            await fs.access(articlesDir);
            console.log('Articles directory exists');
        } catch {
            console.log('Creating articles directory');
            await fs.mkdir(articlesDir, { recursive: true });
        }

        // Save to file
        const articlePath = path.join(articlesDir, `${_id}.json`);
        console.log('Saving article to:', articlePath);
        await fs.writeFile(articlePath, JSON.stringify(newArticle, null, 2));

        // Update article history
        try {
            const historyPath = path.join(articlesDir, 'article_history.json');
            let history = [];
            try {
                const historyContent = await fs.readFile(historyPath, 'utf8');
                history = JSON.parse(historyContent);
            } catch (e) {
                console.log('No existing history file, creating new one');
            }
            
            history.push({
                _id,
                title: newArticle.title,
                createdAt: newArticle.createdAt
            });
            
            await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
            console.log('Updated article history');
        } catch (historyError) {
            console.error('Error updating article history:', historyError);
        }

        console.log('About to send response with article:', newArticle);
        return res.status(201).json(newArticle);
    } catch (error) {
        console.error('Error creating article:', error);
        return res.status(500).json({ error: 'Failed to create article: ' + error.message });
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = path.join(__dirname, 'public', 'uploads');
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit (will be checked per file type in fileFilter)
    },
    fileFilter: function (req, file, cb) {
        // Check file type
        if (file.mimetype.startsWith('image/')) {
            // For images: 10MB limit
            if (parseInt(req.headers['content-length']) > 10 * 1024 * 1024) {
                cb(new Error('Image files must be less than 10MB'), false);
                return;
            }
            // Accept only specific image formats
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
                cb(new Error('Only JPG, JPEG, PNG, and GIF images are allowed'), false);
                return;
            }
        } else if (file.mimetype.startsWith('video/')) {
            // For videos: 25MB limit
            if (parseInt(req.headers['content-length']) > 25 * 1024 * 1024) {
                cb(new Error('Video files must be less than 25MB'), false);
                return;
            }
            // Accept only specific video formats
            if (!file.originalname.match(/\.(mp4|webm|ogg)$/i)) {
                cb(new Error('Only MP4, WebM, and OGG videos are allowed'), false);
                return;
            }
        } else {
            cb(new Error('Only image and video files are allowed'), false);
            return;
        }
        cb(null, true);
    }
}).single('file'); // Changed from 'image' to 'file' to handle both images and videos

// File upload endpoint
app.post('/api/upload', async (req, res) => {
    console.log('Received upload request');
    console.log('Headers:', req.headers);
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    try {
        await fs.mkdir(uploadsDir, { recursive: true });
        
        upload(req, res, function (err) {
            console.log('Processing upload...');
            if (err) {
                console.error('Upload error:', err);
                if (err instanceof multer.MulterError) {
                    console.error('Multer error:', err.code, err.field);
                    return res.status(400).json({ 
                        error: `File upload error: ${err.message}`,
                        code: err.code
                    });
                }
                return res.status(400).json({ 
                    error: err.message || 'Invalid file type or size',
                    details: err.toString()
                });
            }
            
            if (!req.file) {
                console.error('No file in request');
                return res.status(400).json({ error: 'No file uploaded' });
            }
            
            console.log('File uploaded successfully:', req.file);
            
            // Return the URL and type of the uploaded file
            const fileUrl = `/uploads/${req.file.filename}`;
            const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
            res.json({ url: fileUrl, type: fileType });
        });
    } catch (err) {
        console.error('Server error during upload:', err);
        res.status(500).json({ 
            error: 'Server error while handling upload',
            details: err.toString()
        });
    }
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

app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q?.toLowerCase();
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const articlesDir = path.join(__dirname, 'public', 'articles');
        const files = await fs.readdir(articlesDir);
        
        const articles = await Promise.all(
            files
                .filter(file => file.endsWith('.json') && file !== 'article_history.json')
                .map(async file => {
                    const content = await fs.readFile(path.join(articlesDir, file), 'utf8');
                    const article = JSON.parse(content);
                    return {
                        _id: file.replace('.json', ''),
                        ...article
                    };
                })
        );

        // Search in title, content, and author
        const searchResults = articles.filter(article => {
            const titleMatch = article.title?.toLowerCase().includes(query);
            const contentMatch = article.content?.toLowerCase().includes(query);
            const authorMatch = article.author?.toLowerCase().includes(query);
            const categoryMatch = article.category?.toLowerCase().includes(query);
            return titleMatch || contentMatch || authorMatch || categoryMatch;
        });

        // Sort by relevance (title matches first, then content)
        searchResults.sort((a, b) => {
            const aTitle = a.title?.toLowerCase().includes(query);
            const bTitle = b.title?.toLowerCase().includes(query);
            if (aTitle && !bTitle) return -1;
            if (!aTitle && bTitle) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.json(searchResults);
    } catch (error) {
        console.error('Error searching articles:', error);
        res.status(500).json({ error: 'Failed to search articles' });
    }
});

app.get('/api/random', async (req, res) => {
    try {
        const articlesDir = path.join(__dirname, 'public', 'articles');
        const files = await fs.readdir(articlesDir);
        
        const articleFiles = files.filter(file => 
            file.endsWith('.json') && file !== 'article_history.json'
        );

        if (articleFiles.length === 0) {
            return res.status(404).json({ error: 'No articles found' });
        }

        // Select a random article
        const randomFile = articleFiles[Math.floor(Math.random() * articleFiles.length)];
        const content = await fs.readFile(path.join(articlesDir, randomFile), 'utf8');
        const article = JSON.parse(content);

        res.json({
            _id: randomFile.replace('.json', ''),
            ...article
        });
    } catch (error) {
        console.error('Error getting random article:', error);
        res.status(500).json({ error: 'Failed to get random article' });
    }
});

app.get('/api/recent', async (req, res) => {
    try {
        const articlesDir = path.join(__dirname, 'public', 'articles');
        const files = await fs.readdir(articlesDir);
        
        const articles = await Promise.all(
            files
                .filter(file => file.endsWith('.json') && file !== 'article_history.json')
                .map(async file => {
                    const content = await fs.readFile(path.join(articlesDir, file), 'utf8');
                    const article = JSON.parse(content);
                    return {
                        _id: file.replace('.json', ''),
                        ...article
                    };
                })
        );

        // Sort by creation date (newest first) and take top 5
        const recentArticles = articles
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        res.json(recentArticles);
    } catch (error) {
        console.error('Error getting recent articles:', error);
        res.status(500).json({ error: 'Failed to get recent articles' });
    }
});

// Update article
app.put('/api/articles/:id', async (req, res) => {
    try {
        const articleId = req.params.id;
        const { title, content, author, category } = req.body;
        if (!title || !content || !author || !category) {
            return res.status(400).json({ error: 'Title, content, author, and category are required' });
        }

        const articlesDir = path.join(__dirname, 'public', 'articles');
        const articlePath = path.join(articlesDir, `${articleId}.json`);
        
        try {
            await fs.access(articlePath);
        } catch {
            return res.status(404).json({ error: 'Article not found' });
        }

        // Read existing article
        const existingContent = await fs.readFile(articlePath, 'utf8');
        const existingArticle = JSON.parse(existingContent);

        // Update article
        const updatedArticle = {
            ...existingArticle,
            title,
            content,
            author,
            category,
            updatedAt: new Date().toISOString()
        };

        // Save updated article
        await fs.writeFile(
            articlePath,
            JSON.stringify(updatedArticle, null, 2)
        );

        res.json(updatedArticle);
    } catch (error) {
        console.error('Error updating article:', error);
        res.status(500).json({ error: 'Failed to update article' });
    }
});

// Delete article
app.delete('/api/articles/:id', async (req, res) => {
    try {
        const articleId = req.params.id;
        const articlesDir = path.join(__dirname, 'public', 'articles');
        const articlePath = path.join(articlesDir, `${articleId}.json`);
        
        try {
            await fs.access(articlePath);
        } catch {
            return res.status(404).json({ error: 'Article not found' });
        }

        // Delete the article file
        await fs.unlink(articlePath);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting article:', error);
        res.status(500).json({ error: 'Failed to delete article' });
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

// Create articles directory if it doesn't exist
(async () => {
    try {
        const articlesDir = path.join(__dirname, 'public', 'articles');
        await fs.mkdir(articlesDir, { recursive: true });
        console.log('Articles directory ready');
    } catch (error) {
        console.error('Error creating articles directory:', error);
    }
})();

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
