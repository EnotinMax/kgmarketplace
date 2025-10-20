// Класс редактора квестов
class QuestEditor {
    constructor() {
        this.quests = new Map();
        this.selectedQuest = null;
        
        console.log('QuestEditor инициализирован');
        this.initializeEventListeners();
        this.createSampleQuest();
    }

    initializeEventListeners() {
        console.log('Инициализация обработчиков событий квестов');
        
        this.bindButton('questsBtn', () => this.showQuestsModal());
        this.bindButton('importQuestBtn', () => document.getElementById('questFileInput').click());
        this.bindButton('addQuestBtn', () => this.addQuest());
        
        // Файловые inputs
        this.bindInput('questFileInput', (e) => this.handleQuestFileImport(e));
        
        console.log('Все обработчики квестов инициализированы');
    }

    bindButton(id, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
        }
    }

    bindInput(id, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', handler);
        }
    }

    createSampleQuest() {
        console.log('Создание примерного квеста');
        
        const quest = {
            id: 'MyTestQuest1',
            type: 'Kill',
            name: 'Тетрадь обид',
            description: 'Белый бим не утопился, нужно исправить (он в детстве укусил)',
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

    addQuest() {
        const questId = `Quest_${Date.now()}`;
        const quest = {
            id: questId,
            type: 'Kill',
            name: 'New Quest',
            description: 'Quest description',
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

    showQuestsModal() {
        document.getElementById('questsModal').style.display = 'block';
        this.renderQuestsList();
        
        if (this.selectedQuest) {
            this.renderQuestEditor();
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
                <button onclick="questEditor.deleteQuestTarget(${index})">×</button>
            </div>
        `).join('');
        
        const rewardsHtml = quest.rewards.map((reward, index) => `
            <div class="quest-reward-item">
                <span>${reward.type}: ${reward.prefab} x${reward.amount}${reward.level ? ` (уровень ${reward.level})` : ''}</span>
                <button onclick="questEditor.deleteQuestReward(${index})">×</button>
            </div>
        `).join('');
        
        const requirementsHtml = quest.requirements.map((req, index) => `
            <div class="quest-requirement-item">
                <span>${req.type}${req.params.length > 0 ? `: ${req.params.join(', ')}` : ''}</span>
                <button onclick="questEditor.deleteQuestRequirement(${index})">×</button>
            </div>
        `).join('');
        
        container.innerHTML = `
            <div class="quest-form">
                <div class="quest-form-section">
                    <h4>Основная информация</h4>
                    <div class="form-group">
                        <label>ID квеста:</label>
                        <input type="text" class="form-control quest-id" value="${this.escapeHtml(quest.id)}" onchange="questEditor.updateQuestProperty('id', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Тип квеста:</label>
                        <select class="form-control quest-type" onchange="questEditor.updateQuestProperty('type', this.value)">
                            <option value="Kill" ${quest.type === 'Kill' ? 'selected' : ''}>Убийство</option>
                            <option value="Collect" ${quest.type === 'Collect' ? 'selected' : ''}>Сбор</option>
                            <option value="Harvest" ${quest.type === 'Harvest' ? 'selected' : ''}>Сбор ресурсов</option>
                            <option value="Craft" ${quest.type === 'Craft' ? 'selected' : ''}>Крафт</option>
                            <option value="Talk" ${quest.type === 'Talk' ? 'selected' : ''}>Разговор</option>
                            <option value="Build" ${quest.type === 'Build' ? 'selected' : ''}>Строительство</option>
                            <option value="Move" ${quest.type === 'Move' ? 'selected' : ''}>Перемещение</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Название:</label>
                        <input type="text" class="form-control quest-name" value="${this.escapeHtml(quest.name)}" onchange="questEditor.updateQuestProperty('name', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Описание:</label>
                        <textarea class="form-control quest-description" rows="3" onchange="questEditor.updateQuestProperty('description', this.value)">${this.escapeHtml(quest.description)}</textarea>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" class="quest-autocomplete" ${quest.autocomplete ? 'checked' : ''} onchange="questEditor.updateQuestProperty('autocomplete', this.checked)">
                            Автозавершение
                        </label>
                    </div>
                </div>
                
                <div class="quest-form-section">
                    <h4>Цели квеста</h4>
                    <div class="quest-targets">
                        ${targetsHtml || '<p>Нет целей</p>'}
                    </div>
                    <button class="btn-small" onclick="questEditor.showQuestTargetModal()">+ Добавить цель</button>
                </div>
                
                <div class="quest-form-section">
                    <h4>Награды</h4>
                    <div class="quest-rewards">
                        ${rewardsHtml || '<p>Нет наград</p>'}
                    </div>
                    <button class="btn-small" onclick="questEditor.showQuestRewardModal()">+ Добавить награду</button>
                </div>
                
                <div class="quest-form-section">
                    <h4>Требования</h4>
                    <div class="quest-requirements">
                        ${requirementsHtml || '<p>Нет требований</p>'}
                    </div>
                    <button class="btn-small" onclick="questEditor.showQuestRequirementModal()">+ Добавить требование</button>
                </div>
                
                <div class="quest-form-section">
                    <h4>Время</h4>
                    <div class="form-group">
                        <label>Кулдаун (игровые дни):</label>
                        <input type="number" class="form-control quest-cooldown" value="${quest.cooldown}" onchange="questEditor.updateQuestProperty('cooldown', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Лимит времени (секунды):</label>
                        <input type="number" class="form-control quest-time-limit" value="${quest.timeLimit}" onchange="questEditor.updateQuestProperty('timeLimit', this.value)">
                    </div>
                </div>
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

    showQuestTargetModal() {
        alert('Добавление целей квеста будет реализовано в следующей версии');
    }

    showQuestRewardModal() {
        alert('Добавление наград квеста будет реализовано в следующей версии');
    }

    showQuestRequirementModal() {
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

    handleQuestFileImport(e) {
        alert('Импорт квестов будет реализован в следующей версии');
    }

    // Вспомогательные методы
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
