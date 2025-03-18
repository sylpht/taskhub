/**
 * enhancedTasks.js - Модуль для расширенных возможностей задач
 */

class EnhancedTasks {
    constructor(storage) {
        // Хранилище данных (IndexedDB)
        this.storage = storage || window.indexedDBStorage;
        
        // Инициализация DOM-элементов после загрузки страницы
        this.initOnDomReady();
    }
    
    /**
     * Инициализация при загрузке DOM
     */
    initOnDomReady() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupTaskFormEnhancements();
            this.setupTagsSystem();
            this.setupPriorityHighlighting();
            this.setupRecurringTasks();
            this.setupSubtasks();
            this.setupDueDateReminders();
            this.setupTaskSorting();
            this.setupTaskAttachments();
            this.setupTaskNotes();
            this.setupTaskArchiving();
            
            // Обработчики событий
            this.listenForTaskEvents();
        });
    }
    
    /**
     * Установка улучшений для формы задачи
     */
    setupTaskFormEnhancements() {
        // Расширение формы задачи с дополнительными полями
        const taskForm = document.getElementById('taskForm');
        if (!taskForm) return;
        
        // Добавление полей для тегов
        const tagsField = document.createElement('div');
        tagsField.className = 'form-group';
        tagsField.innerHTML = `
            <label for="taskTags" class="form-label">Теги</label>
            <div class="tags-input-container">
                <input type="text" id="taskTags" class="form-control" placeholder="Добавить тег и нажать Enter">
                <div class="tags-container" id="tagsContainer"></div>
            </div>
            <div class="form-text">Добавьте теги для лучшей организации задач</div>
        `;
        
        // Добавление переключателя для повторяющихся задач
        const recurringField = document.createElement('div');
        recurringField.className = 'form-group';
        recurringField.innerHTML = `
            <div class="form-check recurring-task-toggle">
                <input type="checkbox" id="taskRecurring" class="form-check-input">
                <label for="taskRecurring" class="form-check-label">Повторяющаяся задача</label>
            </div>
            <div class="recurring-options" style="display: none;">
                <div class="form-group mt-2">
                    <label for="recurringType" class="form-label">Повторять</label>
                    <select id="recurringType" class="form-select">
                        <option value="daily">Ежедневно</option>
                        <option value="weekly">Еженедельно</option>
                        <option value="monthly">Ежемесячно</option>
                        <option value="custom">Настраиваемый интервал</option>
                    </select>
                </div>
                <div class="custom-recurring" style="display: none;">
                    <div class="form-group mt-2">
                        <label for="recurringInterval" class="form-label">Интервал (дни)</label>
                        <input type="number" id="recurringInterval" class="form-control" min="1" value="1">
                    </div>
                </div>
            </div>
        `;
        
        // Добавление поля для подзадач
        const subtasksField = document.createElement('div');
        subtasksField.className = 'form-group';
        subtasksField.innerHTML = `
            <label class="form-label">Подзадачи</label>
            <div class="subtasks-container" id="subtasksContainer">
                <div class="subtask-input-group">
                    <input type="text" class="form-control subtask-input" placeholder="Добавить подзадачу">
                    <button type="button" class="btn btn-sm btn-primary add-subtask-btn">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="subtasks-list" id="subtasksList"></div>
            </div>
        `;
        
        // Поле для прикрепления файлов (расширенное)
        const attachmentsField = document.createElement('div');
        attachmentsField.className = 'form-group';
        attachmentsField.innerHTML = `
            <label class="form-label">Вложения</label>
            <div class="file-upload enhanced">
                <div class="file-drop-area" id="fileDropArea">
                    <i class="file-drop-icon fas fa-cloud-upload-alt"></i>
                    <div class="file-drop-message">Перетащите файлы сюда или кликните для загрузки</div>
                    <div class="file-drop-sub">Поддерживаемые форматы: изображения, документы, архивы (до 10MB)</div>
                </div>
                <input type="file" id="fileInput" class="d-none" multiple>
                <div class="file-list" id="fileList"></div>
            </div>
        `;
        
        // Поле для заметок (с поддержкой Markdown)
        const notesField = document.createElement('div');
        notesField.className = 'form-group';
        notesField.innerHTML = `
            <label for="taskNotes" class="form-label">Заметки <small>(поддерживается Markdown)</small></label>
            <textarea id="taskNotes" class="form-control" rows="4" placeholder="Введите заметки к задаче..."></textarea>
        `;
        
        // Добавление полей в форму
        const formPositions = taskForm.querySelectorAll('.form-group');
        const insertPosition = formPositions[formPositions.length - 1];
        
        // Вставка полей перед последним элементом формы
        insertPosition.parentNode.insertBefore(notesField, insertPosition);
        insertPosition.parentNode.insertBefore(attachmentsField, insertPosition);
        insertPosition.parentNode.insertBefore(subtasksField, insertPosition);
        insertPosition.parentNode.insertBefore(recurringField, insertPosition);
        insertPosition.parentNode.insertBefore(tagsField, insertPosition);
        
        // Добавление обработчиков для новых полей
        this.setupTagsInput();
        this.setupRecurringOptions();
        this.setupSubtasksHandlers();
    }
    
    /**
     * Настройка ввода тегов
     */
    setupTagsInput() {
        const tagsInput = document.getElementById('taskTags');
        const tagsContainer = document.getElementById('tagsContainer');
        
        if (!tagsInput || !tagsContainer) return;
        
        tagsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                
                const tagValue = tagsInput.value.trim();
                if (tagValue) {
                    this.addTag(tagValue, tagsContainer);
                    tagsInput.value = '';
                }
            }
        });
    }
    
    /**
     * Добавление тега в контейнер
     * @param {string} tagText Текст тега
     * @param {HTMLElement} container Контейнер для тегов
     */
    addTag(tagText, container) {
        const tag = document.createElement('span');
        tag.className = 'task-tag';
        tag.innerHTML = `
            ${tagText}
            <span class="tag-remove"><i class="fas fa-times"></i></span>
        `;
        
        // Обработчик удаления тега
        tag.querySelector('.tag-remove').addEventListener('click', () => {
            tag.remove();
        });
        
        container.appendChild(tag);
    }
    
    /**
     * Настройка опций для повторяющихся задач
     */
    setupRecurringOptions() {
        const recurringCheckbox = document.getElementById('taskRecurring');
        const recurringOptions = document.querySelector('.recurring-options');
        const recurringType = document.getElementById('recurringType');
        const customRecurring = document.querySelector('.custom-recurring');
        
        if (!recurringCheckbox || !recurringOptions || !recurringType || !customRecurring) return;
        
        recurringCheckbox.addEventListener('change', () => {
            recurringOptions.style.display = recurringCheckbox.checked ? 'block' : 'none';
        });
        
        recurringType.addEventListener('change', () => {
            customRecurring.style.display = recurringType.value === 'custom' ? 'block' : 'none';
        });
    }
    
    /**
     * Настройка обработчиков для подзадач
     */
    setupSubtasksHandlers() {
        const addSubtaskBtn = document.querySelector('.add-subtask-btn');
        const subtaskInput = document.querySelector('.subtask-input');
        const subtasksList = document.getElementById('subtasksList');
        
        if (!addSubtaskBtn || !subtaskInput || !subtasksList) return;
        
        addSubtaskBtn.addEventListener('click', () => {
            const subtaskText = subtaskInput.value.trim();
            if (subtaskText) {
                this.addSubtask(subtaskText, subtasksList);
                subtaskInput.value = '';
            }
        });
        
        subtaskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSubtaskBtn.click();
            }
        });
    }
    
    /**
     * Добавление подзадачи в список
     * @param {string} text Текст подзадачи
     * @param {HTMLElement} container Контейнер для подзадач
     */
    addSubtask(text, container) {
        const subtaskItem = document.createElement('div');
        subtaskItem.className = 'subtask-item';
        subtaskItem.innerHTML = `
            <div class="subtask-checkbox-wrapper">
                <input type="checkbox" class="subtask-checkbox">
                <label class="subtask-text">${text}</label>
            </div>
            <button type="button" class="subtask-remove-btn">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        
        // Обработчик удаления подзадачи
        subtaskItem.querySelector('.subtask-remove-btn').addEventListener('click', () => {
            subtaskItem.remove();
        });
        
        container.appendChild(subtaskItem);
    }
    
    /**
     * Настройка системы тегов
     */
    setupTagsSystem() {
        // Добавление контейнера для фильтрации по тегам
        const filtersContainer = document.querySelector('.tasks-filters');
        if (!filtersContainer) return;
        
        const tagsFilter = document.createElement('div');
        tagsFilter.className = 'filter-group tags-filter';
        tagsFilter.innerHTML = `
            <div class="filter-label">Теги:</div>
            <div class="filter-options" id="tagsFilterOptions">
                <button class="filter-btn active" data-tag="all">Все</button>
            </div>
        `;
        
        filtersContainer.appendChild(tagsFilter);
        
        // Загрузка и отображение доступных тегов
        this.loadAvailableTags();
    }
    
    /**
     * Загрузка доступных тегов из задач
     */
    async loadAvailableTags() {
        try {
            const tasks = await this.storage.getTasks();
            const tagsSet = new Set();
            
            // Сбор уникальных тегов из всех задач
            tasks.forEach(task => {
                if (task.tags && Array.isArray(task.tags)) {
                    task.tags.forEach(tag => tagsSet.add(tag));
                }
            });
            
            // Отображение тегов в фильтре
            const tagsFilterOptions = document.getElementById('tagsFilterOptions');
            if (!tagsFilterOptions) return;
            
            // Очистка списка, оставляя только первую кнопку "Все"
            const allButton = tagsFilterOptions.querySelector('[data-tag="all"]');
            tagsFilterOptions.innerHTML = '';
            
            if (allButton) {
                tagsFilterOptions.appendChild(allButton);
            }
            
            // Добавление кнопок для тегов
            tagsSet.forEach(tag => {
                const tagButton = document.createElement('button');
                tagButton.className = 'filter-btn';
                tagButton.setAttribute('data-tag', tag);
                tagButton.textContent = tag;
                
                // Обработчик фильтрации по тегу
                tagButton.addEventListener('click', () => {
                    // Снятие активного класса со всех кнопок
                    tagsFilterOptions.querySelectorAll('.filter-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    
                    // Добавление активного класса текущей кнопке
                    tagButton.classList.add('active');
                    
                    // Обновление фильтра тегов
                    window.currentFilters = window.currentFilters || {};
                    window.currentFilters.tag = tag;
                    
                    // Применение фильтра
                    if (typeof window.applyFilters === 'function') {
                        window.applyFilters();
                    }
                });
                
                tagsFilterOptions.appendChild(tagButton);
            });
        } catch (error) {
            console.error('Ошибка загрузки тегов:', error);
        }
    }
    
    /**
     * Настройка выделения приоритетов
     */
    setupPriorityHighlighting() {
        // Добавление стилей для подсветки приоритетов
        const style = document.createElement('style');
        style.textContent = `
            .task-item.priority-high {
                border-left: 3px solid var(--danger);
            }
            
            .task-item.priority-medium {
                border-left: 3px solid var(--warning);
            }
            
            .task-item.priority-low {
                border-left: 3px solid var(--success);
            }
            
            .priority-indicator {
                display: inline-block;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                margin-right: 5px;
            }
            
            .priority-high .priority-indicator {
                background-color: var(--danger);
            }
            
            .priority-medium .priority-indicator {
                background-color: var(--warning);
            }
            
            .priority-low .priority-indicator {
                background-color: var(--success);
            }
        `;
        
        document.head.appendChild(style);
        
        // Обработчик для применения классов к задачам
        document.addEventListener('taskRendered', () => {
            document.querySelectorAll('.task-item').forEach(task => {
                const priorityBadge = task.querySelector('.badge-danger, .badge-warning, .badge-success');
                
                if (priorityBadge) {
                    if (priorityBadge.classList.contains('badge-danger')) {
                        task.classList.add('priority-high');
                    } else if (priorityBadge.classList.contains('badge-warning')) {
                        task.classList.add('priority-medium');
                    } else if (priorityBadge.classList.contains('badge-success')) {
                        task.classList.add('priority-low');
                    }
                }
            });
        });
    }
    
    /**
     * Настройка повторяющихся задач
     */
    setupRecurringTasks() {
        // Регистрация обработчика завершения задачи для создания следующей задачи
        document.addEventListener('taskCompleted', async (event) => {
            try {
                const taskId = event.detail.taskId;
                const task = await this.storage.getTask(taskId);
                
                if (!task) return;
                
                // Проверка, является ли задача повторяющейся
                if (task.recurring && task.recurring.enabled) {
                    // Создание следующей задачи на основе текущей
                    await this.createNextRecurringTask(task);
                }
            } catch (error) {
                console.error('Ошибка обработки повторяющейся задачи:', error);
            }
        });
    }
    
    /**
     * Создание следующей повторяющейся задачи
     * @param {Object} currentTask Текущая задача
     */
    async createNextRecurringTask(currentTask) {
        try {
            // Клонирование задачи
            const newTask = { ...currentTask };
            
            // Генерация нового ID
            newTask.id = Date.now();
            
            // Сброс статуса выполнения
            newTask.completed = false;
            
            // Обновление даты создания
            newTask.createdAt = new Date().toLocaleDateString('ru-RU');
            
            // Вычисление новой даты выполнения
            if (newTask.dueDate) {
                const dueDate = new Date(newTask.dueDate);
                const recurring = newTask.recurring;
                
                switch (recurring.type) {
                    case 'daily':
                        dueDate.setDate(dueDate.getDate() + 1);
                        break;
                    case 'weekly':
                        dueDate.setDate(dueDate.getDate() + 7);
                        break;
                    case 'monthly':
                        dueDate.setMonth(dueDate.getMonth() + 1);
                        break;
                    case 'custom':
                        dueDate.setDate(dueDate.getDate() + (recurring.interval || 1));
                        break;
                }
                
                newTask.dueDate = dueDate.toISOString().slice(0, 16);
            }
            
            // Сохранение новой задачи
            await this.storage.saveTask(newTask);
            
            // Генерация события создания новой задачи
            window.dispatchEvent(new CustomEvent('taskAdded', { detail: { taskId: newTask.id } }));
            
            // Показать уведомление о создании новой задачи
            if (typeof window.showToast === 'function') {
                window.showToast('Задача создана', `Повторяющаяся задача "${newTask.title}" создана`, 'info');
            }
        } catch (error) {
            console.error('Ошибка создания повторяющейся задачи:', error);
        }
    }
    
    /**
     * Настройка подзадач
     */
    setupSubtasks() {
        // Регистрация обработчика отображения задачи для добавления подзадач
        document.addEventListener('taskRendered', (event) => {
            const taskElement = event.detail.taskElement;
            const taskId = event.detail.taskId;
            
            if (!taskElement || !taskId) return;
            
            // Проверка наличия подзадач у текущей задачи
            this.storage.getTask(taskId).then(task => {
                if (task && task.subtasks && task.subtasks.length > 0) {
                    // Добавление контейнера для подзадач
                    const taskContent = taskElement.querySelector('.task-content');
                    
                    if (taskContent) {
                        const subtasksContainer = document.createElement('div');
                        subtasksContainer.className = 'subtasks-container';
                        
                        // Добавление заголовка и счетчика
                        const completedCount = task.subtasks.filter(subtask => subtask.completed).length;
                        
                        subtasksContainer.innerHTML = `
                            <div class="subtasks-header">
                                <span class="subtasks-title">Подзадачи:</span>
                                <span class="subtasks-count">${completedCount}/${task.subtasks.length}</span>
                            </div>
                            <div class="subtasks-list"></div>
                        `;
                        
                        const subtasksList = subtasksContainer.querySelector('.subtasks-list');
                        
                        // Добавление подзадач
                        task.subtasks.forEach((subtask, index) => {
                            const subtaskElement = document.createElement('div');
                            subtaskElement.className = `subtask-item ${subtask.completed ? 'completed' : ''}`;
                            subtaskElement.innerHTML = `
                                <div class="subtask-checkbox-wrapper">
                                    <input type="checkbox" class="subtask-checkbox" id="subtask-${taskId}-${index}" ${subtask.completed ? 'checked' : ''}>
                                    <label for="subtask-${taskId}-${index}" class="subtask-text">${subtask.text}</label>
                                </div>
                            `;
                            
                            // Обработчик изменения статуса подзадачи
                            const checkbox = subtaskElement.querySelector('.subtask-checkbox');
                            checkbox.addEventListener('change', async () => {
                                // Обновление статуса подзадачи
                                subtask.completed = checkbox.checked;
                                
                                // Обновление класса подзадачи
                                subtaskElement.classList.toggle('completed', checkbox.checked);
                                
                                // Обновление счетчика
                                const newCompletedCount = task.subtasks.filter(s => s.completed).length;
                                subtasksContainer.querySelector('.subtasks-count').textContent = `${newCompletedCount}/${task.subtasks.length}`;
                                
                                // Сохранение изменений
                                await this.storage.saveTask(task);
                            });
                            
                            subtasksList.appendChild(subtaskElement);
                        });
                        
                        // Добавление контейнера подзадач после основного содержимого задачи
                        taskContent.appendChild(subtasksContainer);
                    }
                }
            }).catch(error => {
                console.error('Ошибка загрузки подзадач:', error);
            });
        });
    }
    
    /**
     * Настройка напоминаний о сроках выполнения
     */
    setupDueDateReminders() {
        // Проверка разрешений для уведомлений
        if ('Notification' in window) {
            // Запрос разрешения при загрузке страницы
            if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                Notification.requestPermission();
            }
            
            // Настройка проверки сроков выполнения
            setInterval(() => {
                this.checkUpcomingDueDates();
            }, 60000); // Проверка каждую минуту
            
            // Проверка сроков при загрузке страницы
            this.checkUpcomingDueDates();
        }
    }
    
    /**
     * Проверка предстоящих сроков выполнения
     */
    async checkUpcomingDueDates() {
        try {
            // Проверка разрешения уведомлений
            if (Notification.permission !== 'granted') return;
            
            // Получение всех активных задач с дедлайном
            const tasks = await this.storage.getTasks();
            const now = new Date();
            const oneDayMs = 24 * 60 * 60 * 1000;
            const oneHourMs = 60 * 60 * 1000;
            
            // Фильтрация задач, которые скоро должны быть выполнены
            tasks.filter(task => !task.completed && task.dueDate).forEach(task => {
                const dueDate = new Date(task.dueDate);
                const timeDiff = dueDate.getTime() - now.getTime();
                
                // Проверка, следует ли отправить уведомление (за день, час или просроченные)
                if (timeDiff >= 0 && timeDiff <= oneHourMs) {
                    // Срок выполнения в течение часа
                    this.sendNotification(
                        'Срок выполнения задачи скоро истекает',
                        `"${task.title}" должна быть выполнена в течение часа`
                    );
                } else if (timeDiff >= 0 && timeDiff <= oneDayMs && timeDiff > oneHourMs) {
                    // Срок выполнения в течение дня
                    const hours = Math.floor(timeDiff / oneHourMs);
                    
                    if (hours === 23 || hours === 12 || hours === 6) {
                        this.sendNotification(
                            'Напоминание о задаче',
                            `"${task.title}" должна быть выполнена через ${hours} часов`
                        );
                    }
                } else if (timeDiff < 0 && timeDiff > -oneHourMs) {
                    // Просроченная задача (менее часа назад)
                    this.sendNotification(
                        'Задача просрочена',
                        `Срок выполнения задачи "${task.title}" истек`
                    );
                }
            });
        } catch (error) {
            console.error('Ошибка проверки сроков выполнения:', error);
        }
    }
    
    /**
     * Отправка уведомления
     * @param {string} title Заголовок уведомления
     * @param {string} message Текст уведомления
     */
    sendNotification(title, message) {
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: message,
                icon: '/favicon.ico'
            });
            
            notification.onclick = function() {
                window.focus();
                this.close();
            };
            
            // Показать встроенное уведомление в приложении
            if (typeof window.showToast === 'function') {
                window.showToast(title, message, 'warning');
            }
        }
    }
    
    /**
     * Настройка сортировки задач
     */
    setupTaskSorting() {
        // Добавление кнопок сортировки в панель фильтров
        const filtersContainer = document.querySelector('.tasks-filters');
        if (!filtersContainer) return;
        
        const sortingContainer = document.createElement('div');
        sortingContainer.className = 'filter-group sorting-filter';
        sortingContainer.innerHTML = `
            <div class="filter-label">Сортировка:</div>
            <div class="filter-options">
                <select id="taskSortSelect" class="form-select form-select-sm">
                    <option value="dueDate-asc">По сроку (возрастание)</option>
                    <option value="dueDate-desc">По сроку (убывание)</option>
                    <option value="priority-desc">По приоритету (высокий-низкий)</option>
                    <option value="priority-asc">По приоритету (низкий-высокий)</option>
                    <option value="title-asc">По названию (А-Я)</option>
                    <option value="title-desc">По названию (Я-А)</option>
                    <option value="createdAt-desc">По дате создания (новые-старые)</option>
                    <option value="createdAt-asc">По дате создания (старые-новые)</option>
                </select>
            </div>
        `;
        
        filtersContainer.appendChild(sortingContainer);
        
        // Обработчик изменения сортировки
        const sortSelect = document.getElementById('taskSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                const [field, order] = sortSelect.value.split('-');
                
                // Установка параметров сортировки
                window.currentSorting = { field, order };
                
                // Применение сортировки
                if (typeof window.applyFilters === 'function') {
                    window.applyFilters();
                }
            });
        }
        
        // Расширение функции применения фильтров
        const originalApplyFilters = window.applyFilters;
        if (typeof originalApplyFilters === 'function') {
            window.applyFilters = function() {
                // Вызов оригинальной функции
                originalApplyFilters();
                
                // Дополнительная сортировка результатов
                if (window.currentTasks && window.currentTasks.length > 0) {
                    const sortField = (window.currentSorting && window.currentSorting.field) || 'dueDate';
                    const sortOrder = (window.currentSorting && window.currentSorting.order) || 'asc';
                    
                    window.currentTasks.sort((a, b) => {
                        let aValue, bValue;
                        
                        // Получение значений для сравнения
                        if (sortField === 'priority') {
                            const priorityMap = { high: 3, medium: 2, low: 1 };
                            aValue = priorityMap[a.priority] || 0;
                            bValue = priorityMap[b.priority] || 0;
                        } else if (sortField === 'dueDate') {
                            aValue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                            bValue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                        } else if (sortField === 'createdAt') {
                            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        } else {
                            aValue = a[sortField];
                            bValue = b[sortField];
                        }
                        
                        // Сравнение значений
                        if (sortOrder === 'asc') {
                            return aValue > bValue ? 1 : -1;
                        } else {
                            return aValue < bValue ? 1 : -1;
                        }
                    });
                    
                    // Перерисовка задач
                    if (typeof window.renderTasks === 'function') {
                        window.renderTasks(window.currentTasks);
                    }
                }
            };
        }
    }
    
    /**
     * Настройка вложений для задач
     */
    setupTaskAttachments() {
        // Улучшенный обработчик файлов
        const originalHandleFiles = window.handleFiles;
        if (typeof originalHandleFiles === 'function') {
            window.handleFiles = function(files) {
                // Вызов оригинальной функции
                originalHandleFiles(files);
                
                // Дополнительная обработка для превью изображений
                Array.from(files).forEach(file => {
                    if (file.type.startsWith('image/')) {
                        // Получение последнего добавленного элемента файла
                        const fileList = document.getElementById('fileList');
                        if (!fileList || !fileList.lastElementChild) return;
                        
                        const fileItem = fileList.lastElementChild;
                        
                        // Создание превью изображения
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            const preview = document.createElement('div');
                            preview.className = 'file-preview';
                            preview.innerHTML = `<img src="${e.target.result}" alt="${file.name}">`;
                            
                            fileItem.insertBefore(preview, fileItem.firstChild);
                        };
                        
                        reader.readAsDataURL(file);
                    }
                });
            };
        }
        
        // Сохранение файлов в localStorage (или другом хранилище) в base64 формате
        const originalSaveTask = this.storage.saveTask;
        this.storage.saveTask = async function(task) {
            try {
                // Получение файлов с формы
                const fileList = document.getElementById('fileList');
                if (fileList && fileList.children.length > 0) {
                    task.attachments = task.attachments || [];
                    
                    // Сохранение существующих вложений, которые не изменились
                    const existingTask = await this.getTask(task.id);
                    if (existingTask && existingTask.attachments) {
                        task.attachments = [...existingTask.attachments];
                    }
                    
                    // Добавление новых вложений
                    const children = Array.from(fileList.children);
                    
                    for (const fileItem of children) {
                        const fileName = fileItem.querySelector('.file-name').textContent;
                        const fileSize = fileItem.querySelector('.file-size').textContent;
                        
                        // Проверка, есть ли превью изображения
                        const preview = fileItem.querySelector('.file-preview img');
                        let fileData = null;
                        
                        if (preview) {
                            fileData = preview.src;
                        }
                        
                        // Добавление вложения, если есть данные
                        if (fileData) {
                            task.attachments.push({
                                name: fileName,
                                size: fileSize,
                                data: fileData,
                                type: 'image'
                            });
                        }
                    }
                }
                
                // Вызов оригинальной функции сохранения
                return await originalSaveTask.call(this, task);
            } catch (error) {
                console.error('Ошибка сохранения вложений:', error);
                return await originalSaveTask.call(this, task);
            }
        };
    }
    
    /**
     * Настройка заметок для задач
     */
    setupTaskNotes() {
        // Добавление поддержки Markdown
        let markdownConverter = null;
        
        // Загрузка Showdown.js для конвертации Markdown
        const loadShowdown = () => {
            return new Promise((resolve, reject) => {
                if (window.showdown) {
                    resolve(window.showdown);
                    return;
                }
                
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/showdown/2.1.0/showdown.min.js';
                script.onload = () => resolve(window.showdown);
                script.onerror = () => reject(new Error('Не удалось загрузить Showdown.js'));
                
                document.head.appendChild(script);
            });
        };
        
        // Инициализация конвертера Markdown
        loadShowdown().then(showdown => {
            markdownConverter = new showdown.Converter();
            
            // Обработчик отображения заметок в задаче
            document.addEventListener('taskRendered', (event) => {
                const taskElement = event.detail.taskElement;
                const taskId = event.detail.taskId;
                
                if (!taskElement || !taskId) return;
                
                // Проверка наличия заметок у задачи
                this.storage.getTask(taskId).then(task => {
                    if (task && task.notes) {
                        // Добавление контейнера для заметок
                        const taskContent = taskElement.querySelector('.task-content');
                        
                        if (taskContent) {
                            const notesContainer = document.createElement('div');
                            notesContainer.className = 'task-notes-container';
                            
                            // Конвертация Markdown в HTML
                            const htmlContent = markdownConverter.makeHtml(task.notes);
                            
                            notesContainer.innerHTML = `
                                <div class="task-notes-toggle">
                                    <i class="fas fa-sticky-note"></i>
                                    <span>Заметки</span>
                                </div>
                                <div class="task-notes-content" style="display: none;">
                                    <div class="task-notes-html">${htmlContent}</div>
                                </div>
                            `;
                            
                            // Обработчик переключения отображения заметок
                            const toggleBtn = notesContainer.querySelector('.task-notes-toggle');
                            const notesContent = notesContainer.querySelector('.task-notes-content');
                            
                            toggleBtn.addEventListener('click', () => {
                                const isVisible = notesContent.style.display !== 'none';
                                notesContent.style.display = isVisible ? 'none' : 'block';
                                toggleBtn.classList.toggle('active', !isVisible);
                            });
                            
                            // Добавление контейнера после основного содержимого
                            taskContent.appendChild(notesContainer);
                        }
                    }
                }).catch(error => {
                    console.error('Ошибка загрузки заметок:', error);
                });
            });
        }).catch(error => {
            console.error('Ошибка инициализации Markdown:', error);
        });
    }
    
    /**
     * Настройка архивирования задач
     */
    setupTaskArchiving() {
        // Добавление контейнера с архивированными задачами
        const tasksSection = document.querySelector('.tasks-section');
        
        if (tasksSection) {
            // Добавление кнопки для отображения архива в заголовок секции задач
            const sectionHeader = tasksSection.querySelector('.section-header');
            
            if (sectionHeader) {
                const archiveBtn = document.createElement('button');
                archiveBtn.className = 'btn btn-outline';
                archiveBtn.id = 'archiveBtn';
                archiveBtn.innerHTML = `
                    <i class="fas fa-archive"></i>
                    <span>Архив</span>
                `;
                
                // Добавление кнопки в действия заголовка
                const sectionActions = sectionHeader.querySelector('.section-actions');
                if (sectionActions) {
                    sectionActions.insertBefore(archiveBtn, sectionActions.firstChild);
                }
                
                // Обработчик отображения архива
                archiveBtn.addEventListener('click', () => {
                    this.showArchive();
                });
            }
            
            // Добавление кнопки архивирования к действиям задачи
            document.addEventListener('taskRendered', (event) => {
                const taskElement = event.detail.taskElement;
                const taskActions = taskElement.querySelector('.task-actions');
                
                if (taskActions) {
                    const archiveBtn = document.createElement('button');
                    archiveBtn.className = 'task-action-btn archive-btn';
                    archiveBtn.title = 'Архивировать задачу';
                    archiveBtn.innerHTML = '<i class="fas fa-archive"></i>';
                    
                    // Получение ID задачи
                    const taskId = taskElement.querySelector('[data-id]').getAttribute('data-id');
                    
                    // Обработчик архивирования задачи
                    archiveBtn.addEventListener('click', async () => {
                        try {
                            const task = await this.storage.getTask(taskId);
                            
                            if (task) {
                                // Установка флага архивирования
                                task.archived = true;
                                
                                // Сохранение изменений
                                await this.storage.saveTask(task);
                                
                                // Анимация удаления и обновление интерфейса
                                if (window.animationManager) {
                                    window.animationManager.animateRemove(taskElement, () => {
                                        // Обновление отображения задач
                                        if (typeof window.updateUI === 'function') {
                                            window.updateUI();
                                        }
                                    });
                                } else {
                                    // Если анимации недоступны, просто обновляем UI
                                    if (typeof window.updateUI === 'function') {
                                        window.updateUI();
                                    }
                                }
                                
                                // Показать уведомление
                                if (typeof window.showToast === 'function') {
                                    window.showToast('Задача архивирована', `Задача "${task.title}" перемещена в архив`, 'info');
                                }
                            }
                        } catch (error) {
                            console.error('Ошибка архивирования задачи:', error);
                        }
                    });
                    
                    // Добавление кнопки архивирования
                    taskActions.insertBefore(archiveBtn, taskActions.firstChild);
                }
            });
        }
    }
    
    /**
     * Отображение архива задач
     */
    async showArchive() {
        try {
            // Получение всех архивированных задач
            const tasks = await this.storage.getTasks();
            const archivedTasks = tasks.filter(task => task.archived);
            
            // Создание модального окна для архива
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay';
            
            const modal = document.createElement('div');
            modal.className = 'modal archive-modal';
            
            modal.innerHTML = `
                <div class="modal-header">
                    <h2 class="modal-title">Архив задач</h2>
                    <button class="modal-close" id="closeArchiveModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="archive-tasks-list" id="archiveTasksList">
                        ${archivedTasks.length === 0 ? '<div class="text-center">Архив пуст</div>' : ''}
                    </div>
                </div>
            `;
            
            modalOverlay.appendChild(modal);
            document.body.appendChild(modalOverlay);
            
            // Активация модального окна
            setTimeout(() => {
                modalOverlay.classList.add('active');
                
                // Отображение архивированных задач
                if (archivedTasks.length > 0) {
                    const archiveTasksList = document.getElementById('archiveTasksList');
                    
                    archivedTasks.forEach(task => {
                        const taskElement = document.createElement('div');
                        taskElement.className = `archive-task-item ${task.completed ? 'task-completed' : ''}`;
                        
                        taskElement.innerHTML = `
                            <div class="archive-task-content">
                                <div class="archive-task-header">
                                    <h3 class="archive-task-title">${task.title}</h3>
                                    <span class="task-badge badge-primary">${this.getCategoryText(task.category)}</span>
                                    <span class="task-badge ${this.getPriorityClass(task.priority)}">${this.getPriorityText(task.priority)}</span>
                                </div>
                                <div class="archive-task-meta">
                                    <span class="archive-task-date">Создано: ${task.createdAt}</span>
                                </div>
                            </div>
                            <div class="archive-task-actions">
                                <button class="archive-task-action-btn restore-btn" data-id="${task.id}">
                                    <i class="fas fa-undo"></i>
                                </button>
                                <button class="archive-task-action-btn delete-btn" data-id="${task.id}">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        `;
                        
                        archiveTasksList.appendChild(taskElement);
                    });
                    
                    // Обработчики действий с архивными задачами
                    document.querySelectorAll('.restore-btn').forEach(button => {
                        button.addEventListener('click', async () => {
                            const taskId = button.getAttribute('data-id');
                            const task = await this.storage.getTask(taskId);
                            
                            if (task) {
                                // Восстановление из архива
                                task.archived = false;
                                
                                // Сохранение изменений
                                await this.storage.saveTask(task);
                                
                                // Удаление элемента из списка
                                button.closest('.archive-task-item').remove();
                                
                                // Обновление отображения задач
                                if (typeof window.updateUI === 'function') {
                                    window.updateUI();
                                }
                                
                                // Уведомление
                                if (typeof window.showToast === 'function') {
                                    window.showToast('Задача восстановлена', `Задача "${task.title}" восстановлена из архива`, 'success');
                                }
                                
                                // Проверка, остались ли задачи в архиве
                                if (document.querySelectorAll('.archive-task-item').length === 0) {
                                    document.getElementById('archiveTasksList').innerHTML = '<div class="text-center">Архив пуст</div>';
                                }
                            }
                        });
                    });
                    
                    document.querySelectorAll('.archive-task-actions .delete-btn').forEach(button => {
                        button.addEventListener('click', async () => {
                            const taskId = button.getAttribute('data-id');
                            const task = await this.storage.getTask(taskId);
                            
                            if (task && confirm(`Вы уверены, что хотите удалить задачу "${task.title}" из архива?`)) {
                                // Удаление задачи
                                await this.storage.deleteTask(taskId);
                                
                                // Удаление элемента из списка
                                button.closest('.archive-task-item').remove();
                                
                                // Уведомление
                                if (typeof window.showToast === 'function') {
                                    window.showToast('Задача удалена', `Задача "${task.title}" удалена`, 'success');
                                }
                                
                                // Проверка, остались ли задачи в архиве
                                if (document.querySelectorAll('.archive-task-item').length === 0) {
                                    document.getElementById('archiveTasksList').innerHTML = '<div class="text-center">Архив пуст</div>';
                                }
                            }
                        });
                    });
                }
                
                // Обработчик закрытия модального окна
                document.getElementById('closeArchiveModal').addEventListener('click', () => {
                    modalOverlay.classList.remove('active');
                    setTimeout(() => {
                        document.body.removeChild(modalOverlay);
                    }, 300);
                });
                
                // Закрытие по клику на оверлей
                modalOverlay.addEventListener('click', (e) => {
                    if (e.target === modalOverlay) {
                        modalOverlay.classList.remove('active');
                        setTimeout(() => {
                            document.body.removeChild(modalOverlay);
                        }, 300);
                    }
                });
            }, 50);
        } catch (error) {
            console.error('Ошибка отображения архива:', error);
        }
    }
    
    /**
     * Получение текстового представления категории
     * @param {string} category Значение категории
     * @returns {string} Текстовое представление
     */
    getCategoryText(category) {
        switch (category) {
            case 'design': return 'Дизайн';
            case 'development': return 'Разработка';
            case 'documentation': return 'Документация';
            case 'meeting': return 'Встреча';
            case 'presentation': return 'Презентация';
            default: return 'Другое';
        }
    }
    
    /**
     * Получение класса CSS для приоритета
     * @param {string} priority Значение приоритета
     * @returns {string} Класс CSS
     */
    getPriorityClass(priority) {
        switch (priority) {
            case 'high': return 'badge-danger';
            case 'medium': return 'badge-warning';
            case 'low': return 'badge-success';
            default: return 'badge-secondary';
        }
    }
    
    /**
     * Получение текстового представления приоритета
     * @param {string} priority Значение приоритета
     * @returns {string} Текстовое представление
     */
    getPriorityText(priority) {
        switch (priority) {
            case 'high': return 'Высокий';
            case 'medium': return 'Средний';
            case 'low': return 'Низкий';
            default: return 'Не задан';
        }
    }
    
    /**
     * Обработчики событий задач
     */
    listenForTaskEvents() {
        // Обработка события завершения задачи
        document.addEventListener('taskCompleted', (event) => {
            const taskId = event.detail.taskId;
            const taskElement = document.querySelector(`.task-item .task-checkbox[id="task${taskId}"]`).closest('.task-item');
            
            // Применение анимации завершения
            if (window.animationManager) {
                window.animationManager.animateTaskCompletion(taskElement);
            }
        });
        
        // Обработка события добавления задачи
        document.addEventListener('taskAdded', () => {
            // Обновление списка доступных тегов
            this.loadAvailableTags();
        });
        
        // Обработка события обновления интерфейса
        document.addEventListener('DOMContentLoaded', () => {
            // Переопределение функции отображения задач для добавления событий
            const originalRenderTasks = window.renderTasks;
            
            if (typeof originalRenderTasks === 'function') {
                window.renderTasks = function(tasks) {
                    // Выполнение оригинальной функции
                    originalRenderTasks(tasks);
                    
                    // Добавление фильтрации по архивированным задачам
                    if (window.currentFilters) {
                        tasks = tasks.filter(task => !task.archived);
                    }
                    
                    // Генерация события для каждой отрисованной задачи
                    document.querySelectorAll('.task-item').forEach(taskElement => {
                        const taskId = taskElement.querySelector('[data-id]').getAttribute('data-id');
                        
                        document.dispatchEvent(new CustomEvent('taskRendered', {
                            detail: { taskElement, taskId }
                        }));
                    });
                };
            }
            
            // Переопределение функции сохранения задачи
            const originalSaveTask = window.saveTask && window.saveTask.addEventListener;
            
            if (originalSaveTask) {
                window.saveTask.addEventListener = function(event, handler) {
                    if (event === 'click') {
                        const originalHandler = handler;
                        
                        const newHandler = async function(e) {
                            e.preventDefault();
                            
                            // Получение основных данных задачи из формы
                            const taskTitle = document.getElementById('taskTitle').value.trim();
                            if (!taskTitle) {
                                if (typeof window.showToast === 'function') {
                                    window.showToast('Ошибка', 'Название задачи не может быть пустым', 'error');
                                }
                                return;
                            }
                            
                            // Базовая задача, которую обычно собирает оригинальный обработчик
                            const taskId = this.getAttribute('data-id');
                            let task = {
                                title: taskTitle,
                                description: document.getElementById('taskDescription').value.trim(),
                                category: document.getElementById('taskCategory').value,
                                priority: document.getElementById('taskPriority').value,
                                dueDate: document.getElementById('taskDueDate').value
                            };
                            
                            // Добавление тегов
                            const tagsContainer = document.getElementById('tagsContainer');
                            if (tagsContainer) {
                                const tags = Array.from(tagsContainer.querySelectorAll('.task-tag'))
                                    .map(tag => tag.textContent.trim());
                                
                                if (tags.length > 0) {
                                    task.tags = tags;
                                }
                            }
                            
                            // Добавление настроек для повторяющихся задач
                            const taskRecurring = document.getElementById('taskRecurring');
                            if (taskRecurring && taskRecurring.checked) {
                                const recurringType = document.getElementById('recurringType').value;
                                let interval = 1;
                                
                                if (recurringType === 'custom') {
                                    interval = parseInt(document.getElementById('recurringInterval').value, 10) || 1;
                                }
                                
                                task.recurring = {
                                    enabled: true,
                                    type: recurringType,
                                    interval: interval
                                };
                            }
                            
                            // Добавление подзадач
                            const subtasksList = document.getElementById('subtasksList');
                            if (subtasksList) {
                                const subtasks = Array.from(subtasksList.querySelectorAll('.subtask-item'))
                                    .map(item => ({
                                        text: item.querySelector('.subtask-text').textContent,
                                        completed: item.querySelector('.subtask-checkbox').checked
                                    }));
                                
                                if (subtasks.length > 0) {
                                    task.subtasks = subtasks;
                                }
                            }
                            
                            // Добавление заметок
                            const taskNotes = document.getElementById('taskNotes');
                            if (taskNotes && taskNotes.value.trim()) {
                                task.notes = taskNotes.value.trim();
                            }
                            
                            // Вызов оригинального обработчика сохранения
                            originalHandler.call(this, e);
                        };
                        
                        // Регистрация нового обработчика
                        originalSaveTask.call(this, event, newHandler);
                    } else {
                        // Для других событий используем оригинальный метод
                        originalSaveTask.call(this, event, handler);
                    }
                };
            }
        });
    }
}

// Создание и экспорт экземпляра класса
const enhancedTasks = new EnhancedTasks();
window.enhancedTasks = enhancedTasks;

export default enhancedTasks;
