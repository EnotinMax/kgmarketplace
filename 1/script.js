// Основной класс редактора диалогов
class DialogueEditor {
    constructor() {
        this.nodes = new Map();
        this.quests = new Map();
        this.selectedNode = null;
        this.selectedOption = null;
        this.selectedQuest = null;
        this.currentZoom = 1;
        this.canvasOffset = { x: 0, y: 0 };
        this.isCanvasDragging = false;
        this.canvasStartPos = { x: 0, y: 0 };
        this.previewHistory = [];
        this.currentPreviewNode = null;
        
        console.log('DialogueEditor инициализирован');
        this.initializeEventListeners();
        this.createSampleDialogue();
        this.createSampleQuest();
    }

    initializeEventListeners() {
        console.log('Инициализация обработчиков событий');
        
        // Основные кнопки
        this.bindButton('addNodeBtn', () => this.addNode());
        this.bindButton('addOptionBtn', () => this.addOption());
        this.bindButton('deleteBtn', () => this.deleteSelected());
        this.bindButton('previewBtn', () => this.showPreview());
        this.bindButton('exportBtn', () => this.exportCfg());
        this.bindButton('importDialogueBtn', () => document.getElementById('dialogueFileInput').click());
        this.bindButton('importQuestBtn', () => document.getElementById('questFileInput').click());
        this.bindButton('questsBtn', () => this.showQuestsModal());
        this.bindButton('validateBtn', () => this.validateDialogue());
        this.bindButton('addNodeOptionBtn', () => this.addOptionToSelectedNode());
        this.bindButton('addQuestBtn', () => this.addQuest());
        
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
        
        // Файловые inputs
        this.bindInput('dialogueFileInput', (e) => this.handleDialogueFileImport(e));
        this.bindInput('questFileInput', (e) => this.handleQuestFileImport(e));
        
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
    }

    createSampleDialogue() {
        console.log('Создание примерного диалога');
        
        const startNode = this.addNode('default', 100, 100);
        startNode.text = "Эй, Викинг!\nТы что, псиьма не ждёшь?";
        
        const jobNode = this.addNode('JobOptions', 400, 100);
        jobNode.text = "Что я могу тебе предложить:";
        
        const shopNode = this.addNode('Shop', 400, 300);
        shopNode.text = "И люблю я чяй на правильной травке!\nИ торговать уже в радость!";
        
        // Добавляем опции
        this.addOptionToNode(startNode.id, "Говорящая рыба?");
        this.addOptionToNode(startNode.id, "Ну нахер...");
        const workOption = this.addOptionToNode(startNode.id, "До центра за сколько?");
        workOption.transition = jobNode.id;
        
        const shopOption = this.addOptionToNode(startNode.id, "Пусть шляпник подойдёт к телефону");
        shopOption.transition = shopNode.id;
        shopOption.color = "#ff9900";
        
        this.addOptionToNode(jobNode.id, "Лети, лети, лепесток,\n через запад и восток \n через север, через юг...\n Пусть меня отпустит!");
        const farmOption = this.addOptionToNode(jobNode.id, "За 300 монет");
        farmOption.icon = "Hoe";
        farmOption.conditions.push({ type: "HasItem", params: ["Hoe", "1"] });
        
        this.addOptionToNode(shopNode.id, "Скинь плавник");
        this.addOptionToNode(shopNode.id, "Нужно<color=#ff6666>больше яблок!</color>");
        
        this.renderNodes();
        this.updateTransitionsList();
        this.renderNodeOptionsList();
        
        console.log('Примерный диалог создан');
    }

    createSampleQuest() {
        console.log('Создание примерного квеста');
        
        const quest = {
            id: 'MyTestQuest1',
            type: 'Kill',
            name: 'Список покупок',
            description: 'Надо бы сходит в магаз. Вот, что мне нужно купить:',
            targets: [
                { prefab: 'Wolf', amount: '10', level: '' },
                { prefab: 'Skeleton', amount: '5', level: '' }
            ],
            rewards: [
                { type: 'Item', prefab: 'SwordIron', amount: '1', level: '3' },
                { type: 'Item', prefab: 'Coins', amount: '100', level: '' }
            ],
            cooldown: '10',
            timeLimit: '1800',
            requirements: [],
            autocomplete: false
        };
        
        this.quests.set(quest.id, quest);
        this.renderQuestsList();
        
        console.log('Примерный квест создан');
    }

