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
                <span>[${this.escapeHtml(node.id)}]</span>
                <button class="collapse-btn" data-node-id="${node.id}">
                    ${node.collapsed ? '+' : '−'}
                </button>
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

    // ... остальные методы остаются без изменений до метода showPreview ...

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

    // Новый метод для отображения текста в редакторе (с интерпретацией)
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

    // Существующий метод для предпросмотра (оставляем как есть)
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

    // В методе updateNodeProperty добавляем перерисовку при изменении текста
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

    // В методе updateOptionProperty также добавляем перерисовку
    updateOptionProperty(property, value) {
        const node = this.nodes.get(this.selectedNode);
        if (!node || !this.selectedOption) return;
        
        const option = node.options.find(opt => opt.id === this.selectedOption);
        if (!option) return;
        
        option[property] = value;
        this.renderNodes();
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
