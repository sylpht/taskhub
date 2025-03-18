/**
 * kanban.js
 * Модуль для создания и управления Kanban-доской с функцией перетаскивания
 */

class KanbanBoard {
    constructor(storage) {
        // Использование переданного хранилища или IndexedDB по умолчанию
        this.storage = storage || window.indexedDBStorage;
        
        // Настройки колонок по умолчанию
        this.defaultColumns = [
            {
                id: 'backlog',
                title: 'Бэклог',
                limit: 0, // 0 = без лимита
                color: '#4361ee'
            },
            {
                id: 'todo',
                title: 'К выполнению',
                limit: 0,
                color: '#4cc9f0'
            },
            {
                id: 'in_progress',
                title: 'В процессе',
                limit: 5,
                color: '#ffbe0b'
            },
            {
                id: 'review',
                title: 'На проверке',
                limit: 0,
                color: '#8338ec'
            },
            {
                id: 'done',
                title: 'Выполнено',
                limit: 0,
                color: '#2dc653'
            }
        ];
        
        // Ключ для хранения настроек Kanban-доски в localStorage
        this.settingsKey = 'taskhub_kanban_settings';
        
        // Инициализация
        this.columns = this.loadSettings();
    }

    /**
     * Загрузка настроек Kanban-доски
     * @returns {Array} Массив колонок
     */
    loadSettings() {
        try {
            const settingsJson = localStorage.getItem(this.settingsKey);
            
            if (!settingsJson) {
                return [...this.defaultColumns];
            }
            
            const settings = JSON.parse(settingsJson);
            
            // Проверка корректности структуры
            if (!Array.isArray(settings) || settings.length === 0) {
                return [...this.defaultColumns];
            }
            
            // Проверка наличия обязательных полей
            const isValid = settings.every(column => {
                return column.id && column.title;
            });
            
            if (!isValid) {
                return [...this.defaultColumns];
            }
            
            return settings;
        } catch (error) {
            console.error('Ошибка загрузки настроек Kanban-доски:', error);
            return [...this.defaultColumns];
        }
    }

