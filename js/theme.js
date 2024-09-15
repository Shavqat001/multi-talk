const themeToggle = document.querySelector('.page__theme');
let usersAside = document.querySelector('.users');

// Функция для установки темы
function applyTheme(isLight) {
    if (isLight) {
        usersAside.classList.add('users__light--theme');
        document.querySelectorAll('.users__item').forEach(el => el.classList.add('users__item--light'));
        searchBar.classList.add('users__search--light');
        form.classList.add('messages__form--light');
        messagesContent.classList.add('messages--light');
        document.querySelectorAll('.messages__item').forEach(el => el.classList.add('messages__item--light'));
    } else {
        usersAside.classList.remove('users__light--theme');
        document.querySelectorAll('.users__item').forEach(el => el.classList.remove('users__item--light'));
        searchBar.classList.remove('users__search--light');
        form.classList.remove('messages__form--light');
        messagesContent.classList.remove('messages--light');
        document.querySelectorAll('.messages__item').forEach(el => el.classList.remove('messages__item--light'));
    }
}

window.addEventListener('load', () => {
    // Применяем тему из localStorage, устанавливаем значение по умолчанию как false
    let isChecked = JSON.parse(localStorage.getItem('theme'));
    if (isChecked === null) {
        // Если значения нет в localStorage, устанавливаем по умолчанию false
        isChecked = false;
        localStorage.setItem('theme', JSON.stringify(isChecked));
    }
    // Применяем тему на основе значения из localStorage
    applyTheme(isChecked);
});

document.addEventListener('DOMContentLoaded', () => {
    // Применяем тему из localStorage
    let isChecked = JSON.parse(localStorage.getItem('theme'));
    
    // Переключение темы
    themeToggle.addEventListener('change', () => {
        isChecked = !isChecked;
        localStorage.setItem('theme', JSON.stringify(isChecked));
        applyTheme(isChecked);
    });
});
