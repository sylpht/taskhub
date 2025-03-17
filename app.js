/**
 * app.js
 * Основной файл приложения, связывающий все модули и функциональность
 */

// Импорт хранилища данных
import indexedDBStorage from './storage/indexedDB.js';

// Глобальные переменные
let currentTasks = [];
let currentFilters = {
    status: 'all',
    priority: 'all',
    search: ''
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация хранилища данных
    window.storageManager = indexedDBStorage;
    
    // Инициализация основных функций
    initTaskFunctions();
    initEventListeners();
    
    // Загрузка и отображение задач
    loadTasks();
    
    // Обновление статистики
    updateStats();
    
    console.log('Приложение TaskHub инициализировано');
});

/**
 * Инициализация функций для работы с задачами
 */
function initTaskFunctions() {
    // Функция для редактирования задачи
    window.editTask = function(id) {
        console.log('Редактирование задачи:', id);
        showTaskModal(id);
    };
    
    // Функция для отображения модального окна задачи
    window.showTaskModal = function(id = null) {
        const taskModal = document.getElementById('taskModal');
        if (!taskModal) return;
        
        // Очистка формы
        document.getElementById('taskForm').reset();
        
        if (id) {
            // Режим редактирования
            document.querySelector('.modal-title').textContent = 'Редактировать задачу';
            document.getElementById('saveTask').setAttribute('data-id', id);
            
            // Заполнение формы данными задачи
            indexedDBStorage.getTask(id).then(task => {
                if (task) {
                    document.getElementById('taskTitle').value = task.title || '';
                    document.getElementById('taskDescription').value = task.description || '';
                    document.getElementById('taskCategory').value = task.category || 'other';
                    document.getElementById('taskPriority').value = task.priority || 'medium';
                    
                    if (task.dueDate) {
                        document.getElementById('taskDueDate').value = task.dueDate;
                    }
                }
            });
        } else {
            // Режим создания
            document.querySelector('.modal-title').textContent = 'Новая задача';
            document.getElementById('saveTask').removeAttribute('data-id');
        }
        
        // Отображение модального окна
        taskModal.classList.add('active');
        document.getElementById('taskTitle').focus();
    };
    
    // Функция для обновления интерфейса
    window.updateUI = function() {
        loadTasks();
    };
    
    // Функция для применения фильтров
    window.applyFilters = function() {
        applyFilters();
    };
    
    // Функция для диспетчеризации событий задач
    window.dispatchTaskEvent = function(eventName, taskId) {
        window.dispatchEvent(new CustomEvent(eventName, { detail: { taskId } }));
    };
}

/**
 * Инициализация обработчиков событий
 */
