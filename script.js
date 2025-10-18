// Основные переменные приложения
class DialogueEditor {
    constructor() {
        this.nodes = new Map();
        this.connections = new Map();
        this.selectedNode = null;
        this.selectedOption = null;
        this.currentZoom = 1;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.canvasOffset = { x: 0, y: 0 };
        this.isCanvasDragging = false;
        this.canvasStartPos = { x: 0, y: 0 };
        
        this.initializeEventListeners();
        this.createSampleDialogue();
    }

    initializeEventListeners() {
        // Кнопки управления
        document.getElementById('addNodeBtn').addEventListener('click', () => this.addNode());
        document.getElementById('addOptionBtn').addEventListener('click', () => this.addOption());
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteSelected());
        document.getElementById('previewBtn').addEventListener('click', () => this.showPreview());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportCfg());
        document.getElementById('importBtn').addEventListener('click', () => this.importCfg());
        document.getElementById('validateBtn').addEventListener('click', () => this.validateDialogue());
        
        // Поиск
        document.getElementById('searchInput').addEventListener('input', (e) => this.searchDialogue(e.target.value));
        
        // Модальные окна
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Закрытие модальных окон при клике вне их
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Обработчики для свойств
        document.getElementById('nodeId').addEventListener('change', (e) => this.updateNodeProperty('id', e.target.value));
        document.getElementById('nodeText').addEventListener('change', (e) => this.updateNodeProperty('text', e.target.value));
        document.getElementById('optionText').addEventListener('change', (e) => this.updateOptionProperty('text', e.target.value));
        document.getElementById('optionTransition').addEventListener('change', (e) => this.updateOptionProperty('transition', e.target.value));
        document.getElementById('optionIcon').addEventListener('change', (e) => this.updateOptionProperty('icon', e.target.value));
        document.getElementById('optionColor').addEventListener('change', (e) => this.updateOptionProperty('color', e.target.value));

        // Условия и команды
        document.getElementById('addConditionBtn').addEventListener('click', () => this.showConditionModal());
        document.getElementById('addCommandBtn').addEventListener('click', () => this.showCommandModal());
        document.getElementById('saveConditionBtn').addEventListener('click', () => this.saveCondition());
        document.getElementById('saveCommandBtn').addEventListener('click', () => this.saveCommand());

        // Перетаскивание холста
        const canvas = document.querySelector('.canvas-container');
        canvas.addEventListener('mousedown', (e) => this.startCanvasDrag(e));
        canvas.addEventListener('mousemove', (e) => this.canvasDrag(e));
        canvas.addEventListener('mouseup', () => this.stopCanvasDrag());
        canvas.addEventListener('mouseleave', () => this.stopCanvasDrag());

        // Масштабирование
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoom(0.1));
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoom(-0.1));
        document.getElementById('fitToScreenBtn').addEventListener('click', () => this.fitToScreen());
    }

    createSampleDialogue() {
        // Создаем пример диалога для начала работы
        const startNode = this.addNode('default', 100, 100);
        startNode.text = "Welcome to the village!";
        
        const jobNode = this.addNode('JobOptions', 400, 100);
        jobNode.text = "Available job options:";
        
        // Добавляем опции
        this.addOptionToNode(startNode.id, "Hello there! What brings you to our peaceful village?");
        this.addOptionToNode(startNode.id, "How can I assist you today?");
        const workOption = this.addOptionToNode(startNode.id, "I'm looking for work");
        workOption.transition = jobNode.id;
        
        this.addOptionToNode(jobNode.id, "We have various job opportunities available. What type of work are you interested in?");
        const farmOption = this.addOptionToNode(jobNode.id, "Farming");
        farmOption.icon = "Hoe";
        farmOption.conditions.push({ type: "HasItem", params: ["Hoe", "1"] });
        
        this.renderNodes();
        this.updateTransitionsList();
    }

    addNode(id = null, x = 200, y = 200) {
        const nodeId = id || `node_${Date.now()}`;
        const node = {
            id: nodeId,
            text: "Enter NPC text here...",
            x: x,
            y: y,
            options: []
        };
        
        this.nodes.set(nodeId, node);
        this.renderNodes();
        this.updateTransitionsList();
        return node;
    }

    addOptionToNode(nodeId, text = "New option") {
        const node = this.nodes.get(nodeId);
        if (!node) return null;
        
        const option = {
            id: `opt_${Date.now()}`,
            text: text,
            transition: "",
            commands: [],
            conditions: [],
            icon: "",
            color: ""
        };
        
        node.options.push(option);
        this.renderNodes();
        return option;
    }

    renderNodes() {
        const container = document.getElementById('nodeContainer');
        container.innerHTML = '';
        
        // Очищаем соединения
        document.getElementById('connectionLayer').innerHTML = '';
        
        this.nodes.forEach((node, nodeId) => {
            const nodeElement = this.createNodeElement(node);
            container.appendChild(nodeElement);
            
            // Рисуем соединения для опций
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
        
        nodeDiv.style.left = `${node.x}px`;
        nodeDiv.style.top = `${node.y}px`;
        nodeDiv.setAttribute('data-node-id', node.id);
        
        nodeDiv.innerHTML = `
            <div class="node-header">[${node.id}]</div>
            <div class="node-content">${this.escapeHtml(node.text)}</div>
            <div class="node-options">
                ${node.options.map((option, index) => `
                    <div class="option ${this.selectedOption === option.id ? 'selected' : ''}" 
                         data-option-id="${option.id}">
                         ${option.icon ? `<span class="option-icon"></span>` : ''}
                         ${index + 1}) ${this.escapeHtml(option.text)}
                         ${option.transition ? `→ [${option.transition}]` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        
        // Обработчики событий для узла
        this.addNodeEventListeners(nodeDiv, node);
        return nodeDiv;
    }

    addNodeEventListeners(nodeElement, node) {
        // Выбор узла
        nodeElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('option')) {
                const optionId = e.target.getAttribute('data-option-id');
                this.selectOption(node.id, optionId);
            } else {
                this.selectNode(node.id);
            }
            e.stopPropagation();
        });

        // Перетаскивание узла
        let isDragging = false;
        let startX, startY, initialX, initialY;

        nodeElement.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('option')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = node.x;
            initialY = node.y;
            
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            node.x = initialX + dx;
            node.y = initialY + dy;
            
            this.renderNodes();
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    drawConnection(fromNode, option) {
        const toNode = this.nodes.get(option.transition);
        if (!toNode) return;
        
        const svg = document.getElementById('connectionLayer');
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        
        // Вычисляем позиции соединений (упрощенно)
        const fromX = fromNode.x + 200;
        const fromY = fromNode.y + 100;
        const toX = toNode.x;
        const toY = toNode.y + 50;
        
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
            // Проверяем уникальность ID
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
    }

    updateTransitionsList() {
        const select = document.getElementById('optionTransition');
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
        paramsContainer.innerHTML = '';
        
        // Добавляем поля для параметров в зависимости от типа условия
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
        const modal = document.getElementById('previewModal');
        const content = document.getElementById('previewContent');
        
        if (!this.selectedNode) {
            alert('Выберите диалог для предпросмотра');
            return;
        }
        
        const startNode = this.nodes.get(this.selectedNode);
        content.innerHTML = this.generatePreview(startNode);
        modal.style.display = 'block';
    }

    generatePreview(node, depth = 0) {
        if (depth > 10) return '<div class="preview-error">Слишком глубокая вложенность</div>';
        
        let html = `
            <div class="preview-profile">[${node.id}]</div>
            <div class="preview-npc-text">${this.escapeHtml(node.text)}</div>
            <div class="preview-options">
        `;
        
        node.options.forEach((option, index) => {
            const colorStyle = option.color ? `style="color: ${option.color}"` : '';
            html += `
                <div class="preview-option">
                    ${option.icon ? `<div class="option-icon" title="${option.icon}"></div>` : ''}
                    <span class="option-number">${index + 1})</span>
                    <span class="option-text" ${colorStyle}>${this.escapeHtml(option.text)}</span>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
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

    importCfg() {
        document.getElementById('fileInput').click();
        document.getElementById('fileInput').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                this.parseCfgFile(event.target.result);
            };
            reader.readAsText(file);
        };
    }

    parseCfgFile(content) {
        this.nodes.clear();
        const lines = content.split('\n');
        let currentNode = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('[') && line.endsWith(']')) {
                // Новый узел
                const nodeId = line.slice(1, -1);
                currentNode = this.addNode(nodeId, Math.random() * 500, Math.random() * 300);
                i++; // Переход к следующей строке (текст NPC)
                if (i < lines.length) {
                    currentNode.text = lines[i].trim();
                }
            } else if (line.startsWith('Text:')) {
                // Опция игрока
                this.parseOptionLine(currentNode, line);
            }
        }
        
        this.renderNodes();
        this.updateTransitionsList();
    }

    parseOptionLine(node, line) {
        if (!node) return;
        
        const parts = line.split('|').map(part => part.trim());
        const textPart = parts.find(part => part.startsWith('Text:'));
        
        if (!textPart) return;
        
        const option = this.addOptionToNode(node.id, textPart.substring(5).trim());
        
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
            // Проверяем уникальность ID
            if (!nodeId) {
                errors.push(`Узел без ID`);
            }
            
            // Проверяем текст NPC
            if (!node.text || node.text.trim() === '') {
                errors.push(`Узел "${nodeId}": отсутствует текст NPC`);
            }
            
            // Проверяем опции
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
                document.getElementById('optionProperties').style.display = 'none';
            }
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
            document.getElementById('nodeProperties').style.display = 'none';
        }
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
}

// Инициализация приложения
let editor;
document.addEventListener('DOMContentLoaded', () => {
    editor = new DialogueEditor();
    
    // Добавляем обработчики для модальных окон условий и команд
    document.getElementById('conditionType').addEventListener('change', () => editor.updateConditionParams());
    document.getElementById('commandType').addEventListener('change', () => editor.updateCommandParams());
});
