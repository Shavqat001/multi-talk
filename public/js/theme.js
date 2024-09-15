const themeToggle = document.querySelector('.page__theme');
let usersAside = document.querySelector('.users');

let isLight = JSON.parse(localStorage.getItem('theme'));

themeToggle.addEventListener('click', () => {
    if (isLight) {
        usersAside.classList.remove('users__light--theme');
        document.querySelectorAll('.users__item').forEach(el => el.classList.remove('users__item--light'));
        searchBar.classList.remove('users__search--light');
        form.classList.remove('messages__form--light');
        messagesContent.classList.remove('messages--light');
        document.querySelectorAll('.messages__item').forEach(el => el.classList.remove('messages__item--light'));
        themeToggle.classList.remove('page__theme--light');
        isLight = false;
        JSON.stringify(localStorage.setItem('theme', isLight))
    } else {
        usersAside.classList.add('users__light--theme');
        document.querySelectorAll('.users__item').forEach(el => el.classList.add('users__item--light'));
        searchBar.classList.add('users__search--light');
        form.classList.add('messages__form--light');
        messagesContent.classList.add('messages--light');
        document.querySelectorAll('.messages__item').forEach(el => el.classList.add('messages__item--light'));
        themeToggle.classList.add('page__theme--light');
        isLight = true;
        JSON.stringify(localStorage.setItem('theme', isLight))
    }
});

window.addEventListener('load', () => {
    setTimeout(() => {
        if (isLight) {
            usersAside.classList.add('users__light--theme');
            document.querySelectorAll('.users__item').forEach(el => el.classList.add('users__item--light'));
            searchBar.classList.add('users__search--light');
            form.classList.add('messages__form--light');
            messagesContent.classList.add('messages--light');
            document.querySelectorAll('.messages__item').forEach(el => el.classList.add('messages__item--light'));
            themeToggle.classList.add('page__theme--light');
        } else {
            usersAside.classList.remove('users__light--theme');
            document.querySelectorAll('.users__item').forEach(el => el.classList.remove('users__item--light'));
            searchBar.classList.remove('users__search--light');
            form.classList.remove('messages__form--light');
            messagesContent.classList.remove('messages--light');
            document.querySelectorAll('.messages__item').forEach(el => el.classList.remove('messages__item--light'));
            themeToggle.classList.remove('page__theme--light');
        }
    }, 100);
});