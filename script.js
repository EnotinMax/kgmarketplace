// Основной класс редактора диалогов
class DialogueEditor {
    constructor() {
        this.nodes = new Map();
        this.selectedNode = null;
        this.selectedOption = null;
        this.currentZoom = 1;
        this.canvasOffset = { x: 0, y: 0 };
        this.isCanvasDragging = false;
        this.canvasStartPos = { x: 0, y: 0 };
        this.previewHistory = [];
        
        console.log('DialogueEditor инициализирован');
        this.initializeEventListeners();
        this.createSampleDialogue();
    }

    initializeEventListeners() {
        console.log('Инициализация обработчиков событий');
        
        // Основные кнопки
        this.bindButton('addNodeBtn', () => this.addNode());
        this.bindButton('addOptionBtn', () => this.addOption());
        this.bindButton('deleteBtn', () => this.deleteSelected());
        this.bindButton('previewBtn', () => this.showPreview());
        this.bindButton('exportBtn', () => this.exportCfg());
        this.bindButton('importBtn', () => document.getElementById('fileInput').click());
        this.bindButton('validateBtn', () => this.validateDialogue());
        
        // Новая кнопка добавления опции в панели узла
        this.bindButton('addNodeOptionBtn', () => this.addOptionToSelectedNode());
        
        // Поиск
        this.bindInput('searchInput', (e) => this.searchDialogue(e.target.value));
        
        // Свойства узлов и опций
        this.bindInput('nodeId', (e) => this.updateNodeProperty('id', e.target.value));
        this.bindInput('nodeText', (e) => this.updateNodeProperty('text', e.target.value));
        this.bindInput('optionText', (e) => this.updateOptionProperty('text', e.target.value));
        this.bindInput('optionTransition', (e) => this.updateOptionProperty('transition', e.target.value));
        this.bindInput('optionIcon', (e) => this.updateOptionProperty('icon', e.target.value));
        this.bindInput('optionColor', (e) => this.updateOptionProperty('color', e.target.value));

        // Условия и команды
        this.bindButton('addConditionBtn', () => this.showConditionModal());
        this.bindButton('addCommandBtn', () => this.showCommandModal());
        this.bindButton('saveConditionBtn', () => this.saveCondition());
        this.bindButton('saveCommandBtn', () => this.saveCommand());

        // Модальные окна
        this.bindModalEvents();
        
        // Файловый input
        this.bindInput('fileInput', (e) => this.handleFileImport(e));
        
        // Перетаскивание холста
        this.bindCanvasEvents();
        
        // Масштабирование
        this.bindButton('zoomInBtn', () => this.zoom(0.2));
        this.bindButton('zoomOutBtn', () => this.zoom(-0.2));
        this.bindButton('fitToScreenBtn', () => this.fitToScreen());
        
        // Типы условий и команд
        this.bindInput('conditionType', () => this.updateConditionParams());
        this.bindInput('commandType', () => this.updateCommandParams());
        
        console.log('Все обработчики инициализированы');
    }

    // ... остальные методы остаются без изменений до метода createNodeElement ...

    createNodeElement(node) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'dialogue-node';
        if (this.selectedNode === node.id) {
            nodeDiv.classList.add('selected');
        }
        if (node.collapsed) {
            nodeDiv.classList.add('collapsed');
        }
        
        nodeDiv.style.left = `${node.x}px`;
        nodeDiv.style.top = `${node.y}px`;
        nodeDiv.setAttribute('data-node-id', node.id);
        
        const optionsHtml = node.options.map((option, index) => {
            const processedOptionText = this.processTextForDisplay(option.text);
            const transitionText = option.transition ? `→ ${option.transition}` : '';
            return `
                <div class="option ${this.selectedOption === option.id ? 'selected' : ''}" 
                     data-option-id="${option.id}">
                     ${option.icon ? `<span class="option-icon" title="${option.icon}"></span>` : ''}
                     <span class="option-text">${index + 1}) ${processedOptionText}</span>
                     ${transitionText ? `<span class="option-transition">${transitionText}</span>` : ''}
                </div>
            `;
        }).join('');
        
