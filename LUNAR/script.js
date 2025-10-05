// --- "BANCO DE DADOS" SIMULADO E DADOS DOS MÓDulos ---
const lunarZones = [ { id: 1, name: "Cratera Shackleton", solar: 95, water: "A+", terrain: "Estável", details: "Iluminação solar quase constante, ideal para energia. Acesso direto a depósitos de gelo de água." }, { id: 2, name: "Cratera Nobile", solar: 60, water: "C-", terrain: "Plano", details: "Terreno extremamente plano e seguro para pousos. Pobre em recursos hídricos." }, { id: 3, name: "Cratera de Gerlache", solar: 88, water: "B", terrain: "Irregular", details: "Ponto alto com boa iluminação e linha de visão direta com a Terra, excelente para comunicação." }, ];
const moduleData = {
    alojamentos: { name: 'Alojamentos', icon: 'fa-bed', colorClass: 'module-habitat' },
    estufa: { name: 'Estufa', icon: 'fa-leaf', colorClass: 'module-ltv' },
    cozinha: { name: 'Alimentos', icon: 'fa-utensils', colorClass: 'module-default' },
    refeitorio: { name: 'Refeitório', icon: 'fa-people-group', colorClass: 'module-default' },
    higiene: { name: 'Higiene', icon: 'fa-shower', colorClass: 'module-airlock' },
    hub: { name: 'Hub Central', icon: 'fa-display', colorClass: 'module-power' },
    recreacao: { name: 'Recreação', icon: 'fa-gamepad', colorClass: 'module-default' },
    Energia: { name: 'Energia', icon: 'fa-solar-panel', colorClass: 'module-default' },
    medico: { name: 'Medicina', icon: 'fa-kit-medical', colorClass: 'module-pressurized-rover' },
    quarentena: { name: 'Quarentena', icon: 'fa-biohazard', colorClass: 'module-pressurized-rover' },
    laboratorio: { name: 'Laboratório', icon: 'fa-flask', colorClass: 'module-isru' },
    telecom: { name: 'Comunicação', icon: 'fa-satellite-dish', colorClass: 'module-power' },
    residuos: { name: 'Reciclagem', icon: 'fa-recycle', colorClass: 'module-ltv' },
    manutencao: { name: 'Manutenção', icon: 'fa-screwdriver-wrench', colorClass: 'module-airlock' },
    isru: { name: 'ISRU', icon: 'fa-industry', colorClass: 'module-isru' },
    armazenamento: { name: 'Depósito', icon: 'fa-box-archive', colorClass: 'module-default' },
    suporte_eva: { name: 'Suporte EVA', icon: 'fa-person-walking-arrow-right', colorClass: 'module-airlock' },
};
const terrainData = [ { type: 'stable', x: 50, y: 50, radius: 40 }, { type: 'solar_hotspot', x: 15, y: 50, radius: 25 }, { type: 'unstable', x: 90, y: 15, radius: 18 }, { type: 'water_ice_deposit', x: 85, y: 85, radius: 20 }, ];

// --- ESTADO DA APLICAÇÃO ---
let selectedZone = null;
let modulesOnBlueprint = [];
let completedRings = [];
let ringConnections = [];
let nextRingId = 1;
let nextConnectionId = 1;
let activeModule = null;
let activeRing = null;
let isDraggingRing = false;
let dragStartPos = {};
let elementsToDrag = [];
let offsetX, offsetY;
let nextId = 1;
let ringChain = [];
let ringCenter = null;

// --- CONSTANTES ---
const HEX_WIDTH = 90;
const HEX_HEIGHT = 104;
const SNAP_RADIUS = HEX_WIDTH;
const COLLISION_THRESHOLD = 20;
const RING_SNAP_DISTANCE = HEX_WIDTH * 2.5;

// --- ELEMENTOS DO SITE (DOM) ---
const phase1Container = document.getElementById('phase1-container');
const phase2Container = document.getElementById('phase2-container');
const zoneOptionsContainer = document.querySelector('.zone-options-grid');
const sidePanel = document.getElementById('side-panel');
const blueprintArea = document.getElementById('blueprint-area');
const feedbackPanel = document.getElementById('feedback-panel');
const backToPhase1Btn = document.getElementById('back-to-phase1-btn');
const clearModulesBtn = document.getElementById('clear-modules-btn');

// --- NOVA FUNÇÃO PARA DESENHAR AS ZONAS DE TERRENO ---
function drawTerrainFeatures() {
    const existingZones = blueprintArea.querySelectorAll('.terrain-zone');
    existingZones.forEach(zone => zone.remove());

    const terrainLabels = {
        unstable: 'Terreno Instável',
        solar_hotspot: 'Ponto Solar',
        water_ice_deposit: 'Depósito de Gelo'
    };

    terrainData.forEach(zone => {
        if (zone.type === 'stable') return;

        const zoneEl = document.createElement('div');
        zoneEl.className = `terrain-zone terrain-${zone.type}`;
        
        const diameter = zone.radius * 2;
        zoneEl.style.width = `${diameter}%`;
        zoneEl.style.height = `${diameter}%`;
        zoneEl.style.left = `${zone.x}%`;
        zoneEl.style.top = `${zone.y}%`;

        const label = terrainLabels[zone.type] || zone.type;
        zoneEl.dataset.label = label;
        
        blueprintArea.appendChild(zoneEl);
    });
}


// --- LÓGICA DE NAVEGAÇÃO E RESET ---
function goToPhase1() {
    phase2Container.classList.add('hidden');
    phase1Container.classList.remove('hidden');
    resetPhase2();
}

function goToPhase2(zoneId) {
    selectedZone = lunarZones.find(zone => zone.id === zoneId);
    phase1Container.classList.add('hidden');
    phase2Container.classList.remove('hidden');
    drawTerrainFeatures(); // <--- ZONAS DE TERRENO SÃO DESENHADAS AQUI
    adjustBlueprintAreaHeight();
    provideFeedback();
}

