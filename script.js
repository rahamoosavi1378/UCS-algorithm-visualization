const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const addNodeButton = document.getElementById('addNode');
const addEdgeButton = document.getElementById('addEdge');
const moveNodeButton = document.getElementById('moveNode');
const runUCSButton = document.getElementById('runUCS');
const nextStepButton = document.getElementById('nextStep');
const deleteNodeButton = document.getElementById('deleteNode');
const undoButton = document.getElementById('undoButton');
const startNodeInput = document.getElementById('startNode');
const endNodeInput = document.getElementById('endNode');
const selectStartButton = document.getElementById('selectStart');
const selectEndButton = document.getElementById('selectEnd');
const selectionMessage = document.getElementById('selectionMessage');

let nodes = [];
let edges = [];
let selectedNode = null;
let isAddingEdge = false;
let isMovingNode = false;
let selectedNodeForMove = null;
let history = [];
let currentStep = -1;
let isSelectingStart = false;
let isSelectingEnd = false;
let sortStates = [0, 0];
let isDeletingNode = false;

// ================== Undo System ==================
function saveState() {
    history = history.slice(0, currentStep + 1);
    const state = {
        nodes: nodes.map(node => ({ ...node })),
        edges: edges.map(edge => ({
            node1Label: edge.node1.label,
            node2Label: edge.node2.label,
            cost: edge.cost
        }))
    };
    history.push(state);
    currentStep++;
    updateUndoButton();
    updateEdgeTable();
}

function undo() {
    if (currentStep <= 0) return;
    currentStep--;
    const prevState = history[currentStep];

    nodes = prevState.nodes.map(node => {
        const newNode = new Node(node.x, node.y, node.label);
        Object.assign(newNode, node);
        return newNode;
    });

    edges = prevState.edges.map(edge => {
        const node1 = nodes.find(n => n.label === edge.node1Label);
        const node2 = nodes.find(n => n.label === edge.node2Label);
        return new Edge(node1, node2, edge.cost);
    });

    drawGraph();
    updateUndoButton();
    updateEdgeTable();
}

function updateUndoButton() {
    undoButton.disabled = (currentStep <= 0);
}

// ================== Node & Edge Classes ==================
class Node {
    constructor(x, y, label) {
        this.x = x;
        this.y = y;
        this.label = label;
        this.radius = 20;
        this.defaultColor = '#3498db';
        this.selectedColor = '#e74c3c';
        this.color = this.defaultColor;
        this.isSelected = false;
        this.isEdgeHighlighted = false;
    }

    draw() {
        if (this.isEdgeHighlighted) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
            ctx.fillStyle = '#e74c3c';
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '16px Arial';
        ctx.fillText(this.label, this.x, this.y);
    }

    isClicked(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return dx * dx + dy * dy <= this.radius * this.radius;
    }

    select() {
        this.color = this.selectedColor;
        this.isSelected = true;
    }

    deselect() {
        this.color = this.defaultColor;
        this.isSelected = false;
    }
}

class Edge {
    constructor(node1, node2, cost = 1.00) {
        this.node1 = node1;
        this.node2 = node2;
        this.cost = cost;
        this.color = '#2c3e50';
        this.isHighlighted = false;
    }

    draw() {
        ctx.beginPath();
        ctx.moveTo(this.node1.x, this.node1.y);
        ctx.lineTo(this.node2.x, this.node2.y);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.isHighlighted ? 8 : 2;
        ctx.stroke();

        const midX = (this.node1.x + this.node2.x) / 2;
        const midY = (this.node1.y + this.node2.y) / 2;
        ctx.font = 'bold 12px Arial';
        const text = this.cost.toFixed(2);
        const textWidth = ctx.measureText(text).width;
        const padding = 4;
        ctx.fillStyle = 'white';
        ctx.fillRect(midX - textWidth/2 - padding, midY - 12, textWidth + 2*padding, 24);
        ctx.fillStyle = '#000';
        ctx.fillText(text, midX, midY);
    }
}