    /**
     * Сохранение настроек Kanban-доски
     */
    saveSettings() {
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify(this.columns));
        } catch (error) {
            console.error('Ошибка сохранения настроек Kanban-доски:', error);
        }
    }

    /**
     * Сброс настроек доски к значениям по умолчанию
     */
    resetSettings() {
        this.columns = [...this.defaultColumns];
        this.saveSettings();
    }

    /**
     * Добавление новой колонки
     * @param {Object} column Объект колонки
     * @returns {boolean} Результат добавления
     */
    addColumn(column) {
        // Проверка обязательных полей
        if (!column.id || !column.title) {
            return false;
        }
        
        // Проверка уникальности ID
        if (this.columns.some(c => c.id === column.id)) {
            return false;
        }
        
        // Установка значений по умолчанию для необязательных полей
        column.limit = column.limit || 0;
        column.color = column.color || '#6c757d';
        
        // Добавление колонки
        this.columns.push(column);
        this.saveSettings();
        
        return true;
    }

    /**
     * Удаление колонки
     * @param {string} columnId ID колонки
     * @returns {boolean} Результат удаления
     */
    removeColumn(columnId) {
        const initialLength = this.columns.length;
        
        // Минимум 1 колонка должна остаться
        if (initialLength <= 1) {
            return false;
        }
        
        this.columns = this.columns.filter(column => column.id !== columnId);
        
        if (this.columns.length < initialLength) {
            this.saveSettings();
            return true;
        }
        
        return false;
    }

    /**
     * Обновление колонки
     * @param {string} columnId ID колонки
     * @param {Object} updatedData Обновленные данные
     * @returns {boolean} Результат обновления
     */
    updateColumn(columnId, updatedData) {
        const columnIndex = this.columns.findIndex(column => column.id === columnId);
        
        if (columnIndex === -1) {
            return false;
        }
        
        // Запрет изменения ID
        delete updatedData.id;
        
        // Обновление полей
        this.columns[columnIndex] = {
            ...this.columns[columnIndex],
            ...updatedData
        };
        
        this.saveSettings();
        return true;
    }

    /**
     * Изменение порядка колонок
     * @param {string} columnId ID перемещаемой колонки
     * @param {number} newPosition Новая позиция
     * @returns {boolean} Результат перемещения
     */
    moveColumn(columnId, newPosition) {
        const oldIndex = this.columns.findIndex(column => column.id === columnId);
        
        if (oldIndex === -1 || newPosition < 0 || newPosition >= this.columns.length) {
            return false;
        }
        
        // Перемещение элемента
        const column = this.columns[oldIndex];
        this.columns.splice(oldIndex, 1);
        this.columns.splice(newPosition, 0, column);
        
        this.saveSettings();
        return true;
    }

    /**
     * Проверка превышения лимита колонки
     * @param {string} columnId ID колонки
     * @param {Array} tasks Массив задач
     * @returns {boolean} true, если лимит превышен
     */
    isColumnLimitExceeded(columnId, tasks) {
        const column = this.columns.find(col => col.id === columnId);
        
        if (!column || column.limit === 0) {
            return false;
        }
        
        const tasksInColumn = tasks.filter(task => task.kanbanColumn === columnId);
        return tasksInColumn.length >= column.limit;
    }

    /**
     * Обновление статуса задачи при перемещении между колонками
     * @param {Object} task Объект задачи
     * @param {string} columnId ID новой колонки
     * @returns {Object} Обновленная задача
     */
    updateTaskStatusByColumn(task, columnId) {
        const updatedTask = { ...task };
        
        // Обновление колонки
        updatedTask.kanbanColumn = columnId;
        
        // Автоматическое обновление статуса в зависимости от колонки
        switch (columnId) {
            case 'done':
                updatedTask.completed = true;
                break;
            case 'backlog':
            case 'todo':
            case 'in_progress':
            case 'review':
                updatedTask.completed = false;
                break;
        }
        
        return updatedTask;
    }

    /**
     * Создание DOM-элемента Kanban-доски
     * @returns {HTMLElement} DOM-элемент доски
     */
    async createKanbanBoard() {
        // Получение всех задач
        const tasks = await this.storage.getTasks();
        
        // Создание контейнера доски
        const container = document.createElement('div');
        container.className = 'kanban-board';
        
        // Создание заголовка и кнопок управления
        const header = document.createElement('div');
        header.className = 'kanban-header';
        header.innerHTML = `
            <h2 class="kanban-title">Канбан-доска</h2>
            <div class="kanban-actions">
                <button id="kanbanSettings" class="btn btn-outline btn-icon" title="Настройки доски">
                    <i class="fas fa-cog"></i>
                </button>
                <button id="addTask" class="btn btn-primary">
                    <i class="fas fa-plus"></i>
                    <span>Новая задача</span>
                </button>
            </div>
        `;
        
        container.appendChild(header);
        
        // Создание контейнера для колонок
        const columnsContainer = document.createElement('div');
        columnsContainer.className = 'kanban-columns';
        
        // Создание колонок
        this.columns.forEach(column => {
            const columnElement = this.createColumnElement(column, tasks);
            columnsContainer.appendChild(columnElement);
        });
        
        container.appendChild(columnsContainer);
        
        // Добавление обработчиков событий после добавления в DOM
        setTimeout(() => {
            // Обработчик настроек доски
            document.getElementById('kanbanSettings').addEventListener('click', () => {
                this.showBoardSettings();
            });
            
            // Обработчик создания новой задачи
            document.getElementById('addTask').addEventListener('click', () => {
                // Проверяем существование функции и вызываем
                if (typeof window.showTaskModal === 'function') {
                    window.showTaskModal();
                }
            });
        }, 0);
        
        return container;
    }

    /**
     * Создание элемента колонки
     * @param {Object} column Объект колонки
     * @param {Array} tasks Массив задач
     * @returns {HTMLElement} DOM-элемент колонки
     */
    createColumnElement(column, tasks) {
        // Фильтрация задач для колонки
        let columnTasks = tasks.filter(task => task.kanbanColumn === column.id);
        
        // Если у задачи не установлена колонка, но статус соответствует
        if (column.id === 'done') {
            // Добавляем все выполненные задачи, у которых не установлена колонка
            const completedTasksWithoutColumn = tasks.filter(task => 
                task.completed && !task.kanbanColumn
            );
            columnTasks = [...columnTasks, ...completedTasksWithoutColumn];
        } else if (column.id === 'todo' || column.id === 'backlog') {
            // Добавляем невыполненные задачи без колонки в бэклог или todo
            const incompleteTasksWithoutColumn = tasks.filter(task => 
                !task.completed && !task.kanbanColumn
            );
            
            if (column.id === 'backlog') {
                columnTasks = [...columnTasks, ...incompleteTasksWithoutColumn];
            }
        }
        
        // Создание элемента колонки
        const columnElement = document.createElement('div');
        columnElement.className = 'kanban-column';
        columnElement.dataset.columnId = column.id;
        
        // Создание заголовка колонки
        const columnHeader = document.createElement('div');
        columnHeader.className = 'kanban-column-header';
        columnHeader.style.borderTopColor = column.color;
        
        // Добавление лимита, если он установлен
        let limitText = '';
        if (column.limit > 0) {
            const isLimitExceeded = columnTasks.length > column.limit;
            limitText = `<span class="kanban-column-limit ${isLimitExceeded ? 'exceeded' : ''}">
                ${columnTasks.length}/${column.limit}
            </span>`;
        } else {
            limitText = `<span class="kanban-column-count">${columnTasks.length}</span>`;
        }
        
        columnHeader.innerHTML = `
            <h3 class="kanban-column-title">${column.title}</h3>
            ${limitText}
        `;
        
        // Создание содержимого колонки
        const columnContent = document.createElement('div');
        columnContent.className = 'kanban-column-content';
        
        // Добавление задач
        columnTasks.forEach(task => {
            const taskCard = this.createTaskCard(task);
            columnContent.appendChild(taskCard);
        });
        
        // Создание пустого состояния
        if (columnTasks.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'kanban-empty-state';
            emptyState.textContent = 'Нет задач';
            columnContent.appendChild(emptyState);
        }
        
        // Сборка колонки
        columnElement.appendChild(columnHeader);
        columnElement.appendChild(columnContent);
        
        // Настройка Drag and Drop
        this.setupDragAndDrop(columnContent);
        
        return columnElement;
    }

    /**
     * Создание карточки задачи
     * @param {Object} task Объект задачи
     * @returns {HTMLElement} DOM-элемент карточки
     */
    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `kanban-card ${task.completed ? 'completed' : ''}`;
        card.dataset.taskId = task.id;
        
        // Определение классов для приоритета
        let priorityClass = '';
        let priorityText = '';
        
        if (task.priority === 'high') {
            priorityClass = 'priority-high';
            priorityText = 'Высокий';
        } else if (task.priority === 'medium') {
            priorityClass = 'priority-medium';
            priorityText = 'Средний';
        } else if (task.priority === 'low') {
            priorityClass = 'priority-low';
            priorityText = 'Низкий';
        }
        
        // Определение категории
        let categoryText = '';
        if (task.category === 'design') categoryText = 'Дизайн';
        else if (task.category === 'development') categoryText = 'Разработка';
        else if (task.category === 'documentation') categoryText = 'Документация';
        else if (task.category === 'meeting') categoryText = 'Встреча';
        else if (task.category === 'presentation') categoryText = 'Презентация';
        else categoryText = 'Другое';
        
        // Форматирование даты выполнения
        let dueDateText = '';
        let dueDateClass = '';
        
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Форматирование даты
            dueDateText = dueDate.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short'
            });
            
            // Определение класса для подсветки просроченных задач
            if (!task.completed) {
                if (dueDate < today) {
                    dueDateClass = 'due-overdue';
                } else if (dueDate.toDateString() === today.toDateString()) {
                    dueDateClass = 'due-today';
                } else if (dueDate.toDateString() === tomorrow.toDateString()) {
                    dueDateClass = 'due-tomorrow';
                }
            }
        }
        
        // Формирование содержимого карточки
        card.innerHTML = `
            <div class="kanban-card-content">
                <div class="kanban-card-title">${task.title}</div>
                ${task.description ? `<div class="kanban-card-description">${truncateText(task.description, 100)}</div>` : ''}
                
                <div class="kanban-card-meta">
                    <div class="kanban-card-tags">
                        <span class="kanban-tag tag-category">${categoryText}</span>
                        <span class="kanban-tag tag-priority ${priorityClass}">${priorityText}</span>
                    </div>
                    
                    ${dueDateText ? `<div class="kanban-card-date ${dueDateClass}">
                        <i class="fas fa-calendar"></i>
                        ${dueDateText}
                    </div>` : ''}
                </div>
            </div>
            
            <div class="kanban-card-actions">
                <button class="kanban-card-btn edit-btn" data-id="${task.id}" title="Редактировать задачу">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="kanban-card-btn ${task.completed ? 'incomplete-btn' : 'complete-btn'}" 
                    data-id="${task.id}" 
                    title="${task.completed ? 'Отметить как невыполненную' : 'Отметить как выполненную'}">
                    <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                </button>
            </div>
        `;
        
        // Настройка перетаскивания
        card.setAttribute('draggable', 'true');
        
        // Обработчики событий после добавления в DOM
        setTimeout(() => {
            // Редактирование задачи
            card.querySelector('.edit-btn').addEventListener('click', () => {
                // Проверяем существование функции и вызываем
                if (typeof window.editTask === 'function') {
                    window.editTask(task.id);
                }
            });
            
            // Изменение статуса выполнения задачи
            const toggleBtn = card.querySelector('.complete-btn, .incomplete-btn');
            toggleBtn.addEventListener('click', async () => {
                const updatedTask = { ...task, completed: !task.completed };
                
                // Обновляем колонку в зависимости от статуса
                if (updatedTask.completed) {
                    updatedTask.kanbanColumn = 'done';
                } else if (updatedTask.kanbanColumn === 'done') {
                    updatedTask.kanbanColumn = 'todo';
                }
                
                // Сохраняем изменения
                await this.storage.saveTask(updatedTask);
                
                // Обновляем доску
                this.refreshBoard();
            });
        }, 0);
        
        return card;
    }

    /**
     * Настройка функциональности Drag and Drop
     * @param {HTMLElement} container Контейнер для перетаскиваемых элементов
     */
    setupDragAndDrop(container) {
        // Обработчики для колонки (зона сброса)
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            
            const column = container.closest('.kanban-column');
            column.classList.add('drag-over');
            
            const columnId = column.dataset.columnId;
            
            // Проверка лимита колонки
            if (this.isColumnLimitExceeded(columnId, this.getTasksFromDOM())) {
                column.classList.add('limit-exceeded');
            }
        });
        
        container.addEventListener('dragleave', (e) => {
            const column = container.closest('.kanban-column');
            column.classList.remove('drag-over');
            column.classList.remove('limit-exceeded');
        });
        
        container.addEventListener('drop', async (e) => {
            e.preventDefault();
            
            const column = container.closest('.kanban-column');
            column.classList.remove('drag-over');
            column.classList.remove('limit-exceeded');
            
            const columnId = column.dataset.columnId;
            const taskId = e.dataTransfer.getData('text/plain');
            
            if (!taskId) return;
            
            // Получение задачи
            const task = await this.storage.getTask(taskId);
            
            if (!task) return;
            
            // Проверка лимита колонки
            if (this.isColumnLimitExceeded(columnId, this.getTasksFromDOM())) {
                this.showToast('Превышен лимит колонки', `Колонка "${column.querySelector('.kanban-column-title').textContent}" достигла лимита задач`, 'warning');
                return;
            }
            
            // Обновление задачи
            const updatedTask = this.updateTaskStatusByColumn(task, columnId);
            
            // Сохранение изменений
            await this.storage.saveTask(updatedTask);
            
            // Обновление доски
            this.refreshBoard();
        });
        
        // Обработчики для карточек задач
        const cards = container.querySelectorAll('.kanban-card');
        
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', card.dataset.taskId);
                card.classList.add('dragging');
                
                // Добавление эффекта перетаскивания
                setTimeout(() => {
                    card.style.opacity = '0.5';
                }, 0);
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                card.style.opacity = '1';
                
                // Удаление классов перетаскивания с колонок
                document.querySelectorAll('.kanban-column').forEach(col => {
                    col.classList.remove('drag-over');
                    col.classList.remove('limit-exceeded');
                });
            });
        });
    }

    /**
     * Получение списка задач из текущего DOM
     * @returns {Array} Массив с информацией о задачах
     */
    getTasksFromDOM() {
        const tasks = [];
        const columns = document.querySelectorAll('.kanban-column');
        
        columns.forEach(column => {
            const columnId = column.dataset.columnId;
            const cards = column.querySelectorAll('.kanban-card');
            
            cards.forEach(card => {
                tasks.push({
                    id: card.dataset.taskId,
                    kanbanColumn: columnId,
                    completed: card.classList.contains('completed')
                });
            });
        });
        
        return tasks;
    }

    /**
     * Обновление доски
     */
    async refreshBoard() {
        const boardContainer = document.querySelector('.kanban-board');
        
        if (!boardContainer) return;
        
        // Создание новой доски
        const newBoard = await this.createKanbanBoard();
        
        // Замена доски
        boardContainer.parentNode.replaceChild(newBoard, boardContainer);
    }

    /**
     * Отображение настроек доски
     */
    showBoardSettings() {
        // Создание модального окна
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">Настройки Канбан-доски</h2>
                <button class="modal-close" id="closeBoardSettings">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="kanban-settings">
                    <div class="kanban-columns-list">
                        <h3>Колонки</h3>
                        <div class="kanban-columns-items" id="kanbanColumnsItems">
                            <!-- Здесь будут элементы колонок -->
                        </div>
                        <button class="btn btn-outline mt-2" id="addColumnBtn">
                            <i class="fas fa-plus"></i>
                            Добавить колонку
                        </button>
                    </div>
                    
                    <div class="kanban-settings-actions mt-3">
                        <button class="btn btn-outline" id="resetBoardBtn">
                            <i class="fas fa-undo"></i>
                            Сбросить настройки
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);
        
        // Активация модального окна
        setTimeout(() => {
            modalOverlay.classList.add('active');
            
            // Заполнение списка колонок
            const columnsContainer = document.getElementById('kanbanColumnsItems');
            
            this.columns.forEach((column, index) => {
                const columnItem = document.createElement('div');
                columnItem.className = 'kanban-column-item';
                columnItem.dataset.columnId = column.id;
                
                columnItem.innerHTML = `
                    <div class="column-color-marker" style="background-color: ${column.color};"></div>
                    <div class="column-details">
                        <div class="column-title">${column.title}</div>
                        <div class="column-info">
                            ID: ${column.id}
                            ${column.limit > 0 ? `• Лимит: ${column.limit}` : ''}
                        </div>
                    </div>
                    <div class="column-actions">
                        ${index > 0 ? `
                            <button class="column-action move-up" title="Переместить вверх">
                                <i class="fas fa-arrow-up"></i>
                            </button>
                        ` : ''}
                        ${index < this.columns.length - 1 ? `
                            <button class="column-action move-down" title="Переместить вниз">
                                <i class="fas fa-arrow-down"></i>
                            </button>
                        ` : ''}
                        <button class="column-action edit" title="Редактировать">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        ${this.columns.length > 1 ? `
                            <button class="column-action delete" title="Удалить">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : ''}
                    </div>
                `;
                
                columnsContainer.appendChild(columnItem);
                
                // Добавление обработчиков событий
                const moveUpBtn = columnItem.querySelector('.move-up');
                if (moveUpBtn) {
                    moveUpBtn.addEventListener('click', () => {
                        this.moveColumn(column.id, index - 1);
                        this.refreshColumnsSettings();
                    });
                }
                
                const moveDownBtn = columnItem.querySelector('.move-down');
                if (moveDownBtn) {
                    moveDownBtn.addEventListener('click', () => {
                        this.moveColumn(column.id, index + 1);
                        this.refreshColumnsSettings();
                    });
                }
                
                columnItem.querySelector('.edit').addEventListener('click', () => {
                    this.showColumnEditForm(column);
                });
                
                const deleteBtn = columnItem.querySelector('.delete');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => {
                        if (confirm(`Вы уверены, что хотите удалить колонку "${column.title}"?`)) {
                            this.removeColumn(column.id);
                            this.refreshColumnsSettings();
                        }
                    });
                }
            });
            
            // Обработчик добавления колонки
            document.getElementById('addColumnBtn').addEventListener('click', () => {
                this.showColumnEditForm();
            });
            
            // Обработчик сброса настроек
            document.getElementById('resetBoardBtn').addEventListener('click', () => {
                if (confirm('Вы уверены, что хотите сбросить все настройки доски к значениям по умолчанию?')) {
                    this.resetSettings();
                    this.refreshColumnsSettings();
                }
            });
            
            // Обработчик закрытия модального окна
            function closeModal() {
                modalOverlay.classList.remove('active');
                setTimeout(() => {
                    document.body.removeChild(modalOverlay);
                }, 300);
            }
            
            document.getElementById('closeBoardSettings').addEventListener('click', closeModal);
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    closeModal();
                }
            });
        }, 10);
    }

    /**
     * Обновление списка колонок в настройках
     */
    refreshColumnsSettings() {
        const columnsContainer = document.getElementById('kanbanColumnsItems');
        
        if (!columnsContainer) return;
        
        // Очистка контейнера
        columnsContainer.innerHTML = '';
        
        // Заполнение списка колонок
        this.columns.forEach((column, index) => {
            const columnItem = document.createElement('div');
            columnItem.className = 'kanban-column-item';
            columnItem.dataset.columnId = column.id;
            
            columnItem.innerHTML = `
                <div class="column-color-marker" style="background-color: ${column.color};"></div>
                <div class="column-details">
                    <div class="column-title">${column.title}</div>
                    <div class="column-info">
                        ID: ${column.id}
                        ${column.limit > 0 ? `• Лимит: ${column.limit}` : ''}
                    </div>
                </div>
                <div class="column-actions">
                    ${index > 0 ? `
                        <button class="column-action move-up" title="Переместить вверх">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                    ` : ''}
                    ${index < this.columns.length - 1 ? `
                        <button class="column-action move-down" title="Переместить вниз">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                    ` : ''}
                    <button class="column-action edit" title="Редактировать">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    ${this.columns.length > 1 ? `
                        <button class="column-action delete" title="Удалить">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : ''}
                </div>
            `;
            
            columnsContainer.appendChild(columnItem);
            
            // Добавление обработчиков событий
            const moveUpBtn = columnItem.querySelector('.move-up');
            if (moveUpBtn) {
                moveUpBtn.addEventListener('click', () => {
                    this.moveColumn(column.id, index - 1);
                    this.refreshColumnsSettings();
                });
            }
            
            const moveDownBtn = columnItem.querySelector('.move-down');
            if (moveDownBtn) {
                moveDownBtn.addEventListener('click', () => {
                    this.moveColumn(column.id, index + 1);
                    this.refreshColumnsSettings();
                });
            }
            
            columnItem.querySelector('.edit').addEventListener('click', () => {
                this.showColumnEditForm(column);
            });
            
            const deleteBtn = columnItem.querySelector('.delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`Вы уверены, что хотите удалить колонку "${column.title}"?`)) {
                        this.removeColumn(column.id);
                        this.refreshColumnsSettings();
                    }
                });
            }
        });
        
        // Обновление доски
        this.refreshBoard();
    }

    /**
     * Отображение формы редактирования колонки
     * @param {Object} column Объект колонки (null для новой колонки)
     */
    showColumnEditForm(column = null) {
        const isEditing = !!column;
        
        // Получение текущего модального окна
        const modalBody = document.querySelector('.modal-body');
        
        // Сохранение содержимого для возможности возврата
        const originalContent = modalBody.innerHTML;
        
        // Замена содержимого формой
        modalBody.innerHTML = `
            <div class="column-edit-form">
                <h3>${isEditing ? 'Редактирование' : 'Добавление'} колонки</h3>
                <form id="columnForm">
                    <div class="form-group">
                        <label for="columnTitle">Название колонки</label>
                        <input type="text" id="columnTitle" class="form-control" value="${isEditing ? column.title : ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="columnId">ID колонки</label>
                        <input type="text" id="columnId" class="form-control" value="${isEditing ? column.id : ''}" 
                               ${isEditing ? 'readonly' : 'required'}>
                        <div class="form-text">
                            ${isEditing ? 'ID существующей колонки нельзя изменить.' : 'Используйте только латинские буквы, цифры и знак подчеркивания.'}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="columnLimit">Лимит задач (0 = без лимита)</label>
                        <input type="number" id="columnLimit" class="form-control" min="0" value="${isEditing ? column.limit : '0'}">
                    </div>
                    
                    <div class="form-group">
                        <label for="columnColor">Цвет колонки</label>
                        <input type="color" id="columnColor" class="form-control" value="${isEditing ? column.color : '#4361ee'}">
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" id="cancelColumnEdit" class="btn btn-outline">Отмена</button>
                        <button type="submit" class="btn btn-primary">${isEditing ? 'Сохранить' : 'Добавить'}</button>
                    </div>
                </form>
            </div>
        `;
        
        // Обработчики формы
        const form = document.getElementById('columnForm');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const title = document.getElementById('columnTitle').value.trim();
            const id = document.getElementById('columnId').value.trim();
            const limit = parseInt(document.getElementById('columnLimit').value, 10);
            const color = document.getElementById('columnColor').value;
            
            // Валидация
            if (!title) {
                alert('Укажите название колонки');
                return;
            }
            
            if (!isEditing && !id) {
                alert('Укажите ID колонки');
                return;
            }
            
            if (!isEditing && !/^[a-zA-Z0-9_]+$/.test(id)) {
                alert('ID может содержать только латинские буквы, цифры и знак подчеркивания');
                return;
            }
            
            if (!isEditing && this.columns.some(c => c.id === id)) {
                alert('Колонка с таким ID уже существует');
                return;
            }
            
            // Сохранение изменений
            if (isEditing) {
                this.updateColumn(column.id, { title, limit, color });
            } else {
                this.addColumn({ id, title, limit, color });
            }
            
            // Возврат к списку колонок
            modalBody.innerHTML = originalContent;
            this.refreshColumnsSettings();
        });
        
        // Обработчик отмены
        document.getElementById('cancelColumnEdit').addEventListener('click', () => {
            modalBody.innerHTML = originalContent;
            this.refreshColumnsSettings();
        });
    }

    /**
     * Отображение уведомления
     * @param {string} title Заголовок уведомления
     * @param {string} message Сообщение
     * @param {string} type Тип уведомления
     */
    showToast(title, message, type = 'info') {
        // Проверка существования контейнера уведомлений
        let toastContainer = document.getElementById('toastContainer');
        
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            toastContainer.id = 'toastContainer';
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconClass = 'fa-info-circle';
        if (type === 'success') iconClass = 'fa-check-circle';
        else if (type === 'error') iconClass = 'fa-exclamation-circle';
        else if (type === 'warning') iconClass = 'fa-exclamation-triangle';
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <div class="toast-close">
                <i class="fas fa-times"></i>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', function() {
            toast.classList.add('hiding');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
        
        // Автоматическое закрытие через 5 секунд
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('hiding');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
}

