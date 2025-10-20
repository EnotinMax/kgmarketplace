// Класс редактора диалогов
class DialogueEditor {
    constructor(questEditor) {
        this.nodes = new Map();
        this.questEditor = questEditor;
        this.selectedNode = null;
        this.selectedOption = null;
        this.currentZoom = 1;
        this.canvasOffset = { x: 0, y: 0 };
        this.isCanvasDragging = false;
        this.canvasStartPos = { x: 0, y: 0 };
        this.previewHistory = [];
        this.currentPreviewNode = null;
        this.isConnecting = false;
        this.connectionSource = null;
        
        console.log('DialogueEditor инициализирован');
        this.initializeEventListeners();
        this.createSampleDialogue();
    }

    initializeEventListeners() {
        console.log('Инициализация обработчиков событий диалогов');
        
        // Основные кнопки
        this.bindButton('addNodeBtn', () => this.addNode());
        this.bindButton('addOptionBtn', () => this.addOption());
        this.bindButton('deleteBtn', () => this.deleteSelected());
        this.bindButton('previewBtn', () => this.showPreview());
        this.bindButton('exportBtn', () => this.exportCfg());
        this.bindButton('importDialogueBtn', () => document.getElementById('dialogueFileInput').click());
        this.bindButton('validateBtn', () => this.validateDialogue());
        this.bindButton('addNodeOptionBtn', () => this.addOptionToSelectedNode());
        
        // Поиск
        this.bindInput('searchInput', (e) => this.searchDialogue(e.target.value));
        
        // Свойства узлов и опций
        this.bindInput('nodeId', (e) => this.updateNodeProperty('id', e.target.value));
        this.bindInput('nodeText', (e) => this.updateNodeProperty('text', e.target.value));
        this.bindInput('optionText', (e) => this.updateOptionProperty('text', e.target.value));
        this.bindInput('optionTransition', (e) => this.updateOptionProperty('transition', e.target.value));
        this.bindInput('optionTransitionQuest', (e) => this.updateOptionProperty('transition', `quest:${e.target.value}`));
        this.bindInput('optionTransitionExternal', (e) => this.updateOptionProperty('transition', `ext:${e.target.value}`));
        this.bindInput('optionTransitionType', (e) => this.updateTransitionType(e.target.value));
        this.bindInput('optionIcon', (e) => this.updateOptionProperty('icon', e.target.value));
        this.bindInput('optionColor', (e) => this.updateOptionProperty('color', e.target.value));

        // Условия и команды
        this.bindButton('addConditionBtn', () => this.showConditionModal());
        this.bindButton('addCommandBtn', () => this.showCommandModal());

        // Модальные окна
        this.bindModalEvents();
        
        // Файловые inputs
        this.bindInput('dialogueFileInput', (e) => this.handleDialogueFileImport(e));
        
        // Перетаскивание холста
        this.bindCanvasEvents();
        
        // Масштабирование
        this.bindButton('zoomInBtn', () => this.zoom(0.2));
        this.bindButton('zoomOutBtn', () => this.zoom(-0.2));
        this.bindButton('fitToScreenBtn', () => this.fitToScreen());
        
        console.log('Все обработчики диалогов инициализированы');
    }