        // Перемещаем кнопку сворачивания на левую сторону
        nodeDiv.innerHTML = `
            <div class="node-header">
                <button class="collapse-btn" data-node-id="${node.id}">
                    ${node.collapsed ? '+' : '−'}
                </button>
                <span>[${this.escapeHtml(node.id)}]</span>
            </div>
            <div class="node-content">
                <div class="node-text">${this.processTextForDisplay(node.text)}</div>
                <div class="node-options">
                    ${optionsHtml}
                </div>
            </div>
        `;
        
        this.addNodeEventListeners(nodeDiv, node);
        return nodeDiv;
    }

    // ... остальные методы остаются без изменений до метода showNodeProperties ...

    showNodeProperties() {
        document.getElementById('nodeProperties').style.display = 'block';
        document.getElementById('optionProperties').style.display = 'none';
        
        const node = this.nodes.get(this.selectedNode);
        if (!node) return;
        
        document.getElementById('nodeId').value = node.id;
        document.getElementById('nodeText').value = node.text;
        
        // Обновляем список опций в панели узла
        this.renderNodeOptionsList(node);
    }

    // Новый метод для отображения списка опций в панели узла
    renderNodeOptionsList(node) {
        const optionsList = document.getElementById('nodeOptionsList');
        if (!optionsList) return;
        
        optionsList.innerHTML = '';
        
        node.options.forEach((option, index) => {
            const optionEditor = document.createElement('div');
            optionEditor.className = 'node-option-editor';
            optionEditor.innerHTML = `
                <div class="node-option-header">
                    <span class="node-option-number">${index + 1}</span>
                    <button class="remove-option-btn" data-option-id="${option.id}">×</button>
                </div>
                <div class="option-fields">
                    <div class="option-field option-field-full">
                        <label>Текст:</label>
                        <input type="text" class="option-text-input" data-option-id="${option.id}" 
                               value="${this.escapeHtml(option.text)}" placeholder="Текст опции">
                    </div>
                    <div class="option-field">
                        <label>Переход:</label>
                        <select class="option-transition-select" data-option-id="${option.id}">
                            <option value="">-- Нет --</option>
                            ${this.generateTransitionOptions(option.transition)}
                        </select>
                    </div>
                    <div class="option-field">
                        <label>Иконка:</label>
                        <input type="text" class="option-icon-input" data-option-id="${option.id}" 
                               value="${option.icon || ''}" placeholder="Иконка">
                    </div>
                    <div class="option-field">
                        <label>Цвет:</label>
                        <input type="color" class="option-color-input" data-option-id="${option.id}" 
                               value="${option.color || '#ffffff'}">
                    </div>
                </div>
            `;
            optionsList.appendChild(optionEditor);
        });
        
        // Добавляем обработчики событий для полей ввода
        this.attachNodeOptionEventListeners();
    }

    // Генерация опций для выпадающего списка переходов
    generateTransitionOptions(currentTransition) {
        let options = '';
        this.nodes.forEach((node, nodeId) => {
            if (nodeId !== this.selectedNode) {
                const selected = nodeId === currentTransition ? 'selected' : '';
                options += `<option value="${nodeId}" ${selected}>${nodeId}</option>`;
            }
        });
        return options;
    }

    // Привязка обработчиков событий для полей опций в панели узла
    attachNodeOptionEventListeners() {
        // Текст опции
        document.querySelectorAll('.option-text-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const optionId = e.target.getAttribute('data-option-id');
                this.updateOptionPropertyDirect(optionId, 'text', e.target.value);
            });
        });
        
        // Переход опции
        document.querySelectorAll('.option-transition-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const optionId = e.target.getAttribute('data-option-id');
                this.updateOptionPropertyDirect(optionId, 'transition', e.target.value);
            });
        });
        
        // Иконка опции
        document.querySelectorAll('.option-icon-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const optionId = e.target.getAttribute('data-option-id');
                this.updateOptionPropertyDirect(optionId, 'icon', e.target.value);
            });
        });
        
        // Цвет опции
        document.querySelectorAll('.option-color-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const optionId = e.target.getAttribute('data-option-id');
                this.updateOptionPropertyDirect(optionId, 'color', e.target.value);
            });
        });
        
        // Кнопки удаления опции
        document.querySelectorAll('.remove-option-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const optionId = e.target.getAttribute('data-option-id');
                this.removeOptionFromSelectedNode(optionId);
            });
        });
    }

    // Новый метод для обновления свойств опции напрямую (без выбора опции)
    updateOptionPropertyDirect(optionId, property, value) {
        const node = this.nodes.get(this.selectedNode);
        if (!node) return;
        
        const option = node.options.find(opt => opt.id === optionId);
        if (!option) return;
        
        option[property] = value;
        this.renderNodes();
    }

    // Новый метод для добавления опции к выбранному узлу
    addOptionToSelectedNode() {
        if (!this.selectedNode) {
            alert('Сначала выберите узел');
            return;
        }
        
        const option = this.addOptionToNode(this.selectedNode, "Новая опция");
        if (option) {
            this.renderNodeOptionsList(this.nodes.get(this.selectedNode));
        }
    }

    // Новый метод для удаления опции из выбранного узла
    removeOptionFromSelectedNode(optionId) {
        const node = this.nodes.get(this.selectedNode);
        if (!node) return;
        
        node.options = node.options.filter(opt => opt.id !== optionId);
        this.renderNodes();
        this.renderNodeOptionsList(node);
    }

    // ... остальные методы остаются без изменений до метода drawConnection ...

    drawConnection(fromNode, option) {
        const toNode = this.nodes.get(option.transition);
        if (!toNode) return;
        
        const svg = document.getElementById('connectionLayer');
        
        // Находим элементы в DOM для точного позиционирования
        const fromNodeElement = document.querySelector(`[data-node-id="${fromNode.id}"]`);
        const toNodeElement = document.querySelector(`[data-node-id="${toNode.id}"]`);
        
        if (!fromNodeElement || !toNodeElement) return;
        
        // Получаем позиции элементов
        const fromRect = fromNodeElement.getBoundingClientRect();
        const toRect = toNodeElement.getBoundingClientRect();
        const canvasRect = document.querySelector('.canvas-container').getBoundingClientRect();
        
        // Вычисляем координаты с учетом смещения холста
        // Стрелка начинается из центра правого края исходного узла
        const fromX = fromRect.left - canvasRect.left + fromRect.width;
        const fromY = fromRect.top - canvasRect.top + fromRect.height / 2;
        
        // Стрелка заканчивается в центре левого края целевого узла
        const toX = toRect.left - canvasRect.left;
        const toY = toRect.top - canvasRect.top + toRect.height / 2;
        
        // Создаем путь соединения
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Вычисляем контрольные точки для изгиба
        const controlX = (fromX + toX) / 2;
        const controlY1 = fromY;
        const controlY2 = toY;
        
        // Создаем изогнутую линию
        const pathData = `M ${fromX} ${fromY} C ${controlX} ${controlY1}, ${controlX} ${controlY2}, ${toX} ${toY}`;
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'connection-path');
        
        // Добавляем начальную точку (круг)
        const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        startCircle.setAttribute('cx', fromX);
        startCircle.setAttribute('cy', fromY);
        startCircle.setAttribute('class', 'connection-circle');
        
        svg.appendChild(startCircle);
        svg.appendChild(path);
    }

    // ... остальные методы остаются без изменений до метода processTextForDisplay ...

    // Исправленный метод для отображения текста с переносами
    processTextForDisplay(text) {
        if (!text) return '';
        
        // Заменяем \n на настоящие переносы строк (полагаемся на white-space: pre-line в CSS)
        // Экранируем HTML-теги для безопасности
        return this.escapeHtml(text);
    }

    // Метод для предпросмотра (оставляем как есть)
    processTextForPreview(text) {
        if (!text) return '';
        
        // Заменяем \n на <br>
        let processed = text.replace(/\n/g, '<br>');
        
        // Обрабатываем теги <color>
        processed = processed.replace(/<color=([^>]+)>([^<]*)<\/color>/g, 
            '<span style="color: $1">$2</span>');
        
        // Также поддерживаем формат <color=#hex>text</color>
        processed = processed.replace(/<color=#([0-9a-fA-F]{6})>([^<]*)<\/color>/g,
            '<span style="color: #$1">$2</span>');
        
        return processed;
    }

    // ... остальные методы остаются без изменений ...
}

// Инициализация при загрузке страницы
let editor;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализация редактора...');
    try {
        editor = new DialogueEditor();
        console.log('Редактор успешно инициализирован');
    } catch (error) {
        console.error('Ошибка инициализации редактора:', error);
        alert('Произошла ошибка при инициализации редактора. Проверьте консоль для подробностей.');
    }
});