// ================== Edge Table Management ==================
function updateEdgeTable() {
    const tbody = document.getElementById('edgesTableBody');
    tbody.innerHTML = '';

    const seenEdges = new Set();
    const uniqueEdges = edges.filter(edge => {
        const key1 = `${edge.node1.label}-${edge.node2.label}`;
        const key2 = `${edge.node2.label}-${edge.node1.label}`;
        if (seenEdges.has(key1) || seenEdges.has(key2)) return false;
        seenEdges.add(key1);
        return true;
    });

    uniqueEdges.forEach((edge, index) => {
        const row = tbody.insertRow();
        row.style.cursor = 'pointer';

        row.addEventListener('mouseenter', () => highlightEdge(edge));
        row.addEventListener('mouseleave', () => unhighlightEdge(edge));

        const cell1 = row.insertCell(0);
        cell1.textContent = edge.node1.label;

        const cell2 = row.insertCell(1);
        cell2.textContent = edge.node2.label;

        const cell3 = row.insertCell(2);
        const input = document.createElement('input');
        input.type = 'number';
        input.value = edge.cost.toFixed(2);
        input.min = "0.01";
        input.step = "0.01";
        input.style.width = '60px';
        input.addEventListener('change', (e) => {
            edge.cost = parseFloat(e.target.value) || 1.00;
            saveState();
            drawGraph();
        });
        cell3.appendChild(input);

        const cell4 = row.insertCell(3);
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'حذف';
        deleteBtn.style.padding = '4px 8px';
        deleteBtn.addEventListener('click', () => {
            edges = edges.filter(e =>
                !(e.node1 === edge.node1 && e.node2 === edge.node2) &&
                !(e.node2 === edge.node1 && e.node1 === edge.node2)
            );
            saveState();
            drawGraph();
            updateEdgeTable();
        });
        cell4.appendChild(deleteBtn);
    });
}

function highlightEdge(edge) {
    edge.color = '#e74c3c';
    edge.isHighlighted = true;
    edge.node1.isEdgeHighlighted = true;
    edge.node2.isEdgeHighlighted = true;
    drawGraph();
}

function unhighlightEdge(edge) {
    edge.color = '#2c3e50';
    edge.isHighlighted = false;
    edge.node1.isEdgeHighlighted = false;
    edge.node2.isEdgeHighlighted = false;
    drawGraph();
}

// ================== Sorting Functionality ==================
function sortEdges(columnIndex) {
    sortStates[columnIndex] = (sortStates[columnIndex] + 1) % 3;

    edges.sort((a, b) => {
        const labelA = columnIndex === 0 ? a.node1.label : a.node2.label;
        const labelB = columnIndex === 0 ? b.node1.label : b.node2.label;

        if (sortStates[columnIndex] === 1) {
            return labelA.localeCompare(labelB);
        } else if (sortStates[columnIndex] === 2) {
            return labelB.localeCompare(labelA);
        }
        return 0;
    });

    updateEdgeTable();
    addSortIndicator(columnIndex);
}

function addSortIndicator(columnIndex) {
    const headers = document.querySelectorAll('#edgesTable thead th');
    headers.forEach((header, index) => {
        header.textContent = header.textContent.replace(/ [↑↓]$/, '');
        if (index === columnIndex) {
            const indicator = sortStates[columnIndex] === 1 ? ' ↑' :
                sortStates[columnIndex] === 2 ? ' ↓' : '';
            header.textContent += indicator;
        }
    });
}

// ================== Core Functions ==================
function generateLabel(index) {
    return String.fromCharCode(65 + index);
}

function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    edges.forEach(edge => edge.draw());
    nodes.forEach(node => node.draw());
}

function addNode(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const label = generateLabel(nodes.length);
    nodes.push(new Node(x, y, label));
    saveState();
    drawGraph();
}

