const express = require('express');
const crypto = require('crypto');
const mysql = require('mysql2');
const router = express.Router();

// Подключение к базе данных
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chat_bot'
});

// Функция для хэширования пароля
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

// Регистрация оператора
router.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    // Проверка наличия пользователя
    db.query('SELECT * FROM operators WHERE email = ? OR username = ?', [email, username], (err, results) => {
        if (results.length > 0) {
            return res.send('Пользователь с таким именем или email уже существует.');
        } else {
            // Хэширование пароля и сохранение пользователя
            const hashedPassword = hashPassword(password);
            db.query('INSERT INTO operators (username, password, email) VALUES (?, ?, ?)', 
                     [username, hashedPassword, email], (err, result) => {
                if (err) throw err;
                // Успешная регистрация
                res.redirect('/index'); // Перенаправление на страницу чат-бота
            });
        }
    });
});

// Логин оператора
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM operators WHERE username = ?', [username], (err, results) => {
        if (results.length === 0) {
            return res.send('Неверное имя пользователя.');
        } else {
            const user = results[0];
            // Проверка пароля
            if (hashPassword(password) === user.password) {
                // Успешный логин
                res.redirect('/index'); // Перенаправление на страницу чат-бота
            } else {
                res.send('Неверный пароль.');
            }
        }
    });
});

module.exports = router; // Экспортируем маршруты для использования в server.js