function resetPhase2() {
    blueprintArea.innerHTML = '<div id="ring-guide-message" class="hidden"></div><div id="blueprint-info"> arraste os módulos para cá </div>';
    modulesOnBlueprint = [];
    completedRings = [];
    ringConnections = [];
    selectedZone = null;
    nextId = 1;
    nextRingId = 1;
    nextConnectionId = 1;
    ringChain = [];
    ringCenter = null;
    adjustBlueprintAreaHeight();
    updateRingGuideMessage();
    provideFeedback();
}

// --- FASE 1 ---
function initializePhase1() {
    zoneOptionsContainer.innerHTML = '';
    lunarZones.forEach(zone => {
        const card = document.createElement('div');
        card.className = 'zone-card';
        card.innerHTML = `<h3><i class="fa-solid fa-map-marker-alt"></i> ${zone.name}</h3><ul class="zone-stats"><li><strong>Solar:</strong> ${zone.solar}%</li><li><strong>Água:</strong> ${zone.water}</li><li><strong>Terreno:</strong> ${zone.terrain}</li></ul><p class="zone-details">${zone.details}</p><div class="select-zone-btn">Selecionar Zona</div>`;
        card.onclick = () => goToPhase2(zone.id);
        zoneOptionsContainer.appendChild(card);
    });
}

