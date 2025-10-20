// script.js
let dialogueManager;
let questManager;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализация редактора...');
    try {
        // Создаем менеджеры
        questManager = new QuestManager();
        dialogueManager = new DialogueManager(questManager);
        
        // Инициализируем их
        dialogueManager.initialize();
        questManager.initialize(dialogueManager);
        
        console.log('Все менеджеры успешно инициализированы');
    } catch (error) {
        console.error('Ошибка инициализации редактора:', error);
        alert('Произошла ошибка при инициализации редактора. Проверьте консоль для подробностей.');
    }
});