function addEdge(event) {
    if (!isAddingEdge) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        selectedNode = nodes.find(node => node.isClicked(x, y));
        if (selectedNode) {
            selectedNode.select();
            isAddingEdge = true;
            drawGraph();
        }
    } else {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const targetNode = nodes.find(node => node.isClicked(x, y));

        if (targetNode === selectedNode) {
            selectedNode.deselect();
            selectedNode = null;
            isAddingEdge = false;
            drawGraph();
            return;
        }

        if (targetNode && targetNode !== selectedNode) {
            const isDuplicate = edges.some(edge =>
                (edge.node1 === selectedNode && edge.node2 === targetNode) ||
                (edge.node2 === selectedNode && edge.node1 === targetNode)
            );

            if (isDuplicate) {
                alert("⛔ این یال از قبل وجود دارد!");
                isAddingEdge = false;
                selectedNode.deselect();
                selectedNode = null;
                drawGraph();
                return;
            }

            edges.push(new Edge(selectedNode, targetNode));
            isAddingEdge = false;
            selectedNode.deselect();
            selectedNode = null;
            saveState();
            drawGraph();
            updateEdgeTable();
        } else {
            isAddingEdge = false;
            selectedNode.deselect();
            selectedNode = null;
            drawGraph();
        }
    }
}

function deleteSelectedNode() {
    if (!selectedNode) {
        alert("گرهی انتخاب نشده!");
        return;
    }
    nodes = nodes.filter(node => node !== selectedNode);
    edges = edges.filter(edge =>
        edge.node1 !== selectedNode && edge.node2 !== selectedNode
    );
    selectedNode = null;
    saveState();
    drawGraph();
}

// ================== Validation & Helpers ==================
function validateNode(label) {
    return nodes.some(node => node.label === label.toUpperCase());
}

function resetNodeColors() {
    nodes.forEach(node => {
        node.color = node.defaultColor;
        node.isEdgeHighlighted = false;
    });
    drawGraph();
}

// ================== UCS Algorithm ==================
let ucsState = {
    priorityQueue: [],
    visited: new Set(),
    endNode: null,
    isRunning: false,
};

function showResults(startLabel, endLabel, totalCost, path) {
    const resultsTable = document.getElementById('resultsTable').getElementsByTagName('tbody')[0];
    const newRow = resultsTable.insertRow();

    const cell1 = newRow.insertCell(0);
    const cell2 = newRow.insertCell(1);
    const cell3 = newRow.insertCell(2);
    const cell4 = newRow.insertCell(3);

    cell1.textContent = startLabel;
    cell2.textContent = endLabel;
    cell3.textContent = totalCost.toFixed(2);
    cell4.textContent = path.join(' -> ');
}

function uniformCostSearch(startNodeLabel, endNodeLabel) {
    if (!validateNode(startNodeLabel) || !validateNode(endNodeLabel)) {
        alert("گره شروع یا پایان معتبر نیست!");
        return;
    }

    resetNodeColors();

    const startNode = nodes.find(node => node.label === startNodeLabel.toUpperCase());
    const endNode = nodes.find(node => node.label === endNodeLabel.toUpperCase());

    addNodeButton.disabled = true;
    addEdgeButton.disabled = true;
    deleteNodeButton.disabled = true;

    ucsState = {
        priorityQueue: [{ node: startNode, cost: 0, path: [startNode.label] }],
        visited: new Set(),
        endNode: endNode,
        isRunning: true,
    };

    nextStepButton.disabled = false;
}

function nextStep() {
    if (!ucsState.isRunning) {
        alert("الگوریتم در حال اجرا نیست!");
        return;
    }

    const { priorityQueue, visited, endNode } = ucsState;

    if (priorityQueue.length === 0) {
        alert("مسیری یافت نشد!");
        ucsState.isRunning = false;
        nextStepButton.disabled = true;
        addNodeButton.disabled = false;
        addEdgeButton.disabled = false;
        deleteNodeButton.disabled = false;
        return;
    }

    priorityQueue.sort((a, b) => a.cost - b.cost);
    const { node, cost, path } = priorityQueue.shift();

    if (node === endNode) {
        showResults(path[0], endNode.label, cost, path);
        highlightPath(path);
        ucsState.isRunning = false;
        nextStepButton.disabled = true;
        addNodeButton.disabled = false;
        addEdgeButton.disabled = false;
        deleteNodeButton.disabled = false;
        return;
    }

    if (!visited.has(node.label)) {
        visited.add(node.label);
        node.color = '#e74c3c';
        drawGraph();

        edges.forEach(edge => {
            if (edge.node1 === node && !visited.has(edge.node2.label)) {
                priorityQueue.push({
                    node: edge.node2,
                    cost: cost + edge.cost,
                    path: [...path, edge.node2.label],
                });
            } else if (edge.node2 === node && !visited.has(edge.node1.label)) {
                priorityQueue.push({
                    node: edge.node1,
                    cost: cost + edge.cost,
                    path: [...path, edge.node1.label],
                });
            }
        });
    }

    drawGraph();
}

