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

    let user = users.find(u => u.id === data.chatId);

    if (!user) {
        user = {
            id: data.chatId,
            name: data.name || 'Unknown User',
            platform: data.platform,
            messages: []
        };
        users.push(user);

        const userElement = document.createElement('li');
        userElement.classList.add('users__item');
        userElement.id = data.chatId;
        userElement.innerHTML = `
            <div class="users__picture">
                <img src="${data.profilePic || './img/avatar.jpg'}" alt="${data.name}" width="50">
            </div>
            <div class="users__info">
                <h3 class="users__name">${data.name}</h3>
                <p class="users__text"></p>
                <span class="new-message-indicator"></span>
            </div>
            <img class="users__platform-icon" src="./assets/${data.platform}.ico" alt="${data.platform}" width="25">
        `;
        userElement.addEventListener('click', () => setActiveUser(data.chatId));
        usersList.appendChild(userElement);
    }

    const messageClass = data.platform === 'telegram' ? 'messages__item_telegram' : 'messages__item_whatsapp';
    user.messages.push({ text: data.message, from: data.platform });

    if (activeUser === user.id) {
        messagesList.innerHTML += `
            <li class="messages__item ${messageClass}">
                ${data.message}
                <span class="messages__item_tail"></span>
            </li>`;
    } else {
        const userElement = document.getElementById(user.id);
        userElement.querySelector('.new-message-indicator').classList.add('new-message-indicator--visible');
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
        const user = users.find(u => u.id === activeUser);

        user.messages.push({ text: messageText, from: 'operator' });

        messagesList.innerHTML += `
            <li class="messages__item messages__item_operator">
                ${messageText}
                <span class="messages__item_tail"></span>
            </li>`;

        socket.send(JSON.stringify({
            platform: user.platform,
            chatId: activeUser,
            inputText: messageText
        }));

        messageInput.value = '';
    }
});

// Загружаем историю сообщений для выбранного пользователя
function setActiveUser(chatId) {
    // Убираем активный класс у всех пользователей
    const usersItem = document.querySelectorAll('.users__item');
    usersItem.forEach((el) => el.classList.remove('users__item--active'));

    // Добавляем активный класс текущему пользователю
    const currentElement = document.getElementById(chatId);
    currentElement.classList.add('users__item--active');

    // Настраиваем интерфейс
    messagesContent.style.justifyContent = 'space-between';
    selectMessage.classList.add('visually-hidden');
    form.classList.remove('visually-hidden');
    messageInput.focus();
    activeUser = chatId;
    messagesList.innerHTML = '';
    messagesWrapperList.classList.remove('visually-hidden');

    // Локальные данные (если пользователь уже есть)
    const user = users.find(u => u.id === chatId);
    if (user && user.messages) {
        user.messages.forEach(msg => {
            // Различаем по платформам
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
                // Различаем платформы: telegram, whatsapp
                const messageClass = msg.platform === 'telegram' ? 'messages__item_telegram' :
                    msg.platform === 'whatsapp' ? 'messages__item_whatsapp' :
                        'messages__item_operator';

                // Если сообщение моё (например, это может быть проверено по `message_type`)
                if (msg.message_type === 'operator') {
                    messagesList.innerHTML += `
                    <li class="messages__item messages__item_operator">
                        ${msg.message_text}
                        <span class="messages__item_tail"></span>
                    </li>`;
                } else {
                    messagesList.innerHTML += `
                    <li class="messages__item ${messageClass}">
                        ${msg.message_text}
                        <span class="messages__item_tail"></span>
                    </li>`;
                }
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