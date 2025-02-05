require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Debug database connection
pool.connect()
    .then(() => console.log('✅ Successfully connected to PostgreSQL'))
    .catch(err => {
        console.error('❌ Database connection error:', err.message);
        process.exit(1);
    });

// 📌 Run SQL queries from the frontend securely
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";  // Change this!
app.post('/admin/query', async (req, res) => {
    const { password, query } = req.body;

    if (password !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    try {
        const result = await pool.query(query);
        res.json({ success: true, result: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ Inventory Routes
app.post('/add', async (req, res) => {
    try {
        let { code, name, size, quantity } = req.body;
        if (!code) code = require('crypto').randomBytes(4).toString('hex');

        await pool.query(
            `INSERT INTO inventory (code, name, size, quantity) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (code) DO UPDATE SET quantity = inventory.quantity + $4`,
            [code, name, size, quantity]
        );

        res.json({ message: 'Product added successfully', code });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/sell', async (req, res) => {
    try {
        const { code } = req.body;
        await pool.query(`UPDATE inventory SET quantity = quantity - 1 WHERE code = $1`, [code]);
        res.json({ message: 'Sale registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/inventory', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM inventory`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Barcode Generator
const bwipjs = require('bwip-js');
app.get('/barcode/:code', async (req, res) => {
    try {
        const { code } = req.params;
        bwipjs.toBuffer({
            bcid: 'code128',
            text: code,
            scale: 3,
            height: 10,
            includetext: true
        }, (err, png) => {
            if (err) {
                res.status(500).json({ error: "Barcode generation failed" });
            } else {
                res.set('Content-Type', 'image/png');
                res.send(png);
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