function highlightPath(path) {
    path.forEach(label => {
        const node = nodes.find(n => n.label === label);
        if (node) node.color = '#2ecc71';
    });
    drawGraph();
}

// ================== Move Node Functionality ==================
canvas.addEventListener('mousedown', (e) => {
    if (moveNodeButton.classList.contains('active')) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        selectedNodeForMove = nodes.find(node => node.isClicked(x, y));
        if (selectedNodeForMove) {
            isMovingNode = true;
            selectedNodeForMove.select();
            drawGraph();
        }
    } else if (addNodeButton.classList.contains('active')) {
        addNode(e);
    } else if (addEdgeButton.classList.contains('active')) {
        addEdge(e);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isMovingNode || !selectedNodeForMove) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    selectedNodeForMove.x = x;
    selectedNodeForMove.y = y;
    drawGraph();
});

canvas.addEventListener('mouseup', () => {
    if (isMovingNode) {
        isMovingNode = false;
        selectedNodeForMove.deselect();
        selectedNodeForMove = null;
        saveState();
    }
});

// ================== Node Selection Mode ==================
function enableSelectionMode(type) {
    isSelectingStart = type === 'start';
    isSelectingEnd = type === 'end';
    selectionMessage.textContent = `لطفا گره ${isSelectingStart ? 'شروع' : 'پایان'} را انتخاب کنید`;
    selectionMessage.style.display = 'block';

    addNodeButton.classList.remove('active');
    addEdgeButton.classList.remove('active');
    moveNodeButton.classList.remove('active');
}

// ================== Event Listeners ==================
document.querySelectorAll('#edgesTable thead th').forEach((th, index) => {
    if (index < 2) {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => sortEdges(index));
    }
});

addNodeButton.addEventListener('click', () => {
    addNodeButton.classList.add('active');
    addEdgeButton.classList.remove('active');
    moveNodeButton.classList.remove('active');
});

addEdgeButton.addEventListener('click', () => {
    addEdgeButton.classList.add('active');
    addNodeButton.classList.remove('active');
    moveNodeButton.classList.remove('active');
});

moveNodeButton.addEventListener('click', () => {
    moveNodeButton.classList.toggle('active');
    addNodeButton.classList.remove('active');
    addEdgeButton.classList.remove('active');
});

runUCSButton.addEventListener('click', () => {
    const startNodeLabel = startNodeInput.value.toUpperCase();
    const endNodeLabel = endNodeInput.value.toUpperCase();
    uniformCostSearch(startNodeLabel, endNodeLabel);
});

nextStepButton.addEventListener('click', nextStep);
deleteNodeButton.addEventListener('click', deleteSelectedNode);
undoButton.addEventListener('click', undo);

selectStartButton.addEventListener('click', () => {
    enableSelectionMode('start');
    canvas.style.cursor = 'pointer';
});

selectEndButton.addEventListener('click', () => {
    enableSelectionMode('end');
    canvas.style.cursor = 'pointer';
});

canvas.addEventListener('click', (e) => {
    if (!isSelectingStart && !isSelectingEnd) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = nodes.find(node => node.isClicked(x, y));

    if (node) {
        if (isSelectingStart) {
            startNodeInput.value = node.label;
        } else {
            endNodeInput.value = node.label;
        }
        selectionMessage.style.display = 'none';
        isSelectingStart = false;
        isSelectingEnd = false;
        canvas.style.cursor = 'default';
    } else {
        alert("⚠️ گره معتبر انتخاب نشد!");
    }
});

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
    }
});

// Initialize
saveState();
drawGraph();
updateEdgeTable();