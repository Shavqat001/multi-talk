const socket = new WebSocket('ws://localhost:8081');
let activeUser = null;
let users = [];

let usersAside = document.querySelector('.users');
let usersList = document.querySelector('.users__list');
let messagesContent = document.querySelector('.messages');
let form = document.querySelector('.messages__form');
let messageInput = form.querySelector('.messages__input');
let selectMessage = document.querySelector('.message__select_chat');
let messagesList = document.querySelector('.messages__list');
let messagesWrapperList = document.querySelector('.message__wrapper_list');
let theme = document.querySelector('.page__theme');
let searchBar = document.querySelector('.users__search');

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // Находим пользователя по номеру телефона
    let user = users.find(u => u.phoneNumber === data.phoneNumber);

    if (!user) {
        user = {
            phoneNumber: data.phoneNumber,
            name: data.name || 'Unknown User',
            platform: data.platform,
            profilePic: data.profilePic || './img/avatar.jpg',
            messages: []
        };
        users.push(user);

        // Создаём новый элемент пользователя в DOM
        const userElement = document.createElement('li');
        userElement.classList.add('users__item');
        userElement.id = data.phoneNumber;
        userElement.innerHTML = `
            <div class="users__picture">
                <img src="${user.profilePic}" alt="${data.name}" width="50">
            </div>
            <div class="users__info">
                <h3 class="users__name">${data.name}</h3>
                <p class="users__text">${data.message}</p> <!-- Отображаем последнее сообщение -->
                <span class="new-message-indicator"></span>
            </div>
            <img class="users__platform-icon" src="./assets/${data.platform}.ico" alt="${data.platform}" width="25">
        `;
        userElement.addEventListener('click', () => setActiveUser(data.phoneNumber));
        usersList.appendChild(userElement);
    }

    // Добавляем сообщение в историю пользователя
    user.messages.push({ text: data.message, from: data.from || data.platform });

    // Если активный пользователь, обновляем список сообщений
    if (activeUser === user.phoneNumber) {
        const messageClass = data.from === 'operator' ? 'messages__item_bot' : 
                             data.platform === 'telegram' ? 'messages__item_telegram' :
                             'messages__item_whatsapp';

        messagesList.innerHTML += `
            <li class="messages__item ${messageClass}">
                ${data.message}
                <span class="messages__item_tail"></span>
            </li>`;
        scrollToBottom();
    } else {
        // Показываем зеленый кружок для индикатора нового сообщения
        const userElement = document.getElementById(user.phoneNumber);
        userElement.querySelector('.new-message-indicator').classList.add('new-message-indicator--visible');
        // Обновляем последнее сообщение в интерфейсе
        userElement.querySelector('.users__text').textContent = data.message;
    }
};

function scrollToBottom() {
    messagesWrapperList.scrollTop = messagesList.scrollHeight;
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (activeUser && messageInput.value.trim() !== '') {
        const messageText = messageInput.value.trim();

        // Находим пользователя по номеру телефона (activeUser)
        const user = users.find(u => u.phoneNumber === activeUser);

        if (!user) {
            console.error(`User with phoneNumber ${activeUser} not found.`);
            return; // Если пользователь не найден, прекращаем выполнение
        }

        // Добавляем сообщение только в случае отправки, но не для отображения (через WebSocket)
        user.messages.push({ text: messageText, from: 'operator' });

        // Отправляем сообщение через WebSocket на сервер
        socket.send(JSON.stringify({
            platform: user.platform,
            phoneNumber: activeUser, // Отправляем номер телефона
            inputText: messageText
        }));

        // Очищаем поле ввода
        messageInput.value = '';
    }
});

function setActiveUser(chatId) {
    const usersItem = document.querySelectorAll('.users__item');
    usersItem.forEach((el) => el.classList.remove('users__item--active'));

    const currentElement = document.getElementById(chatId);
    currentElement.classList.add('users__item--active');

    messagesContent.style.justifyContent = 'space-between';
    selectMessage.classList.add('visually-hidden');
    form.classList.remove('visually-hidden');
    messageInput.focus();
    activeUser = chatId;
    messagesList.innerHTML = '';
    messagesWrapperList.classList.remove('visually-hidden');

    const user = users.find(u => u.phoneNumber === chatId);
    if (user && user.messages) {
        user.messages.forEach(msg => {
            const messageClass = msg.from === 'telegram' ? 'messages__item_telegram' :
                msg.from === 'whatsapp' ? 'messages__item_whatsapp' :
                    'messages__item_bot';

            messagesList.innerHTML += `
            <li class="messages__item ${messageClass}">
                ${msg.text}
                <span class="messages__item_tail"></span>
            </li>`;
        });
        scrollToBottom();
    }

    currentElement.querySelector('.new-message-indicator').classList.remove('new-message-indicator--visible');

    fetch(`http://localhost:8082/api/messages/${chatId}`)
        .then(response => response.json())
        .then(data => {
            messagesList.innerHTML = '';

            data.forEach(msg => {
                let messageClass = '';
                if (msg.message_type === 'client') {
                    messageClass = msg.platform === 'telegram' ? 'messages__item_telegram' :
                        msg.platform === 'whatsapp' ? 'messages__item_whatsapp' : 'messages__item_client';
                } else if (msg.message_type === 'operator') {
                    messageClass = 'messages__item_bot';
                }

                messagesList.innerHTML += `
            <li class="messages__item ${messageClass}">
                ${msg.message_text}
                <span class="messages__item_tail"></span>
            </li>`;
            });
            scrollToBottom();
        })
        .catch(err => console.error('Error fetching messages:', err));
}

