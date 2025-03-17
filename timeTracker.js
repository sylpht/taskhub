/**
 * timeTracker.js
 * Модуль для учета времени, затраченного на выполнение задач
 */

class TimeTracker {
    constructor(storage) {
        // Использование переданного хранилища или IndexedDB по умолчанию
        this.storage = storage || window.indexedDBStorage;
        
        // Текущая активная задача
        this.activeTaskId = null;
        this.startTime = null;
        this.timerInterval = null;
        
        // Ключ для хранения состояния в localStorage (для восстановления при перезагрузке)
        this.stateKey = 'taskhub_timetracker_state';
        
        // Загрузка состояния при создании
        this.loadState();
    }

    /**
     * Сохранение текущего состояния
     */
    saveState() {
        const state = {
            activeTaskId: this.activeTaskId,
            startTime: this.startTime ? this.startTime.toISOString() : null
        };
        
        localStorage.setItem(this.stateKey, JSON.stringify(state));
    }

    /**
     * Загрузка сохраненного состояния
     */
    loadState() {
        try {
            const stateJson = localStorage.getItem(this.stateKey);
            if (!stateJson) return;
            
            const state = JSON.parse(stateJson);
            
            if (state.activeTaskId && state.startTime) {
                this.activeTaskId = state.activeTaskId;
                this.startTime = new Date(state.startTime);
                
                // Запуск таймера, если была активная задача
                this.startTimer();
            }
        } catch (error) {
            console.error('Ошибка загрузки состояния таймера:', error);
        }
    }

    /**
     * Запуск таймера для задачи
     * @param {string|number} taskId ID задачи
     * @returns {Promise<boolean>} Результат запуска
     */
    async startTracking(taskId) {
        try {
            // Проверяем, существует ли задача
            const task = await this.storage.getTask(taskId);
            
            if (!task) {
                console.error(`Задача с ID ${taskId} не найдена`);
                return false;
            }
            
            // Если уже отслеживается другая задача, останавливаем её
            if (this.activeTaskId && this.activeTaskId !== taskId) {
                await this.stopTracking();
            }
            
            // Если это та же задача, которая уже отслеживается, просто возвращаем true
            if (this.activeTaskId === taskId && this.startTime) {
                return true;
            }
            
            // Запуск нового отслеживания
            this.activeTaskId = taskId;
            this.startTime = new Date();
            
            // Сохраняем состояние
            this.saveState();
            
            // Запускаем таймер для обновления UI
            this.startTimer();
            
            // Обновляем UI кнопки
            this.updateButton(taskId, true);
            
            return true;
        } catch (error) {
            console.error('Ошибка запуска отслеживания:', error);
            return false;
        }
    }

    /**
     * Запуск таймера для обновления интерфейса
     */
    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Обновление каждую секунду
        this.timerInterval = setInterval(() => {
            this.updateTimerDisplay();
        }, 1000);
        
