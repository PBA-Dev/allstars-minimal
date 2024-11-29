const express = require('express');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;
const productionDomain = 'https://wiki.optimumpflege.de';

// Middleware
app.use(express.json());
app.use(express.static('public'));

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

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Create articles directory if it doesn't exist
const articlesDir = path.join(__dirname, 'public', 'articles');
console.log('Articles directory path:', articlesDir);

if (!fs.existsSync(articlesDir)) {
    try {
        fs.mkdirSync(articlesDir, { recursive: true });
        console.log('Created articles directory');
    } catch (err) {
        console.error('Error creating articles directory:', err);
    }
} else {
    console.log('Articles directory exists');
}

// List all files in articles directory
try {
    const files = fs.readdirSync(articlesDir);
    console.log('Files in articles directory:', files);
} catch (err) {
    console.error('Error listing files:', err);
}

// Initialize articles if directory is empty
fs.readdir(articlesDir, (err, files) => {
    if (err) {
        console.error('Error reading articles directory:', err);
        return;
    }

    // Only initialize if no JSON files exist
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    if (jsonFiles.length === 0) {
        console.log('No existing articles found, copying initial articles...');
        const initialArticles = [
            {
                title: "Die Zukunft der Pflegeberatung",
                content: "<p>Die Digitalisierung eröffnet neue Möglichkeiten für die Pflegeberatung. Online-Seminare und digitale Plattformen erweitern die Reichweite und Effizienz der Beratungsdienste.</p>",
                author: "Verena Campbell",
                category: "Pflegeberatung",
                createdAt: "2024-11-27T09:07:59.509Z",
                updatedAt: "2024-11-27T09:07:59.509Z"
            },
            {
                title: "Pflegegrade und deren Bedeutung",
                content: "<p>Eine detaillierte Erklärung der verschiedenen Pflegegrade und ihrer Bedeutung für die Versorgung.</p>",
                author: "Verena Campbell",
                category: "Pflegegrade",
                createdAt: "2024-11-27T09:07:59.509Z",
                updatedAt: "2024-11-27T09:07:59.509Z"
            },
            {
                title: "Unterstützung bei der häuslichen Pflege",
                content: "<p>Praktische Tipps und Ressourcen für die häusliche Pflege von Angehörigen.</p>",
                author: "Verena Campbell",
                category: "Häusliche Pflege",
                createdAt: "2024-11-27T09:07:59.509Z",
                updatedAt: "2024-11-27T09:07:59.509Z"
            },
            {
                title: "Prävention und Gesundheitsförderung für Pflegebedürftige",
                content: "<p>Wichtige Maßnahmen zur Prävention und Gesundheitsförderung in der Pflege.</p>",
                author: "Verena Campbell",
                category: "Prävention und Gesundheitsförderung",
                createdAt: "2024-11-27T09:07:59.509Z",
                updatedAt: "2024-11-27T09:07:59.509Z"
            },
            {
                title: "Selbsthilfegruppen für pflegende Angehörige",
                content: "<p>Informationen über Selbsthilfegruppen und Unterstützungsnetzwerke für pflegende Angehörige.</p>",
                author: "Verena Campbell",
                category: "Selbsthilfegruppen",
                createdAt: "2024-11-27T09:07:59.509Z",
                updatedAt: "2024-11-27T09:07:59.509Z"
            },
            {
                title: "Pflegeversicherung – Was sie leistet und wie man sie nutzt",
                content: "<p>Ein umfassender Überblick über die Leistungen der Pflegeversicherung und deren Nutzung.</p>",
                author: "Verena Campbell",
                category: "Pflegeversicherung",
                createdAt: "2024-11-27T09:07:59.509Z",
                updatedAt: "2024-11-27T09:07:59.509Z"
            }
        ];

        initialArticles.forEach((article, index) => {
            const id = `173270567950${index + 1}`;
            fs.writeFileSync(
                path.join(articlesDir, `${id}.json`),
                JSON.stringify(article, null, 2)
            );
        });
        console.log('Initial articles created successfully');
    } else {
        console.log(`Found ${jsonFiles.length} existing articles`);
    }
});

