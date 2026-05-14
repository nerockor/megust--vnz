console.log('>>> [DEBUG] EL ARCHIVO INDEX.JS SE ESTA EJECUTANDO');
console.log('>>> [DEBUG] FECHA:', new Date().toISOString());

const express = require('express');
const fs = require('fs');
console.log('>>> [DEBUG] EXPRESS CARGADO');
let sqlite3;
try {
    sqlite3 = require('sqlite3').verbose();
    console.log('>>> [DEBUG] SQLITE3 CARGADO EXITOSAMENTE');
} catch (e) {
    console.error('>>> [ERROR FATAL] FALLO AL CARGAR SQLITE3:', e.message);
    console.error('>>> [ERROR DETALLE]:', e.stack);
    process.exit(1);
}
const cors = require('cors');
console.log('>>> [DEBUG] CORS CARGADO');
const bodyParser = require('body-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const xss = require('xss');

const app = express();
const port = process.env.PORT || 3001;
console.log('>>> [DEBUG] PUERTO:', port);

console.log('>>> [DEBUG] CONFIGURANDO MIDDLEWARES...');
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
console.log('>>> [DEBUG] MIDDLEWARES LISTOS');

// --- SECURITY CONFIGURATION ---
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'elkilombo-admin-secure-key-2026';

// Trust Hostinger's reverse proxy
app.set('trust proxy', 1);

// 1. Rate Limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	message: { error: 'Demasiadas peticiones. Por favor intenta más tarde.' }
});
app.use('/api/', limiter);

// 2. Auth Middleware
const auth = (req, res, next) => {
    const token = req.headers['x-admin-token'] || req.query.token;
    if (token === ADMIN_TOKEN) {
        req.user = { role: 'admin', username: 'admin' };
        return next();
    }
    db.get("SELECT * FROM users WHERE token = ?", [token], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'No autorizado' });
        req.user = user;
        next();
    });
};

// 3. Helper for Sanitization
const clean = (val) => (typeof val === 'string' ? xss(val) : val);

// Database setup
console.log('>>> [DEBUG] PREPARANDO BASE DE DATOS...');
let dbPath = process.env.DB_PATH || path.resolve(__dirname, 'database.db');

// Si la ruta es relativa, resolverla respecto al directorio de trabajo actual
if (dbPath.startsWith('.') || !dbPath.startsWith('/')) {
    dbPath = path.resolve(process.cwd(), dbPath);
}

const dbDir = path.dirname(dbPath);
console.log('>>> [DEBUG] RUTA FINAL DB:', dbPath);
console.log('>>> [DEBUG] CARPETA DB:', dbDir);

