/**
 * onboarding.js
 * Модуль для реализации пошаговой экскурсии по приложению TaskHub
 */

class Onboarding {
    constructor() {
        // Настройки экскурсии
        this.tourSteps = [
            {
                element: '.sidebar',
                title: 'Боковая панель',
                content: 'Здесь находится основная навигация по приложению. Используйте её для доступа к различным разделам.',
                position: 'right'
            },
            {
                element: '.dashboard-grid',
                title: 'Панель управления',
                content: 'Здесь отображается статистика и ключевые метрики ваших задач.',
                position: 'bottom'
            },
            {
                element: '#addTaskBtn',
                title: 'Создание задач',
                content: 'Нажмите эту кнопку, чтобы создать новую задачу.',
                position: 'left'
            },
            {
                element: '.tasks-filters',
                title: 'Фильтрация задач',
                content: 'Используйте эти фильтры для поиска и сортировки ваших задач.',
                position: 'top'
            },
            {
                element: '.task-item:first-child',
                title: 'Управление задачами',
                content: 'Здесь отображаются все ваши задачи. Вы можете отмечать их как выполненные, редактировать или удалять.',
                position: 'top'
            },
            {
                element: '#themeToggle',
                title: 'Настройка темы',
                content: 'Переключайтесь между светлой и тёмной темой в зависимости от ваших предпочтений.',
                position: 'left'
            },
            {
                element: '.kanban-board',
                title: 'Канбан-доска',
                content: 'Визуально управляйте своими задачами, перетаскивая их между колонками.',
                position: 'bottom'
            }
        ];

        this.currentStep = 0;
        this.tourActive = false;
        this.tourKey = 'taskhub_tour_completed';
        
        // Создание DOM-элементов для экскурсии
        this.createTourElements();
    }