    bindButton(id, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
        } else {
            console.warn(`Элемент с id ${id} не найден`);
        }
    }

    bindInput(id, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', handler);
        } else {
            console.warn(`Элемент с id ${id} не найден`);
        }
    }

    bindModalEvents() {
        // Закрытие модальных окон
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';
                if (modal.id === 'previewModal') {
                    this.previewHistory = [];
                    this.currentPreviewNode = null;
                }
            });
        });

        // Закрытие при клике вне окна
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
                if (e.target.id === 'previewModal') {
                    this.previewHistory = [];
                    this.currentPreviewNode = null;
                }
            }
        });
    }

    bindCanvasEvents() {
        const canvas = document.querySelector('.canvas-container');
        if (!canvas) return;

        canvas.addEventListener('mousedown', (e) => this.startCanvasDrag(e));
        canvas.addEventListener('mousemove', (e) => this.canvasDrag(e));
        canvas.addEventListener('mouseup', () => this.stopCanvasDrag());
        canvas.addEventListener('mouseleave', () => this.stopCanvasDrag());
        
        // Обработка создания соединений
        canvas.addEventListener('mousedown', (e) => this.startConnection(e));
        canvas.addEventListener('mousemove', (e) => this.updateConnection(e));
        canvas.addEventListener('mouseup', (e) => this.finishConnection(e));
    }

    createSampleDialogue() {
        console.log('Создание примерного диалога');
        
        const startNode = this.addNode('diza_1', 100, 100);
        startNode.text = "Эй, Викинг!\nТы что, письма не ждёшь?";
        
        const jobNode = this.addNode('diza_to_center', 400, 100);
        jobNode.text = "Что я могу тебе предложить:";
        
        const shopNode = this.addNode('skuffiy', 400, 300);
        shopNode.text = "И люблю я чяй на правильной травке!\nИ торговать уже в радость!";
        
        // Добавляем опции
        this.addOptionToNode(startNode.id, "Говорящая рыба? Скинь плавник в личку");
        this.addOptionToNode(startNode.id, "Ну нахер...");
        const workOption = this.addOptionToNode(startNode.id, "До центра за сколько?");
        workOption.transition = jobNode.id;
        
        const shopOption = this.addOptionToNode(startNode.id, "Пусть шляпник подойдёт к телефону");
        shopOption.transition = shopNode.id;
        shopOption.color = "#ff9900";
        
        this.addOptionToNode(jobNode.id, "Лети, лети, лепесток,\nчерез запад и восток\nчерез север, через юг...\nПусть меня отпустит!");
        const farmOption = this.addOptionToNode(jobNode.id, "За 300 монет");
        farmOption.icon = "Hoe";
        
        this.addOptionToNode(shopNode.id, "Браво! Снимаю шляпу!");
        this.addOptionToNode(shopNode.id, "Нужно больше <color=#ff6666>правильной травки!</color>");
        
        this.renderNodes();
        this.updateTransitionsList();
        this.renderNodeOptionsList();
        
        console.log('Примерный диалог создан');
    }

    addNode(id = null, x = 200, y = 200) {
        const nodeId = id || `node_${Date.now()}`;
        const node = {
            id: nodeId,
            text: "Сюда писать слова NPC...",
            x: x,
            y: y,
            options: [],
            collapsed: false
        };
        
        this.nodes.set(nodeId, node);
        this.renderNodes();
        this.updateTransitionsList();
        return node;
    }

    addOptionToNode(nodeId, text = "New option") {
        const node = this.nodes.get(nodeId);
        if (!node) {
            console.error(`Узел с id ${nodeId} не найден`);
            return null;
        }
        
        const option = {
            id: `opt_${Date.now()}`,
            text: text,
            transition: "",
            commands: [],
            conditions: [],
            icon: "",
            color: "#ffffff"
        };
        
        node.options.push(option);
        this.renderNodes();
        this.renderNodeOptionsList();
        return option;
    }

    addOptionToSelectedNode() {
        if (!this.selectedNode) {
            alert('Сначала выберите диалог');
            return;
        }
        
        this.addOptionToNode(this.selectedNode, "New option");
    }

    renderNodes() {
        const container = document.getElementById('nodeContainer');
        if (!container) {
            console.error('Контейнер узлов не найден');
            return;
        }
        
        container.innerHTML = '';
        
        this.nodes.forEach((node, nodeId) => {
            const nodeElement = this.createNodeElement(node);
            container.appendChild(nodeElement);
        });
        
        this.updateConnections();
    }

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
        
        // Обрабатываем текст для отображения в узле
        const displayText = this.processTextForDisplay(node.text);
        const optionsHtml = node.options.map((option, index) => {
            const displayOptionText = this.processTextForDisplay(option.text);
            let transitionText = '';
            
            if (option.transition) {
                if (option.transition.startsWith('quest:')) {
                    transitionText = `→ [Квест] ${option.transition.substring(6)}`;
                } else if (option.transition.startsWith('ext:')) {
                    transitionText = `→ [Внешний] ${option.transition.substring(4)}`;
                } else {
                    transitionText = `→ ${option.transition}`;
                }
            }
            
            return `
                <div class="option ${this.selectedOption === option.id ? 'selected' : ''}" 
                     data-option-id="${option.id}">
                     <div class="option-connection-point" data-option-id="${option.id}"></div>
                     ${option.icon ? `<span class="option-icon" title="${option.icon}"></span>` : ''}
                     <span class="option-text">${index + 1}) ${displayOptionText}</span>
                     ${transitionText ? `<span class="option-transition">${transitionText}</span>` : ''}
                </div>
            `;
        }).join('');
        
        nodeDiv.innerHTML = `
            <div class="node-header">
                <button class="collapse-btn" data-node-id="${node.id}">
                    ${node.collapsed ? '+' : '−'}
                </button>
                <span class="node-header-text">[${this.escapeHtml(node.id)}]</span>
            </div>
            <div class="node-content">
                <div class="node-text">${displayText}</div>
                <div class="node-options">
                    ${optionsHtml}
                </div>
            </div>
        `;
        
        this.addNodeEventListeners(nodeDiv, node);
        return nodeDiv;
    }

    processTextForDisplay(text) {
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

    addNodeEventListeners(nodeElement, node) {
        // Выбор узла
        nodeElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('option') || e.target.classList.contains('option-connection-point')) {
                const optionId = e.target.getAttribute('data-option-id') || 
                                e.target.closest('.option').getAttribute('data-option-id');
                this.selectOption(node.id, optionId);
            } else if (!e.target.classList.contains('collapse-btn')) {
                this.selectNode(node.id);
            }
            e.stopPropagation();
        });

        // Кнопка сворачивания
        const collapseBtn = nodeElement.querySelector('.collapse-btn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNodeCollapse(node.id);
            });
        }

        // Перетаскивание узла
        let isDragging = false;
        let startX, startY, initialX, initialY;

        nodeElement.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('option') || e.target.classList.contains('option-connection-point') || e.target.classList.contains('collapse-btn')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = node.x;
            initialY = node.y;
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            
            e.preventDefault();
        });

        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const dx = (e.clientX - startX) / this.currentZoom;
            const dy = (e.clientY - startY) / this.currentZoom;
            
            node.x = initialX + dx;
            node.y = initialY + dy;
            
            this.renderNodes();
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }

    updateConnections() {
        const svg = document.getElementById('connectionLayer');
        if (!svg) return;
        
        // Сохраняем defs
        const defs = svg.querySelector('defs');
        svg.innerHTML = '';
        if (defs) {
            svg.appendChild(defs);
        }
        
        // Рисуем все соединения
        this.nodes.forEach((node) => {
            node.options.forEach((option) => {
                if (option.transition && !option.transition.startsWith('quest:') && !option.transition.startsWith('ext:')) {
                    const targetNode = this.nodes.get(option.transition);
                    if (targetNode) {
                        this.drawConnection(node, option, targetNode);
                    }
                }
            });
        });
    }

    drawConnection(fromNode, option, toNode) {
        const svg = document.getElementById('connectionLayer');
        if (!svg) return;
        
        // Находим элементы опции и целевого узла
        const optionElement = document.querySelector(`[data-option-id="${option.id}"]`);
        const toNodeElement = document.querySelector(`[data-node-id="${toNode.id}"]`);
        
        if (!optionElement || !toNodeElement) return;
        
        // Получаем координаты с учетом масштаба и смещения
        const optionRect = optionElement.getBoundingClientRect();
        const toNodeRect = toNodeElement.getBoundingClientRect();
        const canvasRect = document.querySelector('.canvas-container').getBoundingClientRect();
        
        // Начальная точка - середина правого края опции
        const startX = (optionRect.right - canvasRect.left);
        const startY = (optionRect.top + optionRect.height / 2 - canvasRect.top);
        
        // Конечная точка - середина левого края целевого узла
        const endX = (toNodeRect.left - canvasRect.left);
        const endY = (toNodeRect.top + toNodeRect.height / 2 - canvasRect.top);
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', endX);
        line.setAttribute('y2', endY);
        line.setAttribute('stroke', '#3498db');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        
        svg.appendChild(line);
    }

    startConnection(e) {
        if (!e.target.classList.contains('option-connection-point')) return;
        
        e.stopPropagation();
        this.isConnecting = true;
        this.connectionSource = {
            optionId: e.target.getAttribute('data-option-id'),
            nodeId: e.target.closest('.dialogue-node').getAttribute('data-node-id')
        };
        
        document.querySelector('.canvas-container').style.cursor = 'crosshair';
    }

    updateConnection(e) {
        if (!this.isConnecting) return;
        
        const svg = document.getElementById('connectionLayer');
        let tempLine = svg.querySelector('.temp-connection');
        
        if (!tempLine) {
            tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tempLine.classList.add('temp-connection');
            tempLine.setAttribute('stroke', '#f39c12');
            tempLine.setAttribute('stroke-width', '2');
            tempLine.setAttribute('stroke-dasharray', '5,5');
            svg.appendChild(tempLine);
        }
        
        const sourceOption = document.querySelector(`[data-option-id="${this.connectionSource.optionId}"]`);
        if (!sourceOption) return;
        
        const sourceRect = sourceOption.getBoundingClientRect();
        const canvasRect = document.querySelector('.canvas-container').getBoundingClientRect();
        
        const startX = (sourceRect.right - canvasRect.left);
        const startY = (sourceRect.top + sourceRect.height / 2 - canvasRect.top);
        const endX = e.clientX - canvasRect.left;
        const endY = e.clientY - canvasRect.top;
        
        tempLine.setAttribute('x1', startX);
        tempLine.setAttribute('y1', startY);
        tempLine.setAttribute('x2', endX);
        tempLine.setAttribute('y2', endY);
    }

    finishConnection(e) {
        if (!this.isConnecting) return;
        
        this.isConnecting = false;
        document.querySelector('.canvas-container').style.cursor = 'grab';
        
        // Удаляем временную линию
        const tempLine = document.querySelector('.temp-connection');
        if (tempLine) {
            tempLine.remove();
        }
        
        // Проверяем, был ли клик на узле
        const targetNode = e.target.closest('.dialogue-node');
        if (!targetNode || targetNode.getAttribute('data-node-id') === this.connectionSource.nodeId) return;
        
        const targetNodeId = targetNode.getAttribute('data-node-id');
        const sourceNode = this.nodes.get(this.connectionSource.nodeId);
        const option = sourceNode.options.find(opt => opt.id === this.connectionSource.optionId);
        
        if (option) {
            option.transition = targetNodeId;
            this.renderNodes();
            this.renderNodeOptionsList();
        }
        
        this.connectionSource = null;
    }

    toggleNodeCollapse(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.collapsed = !node.collapsed;
            this.renderNodes();
        }
    }

    selectNode(nodeId) {
        this.selectedNode = nodeId;
        this.selectedOption = null;
        this.showNodeProperties();
        this.renderNodes();
        this.renderNodeOptionsList();
    }

    selectOption(nodeId, optionId) {
        this.selectedNode = nodeId;
        this.selectedOption = optionId;
        this.showOptionProperties();
        this.renderNodes();
        this.renderNodeOptionsList();
    }

    showNodeProperties() {
        document.getElementById('nodeProperties').style.display = 'block';
        document.getElementById('optionProperties').style.display = 'none';
        
        const node = this.nodes.get(this.selectedNode);
        if (!node) return;
        
        document.getElementById('nodeId').value = node.id;
        document.getElementById('nodeText').value = node.text;
    }

    showOptionProperties() {
        document.getElementById('nodeProperties').style.display = 'none';
        document.getElementById('optionProperties').style.display = 'block';
        
        const node = this.nodes.get(this.selectedNode);
        if (!node || !this.selectedOption) return;
        
        const option = node.options.find(opt => opt.id === this.selectedOption);
        if (!option) return;
        
        document.getElementById('optionText').value = option.text;
        document.getElementById('optionIcon').value = option.icon;
        document.getElementById('optionColor').value = option.color || '#ffffff';
        
        // Определяем тип перехода и заполняем соответствующие поля
        if (option.transition) {
            if (option.transition.startsWith('quest:')) {
                document.getElementById('optionTransitionType').value = 'quest';
                document.getElementById('optionTransitionQuest').value = option.transition.substring(6);
                this.updateTransitionType('quest');
            } else if (option.transition.startsWith('ext:')) {
                document.getElementById('optionTransitionType').value = 'external';
                document.getElementById('optionTransitionExternal').value = option.transition.substring(4);
                this.updateTransitionType('external');
            } else {
                document.getElementById('optionTransitionType').value = 'node';
                document.getElementById('optionTransition').value = option.transition;
                this.updateTransitionType('node');
            }
        } else {
            document.getElementById('optionTransitionType').value = 'node';
            this.updateTransitionType('node');
        }
        
        this.renderConditionsList(option.conditions);
        this.renderCommandsList(option.commands);
    }

    updateTransitionType(type) {
        document.getElementById('transitionNodeGroup').style.display = type === 'node' ? 'block' : 'none';
        document.getElementById('transitionQuestGroup').style.display = type === 'quest' ? 'block' : 'none';
        document.getElementById('transitionExternalGroup').style.display = type === 'external' ? 'block' : 'none';
        
        if (type === 'quest') {
            this.updateQuestTransitionsList();
        }
    }

    updateTransitionsList() {
        const select = document.getElementById('optionTransition');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Нет --</option>';
        
        this.nodes.forEach((node, nodeId) => {
            if (nodeId !== this.selectedNode) {
                const option = document.createElement('option');
                option.value = nodeId;
                option.textContent = nodeId;
                select.appendChild(option);
            }
        });
    }

    updateQuestTransitionsList() {
        const select = document.getElementById('optionTransitionQuest');
        if (!select || !this.questEditor) return;
        
        select.innerHTML = '<option value="">-- Нет --</option>';
        
        this.questEditor.quests.forEach((quest, questId) => {
            const option = document.createElement('option');
            option.value = questId;
            option.textContent = quest.name || questId;
            select.appendChild(option);
        });
    }

    renderNodeOptionsList() {
        const container = document.getElementById('nodeOptionsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        const node = this.nodes.get(this.selectedNode);
        if (!node) return;
        
        node.options.forEach((option, index) => {
            const div = document.createElement('div');
            div.className = `option-list-item ${this.selectedOption === option.id ? 'selected' : ''}`;
            div.setAttribute('data-option-id', option.id);
            
            const displayText = option.text.length > 50 ? option.text.substring(0, 47) + '...' : option.text;
            
            div.innerHTML = `
                <div class="option-list-text">${index + 1}) ${this.escapeHtml(displayText)}</div>
                <div class="option-list-buttons">
                    <button class="option-list-btn edit-option" title="Редактировать">✎</button>
                    <button class="option-list-btn delete-option" title="Удалить">×</button>
                </div>
            `;
            
            container.appendChild(div);
            
            // Обработчики для кнопок
            div.querySelector('.edit-option').addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectOption(node.id, option.id);
            });
            
            div.querySelector('.delete-option').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteOption(node.id, option.id);
            });
            
            div.addEventListener('click', () => {
                this.selectOption(node.id, option.id);
            });
        });
    }

    deleteOption(nodeId, optionId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        node.options = node.options.filter(opt => opt.id !== optionId);
        
        if (this.selectedOption === optionId) {
            this.selectedOption = null;
            this.showNodeProperties();
        }
        
        this.renderNodes();
        this.renderNodeOptionsList();
    }

    updateNodeProperty(property, value) {
        const node = this.nodes.get(this.selectedNode);
        if (!node) return;
        
        if (property === 'id') {
            if (value && value !== node.id && !this.nodes.has(value)) {
                this.nodes.delete(node.id);
                node.id = value;
                this.nodes.set(value, node);
                this.selectedNode = value;
            }
        } else {
            node[property] = value;
        }
        
        this.renderNodes();
        this.updateTransitionsList();
    }

    updateOptionProperty(property, value) {
        const node = this.nodes.get(this.selectedNode);
        if (!node || !this.selectedOption) return;
        
        const option = node.options.find(opt => opt.id === this.selectedOption);
        if (!option) return;
        
        if (property === 'transition') {
            // Удаляем старые префиксы если есть
            const transitionType = document.getElementById('optionTransitionType').value;
            if (transitionType === 'quest') {
                option.transition = value ? `quest:${value}` : '';
            } else if (transitionType === 'external') {
                option.transition = value ? `ext:${value}` : '';
            } else {
                option.transition = value;
            }
        } else {
            option[property] = value;
        }
        
        this.renderNodes();
        this.renderNodeOptionsList();
    }

    // Методы для перетаскивания холста
    startCanvasDrag(e) {
        if (e.target.closest('.dialogue-node') || e.target.classList.contains('option-connection-point')) return;
        this.isCanvasDragging = true;
        this.canvasStartPos = { x: e.clientX - this.canvasOffset.x, y: e.clientY - this.canvasOffset.y };
        document.querySelector('.canvas-container').style.cursor = 'grabbing';
    }

    canvasDrag(e) {
        if (!this.isCanvasDragging) return;
        this.canvasOffset.x = e.clientX - this.canvasStartPos.x;
        this.canvasOffset.y = e.clientY - this.canvasStartPos.y;
        this.applyCanvasTransform();
    }

    stopCanvasDrag() {
        this.isCanvasDragging = false;
        document.querySelector('.canvas-container').style.cursor = 'grab';
    }

    applyCanvasTransform() {
        const container = document.querySelector('.node-container');
        if (container) {
            container.style.transform = `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.currentZoom})`;
        }
        this.updateConnections();
    }

    zoom(delta) {
        this.currentZoom = Math.max(0.1, Math.min(3, this.currentZoom + delta));
        this.applyCanvasTransform();
    }

    fitToScreen() {
        this.currentZoom = 1;
        this.canvasOffset = { x: 0, y: 0 };
        this.applyCanvasTransform();
    }

    // Вспомогательные методы
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Заглушки для методов, которые будут реализованы позже
    showPreview() {
        alert('Предпросмотр будет реализован в следующей версии');
    }

    exportCfg() {
        alert('Экспорт будет реализован в следующей версии');
    }

    validateDialogue() {
        alert('Валидация будет реализована в следующей версии');
    }

    handleDialogueFileImport(e) {
        alert('Импорт диалогов будет реализован в следующей версии');
    }

    searchDialogue(query) {
        // Базовая реализация поиска
        this.nodes.forEach((node, nodeId) => {
            const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (nodeElement) {
                const matches = nodeId.toLowerCase().includes(query.toLowerCase()) ||
                               node.text.toLowerCase().includes(query.toLowerCase()) ||
                               node.options.some(opt => opt.text.toLowerCase().includes(query.toLowerCase()));
                nodeElement.style.opacity = matches ? '1' : '0.3';
            }
        });
    }

    deleteSelected() {
        if (this.selectedOption) {
            this.deleteOption(this.selectedNode, this.selectedOption);
        } else if (this.selectedNode) {
            // Удаляем все ссылки на этот узел
            this.nodes.forEach(otherNode => {
                otherNode.options.forEach(option => {
                    if (option.transition === this.selectedNode) {
                        option.transition = '';
                    }
                });
            });
            
            this.nodes.delete(this.selectedNode);
            this.selectedNode = null;
            this.renderNodes();
            this.renderNodeOptionsList();
        }
    }

    showConditionModal() {
        alert('Редактор условий будет реализован в следующей версии');
    }

    showCommandModal() {
        alert('Редактор команд будет реализован в следующей версии');
    }

    renderConditionsList(conditions) {
        const container = document.getElementById('conditionsList');
        if (container) {
            container.innerHTML = conditions.length ? 'Условия будут отображены здесь' : 'Нет условий';
        }
    }

    renderCommandsList(commands) {
        const container = document.getElementById('commandsList');
        if (container) {
            container.innerHTML = commands.length ? 'Команды будут отображены здесь' : 'Нет команд';
        }
    }
}