/**
 * Вспомогательная функция для сокращения текста
 * @param {string} text Исходный текст
 * @param {number} maxLength Максимальная длина
 * @returns {string} Сокращенный текст
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    
    if (text.length <= maxLength) {
        return text;
    }
    
    return text.substr(0, maxLength) + '...';
}

// Создание стилей
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        /* Стили для Kanban-доски */
        .kanban-board {
            margin-bottom: 2rem;
        }
        
        .kanban-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
        }
        
        .kanban-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--gray-900);
        }
        
        .kanban-actions {
            display: flex;
            gap: 0.75rem;
        }
        
        .kanban-columns {
            display: flex;
            gap: 1rem;
            overflow-x: auto;
            padding-bottom: 1rem;
        }
        
        .kanban-column {
            flex: 0 0 300px;
            max-width: 300px;
            background-color: var(--gray-100);
            border-radius: var(--radius);
            display: flex;
            flex-direction: column;
            max-height: calc(100vh - 200px);
            border-top: 3px solid transparent;
            transition: var(--transition);
        }
        
        .kanban-column-header {
            padding: 1rem;
            border-bottom: 1px solid var(--gray-200);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .kanban-column-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--gray-800);
            margin: 0;
        }
        
        .kanban-column-limit,
        .kanban-column-count {
            font-size: 0.75rem;
            color: var(--gray-600);
            background-color: var(--gray-200);
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
        }
        
        .kanban-column-limit.exceeded {
            background-color: var(--danger);
            color: white;
        }
        
        .kanban-column-content {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        
        .kanban-card {
            background-color: var(--white);
            border-radius: var(--radius-sm);
            padding: 1rem;
            box-shadow: var(--shadow-sm);
            cursor: grab;
            position: relative;
            transition: var(--transition);
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .kanban-card:hover {
            box-shadow: var(--shadow);
            transform: translateY(-2px);
        }
        
        .kanban-card.completed {
            opacity: 0.75;
        }
        
        .kanban-card.completed .kanban-card-title {
            text-decoration: line-through;
        }
        
        .kanban-card.dragging {
            cursor: grabbing;
        }
        
        .kanban-card-title {
            font-weight: 500;
            color: var(--gray-900);
            margin-bottom: 0.25rem;
            word-break: break-word;
        }
        
        .kanban-card-description {
            font-size: 0.875rem;
            color: var(--gray-600);
            margin-bottom: 0.5rem;
            word-break: break-word;
        }
        
        .kanban-card-meta {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            gap: 0.5rem;
            margin-top: auto;
        }
        
        .kanban-card-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.25rem;
        }
        
        .kanban-tag {
            font-size: 0.7rem;
            padding: 0.15rem 0.4rem;
            border-radius: 10px;
            white-space: nowrap;
        }
        
        .tag-category {
            background-color: rgba(67, 97, 238, 0.1);
            color: var(--primary);
        }
        
        .tag-priority {
            background-color: rgba(108, 117, 125, 0.1);
            color: var(--gray-600);
        }
        
        .tag-priority.priority-high {
            background-color: rgba(229, 56, 59, 0.1);
            color: var(--danger);
        }
        
        .tag-priority.priority-medium {
            background-color: rgba(255, 190, 11, 0.1);
            color: var(--warning);
        }
        
        .tag-priority.priority-low {
            background-color: rgba(45, 198, 83, 0.1);
            color: var(--success);
        }
        
        .kanban-card-date {
            font-size: 0.75rem;
            color: var(--gray-600);
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }
        
        .kanban-card-date.due-overdue {
            color: var(--danger);
        }
        
        .kanban-card-date.due-today {
            color: var(--warning);
        }
        
        .kanban-card-date.due-tomorrow {
            color: var(--info);
        }
        
        .kanban-card-actions {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            display: flex;
            gap: 0.25rem;
            opacity: 0;
            transition: var(--transition);
        }
        
        .kanban-card:hover .kanban-card-actions {
            opacity: 1;
        }
        
        .kanban-card-btn {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            background-color: var(--white);
            border: 1px solid var(--gray-200);
            color: var(--gray-600);
            cursor: pointer;
            transition: var(--transition);
        }
        
        .kanban-card-btn:hover {
            background-color: var(--gray-100);
        }
        
        .kanban-card-btn.edit-btn:hover {
            color: var(--primary);
            border-color: var(--primary);
        }
        
        .kanban-card-btn.complete-btn:hover {
            color: var(--success);
            border-color: var(--success);
        }
        
        .kanban-card-btn.incomplete-btn:hover {
            color: var(--warning);
            border-color: var(--warning);
        }
        
        .kanban-empty-state {
            padding: 2rem 1rem;
            text-align: center;
            color: var(--gray-500);
            font-size: 0.875rem;
            border: 2px dashed var(--gray-300);
            border-radius: var(--radius-sm);
        }
        
        /* Стили для перетаскивания */
        .kanban-column.drag-over {
            background-color: var(--gray-200);
        }
        
        .kanban-column.limit-exceeded {
            border-color: var(--danger);
        }
        
        /* Стили для настроек доски */
        .kanban-settings {
            padding: 1rem;
        }
        
        .kanban-columns-list h3 {
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: 1rem;
        }
        
        .kanban-columns-items {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        
        .kanban-column-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            background-color: var(--white);
            border: 1px solid var(--gray-200);
            border-radius: var(--radius-sm);
            padding: 1rem;
        }
        
        .column-color-marker {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        
        .column-details {
            flex: 1;
            min-width: 0;
        }
        
        .column-title {
            font-weight: 500;
            color: var(--gray-900);
            margin-bottom: 0.25rem;
        }
        
        .column-info {
            font-size: 0.75rem;
            color: var(--gray-600);
        }
        
        .column-actions {
            display: flex;
            gap: 0.5rem;
        }
        
        .column-action {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--white);
            border: 1px solid var(--gray-200);
            color: var(--gray-600);
            cursor: pointer;
            transition: var(--transition);
        }
        
        .column-action:hover {
            background-color: var(--gray-100);
        }
        
        .column-action.move-up:hover,
        .column-action.move-down:hover {
            color: var(--primary);
            border-color: var(--primary);
        }
        
        .column-action.edit:hover {
            color: var(--warning);
            border-color: var(--warning);
        }
        
        .column-action.delete:hover {
            color: var(--danger);
            border-color: var(--danger);
        }
        
        /* Форма редактирования колонки */
        .column-edit-form {
            padding: 1rem;
        }
        
        .column-edit-form h3 {
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
        }
        
        .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            margin-top: 1.5rem;
        }
        
        /* Адаптивность */
        @media (max-width: 768px) {
            .kanban-columns {
                flex-wrap: nowrap;
                overflow-x: auto;
                padding-bottom: 1rem;
                -webkit-overflow-scrolling: touch;
            }
            
            .kanban-column {
                flex: 0 0 280px;
                max-width: 280px;
            }
        }
    `;
    
    document.head.appendChild(style);
});

// Создание и экспорт экземпляра
const kanbanBoard = new KanbanBoard();

// Интеграция с основным интерфейсом
document.addEventListener('DOMContentLoaded', () => {
    // Добавление пункта меню для Kanban-доски
    const navItems = document.querySelector('.menu-items');
    
    if (navItems) {
        const kanbanMenuItem = document.createElement('li');
        kanbanMenuItem.className = 'menu-item';
        kanbanMenuItem.innerHTML = `
            <a href="#" class="menu-link" id="kanbanLink">
                <i class="menu-icon fas fa-columns"></i>
                <span class="menu-text">Канбан-доска</span>
            </a>
        `;
        
        // Вставка после пункта "Мои задачи"
        const tasksMenuItem = Array.from(navItems.querySelectorAll('.menu-link')).find(item => 
            item.textContent.includes('задачи')
        );
        
        if (tasksMenuItem) {
            tasksMenuItem.closest('.menu-item').after(kanbanMenuItem);
        } else {
            navItems.appendChild(kanbanMenuItem);
        }
        
        // Обработчик для отображения доски
        document.getElementById('kanbanLink').addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Удаление активного класса у всех пунктов меню
            document.querySelectorAll('.menu-link').forEach(link => {
                link.classList.remove('active');
            });
            
            // Добавление активного класса текущему пункту
            e.currentTarget.classList.add('active');
            
            // Изменение заголовка страницы
            const navbarTitle = document.querySelector('.navbar-title');
            if (navbarTitle) {
                navbarTitle.textContent = 'Канбан-доска';
            }
            
            // Изменение хлебных крошек
            const breadcrumb = document.querySelector('.navbar-breadcrumb');
            if (breadcrumb) {
                breadcrumb.innerHTML = `
                    <span class="breadcrumb-item">Главная</span>
                    <span class="breadcrumb-separator">
                        <i class="fas fa-chevron-right"></i>
                    </span>
                    <span class="breadcrumb-item active">Канбан-доска</span>
                `;
            }
            
            // Получение контейнера содержимого
            const pageContent = document.querySelector('.page-content');
            
            if (pageContent) {
                // Очистка содержимого
                pageContent.innerHTML = '';
                
                // Добавление индикатора загрузки
                const loader = document.createElement('div');
                loader.className = 'loading-indicator';
                loader.innerHTML = `
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Загрузка доски...</p>
                `;
                pageContent.appendChild(loader);
                
                // Создание доски
                const board = await kanbanBoard.createKanbanBoard();
                
                // Замена индикатора загрузки на доску
                pageContent.innerHTML = '';
                pageContent.appendChild(board);
            }
        });
    }
    
    // Обработчики для интеграции с существующими задачами
    window.addEventListener('taskUpdated', async (event) => {
        // Обновление доски, если она активна
        const board = document.querySelector('.kanban-board');
        if (board) {
            await kanbanBoard.refreshBoard();
        }
    });
    
    window.addEventListener('taskAdded', async (event) => {
        // Обновление доски, если она активна
        const board = document.querySelector('.kanban-board');
        if (board) {
            await kanbanBoard.refreshBoard();
        }
    });
    
    window.addEventListener('taskDeleted', async (event) => {
        // Обновление доски, если она активна
        const board = document.querySelector('.kanban-board');
        if (board) {
            await kanbanBoard.refreshBoard();
        }
    });
});

// Экспорт
export default kanbanBoard;
