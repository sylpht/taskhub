/**
 * keyboardShortcuts.js - Система горячих клавиш для приложения
 */

class KeyboardShortcuts {
    constructor() {
        // Список активных горячих клавиш
        this.shortcuts = [
            { key: 'n', ctrlKey: true, description: 'Создать новую задачу', handler: this.createNewTask },
            { key: 'f', ctrlKey: true, description: 'Фокус на поиск', handler: this.focusSearch },
            { key: '/', ctrlKey: false, description: 'Фокус на поиск', handler: this.focusSearch },
            { key: 'h', ctrlKey: true, description: 'Показать/скрыть боковую панель', handler: this.toggleSidebar },
            { key: 'k', ctrlKey: true, description: 'Показать список горячих клавиш', handler: this.showShortcutsModal },
            { key: 'Escape', ctrlKey: false, description: 'Закрыть активное окно', handler: this.handleEscape },
            { key: 'd', ctrlKey: true, description: 'Переключить тему', handler: this.toggleTheme },
            { key: 'ArrowUp', ctrlKey: true, description: 'Выбрать предыдущую задачу', handler: this.selectPreviousTask },
            { key: 'ArrowDown', ctrlKey: true, description: 'Выбрать следующую задачу', handler: this.selectNextTask },
            { key: 'Enter', ctrlKey: false, description: 'Редактировать выбранную задачу', handler: this.editSelectedTask },
            { key: 'Delete', ctrlKey: false, description: 'Удалить выбранную задачу', handler: this.deleteSelectedTask },
            { key: ' ', ctrlKey: false, description: 'Отметить выбранную задачу как выполненную', handler: this.toggleSelectedTaskCompletion },
            { key: '1', ctrlKey: true, description: 'Перейти к дашборду', handler: () => this.navigateTo('dashboard') },
            { key: '2', ctrlKey: true, description: 'Перейти к списку задач', handler: () => this.navigateTo('tasks') },
            { key: '3', ctrlKey: true, description: 'Перейти к канбан-доске', handler: () => this.navigateTo('kanban') },
            { key: '4', ctrlKey: true, description: 'Перейти к отчетам', handler: () => this.navigateTo('reports') },
            { key: 's', ctrlKey: true, description: 'Сохранить задачу (в режиме редактирования)', handler: this.saveCurrentTask },
            { key: 'a', ctrlKey: true, description: 'Архивировать выбранную задачу', handler: this.archiveSelectedTask }
        ];
        
        // Текущая выбранная задача
        this.selectedTaskIndex = -1;
        
        // Инициализация
        this.init();
    }
    
    /**
     * Инициализация обработчиков клавиш
     */
    init() {
        // Глобальный обработчик клавиш
        document.addEventListener('keydown', (e) => {
            // Игнорируем нажатия в полях ввода
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // Кроме случая нажатия Esc
                if (e.key !== 'Escape') {
                    return;
                }
            }
            
            // Поиск подходящей горячей клавиши
            const shortcut = this.shortcuts.find(s => {
                return s.key === e.key && s.ctrlKey === e.ctrlKey;
            });
            
            if (shortcut) {
                e.preventDefault();
                shortcut.handler.call(this, e);
            }
        });
        