        // Сразу обновляем дисплей
        this.updateTimerDisplay();
    }

    /**
     * Обновление отображения таймера
     */
    updateTimerDisplay() {
        if (!this.activeTaskId || !this.startTime) return;
        
        const elapsed = Date.now() - this.startTime.getTime();
        const formattedTime = this.formatTime(elapsed);
        
        // Обновление всех элементов отображения времени
        const timerDisplays = document.querySelectorAll(`[data-time-display="${this.activeTaskId}"]`);
        timerDisplays.forEach(display => {
            display.textContent = formattedTime;
        });
    }

    /**
     * Остановка отслеживания текущей задачи
     * @returns {Promise<Object|null>} Запись о затраченном времени или null
     */
    async stopTracking() {
        if (!this.activeTaskId || !this.startTime) {
            return null;
        }
        
        try {
            const taskId = this.activeTaskId;
            const startTime = this.startTime;
            const endTime = new Date();
            const duration = endTime.getTime() - startTime.getTime();
            
            // Остановка таймера
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            
            // Сброс состояния
            this.activeTaskId = null;
            this.startTime = null;
            
            // Очистка сохраненного состояния
            localStorage.removeItem(this.stateKey);
            
            // Обновляем UI кнопки
            this.updateButton(taskId, false);
            
            // Если время слишком короткое (менее 5 секунд), не сохраняем
            if (duration < 5000) {
                return null;
            }
            
            // Создание записи о затраченном времени
            const timeEntry = {
                taskId,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                duration,
                date: startTime.toISOString().substr(0, 10) // YYYY-MM-DD
            };
            
            // Сохранение записи
            const savedEntry = await this.storage.addTimeEntry(timeEntry);
            
            // Обновление общего времени для задачи
            await this.updateTaskTotalTime(taskId);
            
            return savedEntry;
        } catch (error) {
            console.error('Ошибка остановки отслеживания:', error);
            return null;
        }
    }

    /**
     * Обновление общего времени для задачи
     * @param {string|number} taskId ID задачи
     * @returns {Promise<number>} Общее время в миллисекундах
     */
    async updateTaskTotalTime(taskId) {
        try {
            // Получение всех записей для задачи
            const entries = await this.storage.getTimeEntriesForTask(taskId);
            
            // Суммирование времени
            const totalTime = entries.reduce((total, entry) => {
                return total + (entry.duration || 0);
            }, 0);
            
            // Обновление задачи с общим временем
            const task = await this.storage.getTask(taskId);
            if (task) {
                task.timeSpent = totalTime;
                await this.storage.saveTask(task);
            }
            
            // Обновление отображения общего времени
            this.updateTotalTimeDisplay(taskId, totalTime);
            
            return totalTime;
        } catch (error) {
            console.error('Ошибка обновления общего времени:', error);
            return 0;
        }
    }

    /**
     * Обновление отображения общего времени
     * @param {string|number} taskId ID задачи
     * @param {number} totalTime Общее время в миллисекундах
     */
    updateTotalTimeDisplay(taskId, totalTime) {
        const formattedTime = this.formatTime(totalTime);
        
        // Обновление всех элементов отображения общего времени
        const totalTimeDisplays = document.querySelectorAll(`[data-total-time="${taskId}"]`);
        totalTimeDisplays.forEach(display => {
            display.textContent = formattedTime;
        });
    }

    /**
     * Форматирование времени в миллисекундах в строку HH:MM:SS
     * @param {number} milliseconds Время в миллисекундах
     * @returns {string} Отформатированное время
     */
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    /**
     * Обновление состояния кнопки отслеживания
     * @param {string|number} taskId ID задачи
     * @param {boolean} isTracking Состояние отслеживания
     */
    updateButton(taskId, isTracking) {
        const buttons = document.querySelectorAll(`[data-time-tracker="${taskId}"]`);
        
        buttons.forEach(button => {
            if (isTracking) {
                button.innerHTML = '<i class="fas fa-stop"></i>';
                button.classList.add('tracking');
                button.title = 'Остановить отслеживание';
            } else {
                button.innerHTML = '<i class="fas fa-play"></i>';
                button.classList.remove('tracking');
                button.title = 'Начать отслеживание';
            }
        });
    }

    /**
     * Получение общего времени для задачи
     * @param {string|number} taskId ID задачи
     * @returns {Promise<number>} Общее время в миллисекундах
     */
    async getTaskTotalTime(taskId) {
        try {
            return await this.storage.getTotalTimeForTask(taskId);
        } catch (error) {
            console.error('Ошибка получения общего времени:', error);
            return 0;
        }
    }

    /**
     * Получение записей о времени для задачи
     * @param {string|number} taskId ID задачи
     * @returns {Promise<Array>} Массив записей
     */
    async getTimeEntries(taskId) {
        try {
            return await this.storage.getTimeEntriesForTask(taskId);
        } catch (error) {
            console.error('Ошибка получения записей времени:', error);
            return [];
        }
    }

    /**
     * Получение статистики по времени выполнения за период
     * @param {string} startDate Начальная дата в формате YYYY-MM-DD
     * @param {string} endDate Конечная дата в формате YYYY-MM-DD
     * @returns {Promise<Object>} Объект со статистикой
     */
    async getTimeStatistics(startDate, endDate) {
        try {
            // Получение всех записей за период
            const entries = await this.storage.getTimeEntriesByDateRange(startDate, endDate);
            
            // Если записей нет, возвращаем пустую статистику
            if (entries.length === 0) {
                return {
                    totalTime: 0,
                    taskStats: [],
                    dailyStats: {}
                };
            }
            
            // Общее время
            const totalTime = entries.reduce((total, entry) => total + (entry.duration || 0), 0);
            
            // Статистика по задачам
            const taskMap = new Map();
            
            for (const entry of entries) {
                if (!taskMap.has(entry.taskId)) {
                    // Получение информации о задаче
                    const task = await this.storage.getTask(entry.taskId);
                    
                    taskMap.set(entry.taskId, {
                        id: entry.taskId,
                        title: task ? task.title : 'Неизвестная задача',
                        category: task ? task.category : 'none',
                        totalTime: 0,
                        percentage: 0
                    });
                }
                
                // Добавление времени к задаче
                const taskStat = taskMap.get(entry.taskId);
                taskStat.totalTime += (entry.duration || 0);
            }
            
            // Расчет процентов
            const taskStats = Array.from(taskMap.values());
            
            taskStats.forEach(stat => {
                stat.percentage = totalTime ? Math.round((stat.totalTime / totalTime) * 100) : 0;
                stat.formattedTime = this.formatTime(stat.totalTime);
            });
            
            // Сортировка по затраченному времени (по убыванию)
            taskStats.sort((a, b) => b.totalTime - a.totalTime);
            
            // Статистика по дням
            const dailyStats = {};
            
            for (const entry of entries) {
                const date = entry.date.substr(0, 10); // YYYY-MM-DD
                
                if (!dailyStats[date]) {
                    dailyStats[date] = {
                        totalTime: 0,
                        tasks: new Map()
                    };
                }
                
                // Добавление времени к общему на день
                dailyStats[date].totalTime += (entry.duration || 0);
                
                // Добавление времени к задаче на день
                if (!dailyStats[date].tasks.has(entry.taskId)) {
                    dailyStats[date].tasks.set(entry.taskId, 0);
                }
                
                dailyStats[date].tasks.set(
                    entry.taskId, 
                    dailyStats[date].tasks.get(entry.taskId) + (entry.duration || 0)
                );
            }
            
            // Преобразование Map в массивы для каждого дня
            Object.keys(dailyStats).forEach(date => {
                const tasksArray = [];
                
                dailyStats[date].tasks.forEach((time, taskId) => {
                    const task = taskMap.get(taskId);
                    
                    tasksArray.push({
                        id: taskId,
                        title: task ? task.title : 'Неизвестная задача',
                        time: time,
                        formattedTime: this.formatTime(time)
                    });
                });
                
                // Сортировка по затраченному времени (по убыванию)
                tasksArray.sort((a, b) => b.time - a.time);
                
                // Замена Map на массив и добавление отформатированного времени
                dailyStats[date].tasks = tasksArray;
                dailyStats[date].formattedTime = this.formatTime(dailyStats[date].totalTime);
            });
            
            return {
                totalTime,
                formattedTotalTime: this.formatTime(totalTime),
                taskStats,
                dailyStats
            };
        } catch (error) {
            console.error('Ошибка получения статистики времени:', error);
            return {
                totalTime: 0,
                formattedTotalTime: '00:00:00',
                taskStats: [],
                dailyStats: {}
            };
        }
    }

    /**
     * Удаление записи времени
     * @param {string|number} entryId ID записи
     * @returns {Promise<boolean>} Результат удаления
     */
    async deleteTimeEntry(entryId) {
        try {
            // Получение записи перед удалением для обновления задачи
            const entry = await this.storage.getTimeEntry(entryId);
            const taskId = entry ? entry.taskId : null;
            
            // Удаление записи
            const result = await this.storage.deleteTimeEntry(entryId);
            
            // Обновление общего времени для задачи
            if (taskId) {
                await this.updateTaskTotalTime(taskId);
            }
            
            return result;
        } catch (error) {
            console.error('Ошибка удаления записи времени:', error);
            return false;
        }
    }

    /**
     * Создание элементов интерфейса для управления временем задачи
     * @param {string|number} taskId ID задачи
     * @returns {HTMLElement} DOM-элемент с интерфейсом
     */
    createTimeControlUI(taskId) {
        // Создание контейнера
        const container = document.createElement('div');
        container.className = 'time-control';
        
        // Получение состояния отслеживания
        const isTracking = this.activeTaskId === taskId && this.startTime !== null;
        
        // Создание кнопки отслеживания
        const trackButton = document.createElement('button');
        trackButton.className = `time-track-btn ${isTracking ? 'tracking' : ''}`;
        trackButton.setAttribute('data-time-tracker', taskId);
        trackButton.title = isTracking ? 'Остановить отслеживание' : 'Начать отслеживание';
        trackButton.innerHTML = isTracking 
            ? '<i class="fas fa-stop"></i>' 
            : '<i class="fas fa-play"></i>';
        
        // Создание отображения текущего времени
        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'time-display';
        timeDisplay.setAttribute('data-time-display', taskId);
        timeDisplay.textContent = '00:00:00';
        
        // Если отслеживание активно, обновляем отображение
        if (isTracking) {
            const elapsed = Date.now() - this.startTime.getTime();
            timeDisplay.textContent = this.formatTime(elapsed);
        }
        
        // Добавление обработчика для кнопки
        trackButton.addEventListener('click', async () => {
            if (this.activeTaskId === taskId && this.startTime) {
                // Остановка отслеживания
                await this.stopTracking();
            } else {
                // Запуск отслеживания
                await this.startTracking(taskId);
            }
        });
        
        // Сборка интерфейса
        container.appendChild(trackButton);
        container.appendChild(timeDisplay);
        
        // Добавление отображения общего времени
        this.storage.getTotalTimeForTask(taskId).then(totalTime => {
            const totalTimeDisplay = document.createElement('div');
            totalTimeDisplay.className = 'total-time-display';
            totalTimeDisplay.setAttribute('data-total-time', taskId);
            totalTimeDisplay.textContent = this.formatTime(totalTime);
            totalTimeDisplay.title = 'Общее затраченное время';
            
            container.appendChild(totalTimeDisplay);
        });
        
        return container;
    }

    /**
     * Создание интерфейса для отображения детальной статистики времени
     * @param {string|number} taskId ID задачи
     * @returns {HTMLElement} DOM-элемент с интерфейсом
     */
    async createTimeStatisticsUI(taskId) {
        // Создание контейнера
        const container = document.createElement('div');
        container.className = 'time-statistics';
        
        try {
            // Получение данных о времени
            const entries = await this.storage.getTimeEntriesForTask(taskId);
            const totalTime = await this.storage.getTotalTimeForTask(taskId);
            
            // Если нет записей, показываем сообщение
            if (entries.length === 0) {
                container.innerHTML = `
                    <div class="time-statistics-empty">
                        <i class="fas fa-clock"></i>
                        <p>Нет данных о затраченном времени</p>
                    </div>
                `;
                return container;
            }
            
            // Отображение общего времени
            container.innerHTML = `
                <div class="time-statistics-header">
                    <h3>Статистика времени</h3>
                    <div class="time-statistics-total">
                        <span>Общее время:</span>
                        <strong>${this.formatTime(totalTime)}</strong>
                    </div>
                </div>
            `;
            
            // Группировка записей по дням
            const entriesByDay = {};
            
            entries.forEach(entry => {
                const date = new Date(entry.startTime);
                const dateKey = date.toISOString().substr(0, 10); // YYYY-MM-DD
                
                if (!entriesByDay[dateKey]) {
                    entriesByDay[dateKey] = [];
                }
                
                entriesByDay[dateKey].push(entry);
            });
            
            // Создание списка записей по дням
            const entriesList = document.createElement('div');
            entriesList.className = 'time-entries-list';
            
            // Сортировка дней по убыванию (сначала новые)
            const sortedDays = Object.keys(entriesByDay).sort((a, b) => b.localeCompare(a));
            
            sortedDays.forEach(day => {
                // Форматирование даты
                const date = new Date(day);
                const formattedDate = new Intl.DateTimeFormat('ru-RU', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }).format(date);
                
                // Расчет общего времени за день
                const dayTotalTime = entriesByDay[day].reduce((total, entry) => {
                    return total + (entry.duration || 0);
                }, 0);
                
                // Создание секции дня
                const daySection = document.createElement('div');
                daySection.className = 'time-entries-day';
                daySection.innerHTML = `
                    <div class="time-entries-day-header">
                        <h4>${formattedDate}</h4>
                        <div class="time-entries-day-total">${this.formatTime(dayTotalTime)}</div>
                    </div>
                `;
                
                // Создание списка записей для дня
                const dayEntriesList = document.createElement('div');
                dayEntriesList.className = 'time-entries-items';
                
                // Сортировка записей по времени начала (сначала новые)
                entriesByDay[day].sort((a, b) => {
                    return new Date(b.startTime) - new Date(a.startTime);
                });
                
                // Добавление каждой записи
                entriesByDay[day].forEach(entry => {
                    const startTime = new Date(entry.startTime);
                    const endTime = new Date(entry.endTime);
                    
                    // Форматирование времени
                    const formattedStartTime = startTime.toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    const formattedEndTime = endTime.toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    // Создание элемента записи
                    const entryItem = document.createElement('div');
                    entryItem.className = 'time-entry-item';
                    entryItem.innerHTML = `
                        <div class="time-entry-info">
                            <div class="time-entry-range">${formattedStartTime} - ${formattedEndTime}</div>
                            <div class="time-entry-duration">${this.formatTime(entry.duration)}</div>
                        </div>
                        <div class="time-entry-actions">
                            <button class="time-entry-delete" data-entry-id="${entry.id}" title="Удалить запись">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    `;
                    
                    // Добавление обработчика удаления
                    const deleteButton = entryItem.querySelector('.time-entry-delete');
                    deleteButton.addEventListener('click', async () => {
                        if (confirm('Удалить эту запись времени?')) {
                            const deleted = await this.deleteTimeEntry(entry.id);
                            
                            if (deleted) {
                                // Удаление элемента из DOM
                                entryItem.remove();
                                
                                // Пересчет общего времени
                                await this.updateTaskTotalTime(taskId);
                                
                                // Обновление общего времени за день
                                const remainingEntries = entriesByDay[day].filter(e => e.id !== entry.id);
                                const newDayTotal = remainingEntries.reduce((total, e) => {
                                    return total + (e.duration || 0);
                                }, 0);
                                
                                const dayTotalElement = daySection.querySelector('.time-entries-day-total');
                                if (dayTotalElement) {
                                    dayTotalElement.textContent = this.formatTime(newDayTotal);
                                }
                                
                                // Если все записи за день удалены, скрываем день
                                if (remainingEntries.length === 0) {
                                    daySection.remove();
                                }
                                
                                // Если все записи удалены, показываем пустое состояние
                                if (entriesList.children.length === 0) {
                                    container.innerHTML = `
                                        <div class="time-statistics-empty">
                                            <i class="fas fa-clock"></i>
                                            <p>Нет данных о затраченном времени</p>
                                        </div>
                                    `;
                                }
                            }
                        }
                    });
                    
                    dayEntriesList.appendChild(entryItem);
                });
                
                daySection.appendChild(dayEntriesList);
                entriesList.appendChild(daySection);
            });
            
            container.appendChild(entriesList);
        } catch (error) {
            console.error('Ошибка создания интерфейса статистики времени:', error);
            container.innerHTML = `
                <div class="time-statistics-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Ошибка загрузки данных о времени</p>
                </div>
            `;
        }
        
        return container;
    }

    /**
     * Создание интерфейса для отображения отчета по времени
     * @param {string} startDate Начальная дата в формате YYYY-MM-DD
     * @param {string} endDate Конечная дата в формате YYYY-MM-DD
     * @returns {HTMLElement} DOM-элемент с интерфейсом
     */
    async createTimeReportUI(startDate = null, endDate = null) {
        // Создание контейнера
        const container = document.createElement('div');
        container.className = 'time-report';
        
        // Если даты не указаны, используем текущий месяц
        if (!startDate || !endDate) {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            
            // Первый день месяца
            const firstDay = new Date(year, month, 1);
            startDate = firstDay.toISOString().substr(0, 10);
            
            // Последний день месяца
            const lastDay = new Date(year, month + 1, 0);
            endDate = lastDay.toISOString().substr(0, 10);
        }
        
        try {
            // Получение статистики
            const stats = await this.getTimeStatistics(startDate, endDate);
            
            // Форматирование дат для отображения
            const formattedStartDate = new Date(startDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const formattedEndDate = new Date(endDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Создание заголовка отчета
            container.innerHTML = `
                <div class="time-report-header">
                    <h3>Отчет по времени</h3>
                    <div class="time-report-period">
                        ${formattedStartDate} - ${formattedEndDate}
                    </div>
                    <div class="time-report-total">
                        <span>Общее время:</span>
                        <strong>${stats.formattedTotalTime}</strong>
                    </div>
                </div>
            `;
            
            // Добавление элементов для фильтрации периода
            const filterForm = document.createElement('div');
            filterForm.className = 'time-report-filter';
            filterForm.innerHTML = `
                <div class="time-report-filter-form">
                    <div class="form-group">
                        <label for="timeReportStartDate">Начальная дата</label>
                        <input type="date" id="timeReportStartDate" class="form-control" value="${startDate}">
                    </div>
                    <div class="form-group">
                        <label for="timeReportEndDate">Конечная дата</label>
                        <input type="date" id="timeReportEndDate" class="form-control" value="${endDate}">
                    </div>
                    <button id="timeReportFilterBtn" class="btn btn-primary">Применить</button>
                </div>
            `;
            
            container.appendChild(filterForm);
            
            // Если нет данных, показываем сообщение
            if (stats.totalTime === 0) {
                const emptyState = document.createElement('div');
                emptyState.className = 'time-report-empty';
                emptyState.innerHTML = `
                    <i class="fas fa-clock"></i>
                    <p>Нет данных о затраченном времени за выбранный период</p>
                `;
                
                container.appendChild(emptyState);
                
                // Добавление обработчика для кнопки фильтрации
                setTimeout(() => {
                    const filterBtn = document.getElementById('timeReportFilterBtn');
                    if (filterBtn) {
                        filterBtn.addEventListener('click', () => {
                            const newStartDate = document.getElementById('timeReportStartDate').value;
                            const newEndDate = document.getElementById('timeReportEndDate').value;
                            
                            // Проверка корректности дат
                            if (!newStartDate || !newEndDate) {
                                alert('Укажите начальную и конечную даты');
                                return;
                            }
                            
                            // Обновление отчета
                            this.createTimeReportUI(newStartDate, newEndDate).then(newReport => {
                                container.parentNode.replaceChild(newReport, container);
                            });
                        });
                    }
                }, 0);
                
                return container;
            }
            
            // Создание контейнера для данных отчета
            const reportData = document.createElement('div');
            reportData.className = 'time-report-data';
            
            // Создание секции статистики по задачам
            const taskStatsSection = document.createElement('div');
            taskStatsSection.className = 'time-report-tasks';
            taskStatsSection.innerHTML = `
                <h4>Распределение времени по задачам</h4>
            `;
            
            // Создание круговой диаграммы (визуализация будет добавлена позже)
            const chartContainer = document.createElement('div');
            chartContainer.className = 'time-report-chart';
            chartContainer.id = 'timeReportTaskChart';
            
            taskStatsSection.appendChild(chartContainer);
            
            // Создание таблицы задач
            const taskTable = document.createElement('div');
            taskTable.className = 'time-report-task-table';
            taskTable.innerHTML = `
                <div class="time-report-task-row header">
                    <div class="time-report-task-name">Задача</div>
                    <div class="time-report-task-time">Время</div>
                    <div class="time-report-task-percent">%</div>
                </div>
            `;
            
            // Добавление строк для каждой задачи
            stats.taskStats.forEach(task => {
                const taskRow = document.createElement('div');
                taskRow.className = 'time-report-task-row';
                taskRow.innerHTML = `
                    <div class="time-report-task-name">${task.title}</div>
                    <div class="time-report-task-time">${task.formattedTime}</div>
                    <div class="time-report-task-percent">${task.percentage}%</div>
                `;
                taskTable.appendChild(taskRow);
            });
            
            taskStatsSection.appendChild(taskTable);
            reportData.appendChild(taskStatsSection);
            
            // Создание секции статистики по дням
            const dailyStatsSection = document.createElement('div');
            dailyStatsSection.className = 'time-report-daily';
            dailyStatsSection.innerHTML = `
                <h4>Распределение времени по дням</h4>
            `;
            
            // Создание контейнера для графика по дням
            const dailyChartContainer = document.createElement('div');
            dailyChartContainer.className = 'time-report-daily-chart';
            dailyChartContainer.id = 'timeReportDailyChart';
            
            dailyStatsSection.appendChild(dailyChartContainer);
            
            // Создание списка дней
            const dailyList = document.createElement('div');
            dailyList.className = 'time-report-daily-list';
            
            // Сортировка дней по убыванию (сначала новые)
            const sortedDays = Object.keys(stats.dailyStats).sort((a, b) => b.localeCompare(a));
            
            sortedDays.forEach(day => {
                const dayData = stats.dailyStats[day];
                
                // Форматирование даты
                const date = new Date(day);
                const formattedDate = new Intl.DateTimeFormat('ru-RU', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }).format(date);
                
                // Создание элемента дня
                const dayElement = document.createElement('div');
                dayElement.className = 'time-report-daily-item';
                dayElement.innerHTML = `
                    <div class="time-report-daily-header">
                        <div class="time-report-daily-date">${formattedDate}</div>
                        <div class="time-report-daily-time">${dayData.formattedTime}</div>
                    </div>
                `;
                
                // Добавление задач для этого дня
                if (dayData.tasks.length > 0) {
                    const tasksElement = document.createElement('div');
                    tasksElement.className = 'time-report-daily-tasks';
                    
                    dayData.tasks.forEach(task => {
                        const taskElement = document.createElement('div');
                        taskElement.className = 'time-report-daily-task';
                        taskElement.innerHTML = `
                            <div class="time-report-daily-task-name">${task.title}</div>
                            <div class="time-report-daily-task-time">${task.formattedTime}</div>
                        `;
                        tasksElement.appendChild(taskElement);
                    });
                    
                    dayElement.appendChild(tasksElement);
                }
                
                dailyList.appendChild(dayElement);
            });
            
            dailyStatsSection.appendChild(dailyList);
            reportData.appendChild(dailyStatsSection);
            
            container.appendChild(reportData);
            
            // Добавление обработчика для кнопки фильтрации
            setTimeout(() => {
                const filterBtn = document.getElementById('timeReportFilterBtn');
                if (filterBtn) {
                    filterBtn.addEventListener('click', () => {
                        const newStartDate = document.getElementById('timeReportStartDate').value;
                        const newEndDate = document.getElementById('timeReportEndDate').value;
                        
                        // Проверка корректности дат
                        if (!newStartDate || !newEndDate) {
                            alert('Укажите начальную и конечную даты');
                            return;
                        }
                        
                        // Обновление отчета
                        this.createTimeReportUI(newStartDate, newEndDate).then(newReport => {
                            container.parentNode.replaceChild(newReport, container);
                        });
                    });
                }
                
                // Инициализация графиков (будет добавлено в модуле charts.js)
                if (typeof window.initTaskTimeChart === 'function') {
                    window.initTaskTimeChart('timeReportTaskChart', stats.taskStats);
                }
                
                if (typeof window.initDailyTimeChart === 'function') {
                    const dailyData = [];
                    
                    // Преобразование данных для графика
                    sortedDays.reverse(); // Для графика нужны данные в хронологическом порядке
                    
                    sortedDays.forEach(day => {
                        const date = new Date(day);
                        const formattedDate = date.toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit'
                        });
                        
                        dailyData.push({
                            date: formattedDate,
                            minutes: Math.round(stats.dailyStats[day].totalTime / 60000)
                        });
                    });
                    
                    window.initDailyTimeChart('timeReportDailyChart', dailyData);
                }
            }, 0);
        } catch (error) {
            console.error('Ошибка создания отчета по времени:', error);
            container.innerHTML = `
                <div class="time-report-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Ошибка загрузки отчета по времени</p>
                </div>
            `;
        }
        
        return container;
    }
}