// Log the contents of the articles directory
fs.readdir(articlesDir, (err, files) => {
    if (err) {
        console.error('Error reading articles directory:', err);
    } else {
        console.log('Articles directory contents:', files);
    }
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory');
} else {
    console.log('Uploads directory exists');
}

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

// Get random article
app.get('/api/articles/random', (req, res) => {
    fs.readdir(articlesDir, (err, files) => {
        if (err) {
            console.error('Error reading articles directory:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        const jsonFiles = files.filter(file => file.endsWith('.json'));
        if (jsonFiles.length === 0) {
            return res.status(404).json({ error: 'No articles found' });
        }

        const randomFile = jsonFiles[Math.floor(Math.random() * jsonFiles.length)];
        const articleId = randomFile.replace('.json', '');

        fs.readFile(path.join(articlesDir, randomFile), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading article file:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            try {
                const article = JSON.parse(data);
                article.id = articleId;
                res.json(article);
            } catch (err) {
                console.error('Error parsing article JSON:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    });
});

// Get recent articles
app.get('/api/articles/recent', (req, res) => {
    fs.readdir(articlesDir, (err, files) => {
        if (err) {
            console.error('Error reading articles directory:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        const jsonFiles = files.filter(file => file.endsWith('.json'));
        const articles = [];

        let processed = 0;
        if (jsonFiles.length === 0) {
            return res.json(articles);
        }

        jsonFiles.forEach(file => {
            fs.readFile(path.join(articlesDir, file), 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading article file:', err);
                    processed++;
                } else {
                    try {
                        const article = JSON.parse(data);
                        article.id = file.replace('.json', '');
                        articles.push(article);
                    } catch (err) {
                        console.error('Error parsing article JSON:', err);
                    }
                    processed++;
                }

                if (processed === jsonFiles.length) {
                    articles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    const recentArticles = articles.filter(article => 
                        new Date(article.createdAt) >= thirtyDaysAgo
                    );
                    res.json(recentArticles);
                }
            });
        });
    });
});

// Search articles
app.get('/api/articles/search', (req, res) => {
    const query = req.query.q?.toLowerCase();
    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    fs.readdir(articlesDir, (err, files) => {
        if (err) {
            console.error('Error reading articles directory:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        const jsonFiles = files.filter(file => file.endsWith('.json'));
        const articles = [];

        let processed = 0;
        if (jsonFiles.length === 0) {
            return res.json(articles);
        }

        jsonFiles.forEach(file => {
            fs.readFile(path.join(articlesDir, file), 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading article file:', err);
                    processed++;
                } else {
                    try {
                        const article = JSON.parse(data);
                        if (article.title.toLowerCase().includes(query) || 
                            article.content.toLowerCase().includes(query)) {
                            article.id = file.replace('.json', '');
                            articles.push(article);
                        }
                    } catch (err) {
                        console.error('Error parsing article JSON:', err);
                    }
                    processed++;
                }

                if (processed === jsonFiles.length) {
                    articles.sort((a, b) => {
                        const aTitle = a.title.toLowerCase().includes(query);
                        const bTitle = b.title.toLowerCase().includes(query);
                        if (aTitle && !bTitle) return -1;
                        if (!aTitle && bTitle) return 1;
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    });
                    res.json(articles);
                }
            });
        });
    });
});

// Get single article
app.get('/api/articles/:id', (req, res) => {
    const articlePath = path.join(articlesDir, `${req.params.id}.json`);
    fs.readFile(articlePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading article:', err);
            return res.status(404).json({ error: 'Article not found' });
        }

        try {
            const article = JSON.parse(data);
            article.id = req.params.id;
            res.json(article);
        } catch (err) {
            console.error('Error parsing article JSON:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
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

// Handle image upload
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
});

// Serve static files and handle routes
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

app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
    if (process.env.NODE_ENV === 'production') {
        console.log(`Production domain: ${productionDomain}`);
    }
});
