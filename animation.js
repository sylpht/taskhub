/**
 * animations.js - Модуль для управления анимациями в приложении
 */

class AnimationManager {
    constructor() {
        // Настройки по умолчанию
        this.settings = {
            enabled: true,             // Включены ли анимации
            reducedMotion: false,      // Уменьшение движения для улучшения доступности
            duration: 300,             // Стандартная длительность анимаций в мс
            easing: 'ease-out'         // Стандартная функция сглаживания
        };
        
        // Загрузка настроек из localStorage
        this.loadSettings();
        
        // Проверка предпочтений пользователя по уменьшению движения
        this.checkReducedMotionPreference();
    }
    
    /**
     * Загрузка настроек из localStorage
     */
    loadSettings() {
        const savedSettings = localStorage.getItem('animation_settings');
        
        if (savedSettings) {
            try {
                const parsedSettings = JSON.parse(savedSettings);
                this.settings = { ...this.settings, ...parsedSettings };
            } catch (error) {
                console.error('Ошибка при загрузке настроек анимации:', error);
            }
        }
    }
    
    /**
     * Проверка предпочтений пользователя по уменьшению движения
     */
    checkReducedMotionPreference() {
        // Проверяем медиа-запрос
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion) {
            this.settings.reducedMotion = true;
        }
    }
    
    /**
     * Сохранение настроек в localStorage
     */
    saveSettings() {
        localStorage.setItem('animation_settings', JSON.stringify(this.settings));
    }
    
    /**
     * Включение или отключение анимаций
     * @param {boolean} enabled Статус включения
     */
    setEnabled(enabled) {
        this.settings.enabled = enabled;
        
        // Применение класса к body для CSS-стилей
        if (enabled) {
            document.body.classList.remove('animations-disabled');
        } else {
            document.body.classList.add('animations-disabled');
        }
        
        this.saveSettings();
    }
    
    /**
     * Установка режима уменьшенного движения
     * @param {boolean} reduced Статус уменьшенного движения
     */
    setReducedMotion(reduced) {
        this.settings.reducedMotion = reduced;
        
        // Применение класса к body для CSS-стилей
        if (reduced) {
            document.body.classList.add('reduced-motion');
        } else {
            document.body.classList.remove('reduced-motion');
        }
        
        this.saveSettings();
    }
    
    /**
     * Применение анимации появления к элементам
     * @param {string} selector CSS-селектор элементов
     * @param {string} animation Название класса анимации
     * @param {number} staggerDelay Задержка между элементами (мс)
     */
    animateElements(selector, animation = 'fade-in', staggerDelay = 50) {
        if (!this.settings.enabled || this.settings.reducedMotion) return;
        
        const elements = document.querySelectorAll(selector);
        
        elements.forEach((element, index) => {
            // Удаляем все классы анимаций
            element.classList.remove('fade-in', 'slide-in-up', 'slide-in-right', 'scale-in');
            
            // Устанавливаем задержку
            element.style.animationDelay = `${index * staggerDelay}ms`;
            
            // Добавляем класс анимации
            element.classList.add(animation);
            
            // Используем requestAnimationFrame для обеспечения плавности
            requestAnimationFrame(() => {
                element.style.opacity = '1';
            });
        });
    }
    
    /**
     * Анимированное появление списка задач
     * @param {string} containerId ID контейнера с задачами
     */
    animateTaskList(containerId = 'tasksList') {
        if (!this.settings.enabled || this.settings.reducedMotion) return;
        
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const tasks = container.querySelectorAll('.task-item');
        
        tasks.forEach((task, index) => {
            task.style.opacity = '0';
            task.style.setProperty('--item-index', index);
        });
        
        this.animateElements('.task-item', 'slide-in-up', 30);
    }
    
    /**
     * Анимированное появление задачи
     * @param {HTMLElement} taskElement Элемент задачи
     * @param {boolean} isNew Является ли задача новой
     */
    animateTaskItem(taskElement, isNew = false) {
        if (!this.settings.enabled || this.settings.reducedMotion) return;
        
        taskElement.style.opacity = '0';
        
        if (isNew) {
            taskElement.classList.add('new-task');
        } else {
            taskElement.classList.add('slide-in-up');
        }
        
        requestAnimationFrame(() => {
            taskElement.style.opacity = '1';
        });
    }
    
    /**
     * Анимация удаления элемента
     * @param {HTMLElement} element Элемент для удаления
     * @param {Function} callback Функция обратного вызова после завершения анимации
     */
    animateRemove(element, callback) {
        if (!this.settings.enabled || this.settings.reducedMotion) {
            if (callback && typeof callback === 'function') {
                callback();
            }
            return;
        }
        
        element.style.transition = `all ${this.settings.duration}ms ${this.settings.easing}`;
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px) scale(0.9)';
        
        setTimeout(() => {
            if (callback && typeof callback === 'function') {
                callback();
            }
        }, this.settings.duration);
    }
    
    /**
     * Анимация завершения задачи
     * @param {HTMLElement} taskElement Элемент задачи
     */
    animateTaskCompletion(taskElement) {
        if (!this.settings.enabled || this.settings.reducedMotion) return;
        
        taskElement.classList.add('highlight-change');
        
        setTimeout(() => {
            taskElement.classList.remove('highlight-change');
        }, 2000);
    }
    
    /**
     * Анимация карточек статистики
     */
    animateStatCards() {
        if (!this.settings.enabled || this.settings.reducedMotion) return;
        
        // Добавляем класс для анимации прогресс-баров
        document.querySelectorAll('.stat-card').forEach(card => {
            card.classList.add('animate-progress');
        });
        
        this.animateElements('.stat-card', 'slide-in-up', 100);
    }
    
    /**
     * Анимация появления модального окна
     * @param {HTMLElement} modalElement Элемент модального окна
     */
    animateModalShow(modalElement) {
        if (!this.settings.enabled || this.settings.reducedMotion) return;
        
        modalElement.classList.add('scale-in');
    }
    
    /**
     * Анимация появления канбан-доски
     */
    animateKanbanBoard() {
        if (!this.settings.enabled || this.settings.reducedMotion) return;
        
        // Анимация колонок
        this.animateElements('.kanban-column', 'slide-in-right', 100);
        
        // Анимация карточек с задержкой
        setTimeout(() => {
            this.animateElements('.kanban-card', 'scale-in', 50);
        }, 300);
    }
    
    /**
     * Анимация для перетаскивания карточки в канбан-доске
     * @param {HTMLElement} cardElement Элемент карточки
     * @param {boolean} isDragging Находится ли карточка в процессе перетаскивания
     */
    animateKanbanCard(cardElement, isDragging) {
        if (!this.settings.enabled || this.settings.reducedMotion) return;
        
        if (isDragging) {
            cardElement.classList.add('dragging');
        } else {
            cardElement.classList.remove('dragging');
        }
    }
    
    /**
     * Добавление анимации пульсации к элементу
     * @param {HTMLElement} element Элемент для анимации
     * @param {boolean} active Активировать или деактивировать пульсацию
     */
    setPulseAnimation(element, active) {
        if (!this.settings.enabled || this.settings.reducedMotion) return;
        
        if (active) {
            element.classList.add('pulse');
        } else {
            element.classList.remove('pulse');
        }
    }
    
    /**
     * Добавляет эффект загрузки "shimmer" к элементу
     * @param {HTMLElement} element Элемент для анимации
     * @param {boolean} active Активировать или деактивировать эффект
     */
    setLoadingShimmer(element, active) {
        if (active) {
            element.classList.add('loading-shimmer');
        } else {
            element.classList.remove('loading-shimmer');
        }
    }
    
    /**
     * Обрабатывает анимацию для уведомлений
     * @param {HTMLElement} toastElement Элемент уведомления
     * @param {boolean} isShowing Показывать или скрывать уведомление
     */
    animateToast(toastElement, isShowing) {
        if (!this.settings.enabled || this.settings.reducedMotion) return;
        
        if (isShowing) {
            toastElement.classList.add('slide-in-right');
            toastElement.classList.remove('hiding');
        } else {
            toastElement.classList.add('hiding');
        }
    }
}

// Создание и экспорт экземпляра менеджера анимаций
const animationManager = new AnimationManager();
window.animationManager = animationManager;

export default animationManager;