    /**
     * Создание необходимых DOM-элементов для экскурсии
     */
    createTourElements() {
        // Создание оверлея
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';
        
        // Создание подсветки элемента
        this.highlight = document.createElement('div');
        this.highlight.className = 'tour-highlight';
        
        // Создание окна с описанием шага
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tour-tooltip';
        
        // Создание стилей
        const style = document.createElement('style');
        style.textContent = `
            .tour-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 9998;
                pointer-events: none;
                transition: opacity 0.3s ease;
                opacity: 0;
            }
            
            .tour-overlay.active {
                opacity: 1;
            }
            
            .tour-highlight {
                position: absolute;
                box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.5);
                border-radius: 4px;
                z-index: 9999;
                pointer-events: none;
                transition: all 0.3s ease;
            }
            
            .tour-tooltip {
                position: absolute;
                background-color: var(--white);
                border-radius: var(--radius);
                box-shadow: var(--shadow-lg);
                padding: 1rem;
                z-index: 10000;
                width: 300px;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .tour-tooltip.active {
                opacity: 1;
            }
            
            .tour-tooltip-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 0.5rem;
            }
            
            .tour-tooltip-title {
                font-weight: 600;
                font-size: 1rem;
                color: var(--gray-900);
            }
            
            .tour-tooltip-close {
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                cursor: pointer;
                color: var(--gray-500);
                background-color: var(--gray-100);
                transition: var(--transition);
            }
            
            .tour-tooltip-close:hover {
                background-color: var(--gray-200);
                color: var(--danger);
            }
            
            .tour-tooltip-content {
                font-size: 0.875rem;
                line-height: 1.5;
                color: var(--gray-700);
                margin-bottom: 1rem;
            }
            
            .tour-tooltip-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .tour-tooltip-progress {
                font-size: 0.75rem;
                color: var(--gray-500);
            }
            
            .tour-tooltip-buttons {
                display: flex;
                gap: 0.5rem;
            }
            
            .tour-btn {
                padding: 0.5rem 1rem;
                border-radius: var(--radius);
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: var(--transition);
            }
            
            .tour-btn-primary {
                background-color: var(--primary);
                color: white;
                border: none;
            }
            
            .tour-btn-primary:hover {
                background-color: var(--primary-dark);
            }
            
            .tour-btn-secondary {
                background-color: transparent;
                color: var(--gray-700);
                border: 1px solid var(--gray-300);
            }
            
            .tour-btn-secondary:hover {
                background-color: var(--gray-100);
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Проверка, была ли экскурсия уже завершена
     * @returns {boolean} Результат проверки
     */
    isTourCompleted() {
        return localStorage.getItem(this.tourKey) === 'true';
    }

    /**
     * Отметка экскурсии как завершённой
     */
    markTourAsCompleted() {
        localStorage.setItem(this.tourKey, 'true');
    }

    /**
     * Запуск экскурсии
     */
    startTour() {
        if (this.isTourCompleted() || this.tourActive) {
            return;
        }
        
        this.tourActive = true;
        this.currentStep = 0;
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.highlight);
        document.body.appendChild(this.tooltip);
        
        setTimeout(() => {
            this.overlay.classList.add('active');
            this.showStep(this.currentStep);
        }, 100);
    }

    /**
     * Отображение конкретного шага экскурсии
     * @param {number} stepIndex Индекс шага
     */
    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.tourSteps.length) {
            this.endTour();
            return;
        }
        
        const step = this.tourSteps[stepIndex];
        const element = document.querySelector(step.element);
        
        // Проверка существования элемента
        if (!element) {
            console.warn(`Элемент ${step.element} не найден. Пропуск шага.`);
            this.nextStep();
            return;
        }
        
        // Позиционирование подсветки
        const rect = element.getBoundingClientRect();
        this.highlight.style.top = `${rect.top}px`;
        this.highlight.style.left = `${rect.left}px`;
        this.highlight.style.width = `${rect.width}px`;
        this.highlight.style.height = `${rect.height}px`;
        
        // Позиционирование подсказки
        let tooltipX = 0;
        let tooltipY = 0;
        
        switch (step.position) {
            case 'top':
                tooltipX = rect.left + rect.width / 2 - 150;
                tooltipY = rect.top - 10 - this.tooltip.offsetHeight;
                break;
            case 'right':
                tooltipX = rect.right + 10;
                tooltipY = rect.top + rect.height / 2 - this.tooltip.offsetHeight / 2;
                break;
            case 'bottom':
                tooltipX = rect.left + rect.width / 2 - 150;
                tooltipY = rect.bottom + 10;
                break;
            case 'left':
                tooltipX = rect.left - 10 - 300;
                tooltipY = rect.top + rect.height / 2 - this.tooltip.offsetHeight / 2;
                break;
        }
        
        // Проверка на выход за пределы экрана
        if (tooltipX < 10) tooltipX = 10;
        if (tooltipX + 300 > window.innerWidth - 10) tooltipX = window.innerWidth - 300 - 10;
        if (tooltipY < 10) tooltipY = 10;
        if (tooltipY + this.tooltip.offsetHeight > window.innerHeight - 10) {
            tooltipY = window.innerHeight - this.tooltip.offsetHeight - 10;
        }
        
        this.tooltip.style.left = `${tooltipX}px`;
        this.tooltip.style.top = `${tooltipY}px`;
        
        // Формирование содержимого подсказки
        this.tooltip.innerHTML = `
            <div class="tour-tooltip-header">
                <div class="tour-tooltip-title">${step.title}</div>
                <div class="tour-tooltip-close"><i class="fas fa-times"></i></div>
            </div>
            <div class="tour-tooltip-content">${step.content}</div>
            <div class="tour-tooltip-footer">
                <div class="tour-tooltip-progress">Шаг ${stepIndex + 1} из ${this.tourSteps.length}</div>
                <div class="tour-tooltip-buttons">
                    ${stepIndex > 0 ? '<button class="tour-btn tour-btn-secondary tour-prev">Назад</button>' : ''}
                    ${stepIndex < this.tourSteps.length - 1 
                        ? '<button class="tour-btn tour-btn-primary tour-next">Далее</button>' 
                        : '<button class="tour-btn tour-btn-primary tour-finish">Завершить</button>'
                    }
                </div>
            </div>
        `;
        
        // Добавление обработчиков событий
        this.tooltip.querySelector('.tour-tooltip-close').addEventListener('click', () => this.endTour());
        
        const prevBtn = this.tooltip.querySelector('.tour-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevStep());
        }
        
        const nextBtn = this.tooltip.querySelector('.tour-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }
        
        const finishBtn = this.tooltip.querySelector('.tour-finish');
        if (finishBtn) {
            finishBtn.addEventListener('click', () => this.endTour());
        }
        
        // Отображение подсказки
        setTimeout(() => {
            this.tooltip.classList.add('active');
        }, 200);
    }

    /**
     * Переход к следующему шагу экскурсии
     */
    nextStep() {
        this.tooltip.classList.remove('active');
        setTimeout(() => {
            this.currentStep++;
            this.showStep(this.currentStep);
        }, 300);
    }

    /**
     * Переход к предыдущему шагу экскурсии
     */
    prevStep() {
        this.tooltip.classList.remove('active');
        setTimeout(() => {
            this.currentStep--;
            this.showStep(this.currentStep);
        }, 300);
    }

    /**
     * Завершение экскурсии
     */
    endTour() {
        this.tooltip.classList.remove('active');
        this.overlay.classList.remove('active');
        
        setTimeout(() => {
            if (this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            
            if (this.highlight.parentNode) {
                this.highlight.parentNode.removeChild(this.highlight);
            }
            
            if (this.tooltip.parentNode) {
                this.tooltip.parentNode.removeChild(this.tooltip);
            }
            
            this.tourActive = false;
            this.markTourAsCompleted();
        }, 300);
    }

    /**
     * Показать диалог с предложением пройти экскурсию
     */
    showTourPrompt() {
        if (this.isTourCompleted()) {
            return;
        }
        
        const promptElement = document.createElement('div');
        promptElement.className = 'tour-prompt';
        promptElement.innerHTML = `
            <div class="tour-prompt-content">
                <h3>Добро пожаловать в TaskHub!</h3>
                <p>Хотите пройти короткую экскурсию по приложению?</p>
                <div class="tour-prompt-buttons">
                    <button class="btn btn-primary" id="startTourBtn">Начать экскурсию</button>
                    <button class="btn btn-outline" id="skipTourBtn">Пропустить</button>
                </div>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .tour-prompt {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: var(--white);
                border-radius: var(--radius);
                box-shadow: var(--shadow-lg);
                z-index: 10001;
                animation: promptFadeIn 0.5s ease;
            }
            
            .tour-prompt-content {
                padding: 2rem;
                text-align: center;
            }
            
            .tour-prompt-content h3 {
                margin-bottom: 1rem;
                color: var(--gray-900);
            }
            
            .tour-prompt-content p {
                margin-bottom: 1.5rem;
                color: var(--gray-700);
            }
            
            .tour-prompt-buttons {
                display: flex;
                gap: 1rem;
                justify-content: center;
            }
            
            @keyframes promptFadeIn {
                from {
                    opacity: 0;
                    transform: translate(-50%, -60%);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%);
                }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(promptElement);
        
        document.getElementById('startTourBtn').addEventListener('click', () => {
            document.body.removeChild(promptElement);
            this.startTour();
        });
        
        document.getElementById('skipTourBtn').addEventListener('click', () => {
            document.body.removeChild(promptElement);
            this.markTourAsCompleted();
        });
    }
}

// Инициализация и экспорт экземпляра класса
const onboarding = new Onboarding();

// Автоматический запуск предложения экскурсии при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Задержка для того, чтобы страница полностью загрузилась
    setTimeout(() => {
        onboarding.showTourPrompt();
    }, 1000);
});

// Добавление кнопки запуска экскурсии в раздел помощи
document.addEventListener('DOMContentLoaded', () => {
    const helpMenuItem = document.querySelector('.menu-link [class*="fa-question"]').closest('.menu-link');
    
    if (helpMenuItem) {
        helpMenuItem.addEventListener('click', (event) => {
            event.preventDefault();
            onboarding.startTour();
        });
    }
});

export default onboarding;