    addNode(id = null, x = 200, y = 200) {
        const nodeId = id || `node_${Date.now()}`;
        const node = {
            id: nodeId,
            text: "это будет говорить NPC",
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

    addOptionToNode(nodeId, text = "Новая опция") {
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

    addQuest() {
        const questId = `Quest_${Date.now()}`;
        const quest = {
            id: questId,
            type: 'Kill',
            name: 'Новый квнст',
            description: 'Описание квеста',
            targets: [],
            rewards: [],
            cooldown: '',
            timeLimit: '',
            requirements: [],
            autocomplete: false
        };
        
        this.quests.set(questId, quest);
        this.selectedQuest = questId;
        this.renderQuestsList();
        this.renderQuestEditor();
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
        
        // Обрабатываем текст для отображения в узле
        const displayText = this.processTextForDisplay(node.text);
        const optionsHtml = node.options.map((option, index) => {
            const displayOptionText = this.processTextForDisplay(option.text);
            const transitionText = option.transition ? `→ ${option.transition}` : '';
            return `
                <div class="option ${this.selectedOption === option.id ? 'selected' : ''}" 
                     data-option-id="${option.id}">
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
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        
        // Начало стрелки из центра правой границы узла
        const fromX = fromNode.x + 200;
        const fromY = fromNode.y + (fromNode.collapsed ? 25 : 75);
        
        // Конец стрелки в центр левой границы целевого узла
        const toX = toNode.x;
        const toY = toNode.y + (toNode.collapsed ? 25 : 50);
        
        line.setAttribute('x1', fromX);
        line.setAttribute('y1', fromY);
        line.setAttribute('x2', toX);
        line.setAttribute('y2', toY);
        line.setAttribute('stroke', '#3498db');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        
        svg.appendChild(line);
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
        document.getElementById('optionTransition').value = option.transition;
        document.getElementById('optionIcon').value = option.icon;
        document.getElementById('optionColor').value = option.color || '#ffffff';
        
        this.renderConditionsList(option.conditions);
        this.renderCommandsList(option.commands);
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

    showQuestsModal() {
        document.getElementById('questsModal').style.display = 'block';
        this.renderQuestsList();
        
        if (this.selectedQuest) {
            this.renderQuestEditor();
        } else {
            document.getElementById('questEditor').innerHTML = `
                <div class="no-quest-selected">
                    <p>Выберите квест для редактирования</p>
                </div>
            `;
        }
    }

    renderQuestsList() {
        const container = document.getElementById('questsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.quests.forEach((quest, questId) => {
            const div = document.createElement('div');
            div.className = `quest-item ${this.selectedQuest === questId ? 'selected' : ''}`;
            div.setAttribute('data-quest-id', questId);
            
            div.innerHTML = `
                <div class="quest-item-name">${this.escapeHtml(quest.name)}</div>
                <div class="quest-item-id">${quest.id}</div>
            `;
            
            div.addEventListener('click', () => {
                this.selectQuest(questId);
            });
            
            container.appendChild(div);
        });
    }

    selectQuest(questId) {
        this.selectedQuest = questId;
        this.renderQuestsList();
        this.renderQuestEditor();
    }

    renderQuestEditor() {
        const container = document.getElementById('questEditor');
        if (!container || !this.selectedQuest) return;
        
        const quest = this.quests.get(this.selectedQuest);
        if (!quest) return;
        
        const targetsHtml = quest.targets.map((target, index) => `
            <div class="quest-target-item">
                <span>${target.prefab} x${target.amount}${target.level ? ` (уровень ${target.level})` : ''}</span>
                <button onclick="editor.deleteQuestTarget(${index})">×</button>
            </div>
        `).join('');
        
        const rewardsHtml = quest.rewards.map((reward, index) => `
            <div class="quest-reward-item">
                <span>${reward.type}: ${reward.prefab} x${reward.amount}${reward.level ? ` (уровень ${reward.level})` : ''}</span>
                <button onclick="editor.deleteQuestReward(${index})">×</button>
            </div>
        `).join('');
        
        const requirementsHtml = quest.requirements.map((req, index) => `
            <div class="quest-requirement-item">
                <span>${req.type}${req.params.length > 0 ? `: ${req.params.join(', ')}` : ''}</span>
                <button onclick="editor.deleteQuestRequirement(${index})">×</button>
            </div>
        `).join('');
        
        container.innerHTML = `
            <div class="quest-form">
                <div class="quest-form-section">
                    <h4>Основная информация</h4>
                    <div class="form-group">
                        <label>ID квеста:</label>
                        <input type="text" class="form-control quest-id" value="${this.escapeHtml(quest.id)}" onchange="editor.updateQuestProperty('id', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Тип квеста:</label>
                        <select class="form-control quest-type" onchange="editor.updateQuestProperty('type', this.value)">
                            <option value="Kill" ${quest.type === 'Kill' ? 'selected' : ''}>Убить</option>
                            <option value="Collect" ${quest.type === 'Collect' ? 'selected' : ''}>Собрать</option>
                            <option value="Harvest" ${quest.type === 'Harvest' ? 'selected' : ''}>Принести</option>
                            <option value="Craft" ${quest.type === 'Craft' ? 'selected' : ''}>Создать</option>
                            <option value="Talk" ${quest.type === 'Talk' ? 'selected' : ''}>Поговорить с</option>
                            <option value="Build" ${quest.type === 'Build' ? 'selected' : ''}>Посмтроить</option>
                            <option value="Move" ${quest.type === 'Move' ? 'selected' : ''}>Переместить</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Название:</label>
                        <input type="text" class="form-control quest-name" value="${this.escapeHtml(quest.name)}" onchange="editor.updateQuestProperty('name', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Описание:</label>
                        <textarea class="form-control quest-description" rows="3" onchange="editor.updateQuestProperty('description', this.value)">${this.escapeHtml(quest.description)}</textarea>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" class="quest-autocomplete" ${quest.autocomplete ? 'checked' : ''} onchange="editor.updateQuestProperty('autocomplete', this.checked)">
                            Автозавершение
                        </label>
                    </div>
                </div>
                
                <div class="quest-form-section">
                    <h4>Цели квеста</h4>
                    <div class="quest-targets">
                        ${targetsHtml || '<p>Нет целей</p>'}
                    </div>
                    <button class="btn-small" onclick="editor.showAddQuestTargetModal()">+ Добавить цель</button>
                </div>
                
                <div class="quest-form-section">
                    <h4>Награды</h4>
                    <div class="quest-rewards">
                        ${rewardsHtml || '<p>Нет наград</p>'}
                    </div>
                    <button class="btn-small" onclick="editor.showAddQuestRewardModal()">+ Добавить награду</button>
                </div>
                
                <div class="quest-form-section">
                    <h4>Требования</h4>
                    <div class="quest-requirements">
                        ${requirementsHtml || '<p>Нет требований</p>'}
                    </div>
                    <button class="btn-small" onclick="editor.showAddQuestRequirementModal()">+ Добавить требование</button>
                </div>
                
                <div class="quest-form-section">
                    <h4>Время</h4>
                    <div class="form-group">
                        <label>Кулдаун (игровые дни):</label>
                        <input type="number" class="form-control quest-cooldown" value="${quest.cooldown}" onchange="editor.updateQuestProperty('cooldown', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Лимит времени (секунды):</label>
                        <input type="number" class="form-control quest-time-limit" value="${quest.timeLimit}" onchange="editor.updateQuestProperty('timeLimit', this.value)">
                    </div>
                </div>
                
                <button class="quest-preview-btn" onclick="editor.showQuestPreview()">Предпросмотр квеста</button>
            </div>
        `;
    }

    updateQuestProperty(property, value) {
        const quest = this.quests.get(this.selectedQuest);
        if (!quest) return;
        
        if (property === 'id') {
            if (value && value !== quest.id && !this.quests.has(value)) {
                this.quests.delete(quest.id);
                quest.id = value;
                this.quests.set(value, quest);
                this.selectedQuest = value;
                this.renderQuestsList();
            }
        } else {
            quest[property] = value;
        }
    }

    showQuestPreview() {
        if (!this.selectedQuest) {
            alert('Выберите квест для предпросмотра');
            return;
        }
        
        const modal = document.getElementById('questPreviewModal');
        const content = document.getElementById('questPreviewContent');
        
        content.innerHTML = this.generateQuestPreview();
        modal.style.display = 'block';
    }

    generateQuestPreview() {
        const quest = this.quests.get(this.selectedQuest);
        if (!quest) return '';
        
        const questsList = Array.from(this.quests.values()).map(q => `
            <div class="quest-preview-list-item ${q.id === quest.id ? 'selected' : ''}" onclick="editor.previewSelectQuest('${q.id}')">
                ${this.escapeHtml(q.name)}
            </div>
        `).join('');
        
        const targetsHtml = quest.targets.map(target => `
            <div class="quest-preview-objective">
                <span>${target.prefab}</span>
                <span>x${target.amount}</span>
            </div>
        `).join('');
        
        const rewardsHtml = quest.rewards.map(reward => `
            <div class="quest-preview-reward">
                <span>${reward.prefab}</span>
                <span>x${reward.amount}</span>
            </div>
        `).join('');
        
        return `
            <div class="quest-preview-content">
                <div class="quest-preview-sidebar">
                    <h3>Квесты</h3>
                    <div class="quest-preview-list">
                        ${questsList}
                    </div>
                </div>
                <div class="quest-preview-details">
                    <div class="quest-preview-title">${this.escapeHtml(quest.name)}</div>
                    <div class="quest-preview-description">${this.processTextForPreview(quest.description)}</div>
                    
                    <div class="quest-preview-separator"></div>
                    
                    <div class="quest-preview-section">
                        <h4>Что нужно сделать:</h4>
                        <div class="quest-preview-objectives">
                            ${targetsHtml || '<p>Нет целей</p>'}
                        </div>
                    </div>
                    
                    <div class="quest-preview-separator"></div>
                    
                    <div class="quest-preview-section">
                        <h4>Вознаграждение:</h4>
                        <div class="quest-preview-rewards">
                            ${rewardsHtml || '<p>Нет наград</p>'}
                        </div>
                    </div>
                    
                    <button class="quest-preview-accept-btn">Взять квест</button>
                </div>
            </div>
        `;
    }

    previewSelectQuest(questId) {
        this.selectedQuest = questId;
        this.renderQuestsList();
        this.showQuestPreview();
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
        
        this.previewHistory = [];
        this.currentPreviewNode = this.nodes.get(this.selectedNode);
        
        content.innerHTML = this.generatePreview(this.currentPreviewNode, true);
        modal.style.display = 'block';
    }

    generatePreview(node, isRoot = false) {
        // Обрабатываем переносы строк и теги цвета
        const processedText = this.processTextForPreview(node.text);
        
        let html = '';
        
        // Добавляем кнопку "Назад" если это не корневой диалог
        if (!isRoot) {
            html += `<div class="preview-back" style="text-align: left; margin-bottom: 15px;">
                <button onclick="editor.previewGoBack()" style="background: #8b7355; border: 1px solid #d4af37; color: #e8d8a3; padding: 5px 10px; border-radius: 3px; cursor: pointer;">← Назад</button>
            </div>`;
        }
        
        html += `
            <div class="preview-profile">[${this.escapeHtml(node.id)}]</div>
            <div class="preview-npc-text">${processedText}</div>
            <div class="preview-options">
        `;
        
        node.options.forEach((option, index) => {
            const processedOptionText = this.processTextForPreview(option.text);
            const colorStyle = option.color && option.color !== '#ffffff' ? `style="color: ${option.color}"` : '';
            const transitionText = option.transition ? `→ ${option.transition}` : '';
            
            const onClick = option.transition ? 
                `onclick="editor.previewNavigate('${option.transition}')"` : 
                '';
            
            html += `
                <div class="preview-option" ${onClick}>
                    ${option.icon ? `<div class="preview-option-icon" title="${option.icon}"></div>` : ''}
                    <span class="preview-option-number">${index + 1})</span>
                    <span class="preview-option-text" ${colorStyle}>${processedOptionText}</span>
                    ${transitionText ? `<span class="preview-option-transition">${transitionText}</span>` : ''}
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    previewNavigate(nodeId) {
        const targetNode = this.nodes.get(nodeId);
        if (!targetNode) return;
        
        this.previewHistory.push(this.currentPreviewNode);
        this.currentPreviewNode = targetNode;
        
        const content = document.getElementById('previewContent');
        content.innerHTML = this.generatePreview(targetNode);
    }

    previewGoBack() {
        if (this.previewHistory.length > 0) {
            this.currentPreviewNode = this.previewHistory.pop();
            const content = document.getElementById('previewContent');
            const isRoot = this.previewHistory.length === 0;
            content.innerHTML = this.generatePreview(this.currentPreviewNode, isRoot);
        }
    }

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

    exportCfg() {
        let cfgContent = '';
        
        // Экспорт диалогов
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

    handleDialogueFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            this.parseDialogueCfgFile(event.target.result);
        };
        reader.readAsText(file);
        
        // Сбрасываем значение input, чтобы можно было выбрать тот же файл снова
        e.target.value = '';
    }

    handleQuestFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            this.parseQuestCfgFile(event.target.result);
        };
        reader.readAsText(file);
        
        // Сбрасываем значение input, чтобы можно было выбрать тот же файл снова
        e.target.value = '';
    }

    parseDialogueCfgFile(content) {
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
        this.renderNodeOptionsList();
    }

    parseQuestCfgFile(content) {
        this.quests.clear();
        const lines = content.split('\n');
        let currentQuest = null;
        let lineIndex = 0;
        
        while (lineIndex < lines.length) {
            const line = lines[lineIndex].trim();
            
            if (line.startsWith('[') && line.endsWith(']')) {
                const questId = line.slice(1, -1);
                const autocomplete = questId.includes('=autocomplete');
                const cleanQuestId = autocomplete ? questId.split('=')[0] : questId;
                
                currentQuest = {
                    id: cleanQuestId,
                    type: '',
                    name: '',
                    description: '',
                    targets: [],
                    rewards: [],
                    cooldown: '',
                    timeLimit: '',
                    requirements: [],
                    autocomplete: autocomplete
                };
                
                lineIndex++;
                
                // Читаем тип квеста
                if (lineIndex < lines.length) {
                    currentQuest.type = lines[lineIndex].trim();
                    lineIndex++;
                }
                
                // Читаем название
                if (lineIndex < lines.length) {
                    currentQuest.name = lines[lineIndex].trim();
                    lineIndex++;
                }
                
                // Читаем описание
                if (lineIndex < lines.length) {
                    currentQuest.description = lines[lineIndex].trim();
                    lineIndex++;
                }
                
                // Читаем цели
                if (lineIndex < lines.length) {
                    const targetsLine = lines[lineIndex].trim();
                    if (targetsLine && targetsLine !== 'None') {
                        const targetParts = targetsLine.split('|').map(part => part.trim());
                        targetParts.forEach(part => {
                            const targetData = part.split(',').map(item => item.trim());
                            currentQuest.targets.push({
                                prefab: targetData[0] || '',
                                amount: targetData[1] || '1',
                                level: targetData[2] || ''
                            });
                        });
                    }
                    lineIndex++;
                }
                
                // Читаем награды
                if (lineIndex < lines.length) {
                    const rewardsLine = lines[lineIndex].trim();
                    if (rewardsLine && rewardsLine !== 'None') {
                        const rewardParts = rewardsLine.split('|').map(part => part.trim());
                        rewardParts.forEach(part => {
                            const rewardData = part.split(':').map(item => item.trim());
                            if (rewardData.length >= 2) {
                                const type = rewardData[0];
                                const params = rewardData[1].split(',').map(p => p.trim());
                                currentQuest.rewards.push({
                                    type: type,
                                    prefab: params[0] || '',
                                    amount: params[1] || '1',
                                    level: params[2] || ''
                                });
                            }
                        });
                    }
                    lineIndex++;
                }
                
                // Читаем время
                if (lineIndex < lines.length) {
                    const timeLine = lines[lineIndex].trim();
                    if (timeLine && timeLine !== 'None') {
                        const timeData = timeLine.split(',').map(item => item.trim());
                        currentQuest.cooldown = timeData[0] || '';
                        currentQuest.timeLimit = timeData[1] || '';
                    }
                    lineIndex++;
                }
                
                // Читаем требования
                if (lineIndex < lines.length) {
                    const reqLine = lines[lineIndex].trim();
                    if (reqLine && reqLine !== 'None') {
                        const reqParts = reqLine.split('|').map(part => part.trim());
                        reqParts.forEach(part => {
                            const reqData = part.split(':').map(item => item.trim());
                            if (reqData.length >= 1) {
                                const type = reqData[0];
                                const params = reqData.length > 1 ? reqData[1].split(',').map(p => p.trim()) : [];
                                currentQuest.requirements.push({
                                    type: type,
                                    params: params
                                });
                            }
                        });
                    }
                    lineIndex++;
                }
                
                this.quests.set(currentQuest.id, currentQuest);
            } else {
                lineIndex++;
            }
        }
        
        this.renderQuestsList();
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
            this.renderNodeOptionsList();
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

    // Заглушки для методов квестов (будут реализованы позже)
    showAddQuestTargetModal() {
        alert('Добавление целей квеста будет реализовано в следующей версии');
    }

    showAddQuestRewardModal() {
        alert('Добавление наград квеста будет реализовано в следующей версии');
    }

    showAddQuestRequirementModal() {
        alert('Добавление требований квеста будет реализовано в следующей версии');
    }

    deleteQuestTarget(index) {
        const quest = this.quests.get(this.selectedQuest);
        if (quest) {
            quest.targets.splice(index, 1);
            this.renderQuestEditor();
        }
    }

    deleteQuestReward(index) {
        const quest = this.quests.get(this.selectedQuest);
        if (quest) {
            quest.rewards.splice(index, 1);
            this.renderQuestEditor();
        }
    }

    deleteQuestRequirement(index) {
        const quest = this.quests.get(this.selectedQuest);
        if (quest) {
            quest.requirements.splice(index, 1);
            this.renderQuestEditor();
        }
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

