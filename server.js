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

// Create table if it doesn't exist
pool.query(`CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE,
    quantity INTEGER
)`);

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Add or update product quantity
app.post('/add', async (req, res) => {
    try {
        const { code, quantity } = req.body;
        await pool.query(
            `INSERT INTO inventory (code, quantity) VALUES ($1, $2)
             ON CONFLICT (code) DO UPDATE SET quantity = inventory.quantity + $2`,
            [code, quantity]
        );
        res.json({ message: 'Inventory updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Register a sale
app.post('/sell', async (req, res) => {
    try {
        const { code } = req.body;
        await pool.query(`UPDATE inventory SET quantity = quantity - 1 WHERE code = $1`, [code]);
        res.json({ message: 'Sale registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get inventory data
app.get('/inventory', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM inventory`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
