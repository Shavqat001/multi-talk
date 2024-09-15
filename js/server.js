require('dotenv').config();
const express = require('express'); 
const cors = require('cors');
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

app.use(express.json());

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

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

bot.start((msg) => {
    msg.reply(`Привет!\n\nЧем я могу вам помочь?`);
});

bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const name = ctx.chat.first_name || 'Telegram User';
    const phoneNumber = chatId.toString();

    let profilePicUrl = './img/avatar.jpg';
    try {
        const photos = await bot.telegram.getUserProfilePhotos(chatId);
        if (photos.total_count > 0) {
            const fileId = photos.photos[0][0].file_id;
            const fileLink = await bot.telegram.getFileLink(fileId);
            profilePicUrl = fileLink.href;
        }
    } catch (error) {
        console.error('Error getting Telegram profile picture:', error);
    }

    wss.clients.forEach(client => {
        client.send(JSON.stringify({
            platform: 'telegram',
            phoneNumber: phoneNumber,
            name: name,
            message: ctx.message.text,
            profilePic: profilePicUrl
        }));
    });

    const query = `
        INSERT INTO messages (phone_number, platform, sender_name, sender_profile_pic, message_text, message_type)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    connection.query(query, [phoneNumber, 'telegram', name, profilePicUrl, ctx.message.text, 'client'], (err, result) => {
        if (err) throw err;
    });
});

bot.launch().then(() => console.log('Telegram bot launched successfully'))
    .catch(err => console.error('Failed to launch Telegram bot:', err));

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

    const realPhoneNumber = contact.number || message.from.replace('@c.us', '');

    let profilePicUrl = './img/avatar.jpg';
    try {
        profilePicUrl = await contact.getProfilePicUrl();
    } catch (err) {
        console.error('Error getting WhatsApp profile picture:', err);
    }

    wss.clients.forEach(function each(client) {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({
                platform: 'whatsapp',
                phoneNumber: realPhoneNumber,
                name: displayName,
                message: message.body,
                profilePic: profilePicUrl
            }));
        }
    });

    const query = `
        INSERT INTO messages (phone_number, platform, sender_name, sender_profile_pic, message_text, message_type)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    connection.query(query, [realPhoneNumber, 'whatsapp', displayName, profilePicUrl, message.body, 'client'], (err, result) => {
        if (err) throw err;
    });
});

whatsappClient.initialize()
    .then(() => '')
    .catch(err => console.error('Failed to initialize WhatsApp client:', err));

wss.on('connection', (ws) => {
    ws.on('message', async (msg) => {
        const data = JSON.parse(msg);
        const inputText = data.inputText || '';
        const phoneNumber = data.phoneNumber;

        connection.query('SELECT * FROM messages WHERE phone_number = ? LIMIT 1', [phoneNumber], (err, results) => {
            if (err) {
                return;
            }

            const userProfilePic = results.length > 0 ? results[0].sender_profile_pic : './img/avatar.jpg';

            // Отправка сообщения обратно всем клиентам
            wss.clients.forEach(function each(client) {
                if (client.readyState === client.OPEN) {
                    client.send(JSON.stringify({
                        platform: data.platform,
                        message: inputText,
                        phoneNumber: phoneNumber,
                        from: 'operator',
                        profilePic: userProfilePic
                    }));
                }
            });

            if (data.platform === 'telegram') {
                bot.telegram.sendMessage(phoneNumber, inputText)
                    .then(() => console.log('Message sent to Telegram'))
                    .catch(err => console.error('Failed to send message to Telegram:', err));
            } else if (data.platform === 'whatsapp') {
                whatsappClient.sendMessage(phoneNumber + '@c.us', inputText)
                    .then(() => console.log('Message sent to WhatsApp'))
                    .catch(err => console.error('Failed to send message to WhatsApp:', err));
            }

            const query = `
                INSERT INTO messages (phone_number, platform, sender_name, sender_profile_pic, message_text, message_type)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            connection.query(query, [phoneNumber, data.platform, 'Operator', userProfilePic, inputText, 'operator'], (err, result) => {
                if (err) throw err;
            });
        });
    });
});

app.get('/api/clients', (req, res) => {
    const query = 'SELECT DISTINCT phone_number, sender_name, platform, sender_profile_pic FROM messages';
    
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching clients:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json(results);
        }
    });
});

app.get('/api/messages/:phoneNumber', (req, res) => {
    const phoneNumber = req.params.phoneNumber;
    const query = 'SELECT * FROM messages WHERE phone_number = ? ORDER BY timestamp ASC';
    connection.query(query, [phoneNumber], (err, results) => {
        if (err) {
            console.error('Error fetching messages:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json(results);
        }
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});