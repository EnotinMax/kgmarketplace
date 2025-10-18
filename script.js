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
        
        // Кнопка добавления опции в панели узла
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
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Закрытие при клике вне окна
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
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
    }

    createSampleDialogue() {
        console.log('Создание примерного диалога');
        
        const startNode = this.addNode('default', 100, 100);
        startNode.text = "Welcome to the village!\nHow can I help you today?";
        
        const jobNode = this.addNode('JobOptions', 400, 100);
        jobNode.text = "Available job options:";
        
        const shopNode = this.addNode('Shop', 400, 300);
        shopNode.text = "Welcome to my shop!";
        
        // Добавляем опции
        this.addOptionToNode(startNode.id, "Hello there! What brings you to our peaceful village?");
        this.addOptionToNode(startNode.id, "How can I assist you today?");
        const workOption = this.addOptionToNode(startNode.id, "I'm looking for work");
        workOption.transition = jobNode.id;
        
        const shopOption = this.addOptionToNode(startNode.id, "I want to browse your shop");
        shopOption.transition = shopNode.id;
        shopOption.color = "#ff9900";
        
        this.addOptionToNode(jobNode.id, "We have various job opportunities available. What type of work are you interested in?");
        const farmOption = this.addOptionToNode(jobNode.id, "Farming");
        farmOption.icon = "Hoe";
        farmOption.conditions.push({ type: "HasItem", params: ["Hoe", "1"] });
        
        this.addOptionToNode(shopNode.id, "Show me your weapons");
        this.addOptionToNode(shopNode.id, "I need some supplies");
        
        this.renderNodes();
        this.updateTransitionsList();
        
        console.log('Примерный диалог создан');
    }

    addNode(id = null, x = 200, y = 200) {
        const nodeId = id || `node_${Date.now()}`;
        const node = {
            id: nodeId,
            text: "Enter NPC text here...",
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
        
        this.addOptionToNode(this.selectedNode, "Новая опция");
    }

    renderNodes() {
        const container = document.getElementById('nodeContainer');
        if (!container) {
            console.error('Контейнер узлов не найден');
            return;
        }
        
        container.innerHTML = '';
        document.getElementById('connectionLayer').innerHTML = '<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#3498db"/></marker></defs>';
        
        this.nodes.forEach((node, nodeId) => {
            const nodeElement = this.createNodeElement(node);
            container.appendChild(nodeElement);
            
            // Рисуем соединения
            node.options.forEach(option => {
                if (option.transition && this.nodes.has(option.transition)) {
                    this.drawConnection(node, option);
                }
            });
        });
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
                <span class="node-header-text">[${this.escapeHtml(node.id)}]</span>
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

    addNodeEventListeners(nodeElement, node) {
        // Выбор узла
        nodeElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('option')) {
                const optionId = e.target.getAttribute('data-option-id');
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
            if (e.target.classList.contains('option') || e.target.classList.contains('collapse-btn')) return;
            
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
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
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

    toggleNodeCollapse(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.collapsed = !node.collapsed;
            this.renderNodes();
        }
    }

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
        const fromX = fromRect.left - canvasRect.left + fromRect.width;
        const fromY = fromRect.top - canvasRect.top + fromRect.height / 2;
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
    }

    showNodeProperties() {
        document.getElementById('nodeProperties').style.display = 'block';
        document.getElementById('optionProperties').style.display = 'none';
        
        const node = this.nodes.get(this.selectedNode);
        if (!node) return;
        
        document.getElementById('nodeId').value = node.id;
        document.getElementById('nodeText').value = node.text;
        
        this.renderNodeOptionsList();
    }

    renderNodeOptionsList() {
        const container = document.getElementById('nodeOptionsList');
        if (!container) return;
        
        const node = this.nodes.get(this.selectedNode);
        if (!node) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = '';
        
        node.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option-editor-item';
            optionElement.innerHTML = `
                <div class="option-editor-header">
                    <span class="option-editor-title">Опция ${index + 1}</span>
                    <div class="option-editor-controls">
                        <button class="option-editor-btn edit" data-option-id="${option.id}">✏️</button>
                        <button class="option-editor-btn delete" data-option-id="${option.id}">🗑️</button>
                    </div>
                </div>
                <div class="option-text-preview">${this.processTextForDisplay(option.text)}</div>
                ${option.transition ? `<div class="option-transition-preview">→ ${option.transition}</div>` : ''}
            `;
            
            container.appendChild(optionElement);
            
            // Обработчики для кнопок редактирования и удаления
            const editBtn = optionElement.querySelector('.edit');
            const deleteBtn = optionElement.querySelector('.delete');
            
            editBtn.addEventListener('click', () => {
                this.selectOption(this.selectedNode, option.id);
            });
            
            deleteBtn.addEventListener('click', () => {
                this.deleteOption(this.selectedNode, option.id);
            });
        });
    }

    deleteOption(nodeId, optionId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        node.options = node.options.filter(opt => opt.id !== optionId);
        
        if (this.selectedOption === optionId) {
            this.selectedOption = null;
        }
        
        this.renderNodes();
        this.renderNodeOptionsList();
    }

    showOptionProperties() {
        document.getElementById('nodeProperties').style.display = 'none';
        document.getElementById('optionProperties').style.display = 'block';
        
        const node = this.nodes.get(this.selectedNode);
        if (!node || !this.selectedOption) return;
        
        const option = node.options.find(opt => opt.id === this.selectedOption);
        if (!option) return;
        
        document.getElementById('optionText').value = option.text;
        document.getElementById('optionTransition').value = option.transition;
        document.getElementById('optionIcon').value = option.icon;
        document.getElementById('optionColor').value = option.color || '#ffffff';
        
        this.renderConditionsList(option.conditions);
        this.renderCommandsList(option.commands);
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
        this.renderNodeOptionsList();
    }

    updateOptionProperty(property, value) {
        const node = this.nodes.get(this.selectedNode);
        if (!node || !this.selectedOption) return;
        
        const option = node.options.find(opt => opt.id === this.selectedOption);
        if (!option) return;
        
        option[property] = value;
        this.renderNodes();
        this.renderNodeOptionsList();
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

    showConditionModal() {
        document.getElementById('conditionModal').style.display = 'block';
        this.updateConditionParams();
    }

    showCommandModal() {
        document.getElementById('commandModal').style.display = 'block';
        this.updateCommandParams();
    }

    updateConditionParams() {
        const type = document.getElementById('conditionType').value;
        const paramsContainer = document.getElementById('conditionParams');
        if (!paramsContainer) return;
        
        paramsContainer.innerHTML = '';
        
        const paramTemplates = {
            'HasItem': ['ItemPrefab', 'Amount', 'ItemLevel'],
            'NotHasItem': ['ItemPrefab', 'Amount', 'ItemLevel'],
            'SkillMore': ['SkillName', 'MinLevel'],
            'QuestFinished': ['QuestName']
        };
        
        const params = paramTemplates[type] || [];
        params.forEach((paramName, index) => {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label>${paramName}:</label>
                <input type="text" class="form-control condition-param" 
                       data-param-index="${index}" placeholder="${paramName}">
            `;
            paramsContainer.appendChild(div);
        });
    }

    updateCommandParams() {
        const type = document.getElementById('commandType').value;
        const paramsContainer = document.getElementById('commandParams');
        if (!paramsContainer) return;
        
        paramsContainer.innerHTML = '';
        
        const paramTemplates = {
            'GiveItem': ['ItemPrefab', 'Amount', 'Level'],
            'RemoveItem': ['ItemPrefab', 'Amount'],
            'GiveQuest': ['QuestName'],
            'FinishQuest': ['QuestID']
        };
        
        const params = paramTemplates[type] || [];
        params.forEach((paramName, index) => {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label>${paramName}:</label>
                <input type="text" class="form-control command-param" 
                       data-param-index="${index}" placeholder="${paramName}">
            `;
            paramsContainer.appendChild(div);
        });
    }

    saveCondition() {
        const node = this.nodes.get(this.selectedNode);
        if (!node || !this.selectedOption) return;
        
        const option = node.options.find(opt => opt.id === this.selectedOption);
        if (!option) return;
        
        const type = document.getElementById('conditionType').value;
        const paramInputs = document.querySelectorAll('.condition-param');
        const params = Array.from(paramInputs).map(input => input.value).filter(val => val);
        
        option.conditions.push({ type, params });
        this.renderConditionsList(option.conditions);
        document.getElementById('conditionModal').style.display = 'none';
    }

    saveCommand() {
        const node = this.nodes.get(this.selectedNode);
        if (!node || !this.selectedOption) return;
        
        const option = node.options.find(opt => opt.id === this.selectedOption);
        if (!option) return;
        
        const type = document.getElementById('commandType').value;
        const paramInputs = document.querySelectorAll('.command-param');
        const params = Array.from(paramInputs).map(input => input.value).filter(val => val);
        
        option.commands.push({ type, params });
        this.renderCommandsList(option.commands);
        document.getElementById('commandModal').style.display = 'none';
    }

    renderConditionsList(conditions) {
        const container = document.getElementById('conditionsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        conditions.forEach((condition, index) => {
            const div = document.createElement('div');
            div.className = 'condition-item';
            div.innerHTML = `
                <span>${condition.type}(${condition.params.join(', ')})</span>
                <button onclick="editor.removeCondition(${index})">×</button>
            `;
            container.appendChild(div);
        });
    }

    renderCommandsList(commands) {
        const container = document.getElementById('commandsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        commands.forEach((command, index) => {
            const div = document.createElement('div');
            div.className = 'command-item';
            div.innerHTML = `
                <span>${command.type}(${command.params.join(', ')})</span>
                <button onclick="editor.removeCommand(${index})">×</button>
            `;
            container.appendChild(div);
        });
    }

    removeCondition(index) {
        const node = this.nodes.get(this.selectedNode);
        if (!node || !this.selectedOption) return;
        
        const option = node.options.find(opt => opt.id === this.selectedOption);
        if (!option) return;
        
        option.conditions.splice(index, 1);
        this.renderConditionsList(option.conditions);
    }

    removeCommand(index) {
        const node = this.nodes.get(this.selectedNode);
        if (!node || !this.selectedOption) return;
        
        const option = node.options.find(opt => opt.id === this.selectedOption);
        if (!option) return;
        
        option.commands.splice(index, 1);
        this.renderCommandsList(option.commands);
    }

    showPreview() {
        if (!this.selectedNode) {
            alert('Выберите диалог для предпросмотра');
            return;
        }
        
        const modal = document.getElementById('previewModal');
        const content = document.getElementById('previewContent');
        
        // Сбрасываем историю и начинаем с выбранного узла
        this.previewHistory = [this.selectedNode];
        this.updatePreview(content, this.selectedNode);
        modal.style.display = 'block';
    }

    updatePreview(content, nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        content.innerHTML = this.generatePreview(node);
        this.attachPreviewEventHandlers(content);
    }

    generatePreview(node) {
        // Обрабатываем переносы строк и теги цвета
        const processedText = this.processTextForPreview(node.text);
        
        let html = `
            <div class="preview-navigation">
                <div class="preview-current-node">[${this.escapeHtml(node.id)}]</div>
                ${this.previewHistory.length > 1 ? 
                    `<button class="preview-back-btn" onclick="editor.previewBack()">← Назад</button>` : 
                    `<div></div>`
                }
            </div>
            <div class="preview-npc-text">${processedText}</div>
            <div class="preview-options">
        `;
        
        node.options.forEach((option, index) => {
            const processedOptionText = this.processTextForPreview(option.text);
            const colorStyle = option.color && option.color !== '#ffffff' ? `style="color: ${option.color}"` : '';
            const transitionClass = option.transition ? 'has-transition' : '';
            const transitionData = option.transition ? `data-transition="${option.transition}"` : '';
            
            html += `
                <div class="preview-option ${transitionClass}" ${transitionData}>
                    ${option.icon ? `<div class="preview-option-icon" title="${option.icon}"></div>` : ''}
                    <span class="preview-option-number">${index + 1})</span>
                    <span class="preview-option-text" ${colorStyle}>${processedOptionText}</span>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    attachPreviewEventHandlers(content) {
        const optionsWithTransition = content.querySelectorAll('.preview-option.has-transition');
        optionsWithTransition.forEach(option => {
            option.addEventListener('click', () => {
                const transitionNodeId = option.getAttribute('data-transition');
                if (transitionNodeId && this.nodes.has(transitionNodeId)) {
                    this.previewHistory.push(transitionNodeId);
                    this.updatePreview(content, transitionNodeId);
                }
            });
        });
    }

    previewBack() {
        if (this.previewHistory.length > 1) {
            this.previewHistory.pop(); // Убираем текущий узел
            const previousNodeId = this.previewHistory[this.previewHistory.length - 1];
            const content = document.getElementById('previewContent');
            this.updatePreview(content, previousNodeId);
        }
    }

    // Метод для отображения текста в редакторе (с интерпретацией)
    processTextForDisplay(text) {
        if (!text) return '';
        
        // Обрабатываем теги <color>
        let processed = text.replace(/<color=([^>]+)>([^<]*)<\/color>/g, 
            '<span style="color: $1">$2</span>');
        
        // Также поддерживаем формат <color=#hex>text</color>
        processed = processed.replace(/<color=#([0-9a-fA-F]{6})>([^<]*)<\/color>/g,
            '<span style="color: #$1">$2</span>');
        
        return processed;
    }

    // Метод для предпросмотра
    processTextForPreview(text) {
        if (!text) return '';
        
        // Обрабатываем теги <color>
        let processed = text.replace(/<color=([^>]+)>([^<]*)<\/color>/g, 
            '<span style="color: $1">$2</span>');
        
        // Также поддерживаем формат <color=#hex>text</color>
        processed = processed.replace(/<color=#([0-9a-fA-F]{6})>([^<]*)<\/color>/g,
            '<span style="color: #$1">$2</span>');
        
        return processed;
    }

    exportCfg() {
        let cfgContent = '';
        
        this.nodes.forEach(node => {
            cfgContent += `[${node.id}]\n`;
            cfgContent += `${node.text}\n`;
            
            node.options.forEach(option => {
                let line = `Text: ${option.text}`;
                
                if (option.transition) {
                    line += ` | Transition: ${option.transition}`;
                }
                
                option.commands.forEach(cmd => {
                    line += ` | Command: ${cmd.type}`;
                    cmd.params.forEach(param => {
                        line += `, ${param}`;
                    });
                });
                
                option.conditions.forEach(condition => {
                    line += ` | Condition: ${condition.type}`;
                    condition.params.forEach(param => {
                        line += `, ${param}`;
                    });
                });
                
                if (option.icon) {
                    line += ` | Icon: ${option.icon}`;
                }
                
                if (option.color && option.color !== '#ffffff') {
                    const rgb = this.hexToRgb(option.color);
                    if (rgb) {
                        line += ` | Color: ${rgb.r}, ${rgb.g}, ${rgb.b}`;
                    }
                }
                
                cfgContent += `${line}\n`;
            });
            
            cfgContent += '\n';
        });
        
        this.downloadFile('dialogue.cfg', cfgContent);
    }

    handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            this.parseCfgFile(event.target.result);
        };
        reader.readAsText(file);
        
        // Сбрасываем значение input, чтобы можно было выбрать тот же файл снова
        e.target.value = '';
    }

    parseCfgFile(content) {
        this.nodes.clear();
        const lines = content.split('\n');
        let currentNode = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('[') && line.endsWith(']')) {
                const nodeId = line.slice(1, -1);
                currentNode = this.addNode(nodeId, Math.random() * 500, Math.random() * 300);
                i++;
                if (i < lines.length) {
                    currentNode.text = lines[i].trim();
                }
            } else if (line.startsWith('Text:') && currentNode) {
                this.parseOptionLine(currentNode, line);
            }
        }
        
        this.renderNodes();
        this.updateTransitionsList();
    }

    parseOptionLine(node, line) {
        const parts = line.split('|').map(part => part.trim());
        const textPart = parts.find(part => part.startsWith('Text:'));
        
        if (!textPart) return;
        
        const option = this.addOptionToNode(node.id, textPart.substring(5).trim());
        if (!option) return;
        
        parts.forEach(part => {
            if (part.startsWith('Transition:')) {
                option.transition = part.substring(11).trim();
            } else if (part.startsWith('Icon:')) {
                option.icon = part.substring(5).trim();
            } else if (part.startsWith('Color:')) {
                option.color = part.substring(6).trim();
            } else if (part.startsWith('Condition:')) {
                this.parseCondition(option, part.substring(10).trim());
            } else if (part.startsWith('Command:')) {
                this.parseCommand(option, part.substring(8).trim());
            }
        });
    }

    parseCondition(option, conditionStr) {
        const parts = conditionStr.split(',').map(part => part.trim());
        const type = parts[0];
        const params = parts.slice(1);
        
        option.conditions.push({ type, params });
    }

    parseCommand(option, commandStr) {
        const parts = commandStr.split(',').map(part => part.trim());
        const type = parts[0];
        const params = parts.slice(1);
        
        option.commands.push({ type, params });
    }

    validateDialogue() {
        const errors = [];
        
        this.nodes.forEach((node, nodeId) => {
            if (!node.text || node.text.trim() === '') {
                errors.push(`Узел "${nodeId}": отсутствует текст NPC`);
            }
            
            node.options.forEach((option, index) => {
                if (!option.text || option.text.trim() === '') {
                    errors.push(`Узел "${nodeId}", опция ${index + 1}: отсутствует текст`);
                }
                
                if (option.transition && !this.nodes.has(option.transition)) {
                    errors.push(`Узел "${nodeId}", опция ${index + 1}: переход ведет к несуществующему узлу "${option.transition}"`);
                }
            });
        });
        
        if (errors.length === 0) {
            alert('Диалог проверен успешно! Ошибок не найдено.');
        } else {
            alert('Найдены ошибки:\n' + errors.join('\n'));
        }
    }

    searchDialogue(query) {
        if (!query.trim()) {
            this.renderNodes();
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        this.nodes.forEach((node, nodeId) => {
            const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (!nodeElement) return;
            
            const matches = 
                nodeId.toLowerCase().includes(lowerQuery) ||
                node.text.toLowerCase().includes(lowerQuery) ||
                node.options.some(opt => opt.text.toLowerCase().includes(lowerQuery));
            
            nodeElement.style.opacity = matches ? '1' : '0.3';
        });
    }

    deleteSelected() {
        if (this.selectedOption) {
            const node = this.nodes.get(this.selectedNode);
            if (node) {
                node.options = node.options.filter(opt => opt.id !== this.selectedOption);
                this.selectedOption = null;
                this.renderNodes();
                this.renderNodeOptionsList();
                document.getElementById('optionProperties').style.display = 'none';
            }
        } else if (this.selectedNode) {
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
            document.getElementById('nodeProperties').style.display = 'block';
        }
    }

    // Методы для перетаскивания холста
    startCanvasDrag(e) {
        if (e.target.closest('.dialogue-node')) return;
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
        container.style.transform = `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.currentZoom})`;
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

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
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
