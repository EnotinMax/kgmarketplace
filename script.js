// Global state
let nodes = {};
let edges = [];
let selectedNodeId = null;
let nextNodeId = 1;
let previewHistory = [];
let searchTerm = '';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadFromStorage();
    renderCanvas();
    setupEventListeners();
    validateGraph();
});

// Event Listeners
function setupEventListeners() {
    // File import
    document.getElementById('importFile').addEventListener('change', handleFileImport);
    
    // Canvas click to deselect
    document.getElementById('canvas').addEventListener('click', function(e) {
        if (e.target === this) {
            selectedNodeId = null;
            hidePropertiesPanel();
        }
    });
}

// Drag and Drop
function dragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.getAttribute('data-type'));
}

function dragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function dragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function drop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const type = e.dataTransfer.getData('text/plain');
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (type === 'dialog') {
        createDialogNode(x, y);
    }
}

// Node Management
function createDialogNode(x, y, id = null, npcText = '', options = []) {
    const nodeId = id || `node_${nextNodeId++}`;
    
    nodes[nodeId] = {
        id: nodeId,
        npcText: npcText,
        options: options,
        x: x,
        y: y
    };
    
    saveToStorage();
    renderCanvas();
    validateGraph();
    return nodeId;
}

function deleteNode(nodeId) {
    // Remove node
    delete nodes[nodeId];
    
    // Remove connected edges
    edges = edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
    
    // Remove from options transitions
    Object.values(nodes).forEach(node => {
        node.options = node.options.filter(opt => opt.transition !== nodeId);
    });
    
    if (selectedNodeId === nodeId) {
        selectedNodeId = null;
        hidePropertiesPanel();
    }
    
    saveToStorage();
    renderCanvas();
    validateGraph();
}

// Rendering
function renderCanvas() {
    const canvas = document.getElementById('canvas');
    canvas.innerHTML = '';
    
    // Render connections first (so they appear behind nodes)
    renderConnections();
    
    // Render nodes
    Object.values(nodes).forEach(node => {
        const nodeElement = createNodeElement(node);
        canvas.appendChild(nodeElement);
    });
    
    // Highlight search results
    if (searchTerm) {
        highlightSearchResults();
    }
}

function createNodeElement(node) {
    const nodeDiv = document.createElement('div');
    nodeDiv.className = `dialog-node ${selectedNodeId === node.id ? 'selected' : ''}`;
    nodeDiv.style.left = node.x + 'px';
    nodeDiv.style.top = node.y + 'px';
    nodeDiv.setAttribute('data-node-id', node.id);
    
    nodeDiv.innerHTML = `
        <div class="node-header">
            <span class="node-id">${node.id}</span>
            <button class="node-delete" onclick="deleteNode('${node.id}')">×</button>
        </div>
        <textarea class="npc-text-area" placeholder="Текст NPC..." 
                  oninput="updateNodeText('${node.id}', this.value)">${escapeHtml(node.npcText)}</textarea>
        <div class="options-list">
            ${node.options.map((opt, index) => `
                <div class="option-item" onclick="editOption('${node.id}', ${index})">
                    ${opt.text || 'Новая опция'}
                </div>
            `).join('')}
            <div class="add-option" onclick="addOption('${node.id}')">+ Добавить опцию</div>
        </div>
    `;
    
    // Make node draggable
    makeDraggable(nodeDiv, node.id);
    
    // Add click handler
    nodeDiv.addEventListener('click', function(e) {
        if (!e.target.classList.contains('node-delete')) {
            selectedNodeId = node.id;
            showPropertiesPanel(node);
            renderCanvas(); // Re-render to update selection
        }
    });
    
    return nodeDiv;
}

function makeDraggable(element, nodeId) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    element.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        const newX = element.offsetLeft - pos1;
        const newY = element.offsetTop - pos2;
        
        element.style.left = newX + "px";
        element.style.top = newY + "px";
        
        // Update node position
        nodes[nodeId].x = newX;
        nodes[nodeId].y = newY;
        
        renderConnections();
    }
    
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        saveToStorage();
    }
}