// --- FUNÇÕES AUXILIARES ---
function getModuleData(element) { return modulesOnBlueprint.find(m => m.element === element); }
function getModuleDataById(id) { return modulesOnBlueprint.find(m => m.id === id); }
function getRingById(id) { return completedRings.find(r => r.id === id); }
function getNeighborPoints(centerX, centerY) { return [ { x: centerX + HEX_WIDTH, y: centerY }, { x: centerX - HEX_WIDTH, y: centerY }, { x: centerX + HEX_WIDTH / 2, y: centerY - HEX_HEIGHT * 0.75 }, { x: centerX - HEX_WIDTH / 2, y: centerY - HEX_HEIGHT * 0.75 }, { x: centerX + HEX_WIDTH / 2, y: centerY + HEX_HEIGHT * 0.75 }, { x: centerX - HEX_WIDTH / 2, y: centerY + HEX_HEIGHT * 0.75 }, ]; }
function isPositionOccupied(targetX, targetY, ignoreActiveModule = false) {
    const modulesToCheck = ignoreActiveModule ? modulesOnBlueprint.filter(m => m.element !== activeModule) : modulesOnBlueprint;
    for (const module of modulesToCheck) {
        const moduleX = parseFloat(module.element.style.left) + HEX_WIDTH / 2;
        const moduleY = parseFloat(module.element.style.top) + HEX_HEIGHT / 2;
        if (Math.hypot(targetX - moduleX, targetY - moduleY) < COLLISION_THRESHOLD) { return true; }
    }
    for (const conn of ringConnections) {
        const connX = parseFloat(conn.element.style.left) + HEX_WIDTH / 2;
        const connY = parseFloat(conn.element.style.top) + HEX_HEIGHT / 2;
        if (Math.hypot(targetX - connX, connY - targetY) < COLLISION_THRESHOLD) { return true; }
    }
    return false;
}
function isAdjacentToRing(targetX, targetY) {
    for (const module of ringChain) {
        const moduleX = parseFloat(module.element.style.left) + HEX_WIDTH / 2;
        const moduleY = parseFloat(module.element.style.top) + HEX_HEIGHT / 2;
        const neighbors = getNeighborPoints(moduleX, moduleY);
        for (const neighbor of neighbors) {
            if (Math.hypot(targetX - neighbor.x, targetY - neighbor.y) < COLLISION_THRESHOLD) { return true; }
        }
    }
    return false;
}
function findRingCenter(chain) {
    if (chain.length < 2) return null;
    const firstModule = chain[0];
    const firstModulePos = { x: parseFloat(firstModule.element.style.left) + HEX_WIDTH / 2, y: parseFloat(firstModule.element.style.top) + HEX_HEIGHT / 2 };
    const potentialCenters = getNeighborPoints(firstModulePos.x, firstModulePos.y);
    const otherModules = chain.slice(1);
    for (const center of potentialCenters) {
        let isCommonNeighbor = true;
        for (const module of otherModules) {
            const modulePos = { x: parseFloat(module.element.style.left) + HEX_WIDTH / 2, y: parseFloat(module.element.style.top) + HEX_HEIGHT / 2 };
            const neighborsOfModule = getNeighborPoints(modulePos.x, modulePos.y);
            const isNeighbor = neighborsOfModule.some(p => Math.hypot(p.x - center.x, p.y - center.y) < COLLISION_THRESHOLD);
            if (!isNeighbor) { isCommonNeighbor = false; break; }
        }
        if (isCommonNeighbor) { return center; }
    }
    return null;
}
function createModule(type) {
    if (!moduleData[type]) { console.error(`Tipo de módulo desconhecido: ${type}`); return; }
    const blueprintInfo = document.getElementById('blueprint-info');
    if (blueprintInfo) blueprintInfo.style.display = 'none';
    let targetPosition = null;
    const startX = HEX_WIDTH;
    const startY = HEX_HEIGHT;
    if (ringChain.length >= 3 && ringChain.length < 6) {
        const endpoints = [ringChain[0], ringChain[ringChain.length - 1]];
        let idealPositions = [];
        for (const endpoint of endpoints) {
            const centerX = parseFloat(endpoint.element.style.left) + HEX_WIDTH / 2;
            const centerY = parseFloat(endpoint.element.style.top) + HEX_HEIGHT / 2;
            idealPositions.push(...getNeighborPoints(centerX, centerY));
        }
        for (const pos of idealPositions) {
            const neighborsOfCenter = getNeighborPoints(ringCenter.x, ringCenter.y);
            const isNeighborOfCenter = neighborsOfCenter.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < COLLISION_THRESHOLD);
            if (!isPositionOccupied(pos.x, pos.y) && isNeighborOfCenter) {
                targetPosition = pos;
                break;
            }
        }
        if (!targetPosition) {
            const positionsToVisit = [{ x: startX, y: startY }];
            const visitedPositions = new Set([`${startX},${startY}`]);
            let safetyBreak = 0;
            while (positionsToVisit.length > 0 && safetyBreak < 1000) {
                safetyBreak++;
                const currentPos = positionsToVisit.shift();
                if (!isPositionOccupied(currentPos.x, currentPos.y, false) && !isAdjacentToRing(currentPos.x, currentPos.y)) {
                    targetPosition = currentPos;
                    break;
                }
                const neighbors = getNeighborPoints(currentPos.x, currentPos.y);
                for (const neighbor of neighbors) {
                    const key = `${Math.round(neighbor.x)},${Math.round(neighbor.y)}`;
                    if (!visitedPositions.has(key)) {
                        visitedPositions.add(key);
                        positionsToVisit.push(neighbor);
                    }
                }
            }
        }
    } else {
        const positionsToVisit = [{ x: startX, y: startY }];
        const visitedPositions = new Set([`${startX},${startY}`]);
        let safetyBreak = 0;
        while (positionsToVisit.length > 0 && safetyBreak < 500) {
            safetyBreak++;
            const currentPos = positionsToVisit.shift();
            if (!isPositionOccupied(currentPos.x, currentPos.y, false)) {
                targetPosition = currentPos;
                break;
            }
            const neighbors = getNeighborPoints(currentPos.x, currentPos.y);
            for (const neighbor of neighbors) {
                const key = `${Math.round(neighbor.x)},${Math.round(neighbor.y)}`;
                if (!visitedPositions.has(key)) {
                    visitedPositions.add(key);
                    positionsToVisit.push(neighbor);
                }
            }
        }
    }
    if (!targetPosition) {
        alert("Não há local adequado para criar o novo módulo!");
        return;
    }
    const moduleInfo = moduleData[type];
    const newModuleData = { id: nextId++, element: document.createElement('div'), type: type, connections: [], ringId: null };
    const { element, id } = newModuleData;
    element.className = `module ${moduleInfo.colorClass}`;
    element.innerHTML = `<div class="delete-module-btn"><i class="fa-solid fa-times"></i></div><i class="fa-solid ${moduleInfo.icon}"></i><span>${moduleInfo.name}</span>`;
    element.dataset.id = id;
    element.style.left = `${targetPosition.x - HEX_WIDTH / 2}px`;
    element.style.top = `${targetPosition.y - HEX_HEIGHT / 2}px`;
    element.addEventListener('mousedown', startDrag);
    blueprintArea.appendChild(element);
    modulesOnBlueprint.push(newModuleData);
    adjustBlueprintAreaHeight();
    provideFeedback();
}
function findConnectedCluster(startRingId) {
    const queue = [startRingId];
    const visited = new Set([startRingId]);
    const ringsInCluster = [];
    const connectionsInCluster = [];
    while (queue.length > 0) {
        const currentRingId = queue.shift();
        const ring = getRingById(currentRingId);
        if (ring) ringsInCluster.push(ring);
        ringConnections.forEach(conn => {
            if (conn.ringA_id === currentRingId || conn.ringB_id === currentRingId) {
                if (!connectionsInCluster.some(c => c.id === conn.id)) {
                    connectionsInCluster.push(conn);
                }
                const otherRingId = conn.ringA_id === currentRingId ? conn.ringB_id : conn.ringA_id;
                if (!visited.has(otherRingId)) {
                    visited.add(otherRingId);
                    queue.push(otherRingId);
                }
            }
        });
    }
    return { rings: ringsInCluster, connections: connectionsInCluster };
}
function checkClusterCollision(draggedElements, totalDelta, staticModules, staticCorridors, ignoredModuleA_Id, ignoredModuleB_Id) {
    const staticElements = staticModules.filter(m => m.id !== ignoredModuleB_Id).map(m => m.element).concat(staticCorridors.map(c => c.element));
    const illegalPositions = new Set();
    for (const staticEl of staticElements) {
        const staticPos = { x: parseFloat(staticEl.style.left) + HEX_WIDTH / 2, y: parseFloat(staticEl.style.top) + HEX_HEIGHT / 2 };
        illegalPositions.add(`${Math.round(staticPos.x)},${Math.round(staticPos.y)}`);
        const neighbors = getNeighborPoints(staticPos.x, staticPos.y);
        for (const neighbor of neighbors) {
            illegalPositions.add(`${Math.round(neighbor.x)},${Math.round(neighbor.y)}`);
        }
    }
    for (const draggedEl of draggedElements) {
        if (!draggedEl.classList.contains('module') && !draggedEl.classList.contains('ring-center')) continue;
        const draggedModuleData = getModuleData(draggedEl);
        if (draggedModuleData && draggedModuleData.id === ignoredModuleA_Id) continue;
        const finalPos = { x: draggedEl.startLeft + totalDelta.x + HEX_WIDTH / 2, y: draggedEl.startTop + totalDelta.y + HEX_HEIGHT / 2 };
        const finalPosKey = `${Math.round(finalPos.x)},${Math.round(finalPos.y)}`;
        if (illegalPositions.has(finalPosKey)) {
            return true;
        }
    }
    return false;
}
function startDrag(event) {
    if (event.target.closest('.delete-module-btn') || event.target.closest('.ring-center')) { return; }
    const moduleToDrag = event.currentTarget;
    const moduleData = getModuleData(moduleToDrag);
    if (moduleData && moduleData.ringId) {
        isDraggingRing = true;
        const ringToDrag = getRingById(moduleData.ringId);
        activeRing = { rings: [ringToDrag], connections: [] };
        const connectionsToBreak = ringConnections.filter(c => c.ringA_id === ringToDrag.id || c.ringB_id === ringToDrag.id);
        connectionsToBreak.forEach(conn => {
            if (conn.element) conn.element.remove();
        });
        ringConnections = ringConnections.filter(c => !connectionsToBreak.some(cb => cb.id === c.id));
        dragStartPos = { x: event.clientX, y: event.clientY };
        elementsToDrag = ringToDrag.moduleIds.map(id => getModuleDataById(id).element);
        const centerElement = document.querySelector(`.ring-center[data-ring-id='${ringToDrag.id}']`);
        if (centerElement) elementsToDrag.push(centerElement);
        elementsToDrag.forEach(el => {
            el.style.transition = 'none';
            el.startLeft = parseFloat(el.style.left);
            el.startTop = parseFloat(el.style.top);
        });
    } else {
        isDraggingRing = false;
        if (moduleData && ringChain.length > 0 && ringChain.some(m => m.id === moduleData.id)) {
            const ringGuideMessage = document.getElementById('ring-guide-message');
            if (ringGuideMessage) {
                ringGuideMessage.textContent = "Exclua um módulo para quebrar o anel e movê-lo.";
                ringGuideMessage.classList.remove('hidden');
                setTimeout(() => { updateRingGuideMessage(); }, 2500);
            }
            event.preventDefault();
            return;
        }
        deselectAllModules();
        activeModule = moduleToDrag;
        activeModule.style.transition = 'none';
        activeModule.originalPosition = { left: activeModule.style.left, top: activeModule.style.top };
        if (moduleData && moduleData.connections.length > 0) {
            activeModule.originalConnections = [...moduleData.connections];
            moduleData.connections.forEach(neighborId => {
                const neighborData = getModuleDataById(neighborId);
                if (neighborData) { neighborData.connections = neighborData.connections.filter(id => id !== moduleData.id); }
            });
            moduleData.connections = [];
        } else if (moduleData) {
            activeModule.originalConnections = [];
        }
        offsetX = event.clientX - activeModule.getBoundingClientRect().left;
        offsetY = event.clientY - activeModule.getBoundingClientRect().top;
    }
    window.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', stopDrag);
}
function drag(event) {
    if (isDraggingRing) {
        const deltaX = event.clientX - dragStartPos.x;
        const deltaY = event.clientY - dragStartPos.y;
        elementsToDrag.forEach(el => {
            el.style.left = `${el.startLeft + deltaX}px`;
            el.style.top = `${el.startTop + deltaY}px`;
        });
    } else if (activeModule) {
        event.preventDefault();
        const blueprintRect = blueprintArea.getBoundingClientRect();
        let newX = event.clientX - blueprintRect.left - offsetX; let newY = event.clientY - blueprintRect.top - offsetY;
        newX = Math.max(0, Math.min(newX, blueprintRect.width - activeModule.offsetWidth));
        newY = Math.max(0, Math.min(newY, blueprintRect.height - activeModule.offsetHeight));
        activeModule.style.left = `${newX}px`; activeModule.style.top = `${newY}px`;
    }
}
function stopDrag(event) {
    window.removeEventListener('mousemove', drag);
    window.removeEventListener('mouseup', stopDrag);
    if (isDraggingRing) {
        let deltaX = event.clientX - dragStartPos.x;
        let deltaY = event.clientY - dragStartPos.y;
        const activeRingIds = activeRing.rings.map(r => r.id);
        const activeConnIds = activeRing.connections.map(c => c.id);
        const otherRings = completedRings.filter(r => !activeRingIds.includes(r.id));
        let bestSnap = { dropDistance: Infinity, totalDelta: { x: deltaX, y: deltaY }, corridor: null };
        const staticModules = modulesOnBlueprint.filter(m => !m.ringId || !activeRingIds.includes(m.ringId));
        const staticCorridors = ringConnections.filter(c => !activeConnIds.includes(c.id));
        for (const draggedRing of activeRing.rings) {
            for (const moduleA_data of draggedRing.moduleIds.map(id => getModuleDataById(id))) {
                const moduleA = moduleA_data.element;
                for (const staticRing of otherRings) {
                    if (connectionExists(draggedRing.id, staticRing.id)) continue;
                    for (const moduleB_data of staticRing.moduleIds.map(id => getModuleDataById(id))) {
                        const moduleB = moduleB_data.element;
                        const modA_current_pos = { x: moduleA.startLeft + deltaX + HEX_WIDTH / 2, y: moduleA.startTop + deltaY + HEX_HEIGHT / 2 };
                        const modB_pos = { x: parseFloat(moduleB.style.left) + HEX_WIDTH / 2, y: parseFloat(moduleB.style.top) + HEX_HEIGHT / 2 };
                        const corridorPoints = getNeighborPoints(modB_pos.x, modB_pos.y);
                        for (const corridorPoint of corridorPoints) {
                            const snapPoints = getNeighborPoints(corridorPoint.x, corridorPoint.y);
                            for (const snapPoint of snapPoints) {
                                if (Math.hypot(snapPoint.x - modB_pos.x, snapPoint.y - modB_pos.y) < 10) continue;
                                const dropDistance = Math.hypot(modA_current_pos.x - snapPoint.x, modA_current_pos.y - snapPoint.y);
                                if (dropDistance < RING_SNAP_DISTANCE) {
                                    const snapDelta = { x: snapPoint.x - modA_current_pos.x, y: snapPoint.y - modA_current_pos.y };
                                    const totalDelta = { x: deltaX + snapDelta.x, y: deltaY + snapDelta.y };
                                    if (!checkClusterCollision(elementsToDrag, totalDelta, staticModules, staticCorridors, moduleA_data.id, moduleB_data.id)) {
                                        if (dropDistance < bestSnap.dropDistance) {
                                            bestSnap = {
                                                dropDistance: dropDistance,
                                                totalDelta: totalDelta,
                                                corridor: { pos: corridorPoint, ringA_id: moduleA_data.ringId, ringB_id: moduleB_data.ringId }
                                            };
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        deltaX = bestSnap.totalDelta.x;
        deltaY = bestSnap.totalDelta.y;
        if (bestSnap.corridor) {
            const newConnection = {
                id: nextConnectionId++,
                ringA_id: bestSnap.corridor.ringA_id,
                ringB_id: bestSnap.corridor.ringB_id,
                element: createCorridorElement(bestSnap.corridor.pos)
            };
            ringConnections.push(newConnection);
        }
        elementsToDrag.forEach(el => {
            el.style.left = `${el.startLeft + deltaX}px`;
            el.style.top = `${el.startTop + deltaY}px`;
            el.style.transition = 'left 0.2s ease, top 0.2s ease';
        });
        activeRing.rings.forEach(r => {
            const centerEl = document.querySelector(`.ring-center[data-ring-id='${r.id}']`);
            if (centerEl) {
                r.center.x = parseFloat(centerEl.style.left) + HEX_WIDTH / 2;
                r.center.y = parseFloat(centerEl.style.top) + HEX_HEIGHT / 2;
            }
        });
        checkForImplicitConnections(activeRing);
        isDraggingRing = false;
        activeRing = null;
        elementsToDrag = [];
        provideFeedback();
        adjustBlueprintAreaHeight();
        return;
    }
    if (!activeModule) return;
    activeModule.style.transition = 'transform 0.2s ease, filter 0.2s ease, left 0.2s ease, top 0.2s ease';
    const dropX = parseFloat(activeModule.style.left) + HEX_WIDTH / 2;
    const dropY = parseFloat(activeModule.style.top) + HEX_HEIGHT / 2;
    const draggedModuleData = getModuleData(activeModule);
    let bestSnapPos = null;
    let minSnapDist = SNAP_RADIUS;
    modulesOnBlueprint.forEach(existingModule => {
        if (existingModule.element === activeModule) return;
        const centerX = parseFloat(existingModule.element.style.left) + HEX_WIDTH / 2;
        const centerY = parseFloat(existingModule.element.style.top) + HEX_HEIGHT / 2;
        getNeighborPoints(centerX, centerY).forEach(point => {
            const dist = Math.hypot(dropX - point.x, dropY - point.y);
            if (dist < minSnapDist) {
                minSnapDist = dist;
                bestSnapPos = point;
            }
        });
    });
    let isValidMove = false;
    let finalPosition = null;
    let targetNeighbors = [];
    if (!bestSnapPos) {
        isValidMove = true;
        finalPosition = { x: dropX, y: dropY };
    } else {
        targetNeighbors = modulesOnBlueprint.filter(m => {
            if (m.element === activeModule) return false;
            const mX = parseFloat(m.element.style.left) + HEX_WIDTH / 2;
            const mY = parseFloat(m.element.style.top) + HEX_HEIGHT / 2;
            return getNeighborPoints(mX, mY).some(p => Math.hypot(p.x - bestSnapPos.x, p.y - bestSnapPos.y) < COLLISION_THRESHOLD);
        });
        if (isPositionOccupied(bestSnapPos.x, bestSnapPos.y, true)) {
            isValidMove = false;
        } else {
            const isConnectingToActiveRing = ringChain.length > 0 && targetNeighbors.some(n => ringChain.some(rc => rc.id === n.id));
            if (isConnectingToActiveRing) {
                const endpoints = [ringChain[0], ringChain[ringChain.length - 1]];
                const connectsToEndpoints = targetNeighbors.filter(n => endpoints.some(e => e.id === n.id));
                const neighborsOfCenter = getNeighborPoints(ringCenter.x, ringCenter.y);
                const isDropPosNeighborOfCenter = neighborsOfCenter.some(p => Math.hypot(p.x - bestSnapPos.x, p.y - bestSnapPos.y) < COLLISION_THRESHOLD);
                if (isDropPosNeighborOfCenter) {
                    if (ringChain.length < 5 && connectsToEndpoints.length === 1 && targetNeighbors.length === 1) isValidMove = true;
                    else if (ringChain.length === 5 && connectsToEndpoints.length === 2 && targetNeighbors.length === 2) isValidMove = true;
                }
            } else {
                const isTargetFull = targetNeighbors.some(m => m.connections.length >= 2);
                const wouldBeFull = draggedModuleData.connections.length + targetNeighbors.length > 2;
                if (!isTargetFull && !wouldBeFull) isValidMove = true;
            }
        }
        if (isValidMove) finalPosition = bestSnapPos;
    }
    if (isValidMove && finalPosition) {
        activeModule.style.left = `${finalPosition.x - HEX_WIDTH / 2}px`;
        activeModule.style.top = `${finalPosition.y - HEX_HEIGHT / 2}px`;
        if (bestSnapPos) {
            targetNeighbors.forEach(neighbor => {
                draggedModuleData.connections.push(neighbor.id);
                neighbor.connections.push(draggedModuleData.id);
            });
            const isConnectingToActiveRing = ringChain.length > 0 && targetNeighbors.some(n => ringChain.some(rc => rc.id === n.id));
            if (isConnectingToActiveRing) {
                const first = ringChain[0];
                if (targetNeighbors.some(n => n.id === first.id)) ringChain.unshift(draggedModuleData);
                else ringChain.push(draggedModuleData);
                if (ringChain.length === 6) {
                    const newRing = completeRing(ringChain, ringCenter);
                    if (newRing) {
                        checkForImplicitConnections({ rings: [newRing], connections: [] });
                    }
                    ringChain = [];
                    ringCenter = null;
                }
            } else if (ringChain.length === 0) {
                const newChain = findChainFrom(draggedModuleData);
                if (newChain.length >= 2) {
                    const center = findRingCenter(newChain);
                    if (center && newChain.length === 3) {
                        ringChain = newChain;
                        ringCenter = center;
                    }
                }
            }
        }
    } else {
        activeModule.style.left = activeModule.originalPosition.left;
        activeModule.style.top = activeModule.originalPosition.top;
        if (draggedModuleData && activeModule.originalConnections) {
            activeModule.originalConnections.forEach(neighborId => {
                const neighborData = getModuleDataById(neighborId);
                if (neighborData) neighborData.connections.push(draggedModuleData.id);
            });
            draggedModuleData.connections = activeModule.originalConnections;
        }
    }
    updateRingGuideMessage();
    checkAllCollisions();
    provideFeedback();
    adjustBlueprintAreaHeight();
    activeModule = null;
}

// --- NOVAS FUNÇÕES ---
function completeRing(chain, center) {
    const newRingId = nextRingId++;
    const moduleIds = chain.map(m => m.id);
    const newRing = { id: newRingId, center: { ...center }, moduleIds: moduleIds, name: '' };
    completedRings.push(newRing);
    chain.forEach((moduleInChain, i) => {
        const moduleData = getModuleDataById(moduleInChain.id);
        if (moduleData) {
            moduleData.ringId = newRingId;
            const prevNeighborId = chain[(i - 1 + chain.length) % chain.length].id;
            const nextNeighborId = chain[(i + 1) % chain.length].id;
            moduleData.connections = [prevNeighborId, nextNeighborId];
        }
    });
    createCenterElement(newRing);
    return newRing;
}
function createCenterElement(ring) {
    const centerEl = document.createElement('div');
    centerEl.className = 'ring-center';
    centerEl.dataset.ringId = ring.id;
    centerEl.style.left = `${ring.center.x - HEX_WIDTH / 2}px`;
    centerEl.style.top = `${ring.center.y - HEX_HEIGHT / 2}px`;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Nome da Zona';
    input.addEventListener('blur', () => saveRingName(input, ring.id));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { input.blur(); } });
    centerEl.appendChild(input);
    blueprintArea.appendChild(centerEl);
    input.focus();
}
function saveRingName(inputElement, ringId) {
    const ring = completedRings.find(r => r.id === ringId);
    if (!ring) return;
    const name = inputElement.value.trim();
    ring.name = name;
    const parent = inputElement.parentElement;
    parent.innerHTML = '';
    if (name) {
        const nameSpan = document.createElement('span');
        nameSpan.className = 'ring-name';
        nameSpan.textContent = name;
        parent.appendChild(nameSpan);
    }
}
// ... (código anterior) ...

// Função para criar o elemento visual do corredor
function createCorridorElement(pos) {
    const corridorEl = document.createElement('div');
    corridorEl.className = 'corridor-module airlock-corridor'; // Adiciona a nova classe 'airlock-corridor'
    corridorEl.style.left = `${pos.x - HEX_WIDTH / 2}px`;
    corridorEl.style.top = `${pos.y - HEX_HEIGHT / 2}px`;

    // Adiciona o texto "AIRLOCK"
    const textSpan = document.createElement('span');
    textSpan.textContent = 'AIRLOCK';
    corridorEl.appendChild(textSpan);

    blueprintArea.appendChild(corridorEl);
    return corridorEl;
}

// ... (restante do código) ...
function findClosestModulePair(ringA, ringB) {
    let closest = { distance: Infinity, moduleA: null, moduleB: null };
    for (const modA_data of ringA.moduleIds.map(id => getModuleDataById(id))) {
        for (const modB_data of ringB.moduleIds.map(id => getModuleDataById(id))) {
            const modA_pos = { x: parseFloat(modA_data.element.style.left) + HEX_WIDTH / 2, y: parseFloat(modA_data.element.style.top) + HEX_HEIGHT / 2 };
            const modB_pos = { x: parseFloat(modB_data.element.style.left) + HEX_WIDTH / 2, y: parseFloat(modB_data.element.style.top) + HEX_HEIGHT / 2 };
            const dist = Math.hypot(modA_pos.x - modB_pos.x, modA_pos.y - modB_pos.y);
            if (dist < closest.distance) {
                closest = { distance: dist, moduleA: modA_data, moduleB: modB_data };
            }
        }
    }
    return closest;
}
function connectionExists(ringIdA, ringIdB) {
    return ringConnections.some(c => (c.ringA_id === ringIdA && c.ringB_id === ringIdB) || (c.ringB_id === ringIdA && c.ringA_id === ringIdB));
}
function checkForImplicitConnections(movedCluster) {
    const movedRings = movedCluster.rings;
    const allOtherRings = completedRings.filter(r => !movedRings.some(mr => mr.id === r.id));
    for (const movedRing of movedRings) {
        for (const staticRing of allOtherRings) {
            if (connectionExists(movedRing.id, staticRing.id)) continue;
            const closestPair = findClosestModulePair(movedRing, staticRing);
            if (Math.abs(closestPair.distance - (HEX_WIDTH * 2)) < 20) {
                const modA_pos = { x: parseFloat(closestPair.moduleA.element.style.left) + HEX_WIDTH / 2, y: parseFloat(closestPair.moduleA.element.style.top) + HEX_HEIGHT / 2 };
                const modB_pos = { x: parseFloat(closestPair.moduleB.element.style.left) + HEX_WIDTH / 2, y: parseFloat(closestPair.moduleB.element.style.top) + HEX_HEIGHT / 2 };

                let corridorPos = null;
                const neighborsOfA = getNeighborPoints(modA_pos.x, modA_pos.y);
                const neighborsOfB = getNeighborPoints(modB_pos.x, modB_pos.y);
                for (const nA of neighborsOfA) {
                    for (const nB of neighborsOfB) {
                        if (Math.hypot(nA.x - nB.x, nA.y - nB.y) < 1) {
                            corridorPos = nA;
                            break;
                        }
                    }
                    if (corridorPos) break;
                }

                if (corridorPos && !isPositionOccupied(corridorPos.x, corridorPos.y)) {
                    const newConnection = {
                        id: nextConnectionId++,
                        ringA_id: movedRing.id,
                        ringB_id: staticRing.id,
                        element: createCorridorElement(corridorPos)
                    };
                    ringConnections.push(newConnection);
                }
            }
        }
    }
}
function adjustBlueprintAreaHeight() {
    const allElements = blueprintArea.querySelectorAll('.module, .ring-center, .corridor-module');
    if (allElements.length === 0) {
        blueprintArea.style.height = '650px';
        return;
    }
    let maxBottom = 0;
    allElements.forEach(el => {
        const bottom = parseFloat(el.style.top) + el.offsetHeight;
        if (bottom > maxBottom) {
            maxBottom = bottom;
        }
    });
    const newHeight = maxBottom + 50;
    blueprintArea.style.height = `${Math.max(650, newHeight)}px`;
}

// --- FUNÇÕES DE FEEDBACK E UTILITÁRIAS ---
function findChainFrom(startModule) {
    let chain = [startModule];
    let currentNode = startModule;
    let prevNode = null;
    while (currentNode.connections.length > 0) {
        const nextNodeId = currentNode.connections.find(id => id !== (prevNode ? prevNode.id : null));
        if (!nextNodeId) break;
        const nextNode = getModuleDataById(nextNodeId);
        if (!nextNode || chain.some(m => m.id === nextNode.id)) break;
        chain.push(nextNode);
        prevNode = currentNode;
        currentNode = nextNode;
    }
    if (chain.some(m => m.connections.length > 2)) return [];
    return chain;
}
function updateRingGuideMessage() {
    const ringGuideMessage = document.getElementById('ring-guide-message');
    if (!ringGuideMessage) return;
    if (ringChain.length >= 3 && ringChain.length < 6) {
        ringGuideMessage.textContent = `Modo Anel Ativado! Conecte nas pontas para fechar o anel de 6.`;
        ringGuideMessage.classList.remove('hidden');
    } else {
        ringGuideMessage.classList.add('hidden');
    }
}
function checkCollision(moduleA, moduleB) { const centerA = { x: parseFloat(moduleA.style.left) + HEX_WIDTH / 2, y: parseFloat(moduleA.style.top) + HEX_HEIGHT / 2 }; const centerB = { x: parseFloat(moduleB.style.left) + HEX_WIDTH / 2, y: parseFloat(moduleB.style.top) + HEX_HEIGHT / 2 }; const distance = Math.sqrt(Math.pow(centerA.x - centerB.x, 2) + Math.pow(centerA.y - centerB.y, 2)); return distance < COLLISION_THRESHOLD; }
function checkAllCollisions() { const allModules = modulesOnBlueprint.map(m => m.element); allModules.forEach(m => m.classList.remove('module-colliding')); for (let i = 0; i < allModules.length; i++) { for (let j = i + 1; j < allModules.length; j++) { const moduleA = allModules[i]; const moduleB = allModules[j]; if (checkCollision(moduleA, moduleB)) { moduleA.classList.add('module-colliding'); moduleB.classList.add('module-colliding'); } } } }
function getTerrainInfoForModule(moduleElement) {
    const moduleData = getModuleData(moduleElement);
    if (moduleData && moduleData.ringId) {
        const ring = completedRings.find(r => r.id === moduleData.ringId);
        if (!ring) return ['stable'];
        const blueprintRect = blueprintArea.getBoundingClientRect();
        const ringCenterX = ring.center.x / blueprintRect.width * 100;
        const ringCenterY = ring.center.y / blueprintRect.height * 100;
        let terrainFeatures = [];
        terrainData.forEach(zone => {
            const distance = Math.sqrt(Math.pow(ringCenterX - zone.x, 2) + Math.pow(ringCenterY - zone.y, 2));
            if (distance <= zone.radius) { terrainFeatures.push(zone.type); }
        });
        if (!terrainFeatures.includes('unstable')) terrainFeatures.push('stable');
        return terrainFeatures;
    } else {
        const blueprintRect = blueprintArea.getBoundingClientRect();
        const moduleRect = moduleElement.getBoundingClientRect();
        const moduleCenterX = ((moduleRect.left - blueprintRect.left) + (moduleRect.width / 2)) / blueprintRect.width * 100;
        const moduleCenterY = ((moduleRect.top - blueprintRect.top) + (moduleRect.height / 2)) / blueprintRect.height * 100;
        let terrainFeatures = [];
        terrainData.forEach(zone => { const distance = Math.sqrt(Math.pow(moduleCenterX - zone.x, 2) + Math.pow(moduleCenterY - zone.y, 2)); if (distance <= zone.radius) { terrainFeatures.push(zone.type); } });
        if (terrainFeatures.length === 0 || !terrainFeatures.includes('unstable')) { if (!terrainFeatures.includes('stable')) { terrainFeatures.push('stable'); } }
        return terrainFeatures;
    }
}
function provideFeedback() {
    if (!selectedZone) return;
    let feedbackMessages = [];
    const currentModuleTypes = new Set(modulesOnBlueprint.map(m => m.type));

    // Alertas existentes (não foram modificados)
    if (document.querySelector('.module-colliding')) {
        feedbackMessages.push(`<p class='feedback-danger'><strong>ERRO DE LAYOUT:</strong> Módulos estão sobrepostos!</p>`);
    }
    if (modulesOnBlueprint.length > 0 && !currentModuleTypes.has('hub')) {
        feedbackMessages.push(`<p class='feedback-warn'><strong>ALERTA:</strong> A base não possui um Hub Central para monitoramento.</p>`);
    }
    if (modulesOnBlueprint.length > 0 && !currentModuleTypes.has('alojamentos')) {
        feedbackMessages.push(`<p class='feedback-danger'><strong>ALERTA CRÍTICO:</strong> A tripulação não tem onde viver.</p>`);
    }

    // Loop para checar terreno instável e a nova condição do módulo de Energia
    modulesOnBlueprint.forEach(module => {
        const terrainInfo = getTerrainInfoForModule(module.element);

        // Alerta de terreno instável (não foi modificado)
        if (terrainInfo.includes('unstable')) {
            const name = module.ringId ? (getRingById(module.ringId) || {}).name || `Anel #${module.ringId}` : (moduleData[module.type] || {}).name;
            feedbackMessages.push(`<p class='feedback-danger'><strong>PERIGO:</strong> O módulo <strong>${name}</strong> está em terreno instável.</p>`);
        }

        // --- NOVA LÓGICA ADICIONADA AQUI ---
        // Se o módulo for de Energia, verifica se ele NÃO está no ponto solar
        if (module.type === 'Energia' && !terrainInfo.includes('solar_hotspot')) {
            feedbackMessages.push(`<p class='feedback-warn'><strong>AVISO DE ENERGIA:</strong> O módulo de <strong>Energia</strong> está em uma região de baixa exposição solar. Aproxime-o da zona solar para otimizar a geração.</p>`);
        }
        // --- FIM DA NOVA LÓGICA ---
    });

    const title = `<h3><i class="fa-solid fa-chart-line"></i> Análise de Viabilidade</h3>`;
    if (feedbackMessages.length > 0) {
        feedbackPanel.innerHTML = title + feedbackMessages.join('');
    } else if (modulesOnBlueprint.length > 0) {
        feedbackPanel.innerHTML = title + `<p class="feedback-good"><strong>Layout Otimizado:</strong> Todos os sistemas estão operacionais!</p>`;
    } else {
        feedbackPanel.innerHTML = title + `<p>Adicione módulos para iniciar a análise...</p>`;
    }
}
function clearModules() { const confirmClear = confirm("Tem certeza que deseja limpar todos os módulos do layout? Esta ação não pode ser desfeita."); if (!confirmClear) return; resetPhase2(); }
function deselectAllModules() { document.querySelectorAll('.module-selected').forEach(m => { m.classList.remove('module-selected'); }); }
function deleteModule(moduleElement) {
    if (!moduleElement) return;
    const moduleDataToDelete = getModuleData(moduleElement);
    if (moduleDataToDelete) {
        if (moduleDataToDelete.ringId) {
            const cluster = findConnectedCluster(moduleDataToDelete.ringId);
            cluster.rings.forEach(ring => {
                ring.moduleIds.forEach(id => getModuleDataById(id).element.remove());
                const centerEl = document.querySelector(`.ring-center[data-ring-id='${ring.id}']`);
                if (centerEl) centerEl.remove();
            });
            cluster.connections.forEach(conn => conn.element.remove());
            const clusterRingIds = cluster.rings.map(r => r.id);
            modulesOnBlueprint = modulesOnBlueprint.filter(m => !clusterRingIds.includes(m.ringId));
            completedRings = completedRings.filter(r => !clusterRingIds.includes(r.id));
            ringConnections = ringConnections.filter(conn => !cluster.connections.map(c => c.id).includes(conn.id));
        } else {
            moduleDataToDelete.connections.forEach(neighborId => {
                const neighborData = getModuleDataById(neighborId);
                if (neighborData) { neighborData.connections = neighborData.connections.filter(id => id !== moduleDataToDelete.id); }
            });
            if (ringChain.some(m => m.id === moduleDataToDelete.id)) {
                ringChain = [];
                ringCenter = null;
                updateRingGuideMessage();
            }
            modulesOnBlueprint = modulesOnBlueprint.filter(mod => mod.id !== moduleDataToDelete.id);
            moduleElement.remove();
        }
    }
    adjustBlueprintAreaHeight();
    provideFeedback();
    if (modulesOnBlueprint.length === 0) { const blueprintInfo = document.getElementById('blueprint-info'); if (blueprintInfo) blueprintInfo.style.display = 'block'; }
}

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    initializePhase1();
    blueprintArea.addEventListener('click', (event) => {
        const clickedModule = event.target.closest('.module');
        const deleteButton = event.target.closest('.delete-module-btn');
        if (deleteButton) { deleteModule(clickedModule); event.stopPropagation(); }
        else if (clickedModule) { deselectAllModules(); clickedModule.classList.add('module-selected'); }
        else { deselectAllModules(); }
    });
    sidePanel.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-module]');
        if (button) { createModule(button.dataset.module); }
    });
    backToPhase1Btn.addEventListener('click', goToPhase1);
    if (clearModulesBtn) { clearModulesBtn.addEventListener('click', clearModules); }

    const allCategories = document.querySelectorAll('.module-category');
    allCategories.forEach(category => {
        category.addEventListener('toggle', (event) => {
            const toggledDetails = event.target;
            if (toggledDetails.open) {
                allCategories.forEach(otherCategory => {
                    if (otherCategory !== toggledDetails) {
                        otherCategory.open = false;
                    }
                });
            }
        });
    });
});

