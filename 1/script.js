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
        this.createSampleQuests();
    }

    initializeEventListeners() {
        console.log('Инициализация обработчиков событий');
        
        // Основные кнопки
        this.bindButton('addNodeBtn', () => this.addNode());
        this.bindButton('addOptionBtn', () => this.addOption());
        this.bindButton('deleteBtn', () => this.deleteSelected());
        this.bindButton('previewBtn', () => this.showPreview());
        this.bindButton('exportBtn', () => this.exportCfg());
        this.bindButton('importDialogBtn', () => document.getElementById('fileInput').click());
        this.bindButton('importQuestBtn', () => document.getElementById('questFileInput').click());
        this.bindButton('validateBtn', () => this.validateDialogue());
        this.bindButton('addNodeOptionBtn', () => this.addOptionToSelectedNode());
        this.bindButton('questEditorBtn', () => this.showQuestEditor());
        
        // Квесты
        this.bindButton('addQuestBtn', () => this.addQuest());
        this.bindButton('exportQuestsBtn', () => this.exportQuests());
        
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
        this.bindInput('fileInput', (e) => this.handleFileImport(e));
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

    // ... (все предыдущие методы для диалогов остаются без изменений)

    // ========== МЕТОДЫ ДЛЯ КВЕСТОВ ==========

    createSampleQuests() {
        console.log('Создание примерных квестов');
        
        const wolfQuest = this.addQuest('MyTestQuest1');
        wolfQuest.name = "Охота на волков";
        wolfQuest.description = "В лесу стало слишком много волков. Убей 10 волков, чтобы сделать окрестности безопаснее.";
        wolfQuest.type = "Kill";
        wolfQuest.targets = [
            { prefab: "Wolf", amount: "10", minLevel: "" },
            { prefab: "Skeleton", amount: "5", minLevel: "" }
        ];
        wolfQuest.rewards = [
            { type: "Item", target: "SwordIron", amount: "1", level: "3" },
            { type: "Item", target: "Coins", amount: "100", level: "" }
        ];
        wolfQuest.cooldown = "10";
        wolfQuest.timeLimit = "1800";
        wolfQuest.requirements = "None";
        
        const harvestQuest = this.addQuest('FarmCarrots');
        harvestQuest.name = "Сбор урожая";
        harvestQuest.description = "Нам нужно собрать морковь для зимних запасов. Собери 20 морковок.";
        harvestQuest.type = "Harvest";
        harvestQuest.targets = [
            { prefab: "Pickable_Carrot", amount: "20", minLevel: "" }
        ];
        harvestQuest.rewards = [
            { type: "Item", target: "Coins", amount: "50", level: "" },
            { type: "Skill", target: "Farming", amount: "5", level: "" }
        ];
        harvestQuest.cooldown = "5";
        harvestQuest.timeLimit = "";
        harvestQuest.requirements = "HasItem: Hoe, 1";
        
        this.renderQuestList();
    }

    addQuest(id = null) {
        const questId = id || `Quest_${Date.now()}`;
        const quest = {
            id: questId,
            name: "Новый квест",
            description: "Описание квеста",
            type: "Kill",
            targets: [],
            rewards: [],
            cooldown: "",
            timeLimit: "",
            requirements: "None"
        };
        
        this.quests.set(questId, quest);
        this.renderQuestList();
        return quest;
    }

    showQuestEditor() {
        const modal = document.getElementById('questModal');
        modal.style.display = 'block';
        this.renderQuestList();
    }

    renderQuestList() {
        const container = document.getElementById('questList');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.quests.forEach((quest, questId) => {
            const questElement = document.createElement('div');
            questElement.className = `quest-item ${this.selectedQuest === questId ? 'selected' : ''}`;
            questElement.setAttribute('data-quest-id', questId);
            
            questElement.innerHTML = `
                <div class="quest-item-name">${this.escapeHtml(quest.name)}</div>
                <div class="quest-item-id">[${this.escapeHtml(quest.id)}]</div>
            `;
            
            questElement.addEventListener('click', () => {
                this.selectQuest(questId);
            });
            
            container.appendChild(questElement);
        });
    }

    selectQuest(questId) {
        this.selectedQuest = questId;
        this.renderQuestList();
        this.showQuestDetails();
    }

    showQuestDetails() {
        const detailsPanel = document.getElementById('questDetails');
        const previewPanel = document.getElementById('questPreview');
        
        if (!this.selectedQuest) {
            detailsPanel.innerHTML = '<div class="no-quest-selected">Выберите квест для редактирования</div>';
            previewPanel.style.display = 'none';
            return;
        }
        
        const quest = this.quests.get(this.selectedQuest);
        if (!quest) return;
        
        // Создаем форму редактирования квеста
        detailsPanel.innerHTML = this.createQuestForm(quest);
        previewPanel.style.display = 'none';
        
        // Добавляем обработчики для формы
        this.bindQuestFormEvents(quest);
    }

    createQuestForm(quest) {
        return `
            <h3>Редактирование квеста</h3>
            <div class="quest-form">
                <div class="quest-form-section">
                    <h4>Основная информация</h4>
                    <div class="form-group">
                        <label>ID квеста:</label>
                        <input type="text" class="form-control quest-id" value="${this.escapeHtml(quest.id)}">
                    </div>
                    <div class="form-group">
                        <label>Название:</label>
                        <input type="text" class="form-control quest-name" value="${this.escapeHtml(quest.name)}">
                    </div>
                    <div class="form-group">
                        <label>Тип квеста:</label>
                        <select class="form-control quest-type">
                            <option value="Kill" ${quest.type === 'Kill' ? 'selected' : ''}>Убийство</option>
                            <option value="Collect" ${quest.type === 'Collect' ? 'selected' : ''}>Сбор</option>
                            <option value="Harvest" ${quest.type === 'Harvest' ? 'selected' : ''}>Сбор урожая</option>
                            <option value="Craft" ${quest.type === 'Craft' ? 'selected' : ''}>Крафт</option>
                            <option value="Talk" ${quest.type === 'Talk' ? 'selected' : ''}>Разговор</option>
                            <option value="Build" ${quest.type === 'Build' ? 'selected' : ''}>Строительство</option>
                            <option value="Move" ${quest.type === 'Move' ? 'selected' : ''}>Перемещение</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Описание:</label>
                        <textarea class="form-control quest-description" rows="4">${this.escapeHtml(quest.description)}</textarea>
                    </div>
                </div>

                <div class="quest-form-section">
                    <h4>Цели квеста</h4>
                    <div class="quest-targets">
                        ${quest.targets.map((target, index) => `
                            <div class="quest-target-item" data-index="${index}">
                                <div>
                                    <strong>${target.prefab}</strong> × ${target.amount}
                                    ${target.minLevel ? `(Ур. ${target.minLevel})` : ''}
                                </div>
                                <div class="quest-item-buttons">
                                    <button class="btn-small edit-target">✎</button>
                                    <button class="btn-small delete-target">×</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn-small add-target-btn">+ Добавить цель</button>
                </div>

                <div class="quest-form-section">
                    <h4>Награды</h4>
                    <div class="quest-rewards">
                        ${quest.rewards.map((reward, index) => `
                            <div class="quest-reward-item" data-index="${index}">
                                <div>
                                    <strong>${reward.type}</strong>: ${reward.target} × ${reward.amount}
                                    ${reward.level ? `(Ур. ${reward.level})` : ''}
                                </div>
                                <div class="quest-item-buttons">
                                    <button class="btn-small edit-reward">✎</button>
                                    <button class="btn-small delete-reward">×</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn-small add-reward-btn">+ Добавить награду</button>
                </div>

                <div class="quest-form-section">
                    <h4>Настройки</h4>
                    <div class="form-group">
                        <label>Кулдаун (дни):</label>
                        <input type="number" class="form-control quest-cooldown" value="${quest.cooldown}">
                    </div>
                    <div class="form-group">
                        <label>Лимит времени (секунды):</label>
                        <input type="number" class="form-control quest-time-limit" value="${quest.timeLimit}">
                    </div>
                    <div class="form-group">
                        <label>Требования:</label>
                        <textarea class="form-control quest-requirements" rows="3">${this.escapeHtml(quest.requirements)}</textarea>
                    </div>
                </div>

                <button class="quest-preview-btn">Предпросмотр квеста</button>
            </div>
        `;
    }

    bindQuestFormEvents(quest) {
        // Основные поля
        this.bindQuestInput('quest-id', (e) => this.updateQuestProperty('id', e.target.value));
        this.bindQuestInput('quest-name', (e) => this.updateQuestProperty('name', e.target.value));
        this.bindQuestInput('quest-type', (e) => this.updateQuestProperty('type', e.target.value));
        this.bindQuestInput('quest-description', (e) => this.updateQuestProperty('description', e.target.value));
        this.bindQuestInput('quest-cooldown', (e) => this.updateQuestProperty('cooldown', e.target.value));
        this.bindQuestInput('quest-time-limit', (e) => this.updateQuestProperty('timeLimit', e.target.value));
        this.bindQuestInput('quest-requirements', (e) => this.updateQuestProperty('requirements', e.target.value));

        // Кнопка предпросмотра
        document.querySelector('.quest-preview-btn')?.addEventListener('click', () => {
            this.showQuestPreview();
        });

        // Кнопки для целей и наград
        document.querySelector('.add-target-btn')?.addEventListener('click', () => {
            this.addQuestTarget(quest);
        });

        document.querySelector('.add-reward-btn')?.addEventListener('click', () => {
            this.addQuestReward(quest);
        });

        // Обработчики для существующих целей и наград
        this.bindQuestItemEvents(quest);
    }

    bindQuestInput(className, handler) {
        const element = document.querySelector(`.${className}`);
        if (element) {
            element.addEventListener('input', handler);
        }
    }

    bindQuestItemEvents(quest) {
        // Цели
        document.querySelectorAll('.edit-target').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.quest-target-item').getAttribute('data-index'));
                this.editQuestTarget(quest, index);
            });
        });

        document.querySelectorAll('.delete-target').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.quest-target-item').getAttribute('data-index'));
                this.deleteQuestTarget(quest, index);
            });
        });

        // Награды
        document.querySelectorAll('.edit-reward').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.quest-reward-item').getAttribute('data-index'));
                this.editQuestReward(quest, index);
            });
        });

        document.querySelectorAll('.delete-reward').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.quest-reward-item').getAttribute('data-index'));
                this.deleteQuestReward(quest, index);
            });
        });
    }

    updateQuestProperty(property, value) {
        if (!this.selectedQuest) return;
        
        const quest = this.quests.get(this.selectedQuest);
        if (!quest) return;
        
        if (property === 'id') {
            // Проверяем уникальность ID
            if (value && value !== quest.id && !this.quests.has(value)) {
                this.quests.delete(quest.id);
                quest.id = value;
                this.quests.set(value, quest);
                this.selectedQuest = value;
                this.renderQuestList();
            }
        } else {
            quest[property] = value;
        }
    }

    addQuestTarget(quest) {
        quest.targets.push({
            prefab: "NewTarget",
            amount: "1",
            minLevel: ""
        });
        this.showQuestDetails();
    }

    addQuestReward(quest) {
        quest.rewards.push({
            type: "Item",
            target: "NewReward",
            amount: "1",
            level: ""
        });
        this.showQuestDetails();
    }

    editQuestTarget(quest, index) {
        const target = quest.targets[index];
        const newPrefab = prompt("Prefab цели:", target.prefab);
        const newAmount = prompt("Количество:", target.amount);
        const newLevel = prompt("Минимальный уровень (опционально):", target.minLevel);
        
        if (newPrefab !== null) target.prefab = newPrefab;
        if (newAmount !== null) target.amount = newAmount;
        if (newLevel !== null) target.minLevel = newLevel;
        
        this.showQuestDetails();
    }

    editQuestReward(quest, index) {
        const reward = quest.rewards[index];
        const newType = prompt("Тип награды (Item, Skill, etc.):", reward.type);
        const newTarget = prompt("Цель награды:", reward.target);
        const newAmount = prompt("Количество:", reward.amount);
        const newLevel = prompt("Уровень (опционально):", reward.level);
        
        if (newType !== null) reward.type = newType;
        if (newTarget !== null) reward.target = newTarget;
        if (newAmount !== null) reward.amount = newAmount;
        if (newLevel !== null) reward.level = newLevel;
        
        this.showQuestDetails();
    }

    deleteQuestTarget(quest, index) {
        quest.targets.splice(index, 1);
        this.showQuestDetails();
    }

    deleteQuestReward(quest, index) {
        quest.rewards.splice(index, 1);
        this.showQuestDetails();
    }

    showQuestPreview() {
        if (!this.selectedQuest) return;
        
        const quest = this.quests.get(this.selectedQuest);
        const previewPanel = document.getElementById('questPreview');
        const detailsPanel = document.getElementById('questDetails');
        
        previewPanel.innerHTML = this.generateQuestPreview(quest);
        previewPanel.style.display = 'block';
        detailsPanel.style.display = 'none';
    }

    generateQuestPreview(quest) {
        // Обрабатываем описание для изображений
        const processedDescription = this.processTextForPreview(quest.description);
        
        return `
            <div class="quest-preview-header">Квесты</div>
            <div class="quest-preview-content">
                <div class="quest-preview-left">
                    <div class="quest-preview-section">
                        <div class="quest-preview-description">
                            ${processedDescription}
                        </div>
                    </div>
                    
                    <div class="quest-preview-separator"></div>
                    
                    <div class="quest-preview-section">
                        <div class="quest-preview-subheader">Что нужно сделать:</div>
                        <div class="quest-preview-objectives">
                            ${quest.targets.map(target => `
                                <div class="quest-objective">
                                    <div class="quest-objective-icon"></div>
                                    <div class="quest-objective-text">
                                        ${this.getTargetDescription(target, quest.type)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="quest-preview-right">
                    <div class="quest-preview-section">
                        <div class="quest-preview-subheader">Вознаграждение:</div>
                        <div class="quest-preview-rewards">
                            ${quest.rewards.map(reward => `
                                <div class="quest-reward">
                                    <div class="quest-reward-icon"></div>
                                    <div class="quest-reward-text">
                                        ${this.getRewardDescription(reward)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="quest-accept-button">Взять квест</div>
        `;
    }

    getTargetDescription(target, questType) {
        const typeNames = {
            'Kill': 'Убить',
            'Collect': 'Собрать',
            'Harvest': 'Собрать',
            'Craft': 'Создать',
            'Talk': 'Поговорить с',
            'Build': 'Построить',
            'Move': 'Переместиться к'
        };
        
        const typeName = typeNames[questType] || 'Выполнить';
        let description = `${typeName} ${target.prefab} × ${target.amount}`;
        
        if (target.minLevel) {
            description += ` (Уровень ${target.minLevel}+)`;
        }
        
        return description;
    }

    getRewardDescription(reward) {
        const typeNames = {
            'Item': 'Предмет',
            'Skill': 'Уровень навыка',
            'Skill_EXP': 'Опыт навыка',
            'EpicMMO_EXP': 'Опыт EpicMMO',
            'Battlepass_EXP': 'Опыт Battlepass',
            'MH_EXP': 'Опыт MagicHeim',
            'Cozyheim_EXP': 'Опыт Cozyheim',
            'GuildAddLevel': 'Уровень гильдии',
            'SetCustomValue': 'Значение',
            'AddCustomValue': 'Значение'
        };
        
        const typeName = typeNames[reward.type] || reward.type;
        let description = `${typeName}: ${reward.target}`;
        
        if (reward.amount && reward.amount !== "1") {
            description += ` × ${reward.amount}`;
        }
        
        if (reward.level) {
            description += ` (Ур. ${reward.level})`;
        }
        
        return description;
    }

    exportQuests() {
        let cfgContent = '';
        
        this.quests.forEach(quest => {
            cfgContent += `[${quest.id}]\n`;
            cfgContent += `${quest.type}\n`;
            cfgContent += `${quest.name}\n`;
            cfgContent += `${quest.description}\n`;
            
            // Цели
            const targetStrings = quest.targets.map(target => {
                let str = target.prefab;
                if (target.amount) str += `, ${target.amount}`;
                if (target.minLevel) str += `, ${target.minLevel}`;
                return str;
            });
            cfgContent += `${targetStrings.join(' | ')}\n`;
            
            // Награды
            const rewardStrings = quest.rewards.map(reward => {
                let str = `${reward.type}: ${reward.target}`;
                if (reward.amount) str += `, ${reward.amount}`;
                if (reward.level) str += `, ${reward.level}`;
                return str;
            });
            cfgContent += `${rewardStrings.join(' | ')}\n`;
            
            // Настройки
            cfgContent += `${quest.cooldown || '0'}, ${quest.timeLimit || '0'}\n`;
            cfgContent += `${quest.requirements}\n\n`;
        });
        
        this.downloadFile('quests.cfg', cfgContent);
    }

    handleQuestFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            this.parseQuestFile(event.target.result);
        };
        reader.readAsText(file);
        
        e.target.value = '';
    }

    parseQuestFile(content) {
        this.quests.clear();
        const lines = content.split('\n');
        let currentQuest = null;
        let lineIndex = 0;
        
        while (lineIndex < lines.length) {
            const line = lines[lineIndex].trim();
            
            if (line.startsWith('[') && line.endsWith(']')) {
                const questId = line.slice(1, -1);
                currentQuest = this.addQuest(questId);
                lineIndex++;
                
                // Читаем остальные поля квеста
                if (lineIndex < lines.length) currentQuest.type = lines[lineIndex++].trim();
                if (lineIndex < lines.length) currentQuest.name = lines[lineIndex++].trim();
                if (lineIndex < lines.length) currentQuest.description = lines[lineIndex++].trim();
                if (lineIndex < lines.length) this.parseQuestTargets(currentQuest, lines[lineIndex++].trim());
                if (lineIndex < lines.length) this.parseQuestRewards(currentQuest, lines[lineIndex++].trim());
                if (lineIndex < lines.length) this.parseQuestSettings(currentQuest, lines[lineIndex++].trim());
                if (lineIndex < lines.length) currentQuest.requirements = lines[lineIndex++].trim();
            } else {
                lineIndex++;
            }
        }
        
        this.renderQuestList();
    }

    parseQuestTargets(quest, line) {
        if (!line || line === 'None') return;
        
        const targets = line.split('|').map(t => t.trim());
        quest.targets = targets.map(target => {
            const parts = target.split(',').map(p => p.trim());
            return {
                prefab: parts[0] || '',
                amount: parts[1] || '1',
                minLevel: parts[2] || ''
            };
        });
    }

    parseQuestRewards(quest, line) {
        if (!line || line === 'None') return;
        
        const rewards = line.split('|').map(r => r.trim());
        quest.rewards = rewards.map(reward => {
            const parts = reward.split(':').map(p => p.trim());
            const type = parts[0];
            const params = parts[1] ? parts[1].split(',').map(p => p.trim()) : [];
            
            return {
                type: type,
                target: params[0] || '',
                amount: params[1] || '1',
                level: params[2] || ''
            };
        });
    }

    parseQuestSettings(quest, line) {
        if (!line || line === 'None') return;
        
        const parts = line.split(',').map(p => p.trim());
        quest.cooldown = parts[0] || '';
        quest.timeLimit = parts[1] || '';
    }

    // ... (остальные методы для диалогов остаются без изменений)
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