function renderConnections() {
    const canvas = document.getElementById('canvas');
    
    // Remove existing connections
    document.querySelectorAll('.connection').forEach(el => el.remove());
    
    // Create arrowhead definition
    const svgNS = "http://www.w3.org/2000/svg";
    let defs = document.getElementById('connection-defs');
    if (!defs) {
        defs = document.createElementNS(svgNS, 'svg');
        defs.style.position = 'absolute';
        defs.style.width = '0';
        defs.style.height = '0';
        defs.id = 'connection-defs';
        defs.innerHTML = `
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#8b7355"/>
                </marker>
            </defs>
        `;
        canvas.appendChild(defs);
    }
    
    // Create connections
    edges.forEach(edge => {
        const sourceNode = nodes[edge.source];
        const targetNode = nodes[edge.target];
        
        if (sourceNode && targetNode) {
            const svg = document.createElementNS(svgNS, 'svg');
            svg.className = 'connection';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.pointerEvents = 'none';
            
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', sourceNode.x + 150);
            line.setAttribute('y1', sourceNode.y + 100);
            line.setAttribute('x2', targetNode.x + 150);
            line.setAttribute('y2', targetNode.y + 100);
            line.setAttribute('stroke', '#8b7355');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('marker-end', 'url(#arrowhead)');
            
            svg.appendChild(line);
            canvas.appendChild(svg);
        }
    });
}

// Properties Panel
function showPropertiesPanel(node) {
    const panel = document.getElementById('propertiesPanel');
    const content = document.getElementById('propertiesContent');
    
    content.innerHTML = `
        <div class="property-group">
            <label>ID узла:</label>
            <input type="text" value="${node.id}" onchange="updateNodeId('${node.id}', this.value)">
        </div>
        <div class="property-group">
            <label>Текст NPC:</label>
            <textarea oninput="updateNodeText('${node.id}', this.value)">${node.npcText}</textarea>
        </div>
        <h4>Опции игрока</h4>
        ${node.options.map((opt, index) => `
            <div class="property-group">
                <label>Опция ${index + 1}:</label>
                <input type="text" value="${opt.text || ''}" 
                       placeholder="Текст опции..."
                       oninput="updateOptionText('${node.id}', ${index}, this.value)">
                <select onchange="updateOptionTransition('${node.id}', ${index}, this.value)">
                    <option value="">-- Переход --</option>
                    ${Object.keys(nodes).filter(id => id !== node.id).map(id => `
                        <option value="${id}" ${opt.transition === id ? 'selected' : ''}>${id}</option>
                    `).join('')}
                </select>
                <button class="remove-btn" onclick="removeOption('${node.id}', ${index})">×</button>
            </div>
        `).join('')}
        <button onclick="addOption('${node.id}')">Добавить опцию</button>
    `;
    
    panel.style.display = 'block';
}

function hidePropertiesPanel() {
    document.getElementById('propertiesPanel').style.display = 'none';
}

function updateNodeId(oldId, newId) {
    if (nodes[newId]) {
        alert('Узел с таким ID уже существует!');
        return;
    }
    
    nodes[newId] = {...nodes[oldId], id: newId};
    delete nodes[oldId];
    
    // Update edges
    edges = edges.map(edge => ({
        source: edge.source === oldId ? newId : edge.source,
        target: edge.target === oldId ? newId : edge.target
    }));
    
    // Update option transitions
    Object.values(nodes).forEach(node => {
        node.options.forEach(opt => {
            if (opt.transition === oldId) {
                opt.transition = newId;
            }
        });
    });
    
    if (selectedNodeId === oldId) {
        selectedNodeId = newId;
    }
    
    saveToStorage();
    renderCanvas();
    validateGraph();
}

function updateNodeText(nodeId, text) {
    nodes[nodeId].npcText = text;
    saveToStorage();
}

// Option Management
function addOption(nodeId) {
    if (!nodes[nodeId].options) {
        nodes[nodeId].options = [];
    }
    
    nodes[nodeId].options.push({
        text: '',
        transition: ''
    });
    
    saveToStorage();
    renderCanvas();
    if (selectedNodeId === nodeId) {
        showPropertiesPanel(nodes[nodeId]);
    }
}

