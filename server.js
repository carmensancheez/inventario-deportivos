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

// Crear tabla si no existe
pool.query(`CREATE TABLE IF NOT EXISTS inventario (
    id SERIAL PRIMARY KEY,
    codigo TEXT UNIQUE,
    cantidad INTEGER
)`);

// Agregar producto o actualizar cantidad
app.post('/agregar', async (req, res) => {
    try {
        const { codigo, cantidad } = req.body;
        await pool.query(
            `INSERT INTO inventario (codigo, cantidad) VALUES ($1, $2)
             ON CONFLICT (codigo) DO UPDATE SET cantidad = inventario.cantidad + $2`,
            [codigo, cantidad]
        );
        res.json({ mensaje: 'Inventario actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registrar venta
app.post('/vender', async (req, res) => {
    try {
        const { codigo } = req.body;
        await pool.query(`UPDATE inventario SET cantidad = cantidad - 1 WHERE codigo = $1`, [codigo]);
        res.json({ mensaje: 'Venta registrada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener inventario
app.get('/inventario', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM inventario`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Servidor corriendo en puerto 3000'));