// Создание стилей
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        /* Стили для управления временем */
        .time-control {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .time-track-btn {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--gray-600);
            background-color: var(--white);
            border: 1px solid var(--gray-300);
            transition: var(--transition);
        }
        
        .time-track-btn:hover {
            background-color: var(--gray-100);
        }
        
        .time-track-btn.tracking {
            background-color: var(--danger);
            color: var(--white);
            border-color: var(--danger);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% {
                box-shadow: 0 0 0 0 rgba(229, 56, 59, 0.4);
            }
            70% {
                box-shadow: 0 0 0 6px rgba(229, 56, 59, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(229, 56, 59, 0);
            }
        }
        
        .time-display {
            font-family: var(--font-family-mono, monospace);
            font-size: 0.875rem;
            color: var(--gray-700);
        }
        
        .total-time-display {
            font-family: var(--font-family-mono, monospace);
            font-size: 0.75rem;
            color: var(--gray-500);
            margin-left: 0.5rem;
            padding: 0.15rem 0.5rem;
            background-color: var(--gray-100);
            border-radius: 12px;
        }
        
        /* Стили для статистики времени */
        .time-statistics {
            padding: 1rem;
        }
        
        .time-statistics-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
        }
        
        .time-statistics-total {
            font-size: 0.875rem;
            color: var(--gray-700);
        }
        
        .time-statistics-total strong {
            font-family: var(--font-family-mono, monospace);
            margin-left: 0.5rem;
            color: var(--primary);
        }
        
        .time-entries-list {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        
        .time-entries-day-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--gray-200);
        }
        
        .time-entries-day-header h4 {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--gray-700);
            margin: 0;
        }
        
        .time-entries-day-total {
            font-family: var(--font-family-mono, monospace);
            font-size: 0.875rem;
            color: var(--gray-700);
        }
        
        .time-entries-items {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .time-entry-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.5rem;
            background-color: var(--gray-50);
            border-radius: var(--radius-sm);
        }
        
        .time-entry-info {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .time-entry-range {
            font-size: 0.875rem;
            color: var(--gray-700);
        }
        
        .time-entry-duration {
            font-family: var(--font-family-mono, monospace);
            font-size: 0.875rem;
            color: var(--gray-600);
        }
        
        .time-entry-actions {
            display: flex;
            gap: 0.5rem;
        }
        
        .time-entry-delete {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--gray-500);
            background-color: var(--white);
            border: 1px solid var(--gray-300);
            transition: var(--transition);
        }
        
        .time-entry-delete:hover {
            background-color: var(--danger);
            color: var(--white);
            border-color: var(--danger);
        }
        
        .time-statistics-empty,
        .time-statistics-error {
            text-align: center;
            padding: 2rem;
            color: var(--gray-500);
        }
        
        .time-statistics-empty i,
        .time-statistics-error i {
            font-size: 2rem;
            margin-bottom: 1rem;
        }
        
        .time-statistics-error {
            color: var(--danger);
        }
        
        /* Стили для отчета по времени */
        .time-report {
            padding: 1rem;
        }
        
        .time-report-header {
            margin-bottom: 1.5rem;
        }
        
        .time-report-period {
            font-size: 0.875rem;
            color: var(--gray-600);
            margin-bottom: 0.5rem;
        }
        
        .time-report-total {
            font-size: 1.25rem;
            color: var(--gray-900);
        }
        
        .time-report-total strong {
            font-family: var(--font-family-mono, monospace);
            color: var(--primary);
        }
        
        .time-report-filter {
            margin-bottom: 1.5rem;
            padding: 1rem;
            background-color: var(--gray-50);
            border-radius: var(--radius);
        }
        
        .time-report-filter-form {
            display: flex;
            gap: 1rem;
            align-items: flex-end;
        }
        
        .time-report-data {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        
        .time-report-tasks,
        .time-report-daily {
            background-color: var(--white);
            border-radius: var(--radius);
            box-shadow: var(--shadow-sm);
            padding: 1.5rem;
        }
        
        .time-report-tasks h4,
        .time-report-daily h4 {
            font-size: 1rem;
            margin-bottom: 1rem;
            color: var(--gray-800);
        }
        
        .time-report-chart,
        .time-report-daily-chart {
            height: 200px;
            margin-bottom: 1rem;
        }
        
        .time-report-task-table {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .time-report-task-row {
            display: flex;
            padding: 0.5rem 0;
            border-bottom: 1px solid var(--gray-100);
        }
        
        .time-report-task-row.header {
            font-weight: 600;
            color: var(--gray-700);
        }
        
        .time-report-task-name {
            flex: 1;
        }
        
        .time-report-task-time {
            width: 100px;
            text-align: right;
            font-family: var(--font-family-mono, monospace);
        }
        
        .time-report-task-percent {
            width: 50px;
            text-align: right;
        }
        
        .time-report-daily-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .time-report-daily-item {
            padding: 0.75rem;
            background-color: var(--gray-50);
            border-radius: var(--radius-sm);
        }
        
        .time-report-daily-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
        }
        
        .time-report-daily-date {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--gray-700);
        }
        
        .time-report-daily-time {
            font-family: var(--font-family-mono, monospace);
            font-size: 0.875rem;
            color: var(--gray-700);
        }
        
        .time-report-daily-tasks {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        
        .time-report-daily-task {
            display: flex;
            justify-content: space-between;
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
            color: var(--gray-600);
        }
        
        .time-report-daily-task-time {
            font-family: var(--font-family-mono, monospace);
        }
        
        .time-report-empty,
        .time-report-error {
            text-align: center;
            padding: 2rem;
            color: var(--gray-500);
        }
        
        .time-report-empty i,
        .time-report-error i {
            font-size: 2rem;
            margin-bottom: 1rem;
        }
        
        .time-report-error {
            color: var(--danger);
        }
        
        @media (max-width: 768px) {
            .time-report-filter-form {
                flex-direction: column;
                align-items: stretch;
            }
            
            .time-report-data {
                grid-template-columns: 1fr;
            }
        }
    `;
    
    document.head.appendChild(style);
});

// Создание и экспорт экземпляра
const timeTracker = new TimeTracker();

// Инициализация и внедрение интерфейса в задачи
document.addEventListener('DOMContentLoaded', () => {
    // Интеграция с существующими задачами
    document.querySelectorAll('.task-item').forEach(taskItem => {
        // Извлечение ID задачи
        const taskId = taskItem.querySelector('[data-id]')?.getAttribute('data-id');
        
        if (!taskId) return;
        
        // Создание контейнера для элементов управления временем
        const timeControlContainer = document.createElement('div');
        timeControlContainer.className = 'task-time-control';
        
        // Добавление интерфейса управления временем
        timeControlContainer.appendChild(timeTracker.createTimeControlUI(taskId));
        
        // Вставка после основного содержимого задачи
        const taskContent = taskItem.querySelector('.task-content');
        
        if (taskContent) {
            taskContent.after(timeControlContainer);
        }
    });
    
    // Добавление обработчика для будущих задач
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('task-item')) {
                        const taskId = node.querySelector('[data-id]')?.getAttribute('data-id');
                        
                        if (!taskId) return;
                        
                        // Проверка, есть ли уже элемент управления временем
                        if (node.querySelector('.task-time-control')) return;
                        
                        // Создание контейнера для элементов управления временем
                        const timeControlContainer = document.createElement('div');
                        timeControlContainer.className = 'task-time-control';
                        
                        // Добавление интерфейса управления временем
                        timeControlContainer.appendChild(timeTracker.createTimeControlUI(taskId));
                        
                        // Вставка после основного содержимого задачи
                        const taskContent = node.querySelector('.task-content');
                        
                        if (taskContent) {
                            taskContent.after(timeControlContainer);
                        }
                    }
                });
            }
        });
    });
    
    // Запуск наблюдения за контейнером задач
    const tasksList = document.getElementById('tasksList');
    
    if (tasksList) {
        observer.observe(tasksList, { childList: true });
    }
    
    // Добавление пункта меню для отчета по времени
    const navItems = document.querySelector('.menu-items');
    
    if (navItems) {
        const reportMenuItem = document.createElement('li');
        reportMenuItem.className = 'menu-item';
        reportMenuItem.innerHTML = `
            <a href="#" class="menu-link" id="timeReportLink">
                <i class="menu-icon fas fa-chart-line"></i>
                <span class="menu-text">Отчет по времени</span>
            </a>
        `;
        
        navItems.appendChild(reportMenuItem);
        
        // Обработчик для отображения отчета
        document.getElementById('timeReportLink').addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Создание модального окна для отчета
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay';
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.maxWidth = '800px'; // Увеличиваем ширину модального окна для отчета
            
            modal.innerHTML = `
                <div class="modal-header">
                    <h2 class="modal-title">Отчет по времени</h2>
                    <button class="modal-close" id="closeTimeReportModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" id="timeReportModalBody">
                    <div class="loading-indicator">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Загрузка отчета...</p>
                    </div>
                </div>
            `;
            
            modalOverlay.appendChild(modal);
            document.body.appendChild(modalOverlay);
            
            // Активация модального окна
            setTimeout(() => {
                modalOverlay.classList.add('active');
            }, 10);
            
            // Загрузка отчета
            const reportContainer = await timeTracker.createTimeReportUI();
            
            // Замена индикатора загрузки на отчет
            const modalBody = document.getElementById('timeReportModalBody');
            modalBody.innerHTML = '';
            modalBody.appendChild(reportContainer);
            
            // Обработчик закрытия
            function closeModal() {
                modalOverlay.classList.remove('active');
                setTimeout(() => {
                    document.body.removeChild(modalOverlay);
                }, 300);
            }
            
            document.getElementById('closeTimeReportModal').addEventListener('click', closeModal);
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    closeModal();
                }
            });
        });
    }
});

export default timeTracker;