function toggleTheme(isChecked) {
    if (isChecked) {
        usersAside.classList.add('users__light--theme');
        document.querySelectorAll('.users__item')
            .forEach(el => el.classList.add('users__item--light'));
        searchBar.classList.add('users__search--light');
        form.classList.add('messages__form--light');
        messagesContent.classList.add('messages--light');
        document.querySelectorAll('.messages__item')
            .forEach(el => {
                el.classList.add('messages__item--light');
            });
    } else {
        usersAside.classList.remove('users__light--theme');
        document.querySelectorAll('.users__item')
            .forEach(el => el.classList.remove('users__item--light'));
        searchBar.classList.remove('users__search--light');
        form.classList.remove('messages__form--light');
        messagesContent.classList.remove('messages--light');
        document.querySelectorAll('.messages__item')
            .forEach(el => {
                el.classList.remove('messages__item--light');
            });
    }
}

searchBar.addEventListener('input', () => {
    const usersItem = document.querySelectorAll('.users__item');
    usersItem.forEach(user => {
        if (user.querySelector('.users__name')
            .textContent.toLowerCase() === searchBar.value.toLowerCase()) {
            usersItem.forEach(el => el.style.display = 'none');
            user.style.display = 'flex';
        }
        if (searchBar.value === '') {
            usersItem.forEach(el => el.style.display = 'flex');
        }
    });
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        cancelActiveUser();
    }
});

function cancelActiveUser() {
    const usersItem = document.querySelectorAll('.users__item');
    usersItem.forEach(el => el.classList.remove('users__item--active'));
    messagesContent.style.justifyContent = 'center';
    selectMessage.classList.remove('visually-hidden');
    form.classList.add('visually-hidden');
    messagesList.innerHTML = '';
    messagesWrapperList.classList.add('visually-hidden');
}

// Загружаем список клиентов при загрузке страницы
function loadClients() {
    fetch('http://localhost:8082/api/clients')
        .then(response => response.json())
        .then(clients => {
            // Очищаем DOM, но сохраняем массив users
            usersList.innerHTML = '';

            clients.forEach(client => {
                // Проверка на существование клиента в массиве по номеру телефона
                let user = users.find(u => u.phoneNumber === client.phone_number);

                if (!user) {
                    // Если клиента нет в списке, добавляем его
                    user = {
                        phoneNumber: client.phone_number,
                        name: client.sender_name || 'Unknown User',
                        platform: client.platform,
                        profilePic: client.sender_profile_pic || './img/avatar.jpg',
                        messages: []
                    };
                    users.push(user);
                }

                // Проверка на существование клиента в DOM
                let userElement = document.getElementById(client.phone_number);
                if (!userElement) {
                    // Создаём элемент пользователя в DOM
                    userElement = document.createElement('li');
                    userElement.classList.add('users__item');
                    userElement.id = client.phone_number;
                    userElement.innerHTML = `
                        <div class="users__picture">
                            <img src="${client.sender_profile_pic || './img/avatar.jpg'}" alt="${client.sender_name || 'Unknown User'}" width="50">
                        </div>
                        <div class="users__info">
                            <h3 class="users__name">${client.sender_name || 'Unknown User'}</h3>
                            <p class="users__text"></p>
                            <span class="new-message-indicator"></span>
                        </div>
                        <img class="users__platform-icon" src="./assets/${client.platform}.ico" alt="${client.platform}" width="25">
                    `;

                    // Добавляем обработчик клика для выбора активного пользователя
                    userElement.addEventListener('click', () => setActiveUser(client.phone_number));
                    usersList.appendChild(userElement);
                } else {
                    // Если элемент уже есть, обновляем его
                    userElement.querySelector('.users__picture img').src = client.sender_profile_pic || './img/avatar.jpg';
                }
            });
        })
        .catch(err => console.error('Error loading clients:', err));
}


window.addEventListener('DOMContentLoaded', loadClients);
