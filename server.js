const express = require('express');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;
const productionDomain = 'https://wiki.pflegeberatung-allstars.de';

// Routes for serving HTML pages - Must be before API routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/edit/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'edit.html'));
});

app.get('/create', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'edit.html'));
});

app.get('/article/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/help', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'help.html'));
});

// Middleware
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add CORS headers for production
app.use((req, res, next) => {
    const allowedOrigins = ['http://localhost:3000', productionDomain];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = path.join(__dirname, 'public', 'uploads');
        fs.mkdir(uploadsDir, { recursive: true }, (err) => {
            if (err) {
                console.error('Error creating uploads directory:', err);
                cb(err, null);
            } else {
                cb(null, uploadsDir);
            }
        });
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
}).single('file');

// Create directories if they don't exist
const articlesDir = path.join(__dirname, 'public', 'articles');
const uploadsDir = path.join(__dirname, 'public', 'uploads');

Promise.all([
    fsPromises.mkdir(articlesDir, { recursive: true }),
    fsPromises.mkdir(uploadsDir, { recursive: true })
]).then(() => {
    console.log('Directories created successfully');
}).catch(err => {
    console.error('Error creating directories:', err);
});

// File upload endpoint with better error handling
app.post('/api/upload', (req, res) => {
    console.log('Received upload request');
    console.log('Headers:', req.headers);
    
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
});

// Get random article
app.get('/api/random', async (req, res) => {
    try {
        const files = await fsPromises.readdir(articlesDir);
        const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'article_history.json');
        
        if (jsonFiles.length === 0) {
            return res.status(404).json({ error: 'No articles found' });
        }
        
        const randomFile = jsonFiles[Math.floor(Math.random() * jsonFiles.length)];
        const content = await fsPromises.readFile(path.join(articlesDir, randomFile), 'utf8');
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

// Get recent articles
app.get('/api/recent', async (req, res) => {
    try {
        const files = await fsPromises.readdir(articlesDir);
        const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'article_history.json');
        
        // Get file stats and sort by creation time
        const fileStats = await Promise.all(
            jsonFiles.map(async file => {
                const stats = await fsPromises.stat(path.join(articlesDir, file));
                return { file, createdAt: stats.birthtime };
            })
        );
        
        // Sort by creation time (newest first) and take top 5
        const recentFiles = fileStats
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5)
            .map(stat => stat.file);
        
        // Read and parse recent articles
        const articles = await Promise.all(
            recentFiles.map(async file => {
                const content = await fsPromises.readFile(path.join(articlesDir, file), 'utf8');
                const article = JSON.parse(content);
                return {
                    _id: file.replace('.json', ''),
                    ...article
                };
            })
        );
        
        res.json(articles);
    } catch (error) {
        console.error('Error getting recent articles:', error);
        res.status(500).json({ error: 'Failed to get recent articles' });
    }
});

// API endpoints
// Get all articles
app.get('/api/articles', async (req, res) => {
    try {
        const { category } = req.query;
        const files = await fsPromises.readdir(articlesDir);
        console.log('Articles directory contents:', files);

        const articles = await Promise.all(
            files
                .filter(file => file.endsWith('.json'))
                .map(async file => {
                    const content = await fsPromises.readFile(path.join(articlesDir, file), 'utf8');
                    const article = JSON.parse(content);
                    return {
                        id: file.replace('.json', ''),
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
        const articlePath = path.join(articlesDir, `${articleId}.json`);
        
        if (!fs.existsSync(articlePath)) {
            console.error('Article not found:', articleId);
            return res.status(404).json({ error: 'Article not found' });
        }

        console.log('Reading article from:', articlePath);
        const content = await fsPromises.readFile(articlePath, 'utf8');
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
        const { title, content, author, category } = req.body;
        const articleId = Date.now().toString();
        const article = {
            title,
            content,
            author,
            category,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await fsPromises.writeFile(
            path.join(articlesDir, `${articleId}.json`),
            JSON.stringify(article, null, 2)
        );
        console.log(`Created new article: ${articleId}`);
        res.json({ id: articleId, ...article });
    } catch (error) {
        console.error('Error creating article:', error);
        res.status(500).json({ error: 'Failed to create article' });
    }
});

// Update article
app.put('/api/articles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, author, category } = req.body;
        const articlePath = path.join(articlesDir, `${id}.json`);
        
        const existingArticle = JSON.parse(
            await fsPromises.readFile(articlePath, 'utf8')
        );
        const updatedArticle = {
            ...existingArticle,
            title,
            content,
            author,
            category,
            updatedAt: new Date().toISOString()
        };

        await fsPromises.writeFile(
            articlePath,
            JSON.stringify(updatedArticle, null, 2)
        );
        console.log(`Updated article: ${id}`);
        res.json(updatedArticle);
    } catch (error) {
        console.error('Error updating article:', error);
        res.status(500).json({ error: 'Failed to update article' });
    }
});

// Handle 404 errors - Must be after all other routes
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
    if (process.env.NODE_ENV === 'production') {
        console.log(`Production domain: ${productionDomain}`);
    }
});
