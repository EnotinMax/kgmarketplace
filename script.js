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
        
        // Поиск
        this.bindInput('searchInput', (e) => this.searchDialogue(e.target.value));
        
        // Свойства узлов и опций
        this.bindInput('nodeId', (e) => this.updateNodeProperty('id', e.target.value));
        this.bindInput('nodeText', (e) => this.updateNodeProperty('text', e.target.value));
        
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
        
        // Добавляем редактор опций для узла
        this.renderNodeOptionsEditor(node);
    }

    renderNodeOptionsEditor(node) {
        // Создаем или обновляем редактор опций
        let optionsEditor = document.getElementById('nodeOptionsEditor');
        if (!optionsEditor) {
            optionsEditor = document.createElement('div');
            optionsEditor.id = 'nodeOptionsEditor';
            optionsEditor.className = 'node-options-editor';
            document.getElementById('nodeProperties').appendChild(optionsEditor);
        }
        
        optionsEditor.innerHTML = `
            <h4>Опции игрока</h4>
            <div id="nodeOptionsList"></div>
            <button id="addNodeOptionBtn" class="btn-small" style="margin-top: 10px;">+ Добавить опцию</button>
        `;
        
        // Рендерим список опций
        this.renderNodeOptionsList(node);
        
        // Добавляем обработчики
        this.bindButton('addNodeOptionBtn', () => this.addOptionToCurrentNode());
    }

    renderNodeOptionsList(node) {
        const container = document.getElementById('nodeOptionsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        node.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option-editor-item';
            optionElement.innerHTML = `
                <div class="option-editor-header">
                    <span class="option-editor-index">${index + 1})</span>
                    <div class="option-editor-controls">
                        <button onclick="editor.moveOptionUp(${index})" ${index === 0 ? 'disabled' : ''}>↑</button>
                        <button onclick="editor.moveOptionDown(${index})" ${index === node.options.length - 1 ? 'disabled' : ''}>↓</button>
                        <button onclick="editor.deleteNodeOption(${index})" style="background: #e74c3c;">×</button>
                    </div>
                </div>
                <div class="option-editor-content">
                    <div class="option-editor-row">
                        <div class="form-group option-editor-text">
                            <label>Текст опции:</label>
                            <textarea class="form-control node-option-text" data-option-index="${index}" 
                                      rows="2" placeholder="Текст опции...">${this.escapeHtml(option.text)}</textarea>
                        </div>
                    </div>
                    <div class="option-editor-row">
                        <div class="form-group option-editor-transition">
                            <label>Переход:</label>
                            <select class="form-control node-option-transition" data-option-index="${index}">
                                <option value="">-- Нет --</option>
                                ${Array.from(this.nodes.keys()).filter(id => id !== this.selectedNode).map(id => 
                                    `<option value="${id}" ${option.transition === id ? 'selected' : ''}>${id}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group option-editor-icon">
                            <label>Иконка:</label>
                            <input type="text" class="form-control node-option-icon" data-option-index="${index}" 
                                   value="${option.icon}" placeholder="Hammer, Sword...">
                        </div>
                        <div class="form-group option-editor-color">
                            <label>Цвет:</label>
                            <input type="color" class="form-control node-option-color" data-option-index="${index}" 
                                   value="${option.color || '#ffffff'}">
                        </div>
                    </div>
                    <div class="option-editor-actions">
                        <button class="btn-small" onclick="editor.showConditionsForOption(${index})">Условия</button>
                        <button class="btn-small" onclick="editor.showCommandsForOption(${index})">Команды</button>
                    </div>
                </div>
            `;
            container.appendChild(optionElement);
        });
        
        // Добавляем обработчики изменений
        this.attachNodeOptionEventListeners();
    }

    attachNodeOptionEventListeners() {
        // Текст опции
        document.querySelectorAll('.node-option-text').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.getAttribute('data-option-index'));
                this.updateNodeOptionProperty(index, 'text', e.target.value);
            });
        });
        
        // Переход
        document.querySelectorAll('.node-option-transition').forEach(select => {
            select.addEventListener('change', (e) => {
                const index = parseInt(e.target.getAttribute('data-option-index'));
                this.updateNodeOptionProperty(index, 'transition', e.target.value);
            });
        });
        
        // Иконка
        document.querySelectorAll('.node-option-icon').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.getAttribute('data-option-index'));
                this.updateNodeOptionProperty(index, 'icon', e.target.value);
            });
        });
        
        // Цвет
        document.querySelectorAll('.node-option-color').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.getAttribute('data-option-index'));
                this.updateNodeOptionProperty(index, 'color', e.target.value);
            });
        });
    }

    updateNodeOptionProperty(optionIndex, property, value) {
        const node = this.nodes.get(this.selectedNode);
        if (!node || optionIndex >= node.options.length) return;
        
        node.options[optionIndex][property] = value;
        this.renderNodes();
    }

    addOptionToCurrentNode() {
        if (!this.selectedNode) return;
        
        const node = this.nodes.get(this.selectedNode);
        if (!node) return;
        
        this.addOptionToNode(this.selectedNode, "Новая опция");
        this.renderNodeOptionsList(node);
    }

    deleteNodeOption(optionIndex) {
        const node = this.nodes.get(this.selectedNode);
        if (!node || optionIndex >= node.options.length) return;
        
        node.options.splice(optionIndex, 1);
        this.renderNodes();
        this.renderNodeOptionsList(node);
    }

    moveOptionUp(optionIndex) {
        const node = this.nodes.get(this.selectedNode);
        if (!node || optionIndex <= 0) return;
        
        const temp = node.options[optionIndex];
        node.options[optionIndex] = node.options[optionIndex - 1];
        node.options[optionIndex - 1] = temp;
        
        this.renderNodes();
        this.renderNodeOptionsList(node);
    }

    moveOptionDown(optionIndex) {
        const node = this.nodes.get(this.selectedNode);
        if (!node || optionIndex >= node.options.length - 1) return;
        
        const temp = node.options[optionIndex];
        node.options[optionIndex] = node.options[optionIndex + 1];
        node.options[optionIndex + 1] = temp;
        
        this.renderNodes();
        this.renderNodeOptionsList(node);
    }

    showConditionsForOption(optionIndex) {
        this.selectedOption = this.nodes.get(this.selectedNode).options[optionIndex].id;
        this.showConditionModal();
    }

    showCommandsForOption(optionIndex) {
        this.selectedOption = this.nodes.get(this.selectedNode).options[optionIndex].id;
        this.showCommandModal();
    }

    // ... остальные методы остаются без изменений ...

    // Обновляем метод processTextForDisplay для корректной обработки переносов
    processTextForDisplay(text) {
        if (!text) return '';
        
        // Экранируем HTML кроме тегов <br>
        let processed = this.escapeHtml(text);
        
        // Заменяем \n на <br>
        processed = processed.replace(/\n/g, '<br>');
        
        // Обрабатываем теги <color> (после экранирования, чтобы не экранировать наши span)
        processed = processed.replace(/&lt;color=([^&]+)&gt;([^&]*)&lt;\/color&gt;/g, 
            '<span style="color: $1">$2</span>');
        
        // Также поддерживаем формат <color=#hex>text</color>
        processed = processed.replace(/&lt;color=#([0-9a-fA-F]{6})&gt;([^&]*)&lt;\/color&gt;/g,
            '<span style="color: #$1">$2</span>');
        
        return processed;
    }

    // Обновляем метод escapeHtml для корректной работы
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
