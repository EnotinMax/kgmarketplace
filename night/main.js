// Главный файл инициализации
let dialogueEditor;
let questEditor;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализация редакторов...');
    try {
        // Создаем редактор квестов первым
        questEditor = new QuestEditor();
        
        // Создаем редактор диалогов и передаем ему ссылку на редактор квестов
        dialogueEditor = new DialogueEditor(questEditor);
        
        // Делаем редакторы глобально доступными для обратной совместимости
        window.editor = dialogueEditor;
        window.questEditor = questEditor;
        
        console.log('Все редакторы успешно инициализированы');
    } catch (error) {
        console.error('Ошибка инициализации редакторов:', error);
        alert('Произошла ошибка при инициализации редакторов. Проверьте консоль для подробностей.');
    }
});