// Asegurar que el directorio existe
if (!fs.existsSync(dbDir)) {
    console.log('>>> [DEBUG] LA CARPETA NO EXISTE EN EL SISTEMA. INTENTANDO CREARLA...');
    try {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('>>> [DEBUG] CARPETA CREADA EXITOSAMENTE');
    } catch (e) {
        console.error('>>> [ERROR FATAL] NO SE PUDO CREAR LA CARPETA:', e.message);
    }
} else {
    console.log('>>> [DEBUG] LA CARPETA EXISTE Y ES ACCESIBLE');
    try {
        fs.accessSync(dbDir, fs.constants.W_OK);
        console.log('>>> [DEBUG] PERMISO DE ESCRITURA CONFIRMADO EN LA CARPETA');
    } catch (e) {
        console.error('>>> [ERROR] SIN PERMISO DE ESCRITURA EN LA CARPETA:', e.message);
    }
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('>>> [ERROR DB] ERROR AL ABRIR:', err.message);
    } else {
        console.log('>>> [DEBUG] CONECTADO A SQLITE');
        
        db.run(`CREATE TABLE IF NOT EXISTS ads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            x INTEGER NOT NULL,
            y INTEGER NOT NULL,
            width INTEGER DEFAULT 10,
            height INTEGER DEFAULT 10,
            sector TEXT NOT NULL,
            image TEXT,
            name TEXT,
            phone TEXT,
            email TEXT,
            location TEXT,
            category TEXT,
            barrio TEXT,
            zona TEXT,
            description TEXT,
            lat REAL,
            lng REAL,
            expiration_date TEXT,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        const columns = ['image', 'name', 'phone', 'email', 'expiration_date', 'location', 'category', 'barrio', 'zona', 'lat', 'lng', 'description', 'created_by'];
        columns.forEach(col => {
            db.run(`ALTER TABLE ads ADD COLUMN ${col} TEXT`, (err) => {
                if (err) { /* column probably exists */ }
            });
        });

        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            token TEXT
        )`, (err) => {
            if (!err) {
                db.get("SELECT * FROM users WHERE role = 'admin'", [], (err, row) => {
                    if (!row) {
                        db.run("INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')", ['admin', ADMIN_TOKEN]);
                    }
                });
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS visitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            phone TEXT,
            email TEXT UNIQUE,
            password TEXT,
            whatsapp_clicks TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ad_id INTEGER NOT NULL,
            visitor_id INTEGER NOT NULL,
            score INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(ad_id, visitor_id)
        )`);
    }
});

// Canvas constraints
const CANVAS_SIZE = 1000;
const GRID_STEP = 10; // The base unit size (10x10)
const SECTOR_SIZE = Math.floor((CANVAS_SIZE / 3) / GRID_STEP) * GRID_STEP;

// Sector mapping to bounding boxes
const SECTORS = {
    'superior-izquierdo': { x: 0, y: 0 },
    'superior-centro': { x: SECTOR_SIZE, y: 0 },
    'superior-derecho': { x: SECTOR_SIZE * 2, y: 0 },
    'centro-izquierdo': { x: 0, y: SECTOR_SIZE },
    'centro': { x: SECTOR_SIZE, y: SECTOR_SIZE },
    'centro-derecho': { x: SECTOR_SIZE * 2, y: SECTOR_SIZE },
    'inferior-izquierdo': { x: 0, y: SECTOR_SIZE * 2 },
    'inferior-centro': { x: SECTOR_SIZE, y: SECTOR_SIZE * 2 },
    'inferior-derecho': { x: SECTOR_SIZE * 2, y: SECTOR_SIZE * 2 }
};

// API: Get all ads (Lightweight - No images)
app.get('/api/ads', (req, res) => {
    db.all("SELECT id, url, x, y, width, height, sector, name, phone, location, category, barrio, zona, description, lat, lng, expiration_date FROM ads", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// API: Auth Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    // Master key fallback
    console.log(`Intento de login - Usuario: ${username}, Clave enviada: ${password}`);
    console.log(`Token esperado: ${ADMIN_TOKEN}`);
    if (username === 'admin' && password === ADMIN_TOKEN) {
        console.log("Login exitoso vía Master Key");
        return res.json({ token: ADMIN_TOKEN, role: 'admin', username: 'admin' });
    }
    
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [clean(username), clean(password)], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        db.run("UPDATE users SET token = ? WHERE id = ?", [newToken, user.id], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: 'Error interno del servidor' });
            res.json({ token: newToken, role: user.role, username: user.username });
        });
    });
});

// API: User Management (Admin Only)
app.get('/api/users', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    db.all(`
        SELECT 
            u.id, 
            u.username, 
            u.role,
            COUNT(a.id) as ads_last_month
        FROM users u
        LEFT JOIN ads a ON u.id = a.created_by AND a.created_at >= date('now', '-30 days')
        WHERE u.role != 'admin'
        GROUP BY u.id
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/admin/visitors', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    
    db.all(`
        SELECT 
            v.id, 
            v.name, 
            v.email, 
            v.phone,
            v.whatsapp_clicks,
            v.created_at,
            COUNT(r.id) as rating_count
        FROM visitors v
        LEFT JOIN ratings r ON v.id = r.visitor_id
        GROUP BY v.id
        ORDER BY v.created_at DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const visitorsWithStats = rows.map(row => {
            let clicks = [];
            try {
                clicks = JSON.parse(row.whatsapp_clicks || '[]');
            } catch(e) {}
            return {
                id: row.id,
                name: row.name,
                email: row.email,
                phone: row.phone,
                created_at: row.created_at,
                rating_count: row.rating_count,
                click_count: clicks.length
            };
        });
        
        res.json(visitorsWithStats);
    });
});

app.post('/api/users', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Datos incompletos' });
    
    db.run("INSERT INTO users (username, password, role) VALUES (?, ?, 'vendedor')", [clean(username), clean(password)], function(err) {
        if (err) return res.status(400).json({ error: 'El usuario ya existe' });
        res.json({ id: this.lastID, username: clean(username), role: 'vendedor' });
    });
});

app.delete('/api/users/:id', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    db.run("DELETE FROM users WHERE id = ? AND role != 'admin'", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// API: Get full data for specific ads (Lazy Loading)
app.post('/api/ads/batch', (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'IDs array required' });
    }

    const placeholders = ids.map(() => '?').join(',');
    db.all(`SELECT id, image FROM ads WHERE id IN (${placeholders})`, ids, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// API: Add new ad
app.post('/api/ads', auth, (req, res) => {
    let { url, sector, image, name, phone, email, location, category, barrio, zona, description, lat, lng, expiration_date, size } = req.body;

    // Sanitize critical string inputs
    name = clean(name);
    location = clean(location);
    description = clean(description);
    category = clean(category);
    barrio = clean(barrio);
    zona = clean(zona);

    if (!url || !sector || !SECTORS[sector]) {
        return res.status(400).json({ error: 'URL and valid sector are required' });
    }
    
    // Parse the requested block size based on UI combos
    const requestedSize = parseInt(size) || 10;
    if (![10, 20, 50].includes(requestedSize)) {
        return res.status(400).json({ error: 'Invalid block size requested' });
    }

    const bounds = SECTORS[sector];
    
    // Fetch existing ads in sector to build occupancy grid
    db.all("SELECT x, y, width, height FROM ads WHERE sector = ?", [sector], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Sector grid dimensions
        const gridCols = Math.floor(SECTOR_SIZE / GRID_STEP);
        const grid = Array.from({ length: gridCols }, () => Array(gridCols).fill(false));

        // Mark all occupied spaces perfectly mathematically mapped onto the virtual grid
        rows.forEach(ad => {
            const relX = ad.x - bounds.x;
            const relY = ad.y - bounds.y;
            
            const startCol = Math.round(relX / GRID_STEP);
            const startRow = Math.round(relY / GRID_STEP);
            
            const cellW = Math.round(ad.width / GRID_STEP);
            const cellH = Math.round(ad.height / GRID_STEP);
            
            for (let r = 0; r < cellH; r++) {
                for (let c = 0; c < cellW; c++) {
                    const gridR = startRow + r;
                    const gridC = startCol + c;
                    
                    if (gridR >= 0 && gridR < gridCols && gridC >= 0 && gridC < gridCols) {
                        grid[gridR][gridC] = true;
                    }
                }
            }
        });

        // Scan algorithm looking for first contiguous open subset 
        const cellsNeeded = requestedSize / GRID_STEP;
        let found = false;
        let bestCol = -1;
        let bestRow = -1;

        for (let r = 0; r <= gridCols - cellsNeeded; r++) {
            for (let c = 0; c <= gridCols - cellsNeeded; c++) {
                
                let isClear = true;
                for (let wr = 0; wr < cellsNeeded; wr++) {
                    for (let wc = 0; wc < cellsNeeded; wc++) {
                        if (grid[r + wr][c + wc]) {
                            isClear = false;
                            break;
                        }
                    }
                    if (!isClear) break;
                }

                if (isClear) {
                    bestCol = c;
                    bestRow = r;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (!found) {
            return res.status(400).json({ error: 'Sector is full or lacks enough contiguous space to drop this block combo.' });
        }

        // Transform internal relative grid coordinates back to universal absolute map XY definitions
        const nextX = bounds.x + (bestCol * GRID_STEP);
        const nextY = bounds.y + (bestRow * GRID_STEP);

        const createdBy = req.user.id || 0; // 0 for super admin if no ID
        const stmt = db.prepare("INSERT INTO ads (url, x, y, sector, width, height, image, name, phone, email, location, category, barrio, zona, description, lat, lng, expiration_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        stmt.run(url, nextX, nextY, sector, requestedSize, requestedSize, image, name, phone, email, location, category, barrio, zona, description, lat, lng, expiration_date, createdBy, function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, x: nextX, y: nextY, width: requestedSize, height: requestedSize });
        });
        stmt.finalize();
    });
});

// API: Visitor Register
app.post('/api/visitors/register', (req, res) => {
    let { name, phone, email, password } = req.body;
    if (!name || !phone || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    name = clean(name);
    phone = clean(phone);
    email = clean(email);
    password = clean(password);

    db.run("INSERT INTO visitors (name, phone, email, password) VALUES (?, ?, ?, ?)", [name, phone, email, password], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'El email ya está registrado' });
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.json({ id: this.lastID, success: true });
    });
});

// API: Visitor Login
app.post('/api/visitors/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    db.get("SELECT id, name, email FROM visitors WHERE email = ? AND password = ?", [clean(email), clean(password)], (err, visitor) => {
        if (err || !visitor) return res.status(401).json({ error: 'Credenciales inválidas' });
        
        // Use a simple token or just return user data
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        res.json({ token, visitor });
    });
});

// API: Register WhatsApp Click
app.post('/api/visitors/:id/click', (req, res) => {
    const { id } = req.params;
    const { ad_id, ad_name } = req.body;

    db.get("SELECT whatsapp_clicks FROM visitors WHERE id = ?", [id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Visitante no encontrado' });

        let clicks = [];
        try {
            clicks = JSON.parse(row.whatsapp_clicks || '[]');
        } catch (e) {
            clicks = [];
        }

        clicks.push({ ad_id, ad_name, timestamp: new Date().toISOString() });

        db.run("UPDATE visitors SET whatsapp_clicks = ? WHERE id = ?", [JSON.stringify(clicks), id], function(updateErr) {
            if (updateErr) return res.status(500).json({ error: 'Error al guardar el click' });
            res.json({ success: true });
        });
    });
});

// --- RATINGS ENDPOINTS ---

app.get('/api/ads/:id/rating', (req, res) => {
    const { id } = req.params;
    db.get("SELECT AVG(score) as avg, COUNT(*) as count FROM ratings WHERE ad_id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Error al obtener rating' });
        res.json({ 
            avg: row.avg ? parseFloat(row.avg.toFixed(1)) : 0, 
            count: row.count || 0 
        });
    });
});

app.post('/api/ads/:id/rate', (req, res) => {
    const { id } = req.params; // ad_id
    const { visitor_id, score } = req.body;

    if (!visitor_id || !score || score < 1 || score > 5) {
        return res.status(400).json({ error: 'Datos de valoración inválidos' });
    }

    db.run(`INSERT INTO ratings (ad_id, visitor_id, score) 
            VALUES (?, ?, ?) 
            ON CONFLICT(ad_id, visitor_id) 
            DO UPDATE SET score = excluded.score, created_at = CURRENT_TIMESTAMP`, 
    [id, visitor_id, score], function(err) {
        if (err) return res.status(500).json({ error: 'Error al guardar valoración' });
        res.json({ success: true });
    });
});

app.get('/api/visitors/:id/ratings', (req, res) => {
    const { id } = req.params;
    db.all("SELECT r.*, a.name as ad_name FROM ratings r JOIN ads a ON r.ad_id = a.id WHERE r.visitor_id = ? ORDER BY r.created_at DESC", [id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener valoraciones del usuario' });
        res.json(rows);
    });
});

// Serve frontend in production
app.use(express.static(path.join(__dirname, '../client/dist')));

// API: Update ad
app.put('/api/ads/:id', auth, (req, res) => {
    const { id } = req.params;
    let { url, image, name, phone, email, location, category, barrio, zona, description, lat, lng, expiration_date } = req.body;
    
    name = clean(name);
    location = clean(location);
    description = clean(description);
    
    db.run("UPDATE ads SET url = ?, image = ?, name = ?, phone = ?, email = ?, location = ?, category = ?, barrio = ?, zona = ?, description = ?, lat = ?, lng = ?, expiration_date = ? WHERE id = ?", 
        [url, image, name, phone, email, location, category, barrio, zona, description, lat, lng, expiration_date, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, changes: this.changes });
    });
});

// API: Delete ad
app.delete('/api/ads/:id', auth, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM ads WHERE id = ?", [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, changes: this.changes });
    });
});

// API: Export all ads as CSV
app.get('/api/ads/export/csv', auth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send('Acceso denegado. Solo administradores pueden exportar datos.');
    }

    db.all("SELECT id, name, url, phone, email, location, category, barrio, zona, description, lat, lng, sector, x, y, width, height, expiration_date, created_at FROM ads ORDER BY id", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const headers = ['ID', 'Nombre', 'URL', 'Teléfono', 'Email', 'Ubicación', 'Rubro', 'Barrio', 'Zona', 'Descripción', 'Lat', 'Lng', 'Sector', 'X', 'Y', 'Ancho', 'Alto', 'Vencimiento', 'Fecha Registro'];
        const escapeCsv = (val) => {
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        };

        const csvRows = [headers.join(',')];
        rows.forEach(row => {
            csvRows.push([
                row.id, escapeCsv(row.name), escapeCsv(row.url), escapeCsv(row.phone),
                escapeCsv(row.email), escapeCsv(row.location), escapeCsv(row.category), escapeCsv(row.barrio), escapeCsv(row.zona),
                escapeCsv(row.description), row.lat, row.lng, escapeCsv(row.sector), row.x, row.y, row.width, row.height,
                escapeCsv(row.expiration_date), escapeCsv(row.created_at)
            ].join(','));
        });

        const csvContent = '\uFEFF' + csvRows.join('\n');
        const date = new Date().toISOString().split('T')[0];
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="anunciantes_${date}.csv"`);
        res.send(csvContent);
    });
});

// Catch-all route to serve the frontend (must be last)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