        // Инициализация помощи по горячим клавишам
        document.addEventListener('DOMContentLoaded', () => {
            // Добавление кнопки помощи в нижнюю часть боковой панели
            const sidebar = document.querySelector('.sidebar');
            
            if (sidebar) {
                const helpButton = document.createElement('div');
                helpButton.className = 'keyboard-shortcuts-help';
                helpButton.innerHTML = `
                    <button class="keyboard-shortcuts-button">
                        <i class="fas fa-keyboard"></i>
                        <span>Горячие клавиши</span>
                    </button>
                `;
                
                // Добавление кнопки в нижнюю часть боковой панели
                sidebar.appendChild(helpButton);
                
                // Обработчик клика по кнопке
                helpButton.querySelector('.keyboard-shortcuts-button').addEventListener('click', () => {
                    this.showShortcutsModal();
                });
                
                // Добавление стилей
                const style = document.createElement('style');
                style.textContent = `
                    .keyboard-shortcuts-help {
                        padding: 1rem;
                        border-top: 1px solid var(--gray-200);
                        margin-top: auto;
                    }
                    
                    .keyboard-shortcuts-button {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        width: 100%;
                        padding: 0.5rem;
                        background: var(--gray-100);
                        border: 1px solid var(--gray-200);
                        border-radius: var(--radius);
                        cursor: pointer;
                        transition: var(--transition);
                        font-size: var(--font-size-sm);
                    }
                    
                    .keyboard-shortcuts-button:hover {
                        background: var(--gray-200);
                    }
                    
                    .shortcut-key {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        min-width: 24px;
                        height: 24px;
                        padding: 0 6px;
                        background-color: var(--gray-100);
                        border: 1px solid var(--gray-300);
                        border-radius: var(--radius-sm);
                        font-family: monospace;
                        font-size: 12px;
                        font-weight: 600;
                        color: var(--gray-700);
                        box-shadow: 0 1px 1px rgba(0,0,0,0.1);
                    }
                    
                    .shortcut-keys-combo {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }
                    
                    .shortcut-plus {
                        font-size: 12px;
                        color: var(--gray-500);
                    }
                    
                    .task-item.selected {
                        outline: 2px solid var(--primary);
                        background-color: rgba(var(--primary-rgb), 0.05);
                    }
                `;
                
                document.head.appendChild(style);
            }
        });
    }
    
    /**
     * Создание новой задачи
     */
    createNewTask() {
        if (typeof window.showTaskModal === 'function') {
            window.showTaskModal();
        }
    }
    
    /**
     * Установка фокуса на поле поиска
     */
    focusSearch() {
        const searchInput = document.querySelector('.tasks-search-input');
        
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    /**
     * Переключение видимости боковой панели
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        
        if (sidebar) {
            sidebar.classList.toggle('sidebar-collapsed');
        }
    }
    
    /**
     * Отображение модального окна с горячими клавишами
     */
    showShortcutsModal() {
        // Создание модального окна
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal shortcuts-modal';
        
        // Группировка горячих клавиш по категориям
        const categorizedShortcuts = {
            'Навигация': this.shortcuts.filter(s => 
                s.key.startsWith('Arrow') || s.key === 'h' || ['1', '2', '3', '4'].includes(s.key)
            ),
            'Задачи': this.shortcuts.filter(s => 
                ['n', 'Enter', 'Delete', ' ', 's', 'a'].includes(s.key)
            ),
            'Общие': this.shortcuts.filter(s => 
                ['f', '/', 'Escape', 'd', 'k'].includes(s.key)
            )
        };
        
        // Подготовка HTML для содержимого модального окна
        let shortcutsHTML = '';
        
        for (const [category, shortcuts] of Object.entries(categorizedShortcuts)) {
            shortcutsHTML += `
                <div class="shortcuts-category">
                    <h3>${category}</h3>
                    <div class="shortcuts-list">
            `;
            
            shortcuts.forEach(shortcut => {
                shortcutsHTML += `
                    <div class="shortcut-item">
                        <div class="shortcut-keys-combo">
                            ${shortcut.ctrlKey ? '<span class="shortcut-key">Ctrl</span><span class="shortcut-plus">+</span>' : ''}
                            <span class="shortcut-key">${this.formatKeyName(shortcut.key)}</span>
                        </div>
                        <div class="shortcut-description">${shortcut.description}</div>
                    </div>
                `;
            });
            
            shortcutsHTML += `
                    </div>
                </div>
            `;
        }
        
        modal.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">Горячие клавиши</h2>
                <button class="modal-close" id="closeShortcutsModal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="shortcuts-container">
                    ${shortcutsHTML}
                </div>
            </div>
        `;
        
        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);
        
        // Активация модального окна
        setTimeout(() => {
            modalOverlay.classList.add('active');
            
            // Обработчик закрытия
            document.getElementById('closeShortcutsModal').addEventListener('click', () => {
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
    }
    
    /**
     * Форматирование названия клавиши для отображения
     * @param {string} key Название клавиши
     * @returns {string} Отформатированное название
     */
    formatKeyName(key) {
        const keyMap = {
            'ArrowUp': '↑',
            'ArrowDown': '↓',
            'ArrowLeft': '←',
            'ArrowRight': '→',
            'Escape': 'Esc',
            ' ': 'Space',
            '/': '/',
            'Delete': 'Del'
        };
        
        return keyMap[key] || key.toUpperCase();
    }
    
    /**
     * Обработчик нажатия клавиши Escape
     */
    handleEscape() {
        // Закрытие активного модального окна
        const activeModal = document.querySelector('.modal-overlay.active');
        
        if (activeModal) {
            const closeButton = activeModal.querySelector('.modal-close');
            
            if (closeButton) {
                closeButton.click();
            } else {
                activeModal.classList.remove('active');
            }
        }
    }
    
    /**
     * Переключение темы оформления
     */
    toggleTheme() {
        const themeToggle = document.getElementById('themeToggle');
        
        if (themeToggle) {
            themeToggle.click();
        }
    }
    
    /**
     * Выбор предыдущей задачи
     */
    selectPreviousTask() {
        const tasks = document.querySelectorAll('.task-item');
        
        if (tasks.length === 0) return;
        
        // Снятие выделения с текущей задачи
        if (this.selectedTaskIndex >= 0 && this.selectedTaskIndex < tasks.length) {
            tasks[this.selectedTaskIndex].classList.remove('selected');
        }
        
        // Выбор предыдущей задачи или последней, если текущая первая
        this.selectedTaskIndex = (this.selectedTaskIndex <= 0) ? tasks.length - 1 : this.selectedTaskIndex - 1;
        
        // Выделение новой задачи
        tasks[this.selectedTaskIndex].classList.add('selected');
        
        // Прокрутка к выбранной задаче
        tasks[this.selectedTaskIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    /**
     * Выбор следующей задачи
     */
    selectNextTask() {
        const tasks = document.querySelectorAll('.task-item');
        
        if (tasks.length === 0) return;
        
        // Снятие выделения с текущей задачи
        if (this.selectedTaskIndex >= 0 && this.selectedTaskIndex < tasks.length) {
            tasks[this.selectedTaskIndex].classList.remove('selected');
        }
        
        // Выбор следующей задачи или первой, если текущая последняя
        this.selectedTaskIndex = (this.selectedTaskIndex >= tasks.length - 1) ? 0 : this.selectedTaskIndex + 1;
        
        // Выделение новой задачи
        tasks[this.selectedTaskIndex].classList.add('selected');
        
        // Прокрутка к выбранной задаче
        tasks[this.selectedTaskIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    /**
     * Редактирование выбранной задачи
     */
    editSelectedTask() {
        const tasks = document.querySelectorAll('.task-item');
        
        if (this.selectedTaskIndex >= 0 && this.selectedTaskIndex < tasks.length) {
            const editButton = tasks[this.selectedTaskIndex].querySelector('.edit-btn');
            
            if (editButton) {
                editButton.click();
            }
        }
    }
    
    /**
     * Удаление выбранной задачи
     */
    deleteSelectedTask() {
        const tasks = document.querySelectorAll('.task-item');
        
        if (this.selectedTaskIndex >= 0 && this.selectedTaskIndex < tasks.length) {
            const deleteButton = tasks[this.selectedTaskIndex].querySelector('.delete-btn');
            
            if (deleteButton) {
                deleteButton.click();
            }
        }
    }
    
    /**
     * Переключение статуса выполнения выбранной задачи
     */
    toggleSelectedTaskCompletion() {
        const tasks = document.querySelectorAll('.task-item');
        
        if (this.selectedTaskIndex >= 0 && this.selectedTaskIndex < tasks.length) {
            const checkbox = tasks[this.selectedTaskIndex].querySelector('.task-checkbox');
            
            if (checkbox) {
                checkbox.click();
            }
        }
    }
    
    /**
     * Переход к указанному разделу
     * @param {string} section Название раздела
     */
    navigateTo(section) {
        let menuItem;
        
        switch (section) {
            case 'dashboard':
                menuItem = document.querySelector('.menu-link:has(i.fa-tachometer-alt)');
                break;
            case 'tasks':
                menuItem = document.querySelector('.menu-link:has(i.fa-tasks)');
                break;
            case 'kanban':
                menuItem = document.querySelector('.menu-link:has(i.fa-columns)');
                break;
            case 'reports':
                menuItem = document.querySelector('.menu-link:has(i.fa-chart-line), .menu-link:has(i.fa-chart-bar)');
                break;
        }
        
        if (menuItem) {
            menuItem.click();
        }
    }
    
    /**
     * Сохранение текущей задачи в режиме редактирования
     */
    saveCurrentTask() {
        const saveTaskButton = document.getElementById('saveTask');
        
        if (saveTaskButton && document.querySelector('.modal-overlay.active')) {
            saveTaskButton.click();
        }
    }
    
    /**
     * Архивирование выбранной задачи
     */
    archiveSelectedTask() {
        const tasks = document.querySelectorAll('.task-item');
        
        if (this.selectedTaskIndex >= 0 && this.selectedTaskIndex < tasks.length) {
            const archiveButton = tasks[this.selectedTaskIndex].querySelector('.archive-btn');
            
            if (archiveButton) {
                archiveButton.click();
            }
        }
    }
}

// Создание и экспорт экземпляра системы горячих клавиш
const keyboardShortcuts = new KeyboardShortcuts();
window.keyboardShortcuts = keyboardShortcuts;

export default keyboardShortcuts;
