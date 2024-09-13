require('dotenv').config();
const express = require('express');  // Добавляем Express для обработки маршрутов
const cors = require('cors');  // Подключаем cors
const { Server } = require('ws');
const { Telegraf } = require('telegraf');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mysql = require('mysql2');

const app = express(); 
const port = 8082;

app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());  // Для работы с JSON

// Настройка подключения к MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chat_bot'
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Подключено к MySQL');
});

const wss = new Server({ port: 8081 });

// Telegram Bot
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

bot.start((msg) => {
    msg.reply(`Привет!\n\nЧем я могу вам помочь?`);
});

bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const name = ctx.chat.first_name || 'Telegram User';

    let profilePicUrl = './img/avatar.jpg';  // Дефолтная картинка
    try {
        const photos = await bot.telegram.getUserProfilePhotos(chatId);
        if (photos.total_count > 0) {
            const fileId = photos.photos[0][0].file_id;
            const fileLink = await bot.telegram.getFileLink(fileId);
            profilePicUrl = fileLink.href;  // Извлекаем строку href из объекта URL
        }
    } catch (error) {
        console.error('Error getting Telegram profile picture:', error);
    }

    // Отправляем сообщение через WebSocket и сохраняем в базу данных
    wss.clients.forEach(client => {
        client.send(JSON.stringify({
            platform: 'telegram',
            chatId: chatId,
            name: name,
            message: ctx.message.text,
            profilePic: profilePicUrl  // Передаем строку URL
        }));
    });

    // Сохраняем сообщение в базу данных
    const query = `
        INSERT INTO messages (chat_id, platform, sender_name, sender_profile_pic, message_text, message_type)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    connection.query(query, [chatId, 'telegram', name, profilePicUrl, ctx.message.text, 'client'], (err, result) => {
        if (err) throw err;
        console.log('Message from Telegram saved to DB');
    });
});

bot.launch().then(() => console.log('Telegram bot launched successfully'))
    .catch(err => console.error('Failed to launch Telegram bot:', err));

// WhatsApp Bot
const whatsappClient = new Client({
    authStrategy: new LocalAuth()
});

whatsappClient.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
    console.log('WhatsApp client is ready');
});

whatsappClient.on('message', async message => {
    const contact = await whatsappClient.getContactById(message.from);
    const displayName = contact.pushname || contact.name || 'WhatsApp User';

    let profilePicUrl = './img/avatar.jpg';  // Дефолтная картинка
    try {
        profilePicUrl = await contact.getProfilePicUrl();  // Получаем строку URL
    } catch (err) {
        console.error('Error getting WhatsApp profile picture:', err);
    }

    // Отправляем сообщение через WebSocket и сохраняем в базу данных
    wss.clients.forEach(function each(client) {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({
                platform: 'whatsapp',
                message: message.body,
                chatId: message.from,
                name: displayName,
                profilePic: profilePicUrl  // Передаем строку URL
            }));
        }
    });

    // Сохраняем сообщение в базу данных
    const query = `
        INSERT INTO messages (chat_id, platform, sender_name, sender_profile_pic, message_text, message_type)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    connection.query(query, [message.from, 'whatsapp', displayName, profilePicUrl, message.body, 'client'], (err, result) => {
        if (err) throw err;
        console.log('Message from WhatsApp saved to DB');
    });
});

whatsappClient.initialize()
    .then(() => console.log('WhatsApp client initialized successfully'))
    .catch(err => console.error('Failed to initialize WhatsApp client:', err));

// WebSocket для обработки сообщений от оператора
wss.on('connection', (ws) => {
    ws.on('message', async (msg) => {
        const data = JSON.parse(msg);
        const inputText = data.inputText || '';
        const chatId = data.chatId;

        if (data.platform === 'telegram') {
            bot.telegram.sendMessage(chatId, inputText)
                .then(() => console.log('Message sent to Telegram'))
                .catch(err => console.error('Failed to send message to Telegram:', err));
        }

        if (data.platform === 'whatsapp') {
            wss.clients.forEach(function each(client) {
                if (client !== ws && client.readyState === client.OPEN) {
                    client.send(JSON.stringify({
                        platform: 'whatsapp',
                        message: inputText,
                        chatId: chatId
                    }));
                }
            });

            whatsappClient.sendMessage(chatId, inputText)
                .then(() => console.log('Message sent to WhatsApp'))
                .catch(err => console.error('Failed to send message to WhatsApp'));
        }
    });
});

// Маршрут для получения истории сообщений по chatId
app.get('/api/messages/:chatId', (req, res) => {
    const chatId = req.params.chatId;
    console.log(`Fetching messages for chatId: ${chatId}`);  // Логирование

    const query = 'SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC';
    connection.query(query, [chatId], (err, results) => {
        if (err) throw err;
        res.json(results);  // Отправляем сообщения в формате JSON
    });
});

// Запуск сервера Express
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