function initEventListeners() {
    // Обработчик переключения боковой панели
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const menuToggle = document.getElementById('menuToggle');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('sidebar-collapsed');
        });
    }
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    // Обработчик переключения темы
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                localStorage.setItem('theme', 'light');
            } else {
                body.setAttribute('data-theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                localStorage.setItem('theme', 'dark');
            }
        });
        
        // Проверка сохраненной темы в localStorage
        if (localStorage.getItem('theme') === 'dark') {
            body.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
    
    // Обработчики для модального окна задачи
    const taskModal = document.getElementById('taskModal');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const closeModal = document.getElementById('closeModal');
    const cancelTask = document.getElementById('cancelTask');
    const saveTask = document.getElementById('saveTask');
    const taskForm = document.getElementById('taskForm');
    
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', function() {
            window.showTaskModal();
        });
    }
    
    function closeTaskModal() {
        if (taskModal) {
            taskModal.classList.remove('active');
            if (taskForm) taskForm.reset();
        }
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', closeTaskModal);
    }
    
    if (cancelTask) {
        cancelTask.addEventListener('click', closeTaskModal);
    }
    
    if (taskModal) {
        taskModal.addEventListener('click', function(e) {
            if (e.target === taskModal) {
                closeTaskModal();
            }
        });
    }
    
    // Обработчик сохранения задачи
    if (saveTask) {
        saveTask.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const taskTitle = document.getElementById('taskTitle').value.trim();
            if (!taskTitle) {
                showToast('Ошибка', 'Название задачи не может быть пустым', 'error');
                return;
            }
            
            const taskId = this.getAttribute('data-id');
            let task = {
                title: taskTitle,
                description: document.getElementById('taskDescription').value.trim(),
                category: document.getElementById('taskCategory').value,
                priority: document.getElementById('taskPriority').value,
                dueDate: document.getElementById('taskDueDate').value,
                completed: false
            };
            
            if (taskId) {
                // Редактирование существующей задачи
                const existingTask = await indexedDBStorage.getTask(taskId);
                if (existingTask) {
                    // Сохраняем старые значения, которые не меняются в форме
                    task.id = existingTask.id;
                    task.completed = existingTask.completed;
                    task.createdAt = existingTask.createdAt;
                    task.kanbanColumn = existingTask.kanbanColumn;
                    
                    if (existingTask.timeSpent) {
                        task.timeSpent = existingTask.timeSpent;
                    }
                }
                
                await indexedDBStorage.saveTask(task);
                showToast('Задача обновлена', `Задача "${taskTitle}" успешно обновлена`, 'success');
            } else {
                // Создание новой задачи
                task.id = Date.now();
                task.createdAt = new Date().toLocaleDateString('ru-RU');
                
                await indexedDBStorage.saveTask(task);
                showToast('Задача создана', `Задача "${taskTitle}" успешно создана`, 'success');
                
                // Генерация события добавления задачи
                window.dispatchEvent(new CustomEvent('taskAdded', { detail: { taskId: task.id } }));
            }
            
            // Закрытие модального окна
            closeTaskModal();
            
            // Обновление интерфейса
            loadTasks();
            updateStats();
        });
    }
    
    // Обработчики фильтрации задач
    const filterButtons = document.querySelectorAll('.filter-btn');
    const tasksSearchInput = document.querySelector('.tasks-search-input');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filterType = this.parentNode.parentNode.querySelector('.filter-label').textContent.trim().toLowerCase().replace(':', '');
            const filterValue = this.getAttribute('data-filter');
            
            // Удаление активного класса у всех кнопок в этой группе
            this.parentNode.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Добавление активного класса этой кнопке
            this.classList.add('active');
            
            // Обновление текущих фильтров
            if (filterType.includes('статус')) {
                currentFilters.status = filterValue;
            } else if (filterType.includes('приоритет')) {
                currentFilters.priority = filterValue;
            }
            
            // Применение фильтров
            applyFilters();
        });
    });
    
    if (tasksSearchInput) {
        tasksSearchInput.addEventListener('input', function() {
            currentFilters.search = this.value.trim().toLowerCase();
            applyFilters();
        });
    }
    
    // Обработчик загрузки файлов
    const fileDropArea = document.getElementById('fileDropArea');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    
    if (fileDropArea && fileInput) {
        fileDropArea.addEventListener('click', function() {
            fileInput.click();
        });
        
        fileDropArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        
        fileDropArea.addEventListener('dragleave', function() {
            this.classList.remove('dragover');
        });
        
        fileDropArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        });
        
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                handleFiles(this.files);
            }
        });
    }
    
    // Функция обработки файлов
    function handleFiles(files) {
        if (!fileList || files.length === 0) return;
        
        Array.from(files).forEach(file => {
            // Проверка размера файла (10MB)
            if (file.size > 10 * 1024 * 1024) {
                showToast('Ошибка', `Файл "${file.name}" превышает максимальный размер (10MB)`, 'error');
                return;
            }
            
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            // Определение иконки файла
            let fileIcon = 'fa-file';
            if (file.type.includes('image')) fileIcon = 'fa-file-image';
            else if (file.type.includes('pdf')) fileIcon = 'fa-file-pdf';
            else if (file.type.includes('word')) fileIcon = 'fa-file-word';
            else if (file.type.includes('excel')) fileIcon = 'fa-file-excel';
            else if (file.type.includes('zip')) fileIcon = 'fa-file-archive';
            
            // Форматирование размера файла
            let fileSize = '';
            if (file.size < 1024) fileSize = `${file.size} B`;
            else if (file.size < 1024 * 1024) fileSize = `${(file.size / 1024).toFixed(1)} KB`;
            else fileSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
            
            fileItem.innerHTML = `
                <i class="file-icon fas ${fileIcon}"></i>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
                <button class="file-remove">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            const removeBtn = fileItem.querySelector('.file-remove');
            removeBtn.addEventListener('click', function() {
                fileItem.remove();
            });
            
            fileList.appendChild(fileItem);
        });
    }
}

/**
 * Загрузка задач из хранилища
 */
async function loadTasks() {
    try {
        // Получение задач из хранилища
        currentTasks = await indexedDBStorage.getTasks();
        
        // Применение фильтров и отображение задач
        applyFilters();
        
    } catch (error) {
        console.error('Ошибка загрузки задач:', error);
        showToast('Ошибка', 'Не удалось загрузить задачи', 'error');
    }
}

/**
 * Применение фильтров к задачам и отображение
 */
function applyFilters() {
    const filteredTasks = currentTasks.filter(task => {
        // Фильтр по статусу
        if (currentFilters.status !== 'all') {
            if (currentFilters.status === 'completed' && !task.completed) return false;
            if (currentFilters.status === 'active' && task.completed) return false;
        }
        
        // Фильтр по приоритету
        if (currentFilters.priority !== 'all' && task.priority !== currentFilters.priority) return false;
        
        // Фильтр по поисковому запросу
        if (currentFilters.search !== '' && !task.title.toLowerCase().includes(currentFilters.search)) return false;
        
        return true;
    });
    
    // Отображение отфильтрованных задач
    renderTasks(filteredTasks);
}

/**
 * Отображение задач
 * @param {Array} tasks Массив задач для отображения
 */
function renderTasks(tasks) {
    const tasksListElement = document.getElementById('tasksList');
    if (!tasksListElement) return;
    
    tasksListElement.innerHTML = '';
    
    if (tasks.length === 0) {
        tasksListElement.innerHTML = `
            <div class="text-center p-4">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--gray-300); margin-bottom: 1rem;"></i>
                <p class="text-gray-600">Задачи не найдены</p>
            </div>
        `;
        return;
    }
    
    // Отображение каждой задачи
    tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item${task.completed ? ' task-completed' : ''}`;
        
        // Форматирование даты выполнения
        let dueDateText = '';
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            if (dueDate.toDateString() === today.toDateString()) {
                dueDateText = `Сегодня, ${dueDate.getHours()}:${String(dueDate.getMinutes()).padStart(2, '0')}`;
            } else if (dueDate.toDateString() === tomorrow.toDateString()) {
                dueDateText = `Завтра, ${dueDate.getHours()}:${String(dueDate.getMinutes()).padStart(2, '0')}`;
            } else {
                dueDateText = `${dueDate.getDate()} ${getMonthName(dueDate.getMonth())}, ${dueDate.getHours()}:${String(dueDate.getMinutes()).padStart(2, '0')}`;
            }
        }
        
        // Определение классов для категории и приоритета
        let priorityClass = '';
        let priorityText = '';
        
        if (task.priority === 'high') {
            priorityClass = 'badge-danger';
            priorityText = 'Высокий';
        } else if (task.priority === 'medium') {
            priorityClass = 'badge-warning';
            priorityText = 'Средний';
        } else if (task.priority === 'low') {
            priorityClass = 'badge-success';
            priorityText = 'Низкий';
        }
        
        let categoryText = '';
        if (task.category === 'design') categoryText = 'Дизайн';
        else if (task.category === 'development') categoryText = 'Разработка';
        else if (task.category === 'documentation') categoryText = 'Документация';
        else if (task.category === 'meeting') categoryText = 'Встреча';
        else if (task.category === 'presentation') categoryText = 'Презентация';
        else categoryText = 'Другое';
        
        // Формирование HTML для задачи
        taskElement.innerHTML = `
            <input type="checkbox" class="task-checkbox" id="task${task.id}" ${task.completed ? 'checked' : ''}>
            <div class="task-content">
                <div class="task-header">
                    <h3 class="task-title">${task.title}</h3>
                    <span class="task-badge badge-primary">${categoryText}</span>
                    <span class="task-badge ${priorityClass}">${priorityText}</span>
                </div>
                <div class="task-details">
                    ${dueDateText ? `
                        <div class="task-detail">
                            <i class="fas fa-calendar"></i>
                            <span>${dueDateText}</span>
                        </div>
                    ` : ''}
                    <div class="task-detail">
                        <i class="fas fa-user"></i>
                        <span>${task.assignee || 'Не назначен'}</span>
                    </div>
                </div>
            </div>
            <div class="task-meta">
                <span class="task-date">Создано: ${task.createdAt}</span>
            </div>
            <div class="task-actions">
                <button class="task-action-btn edit-btn" data-id="${task.id}">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="task-action-btn delete-btn" data-id="${task.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        
        // Обработчик события изменения статуса задачи
        const checkbox = taskElement.querySelector('.task-checkbox');
        checkbox.addEventListener('change', async function() {
            const taskId = parseInt(this.id.replace('task', ''));
            const task = await indexedDBStorage.getTask(taskId);
            
            if (task) {
                task.completed = this.checked;
                
                // Если задача выполнена, переместить в колонку "Выполнено"
                if (task.completed && !task.kanbanColumn) {
                    task.kanbanColumn = 'done';
                }
                
                // Если задача снова активна, переместить в колонку "К выполнению"
                if (!task.completed && task.kanbanColumn === 'done') {
                    task.kanbanColumn = 'todo';
                }
                
                await indexedDBStorage.saveTask(task);
                
                // Обновление класса задачи
                taskElement.classList.toggle('task-completed', this.checked);
                
                // Показать уведомление
                if (this.checked) {
                    showToast('Задача выполнена', `Задача "${task.title}" отмечена как выполненная`, 'success');
                } else {
                    showToast('Задача активна', `Задача "${task.title}" отмечена как активная`, 'info');
                }
                
                // Обновление статистики
                updateStats();
            }
        });
        
        // Добавление задачи в список
        tasksListElement.appendChild(taskElement);
    });
    
    // Добавление обработчиков для кнопок редактирования и удаления
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', function() {
            const taskId = this.getAttribute('data-id');
            window.editTask(taskId);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const taskId = this.getAttribute('data-id');
            const task = await indexedDBStorage.getTask(taskId);
            
            if (confirm(`Вы уверены, что хотите удалить задачу "${task.title}"?`)) {
                await indexedDBStorage.deleteTask(taskId);
                
                // Обновление интерфейса
                loadTasks();
                updateStats();
                
                // Показать уведомление
                showToast('Задача удалена', `Задача "${task.title}" успешно удалена`, 'success');
                
                // Генерация события удаления задачи
                window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { taskId } }));
            }
        });
    });
}

/**
 * Обновление статистики на дашборде
 */
async function updateStats() {
    try {
        const tasks = await indexedDBStorage.getTasks();
        
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const activeTasks = totalTasks - completedTasks;
        const overdueTasks = tasks.filter(task => {
            if (task.completed) return false;
            if (!task.dueDate) return false;
            
            const dueDate = new Date(task.dueDate);
            return dueDate < new Date();
        }).length;
        
        const highPriorityTasks = tasks.filter(task => task.priority === 'high' && !task.completed).length;
        
        // Обновление карточек статистики
        updateStatCard('stat-primary', totalTasks, activeTasks, (activeTasks / totalTasks) * 100);
        updateStatCard('stat-success', completedTasks, `Эффективность: ${Math.round((completedTasks / totalTasks) * 100)}%`, (completedTasks / totalTasks) * 100);
        updateStatCard('stat-warning', activeTasks, `Срочных: ${highPriorityTasks}`, (activeTasks / totalTasks) * 100);
        updateStatCard('stat-danger', overdueTasks, `Критичных: ${tasks.filter(task => task.priority === 'high' && !task.completed && new Date(task.dueDate) < new Date()).length}`, (overdueTasks / totalTasks) * 100);
        
        // Обновление информации о пагинации
        const paginationInfo = document.querySelector('.pagination-info');
        if (paginationInfo) {
            paginationInfo.textContent = `Показано 1-${Math.min(5, totalTasks)} из ${totalTasks} задач`;
        }
    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
    }
}

/**
 * Обновление карточки статистики
 * @param {string} cardClass Класс карточки
 * @param {number} value Основное значение
 * @param {string|number} description Описание
 * @param {number} progressPercent Процент для прогресс-бара
 */
function updateStatCard(cardClass, value, description, progressPercent) {
    const card = document.querySelector(`.${cardClass}`);
    if (!card) return;
    
    const valueElement = card.querySelector('.stat-value');
    const descriptionElement = card.querySelector('.stat-description');
    const progressElement = card.querySelector('.progress-value');
    
    if (valueElement) valueElement.textContent = value;
    if (descriptionElement) descriptionElement.textContent = description;
    if (progressElement) progressElement.style.width = `${progressPercent}%`;
}

/**
 * Получение названия месяца
 * @param {number} month Номер месяца (0-11)
 * @returns {string} Название месяца
 */
function getMonthName(month) {
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return months[month];
}

/**
 * Отображение уведомления
 * @param {string} title Заголовок уведомления
 * @param {string} message Сообщение уведомления
 * @param {string} type Тип уведомления (info, success, error, warning)
 */
function showToast(title, message, type = 'info') {
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

// Экспорт для доступа из других модулей
export { showToast };