function removeOption(nodeId, optionIndex) {
    nodes[nodeId].options.splice(optionIndex, 1);
    saveToStorage();
    renderCanvas();
    if (selectedNodeId === nodeId) {
        showPropertiesPanel(nodes[nodeId]);
    }
}

function updateOptionText(nodeId, optionIndex, text) {
    nodes[nodeId].options[optionIndex].text = text;
    saveToStorage();
}

function updateOptionTransition(nodeId, optionIndex, transition) {
    nodes[nodeId].options[optionIndex].transition = transition;
    
    // Update edges
    edges = edges.filter(edge => !(edge.source === nodeId));
    
    if (transition) {
        edges.push({
            source: nodeId,
            target: transition
        });
    }
    
    saveToStorage();
    renderConnections();
    validateGraph();
}

// Import/Export
function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = parseCfgFile(e.target.result);
            nodes = parsed.nodes;
            edges = parsed.edges;
            nextNodeId = Math.max(...Object.keys(nodes).map(id => parseInt(id.replace('node_', '')) || 0)) + 1;
            
            saveToStorage();
            renderCanvas();
            validateGraph();
            alert('Файл успешно импортирован!');
        } catch (error) {
            alert('Ошибка при импорте файла: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
}

function exportCfg() {
    const cfgContent = generateCfg();
    const blob = new Blob([cfgContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dialogue.cfg';
    a.click();
    URL.revokeObjectURL(url);
}

function parseCfgFile(content) {
    const nodes = {};
    const edges = [];
    const lines = content.split('\n');
    
    let currentNode = null;
    
    lines.forEach(line => {
        line = line.trim();
        
        // Новый узел
        if (line.startsWith('[') && line.endsWith(']')) {
            if (currentNode) {
                nodes[currentNode.id] = currentNode;
            }
            const nodeId = line.slice(1, -1);
            currentNode = {
                id: nodeId,
                npcText: '',
                options: [],
                x: Math.random() * 1000,
                y: Math.random() * 600
            };
        }
        // Текст NPC (первая не-опция строка после заголовка узла)
        else if (currentNode && !line.startsWith('Text:') && currentNode.npcText === '' && line !== '') {
            currentNode.npcText = line;
        }
        // Опция игрока
        else if (line.startsWith('Text:')) {
            const option = parseOptionLine(line);
            currentNode.options.push(option);
            
            if (option.transition) {
                edges.push({
                    source: currentNode.id,
                    target: option.transition
                });
            }
        }
    });
    
    if (currentNode) {
        nodes[currentNode.id] = currentNode;
    }
    
    return { nodes, edges };
}

function parseOptionLine(line) {
    const parts = line.split('|').map(part => part.trim());
    const option = { text: '', transition: '' };
    
    parts.forEach(part => {
        if (part.startsWith('Text:')) {
            option.text = part.replace('Text:', '').trim();
        }
        else if (part.startsWith('Transition:')) {
            option.transition = part.replace('Transition:', '').trim();
        }
    });
    
    return option;
}

function generateCfg() {
    let cfgContent = '';
    
    Object.values(nodes).forEach(node => {
        cfgContent += `[${node.id}]\n`;
        cfgContent += `${node.npcText}\n`;
        
        node.options.forEach(option => {
            let line = `Text: ${option.text}`;
            
            if (option.transition) {
                line += ` | Transition: ${option.transition}`;
            }
            
            cfgContent += `${line}\n`;
        });
        
        cfgContent += '\n';
    });
    
    return cfgContent;
}

// Validation
function validateGraph() {
    const errors = [];
    const nodeIds = new Set(Object.keys(nodes));
    
    // Check for transitions to non-existent nodes
    edges.forEach(edge => {
        if (!nodeIds.has(edge.target)) {
            errors.push(`Переход ведёт на несуществующий узел: ${edge.target}`);
        }
    });
    
    // Check for empty NPC text
    Object.values(nodes).forEach(node => {
        if (!node.npcText.trim()) {
            errors.push(`Узел ${node.id}: отсутствует текст NPC`);
        }
    });
    
    // Check for cycles
    const cycles = findCycles();
    cycles.forEach(cycle => {
        errors.push(`Обнаружен цикл: ${cycle.join(' → ')}`);
    });
    
    displayValidationErrors(errors);
    return errors.length === 0;
}

function findCycles() {
    const graph = {};
    Object.keys(nodes).forEach(id => graph[id] = []);
    edges.forEach(edge => graph[edge.source].push(edge.target));
    
    const cycles = [];
    const visited = {};
    const recursionStack = {};
    
    function dfs(node, path) {
        if (recursionStack[node]) {
            const cycleStart = path.indexOf(node);
            if (cycleStart !== -1) {
                cycles.push(path.slice(cycleStart));
            }
            return;
        }
        if (visited[node]) return;
        
        visited[node] = true;
        recursionStack[node] = true;
        
        graph[node].forEach(neighbor => {
            dfs(neighbor, [...path, node]);
        });
        
        recursionStack[node] = false;
    }
    
    Object.keys(nodes).forEach(id => {
        if (!visited[id]) dfs(id, []);
    });
    
    return cycles;
}

function displayValidationErrors(errors) {
    const errorsDiv = document.getElementById('validationErrors');
    
    if (errors.length === 0) {
        errorsDiv.innerHTML = '<div style="color: #4a7c59;">✓ Ошибок нет</div>';
    } else {
        errorsDiv.innerHTML = errors.map(error => 
            `<div>⚠ ${error}</div>`
        ).join('');
    }
}

// Preview System
function togglePreview() {
    const modal = document.getElementById('previewModal');
    
    if (modal.style.display === 'none') {
        const startNode = Object.values(nodes)[0];
        if (!startNode) {
            alert('Добавьте хотя бы один диалоговый узел!');
            return;
        }
        
        previewHistory = [];
        showPreviewNode(startNode);
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
}

function showPreviewNode(node) {
    document.getElementById('previewNpcText').textContent = node.npcText;
    
    const optionsDiv = document.getElementById('previewOptions');
    optionsDiv.innerHTML = '';
    
    node.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option.text || `Опция ${index + 1}`;
        button.onclick = () => handlePreviewOption(option);
        optionsDiv.appendChild(button);
    });
    
    document.getElementById('previewBackBtn').style.display = 
        previewHistory.length > 0 ? 'block' : 'none';
}

function handlePreviewOption(option) {
    previewHistory.push(option);
    
    if (option.transition && nodes[option.transition]) {
        showPreviewNode(nodes[option.transition]);
    } else {
        // End of dialogue
        togglePreview();
    }
}

function previewGoBack() {
    if (previewHistory.length > 0) {
        previewHistory.pop();
        const previousOption = previewHistory[previewHistory.length - 1];
        
        if (previousOption && previousOption.transition) {
            showPreviewNode(nodes[previousOption.transition]);
        } else {
            // Back to start
            const startNode = Object.values(nodes)[0];
            showPreviewNode(startNode);
        }
    }
}

// Search
function handleSearch() {
    searchTerm = document.getElementById('searchInput').value.toLowerCase();
    renderCanvas();
    
    if (searchTerm) {
        highlightSearchResults();
    }
}

function highlightSearchResults() {
    Object.values(nodes).forEach(node => {
        const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
        if (nodeElement) {
            const matches = 
                node.id.toLowerCase().includes(searchTerm) ||
                node.npcText.toLowerCase().includes(searchTerm) ||
                node.options.some(opt => opt.text.toLowerCase().includes(searchTerm));
            
            if (matches) {
                nodeElement.classList.add('highlighted');
            } else {
                nodeElement.classList.remove('highlighted');
            }
        }
    });
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function saveToStorage() {
    localStorage.setItem('valheimDialogueEditor', JSON.stringify({
        nodes: nodes,
        edges: edges,
        nextNodeId: nextNodeId
    }));
}

function loadFromStorage() {
    const saved = localStorage.getItem('valheimDialogueEditor');
    if (saved) {
        const data = JSON.parse(saved);
        nodes = data.nodes || {};
        edges = data.edges || [];
        nextNodeId = data.nextNodeId || 1;
    }
}

// Create initial node if none exists
if (Object.keys(nodes).length === 0) {
    createDialogNode(100, 100, 'default', 'Welcome to the village!');
}
