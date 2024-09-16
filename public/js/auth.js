const express = require('express');
const crypto = require('crypto');
const mysql = require('mysql2');
const router = express.Router();

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chat_bot'
});

const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

router.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    // Проверка наличия пользователя
    db.query('SELECT * FROM operators WHERE email = ? OR username = ?', [email, username], (err, results) => {
        if (results.length > 0) {
            return res.send('Пользователь с таким именем или email уже существует.');
        } else {
            const hashedPassword = hashPassword(password);
            db.query('INSERT INTO operators (username, password, email) VALUES (?, ?, ?)', 
                     [username, hashedPassword, email], (err, result) => {
                if (err) throw err;
                res.send('success'); 
            });
        }
    });
});

// Логин оператора
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM operators WHERE username = ?', [username], (err, results) => {
        if (results.length === 0) {
            return res.send('Неверное имя пользователя или пароль.');
        } else {
            const user = results[0];
            if (hashPassword(password) === user.password) {
                res.send('success'); 
            } else {
                res.send('Неверное имя пользователя или пароль.');
            }
        }
    });
});

module.exports = router;
