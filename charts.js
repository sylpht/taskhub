/**
 * charts.js
 * Модуль интерактивных диаграмм с использованием Chart.js
 */

// Импорт Chart.js через CDN в index.html
// <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.1/chart.min.js"></script>

class ChartManager {
    constructor(storage) {
        // Использование переданного хранилища или IndexedDB по умолчанию
        this.storage = storage || window.indexedDBStorage;
        
        // Объект для хранения созданных графиков
        this.charts = {};
        
        // Цвета для диаграмм
        this.colors = {
            primary: '#4361ee',
            secondary: '#f72585',
            success: '#2dc653',
            warning: '#ffbe0b',
            danger: '#e5383b',
            info: '#4cc9f0',
            primaryLight: 'rgba(67, 97, 238, 0.5)',
            secondaryLight: 'rgba(247, 37, 133, 0.5)',
            successLight: 'rgba(45, 198, 83, 0.5)',
            warningLight: 'rgba(255, 190, 11, 0.5)',
            dangerLight: 'rgba(229, 56, 59, 0.5)',
            infoLight: 'rgba(76, 201, 240, 0.5)'
        };
        
        // Параметры анимации по умолчанию
        this.defaultAnimation = {
            duration: 1000,
            easing: 'easeOutQuart'
        };
    }

    /**
     * Создание графика распределения задач
     * @param {string} canvasId ID элемента canvas
     * @returns {Promise<Chart>} Экземпляр графика
     */
    async createTaskDistributionChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            console.error(`Canvas элемент с ID ${canvasId} не найден`);
            return null;
        }
        
        try {
            // Получение задач
            const tasks = await this.storage.getTasks();
            
            // Статистика по статусу
            const statusData = {
                completed: tasks.filter(task => task.completed).length,
                active: tasks.filter(task => !task.completed).length
            };
            
            // Статистика по приоритету
            const priorityData = {
                high: tasks.filter(task => task.priority === 'high').length,
                medium: tasks.filter(task => task.priority === 'medium').length,
                low: tasks.filter(task => task.priority === 'low').length,
                none: tasks.filter(task => !task.priority).length
            };
            
            // Статистика по категориям
            const categoryData = {};
            tasks.forEach(task => {
                const category = task.category || 'none';
                categoryData[category] = (categoryData[category] || 0) + 1;
            });
            
            // Данные для графика
            const data = {
                labels: ['Статус', 'Приоритет', 'Категории'],
                datasets: [
                    {
                        label: 'Выполнено',
                        data: [statusData.completed, 0, 0],
                        backgroundColor: this.colors.success,
                        stack: 'Status'
                    },
                    {
                        label: 'Активные',
                        data: [statusData.active, 0, 0],
                        backgroundColor: this.colors.primary,
                        stack: 'Status'
                    },
                    {
                        label: 'Высокий',
                        data: [0, priorityData.high, 0],
                        backgroundColor: this.colors.danger,
                        stack: 'Priority'
                    },
                    {
                        label: 'Средний',
                        data: [0, priorityData.medium, 0],
                        backgroundColor: this.colors.warning,
                        stack: 'Priority'
                    },
                    {
                        label: 'Низкий',
                        data: [0, priorityData.low, 0],
                        backgroundColor: this.colors.success,
                        stack: 'Priority'
                    }
                ]
            };
            
            // Добавление категорий
            const categoryLabels = Object.keys(categoryData).sort((a, b) => categoryData[b] - categoryData[a]);
            
            // Создаем яркие цвета для каждой категории
            const categoryColors = this.generateColors(categoryLabels.length);
            
            categoryLabels.forEach((category, index) => {
                data.datasets.push({
                    label: this.getCategoryName(category),
                    data: [0, 0, categoryData[category]],
                    backgroundColor: categoryColors[index],
                    stack: 'Category'
                });
            });
            
            // Опции графика
            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Распределение задач'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${value}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Категории'
                        }
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Количество задач'
                        },
                        ticks: {
                            precision: 0
                        }
                    }
                },
                animation: this.defaultAnimation
            };
            
            // Создание графика
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }
            
            this.charts[canvasId] = new Chart(canvas, {
                type: 'bar',
                data: data,
                options: options
            });
            
            return this.charts[canvasId];
        } catch (error) {
            console.error('Ошибка создания графика распределения задач:', error);
            return null;
        }
    }

    /**
     * Создание круговой диаграммы статуса задач
     * @param {string} canvasId ID элемента canvas
     * @returns {Promise<Chart>} Экземпляр графика
     */
    async createTaskStatusChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            console.error(`Canvas элемент с ID ${canvasId} не найден`);
            return null;
        }
        
        try {
            // Получение задач
            const tasks = await this.storage.getTasks();
            
            // Статистика по статусу
            const completed = tasks.filter(task => task.completed).length;
            const active = tasks.filter(task => !task.completed).length;
            
            // Данные для графика
            const data = {
                labels: ['Выполнено', 'Активные'],
                datasets: [{
                    data: [completed, active],
                    backgroundColor: [
                        this.colors.success,
                        this.colors.primary
                    ],
                    hoverOffset: 4
                }]
            };
            
            // Опции графика
            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Статус задач'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: this.defaultAnimation
            };
            
            // Создание графика
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }
            
            this.charts[canvasId] = new Chart(canvas, {
                type: 'doughnut',
                data: data,
                options: options
            });
            
            return this.charts[canvasId];
        } catch (error) {
            console.error('Ошибка создания графика статуса задач:', error);
            return null;
        }
    }

    /**
     * Создание круговой диаграммы приоритетов задач
     * @param {string} canvasId ID элемента canvas
     * @returns {Promise<Chart>} Экземпляр графика
     */
    async createTaskPriorityChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            console.error(`Canvas элемент с ID ${canvasId} не найден`);
            return null;
        }
        
        try {
            // Получение задач
            const tasks = await this.storage.getTasks();
            
            // Статистика по приоритетам
            const high = tasks.filter(task => task.priority === 'high').length;
            const medium = tasks.filter(task => task.priority === 'medium').length;
            const low = tasks.filter(task => task.priority === 'low').length;
            const none = tasks.filter(task => !task.priority).length;
            
            // Данные для графика
            const data = {
                labels: ['Высокий', 'Средний', 'Низкий', 'Не задан'],
                datasets: [{
                    data: [high, medium, low, none],
                    backgroundColor: [
                        this.colors.danger,
                        this.colors.warning,
                        this.colors.success,
                        this.colors.info
                    ],
                    hoverOffset: 4
                }]
            };
            
            // Опции графика
            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Приоритеты задач'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: this.defaultAnimation
            };
            
            // Создание графика
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }
            
            this.charts[canvasId] = new Chart(canvas, {
                type: 'pie',
                data: data,
                options: options
            });
            
            return this.charts[canvasId];
        } catch (error) {
            console.error('Ошибка создания графика приоритетов задач:', error);
            return null;
        }
    }

    /**
     * Создание графика задач по категориям
     * @param {string} canvasId ID элемента canvas
     * @returns {Promise<Chart>} Экземпляр графика
     */
    async createTaskCategoryChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            console.error(`Canvas элемент с ID ${canvasId} не найден`);
            return null;
        }
        
        try {
            // Получение задач
            const tasks = await this.storage.getTasks();
            
            // Статистика по категориям
            const categoryData = {};
            const categoryCompletedData = {};
            
            tasks.forEach(task => {
                const category = task.category || 'none';
                categoryData[category] = (categoryData[category] || 0) + 1;
                
                if (task.completed) {
                    categoryCompletedData[category] = (categoryCompletedData[category] || 0) + 1;
                }
            });
            
            // Сортировка категорий по количеству задач
            const sortedCategories = Object.keys(categoryData).sort((a, b) => categoryData[b] - categoryData[a]);
            
            // Подготовка данных для графика
            const labels = sortedCategories.map(category => this.getCategoryName(category));
            const totalData = sortedCategories.map(category => categoryData[category]);
            const completedData = sortedCategories.map(category => categoryCompletedData[category] || 0);
            const activeData = sortedCategories.map(category => categoryData[category] - (categoryCompletedData[category] || 0));
            
            // Данные для графика
            const data = {
                labels: labels,
                datasets: [
                    {
                        label: 'Выполнено',
                        data: completedData,
                        backgroundColor: this.colors.success
                    },
                    {
                        label: 'Активные',
                        data: activeData,
                        backgroundColor: this.colors.primary
                    }
                ]
            };
            
            // Опции графика
            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Задачи по категориям'
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Категории'
                        }
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Количество задач'
                        },
                        ticks: {
                            precision: 0
                        }
                    }
                },
                animation: this.defaultAnimation
            };
            
            // Создание графика
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }
            
            this.charts[canvasId] = new Chart(canvas, {
                type: 'bar',
                data: data,
                options: options
            });
            
            return this.charts[canvasId];
        } catch (error) {
            console.error('Ошибка создания графика задач по категориям:', error);
            return null;
        }
    }

    /**
     * Создание графика задач по датам выполнения
     * @param {string} canvasId ID элемента canvas
     * @returns {Promise<Chart>} Экземпляр графика
     */
    async createTaskDueDateChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            console.error(`Canvas элемент с ID ${canvasId} не найден`);
            return null;
        }
        
        try {
            // Получение задач
            const tasks = await this.storage.getTasks();
            
            // Фильтрация задач с датами
            const tasksWithDates = tasks.filter(task => task.dueDate);
            
            // Если нет задач с датами, показываем пустой график
            if (tasksWithDates.length === 0) {
                if (this.charts[canvasId]) {
                    this.charts[canvasId].destroy();
                }
                
                this.charts[canvasId] = new Chart(canvas, {
                    type: 'bar',
                    data: {
                        labels: ['Нет данных'],
                        datasets: [{
                            label: 'Задачи',
                            data: [0],
                            backgroundColor: this.colors.primaryLight
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top',
                            },
                            title: {
                                display: true,
                                text: 'Задачи по датам выполнения (нет данных)'
                            }
                        }
                    }
                });
                
                return this.charts[canvasId];
            }
            
            // Группировка задач по дате
            const tasksByDate = {};
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(todayStart);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const nextWeek = new Date(todayStart);
            nextWeek.setDate(nextWeek.getDate() + 7);
            
            const nextMonth = new Date(todayStart);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            
            // Категории времени
            tasksByDate['overdue'] = { label: 'Просроченные', count: 0, color: this.colors.danger };
            tasksByDate['today'] = { label: 'Сегодня', count: 0, color: this.colors.warning };
            tasksByDate['tomorrow'] = { label: 'Завтра', count: 0, color: this.colors.info };
            tasksByDate['thisWeek'] = { label: 'Эта неделя', count: 0, color: this.colors.primary };
            tasksByDate['nextWeek'] = { label: 'Следующая неделя', count: 0, color: this.colors.secondary };
            tasksByDate['later'] = { label: 'Позже', count: 0, color: this.colors.success };
            
            // Распределение задач по категориям времени
            tasksWithDates.forEach(task => {
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                
                if (dueDate < todayStart) {
                    tasksByDate['overdue'].count++;
                } else if (dueDate.getTime() === todayStart.getTime()) {
                    tasksByDate['today'].count++;
                } else if (dueDate.getTime() === tomorrow.getTime()) {
                    tasksByDate['tomorrow'].count++;
                } else if (dueDate < nextWeek) {
                    tasksByDate['thisWeek'].count++;
                } else if (dueDate < nextMonth) {
                    tasksByDate['nextWeek'].count++;
                } else {
                    tasksByDate['later'].count++;
                }
            });
            
            // Подготовка данных для графика
            const labels = Object.values(tasksByDate).map(item => item.label);
            const data = Object.values(tasksByDate).map(item => item.count);
            const backgroundColors = Object.values(tasksByDate).map(item => item.color);
            
            // Данные для графика
            const chartData = {
                labels: labels,
                datasets: [{
                    label: 'Задачи',
                    data: data,
                    backgroundColor: backgroundColors
                }]
            };
            
            // Опции графика
            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Задачи по срокам выполнения'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Количество задач'
                        },
                        ticks: {
                            precision: 0
                        }
                    }
                },
                animation: this.defaultAnimation
            };
            
            // Создание графика
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }
            
            this.charts[canvasId] = new Chart(canvas, {
                type: 'bar',
                data: chartData,
                options: options
            });
            
            return this.charts[canvasId];
        } catch (error) {
            console.error('Ошибка создания графика задач по датам выполнения:', error);
            return null;
        }
    }

    /**
     * Создание графика прогресса по дням
     * @param {string} canvasId ID элемента canvas
     * @param {number} daysCount Количество дней для отображения
     * @returns {Promise<Chart>} Экземпляр графика
     */
    async createDailyProgressChart(canvasId, daysCount = 14) {
        const canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            console.error(`Canvas элемент с ID ${canvasId} не найден`);
            return null;
        }
        
        try {
            // Получение задач
            const tasks = await this.storage.getTasks();
            
            // Создание списка дат для отображения (от daysCount дней назад до сегодня)
            const dates = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            for (let i = daysCount - 1; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                dates.push(date);
            }
            
            // Метки для графика (даты в формате ДД.ММ)
            const labels = dates.map(date => {
                return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
            });
            
            // Подсчет задач, созданных и выполненных по дням
            const createdData = new Array(dates.length).fill(0);
            const completedData = new Array(dates.length).fill(0);
            
            tasks.forEach(task => {
                // Учет созданных задач
                if (task.createdAt) {
                    const createdDate = new Date(task.createdAt);
                    
                    dates.forEach((date, index) => {
                        if (createdDate.getFullYear() === date.getFullYear() &&
                            createdDate.getMonth() === date.getMonth() &&
                            createdDate.getDate() === date.getDate()) {
                            createdData[index]++;
                        }
                    });
                }
                
                // Учет выполненных задач
                if (task.completed && task.completedAt) {
                    const completedDate = new Date(task.completedAt);
                    
                    dates.forEach((date, index) => {
                        if (completedDate.getFullYear() === date.getFullYear() &&
                            completedDate.getMonth() === date.getMonth() &&
                            completedDate.getDate() === date.getDate()) {
                            completedData[index]++;
                        }
                    });
                }
            });
            
            // Данные для графика
            const data = {
                labels: labels,
                datasets: [
                    {
                        label: 'Создано',
                        data: createdData,
                        borderColor: this.colors.primary,
                        backgroundColor: this.colors.primaryLight,
                        tension: 0.2,
                        fill: true
                    },
                    {
                        label: 'Выполнено',
                        data: completedData,
                        borderColor: this.colors.success,
                        backgroundColor: this.colors.successLight,
                        tension: 0.2,
                        fill: true
                    }
                ]
            };
            
            // Опции графика
            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Динамика задач'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Количество задач'
                        },
                        ticks: {
                            precision: 0
                        }
                    }
                },
                animation: this.defaultAnimation
            };
            
            // Создание графика
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }
            
            this.charts[canvasId] = new Chart(canvas, {
                type: 'line',
                data: data,
                options: options
            });
            
            return this.charts[canvasId];
        } catch (error) {
            console.error('Ошибка создания графика прогресса по дням:', error);
            return null;
        }
    }

    /**
     * Создание радарного графика распределения задач
     * @param {string} canvasId ID элемента canvas
     * @returns {Promise<Chart>} Экземпляр графика
     */
    async createTaskRadarChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            console.error(`Canvas элемент с ID ${canvasId} не найден`);
            return null;
        }
        
        try {
            // Получение задач
            const tasks = await this.storage.getTasks();
            
            // Статистика по категориям
            const categoryData = {};
            const completedCategoryData = {};
            
            tasks.forEach(task => {
                const category = task.category || 'none';
                categoryData[category] = (categoryData[category] || 0) + 1;
                
                if (task.completed) {
                    completedCategoryData[category] = (completedCategoryData[category] || 0) + 1;
                }
            });
            
            // Отбираем топ-6 категорий для лучшего отображения
            const topCategories = Object.keys(categoryData)
                .sort((a, b) => categoryData[b] - categoryData[a])
                .slice(0, 6);
            
            // Подготовка данных для графика
            const labels = topCategories.map(category => this.getCategoryName(category));
            const totalData = topCategories.map(category => categoryData[category]);
            const completedData = topCategories.map(category => completedCategoryData[category] || 0);
            
            // Данные для графика
            const data = {
                labels: labels,
                datasets: [
                    {
                        label: 'Всего задач',
                        data: totalData,
                        backgroundColor: this.colors.primaryLight,
                        borderColor: this.colors.primary,
                        pointBackgroundColor: this.colors.primary,
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: this.colors.primary
                    },
                    {
                        label: 'Выполнено',
                        data: completedData,
                        backgroundColor: this.colors.successLight,
                        borderColor: this.colors.success,
                        pointBackgroundColor: this.colors.success,
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: this.colors.success
                    }
                ]
            };
            
            // Опции графика
            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Распределение задач по категориям'
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            display: true
                        },
                        suggestedMin: 0,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                animation: this.defaultAnimation
            };
            
            // Создание графика
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }
            
            this.charts[canvasId] = new Chart(canvas, {
                type: 'radar',
                data: data,
                options: options
            });
            
            return this.charts[canvasId];
        } catch (error) {
            console.error('Ошибка создания радарного графика распределения задач:', error);
            return null;
        }
    }

    /**
     * Создание графика выполнения задач по времени
     * @param {string} canvasId ID элемента canvas
     * @param {Array} timeData Данные о затраченном времени
     * @returns {Chart} Экземпляр графика
     */
    createTaskTimeChart(canvasId, timeData) {
        const canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            console.error(`Canvas элемент с ID ${canvasId} не найден`);
            return null;
        }
        
        try {
            // Если нет данных, показываем пустой график
            if (!timeData || timeData.length === 0) {
                if (this.charts[canvasId]) {
                    this.charts[canvasId].destroy();
                }
                
                this.charts[canvasId] = new Chart(canvas, {
                    type: 'doughnut',
                    data: {
                        labels: ['Нет данных'],
                        datasets: [{
                            label: 'Время',
                            data: [1],
                            backgroundColor: [this.colors.gray]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top',
                            },
                            title: {
                                display: true,
                                text: 'Затраченное время (нет данных)'
                            }
                        }
                    }
                });
                
                return this.charts[canvasId];
            }
            
            // Подготовка данных для графика
            const labels = timeData.map(item => item.title || 'Без названия');
            const data = timeData.map(item => Math.round(item.totalTime / 60000)); // Время в минутах
            
            // Генерация цветов для графика
            const backgroundColors = this.generateColors(timeData.length);
            
            // Данные для графика
            const chartData = {
                labels: labels,
                datasets: [{
                    label: 'Время (мин)',
                    data: data,
                    backgroundColor: backgroundColors,
                    hoverOffset: 4
                }]
            };
            
            // Опции графика
            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Затраченное время по задачам'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                let timeLabel = `${value} мин`;
                                
                                if (value >= 60) {
                                    const hours = Math.floor(value / 60);
                                    const minutes = value % 60;
                                    timeLabel = `${hours} ч ${minutes} мин`;
                                }
                                
                                return `${label}: ${timeLabel} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: this.defaultAnimation
            };
            
            // Создание графика
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }
            
            this.charts[canvasId] = new Chart(canvas, {
                type: 'doughnut',
                data: chartData,
                options: options
            });
            
            return this.charts[canvasId];
        } catch (error) {
            console.error('Ошибка создания графика выполнения задач по времени:', error);
            return null;
        }
    }

    /**
     * Создание графика времени по дням
     * @param {string} canvasId ID элемента canvas
     * @param {Array} dailyData Данные о затраченном времени по дням
     * @returns {Chart} Экземпляр графика
     */
    createDailyTimeChart(canvasId, dailyData) {
        const canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            console.error(`Canvas элемент с ID ${canvasId} не найден`);
            return null;
        }
        
        try {
            // Если нет данных, показываем пустой график
            if (!dailyData || dailyData.length === 0) {
                if (this.charts[canvasId]) {
                    this.charts[canvasId].destroy();
                }
                
                this.charts[canvasId] = new Chart(canvas, {
                    type: 'bar',
                    data: {
                        labels: ['Нет данных'],
                        datasets: [{
                            label: 'Время',
                            data: [0],
                            backgroundColor: this.colors.primaryLight
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            title: {
                                display: true,
                                text: 'Время по дням (нет данных)'
                            }
                        }
                    }
                });
                
                return this.charts[canvasId];
            }
            
            // Подготовка данных для графика
            const labels = dailyData.map(item => item.date);
            const data = dailyData.map(item => item.minutes);
            
            // Данные для графика
            const chartData = {
                labels: labels,
                datasets: [{
                    label: 'Время (мин)',
                    data: data,
                    backgroundColor: this.colors.primary,
                    borderColor: this.colors.primary,
                    borderWidth: 1
                }]
            };
            
            // Опции графика
            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Затраченное время по дням'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw || 0;
                                let timeLabel = `${value} мин`;
                                
                                if (value >= 60) {
                                    const hours = Math.floor(value / 60);
                                    const minutes = value % 60;
                                    timeLabel = `${hours} ч ${minutes} мин`;
                                }
                                
                                return `${timeLabel}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Время (мин)'
                        }
                    }
                },
                animation: this.defaultAnimation
            };
            
            // Создание графика
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }
            
            this.charts[canvasId] = new Chart(canvas, {
                type: 'bar',
                data: chartData,
                options: options
            });
            
            return this.charts[canvasId];
        } catch (error) {
            console.error('Ошибка создания графика времени по дням:', error);
            return null;
        }
    }

    /**
     * Создание панели со статистикой задач
     * @param {string} containerId ID контейнера для размещения
     * @returns {Promise<HTMLElement>} DOM-элемент с графиками
     */
    async createDashboardCharts(containerId) {
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.error(`Контейнер с ID ${containerId} не найден`);
            return null;
        }
        
        try {
            // Очистка контейнера
            container.innerHTML = '';
            
            // Создание заголовка
            const header = document.createElement('div');
            header.className = 'charts-header';
            header.innerHTML = `
                <h2 class="charts-title">Аналитика задач</h2>
            `;
            container.appendChild(header);
            
            // Создание сетки для графиков
            const grid = document.createElement('div');
            grid.className = 'charts-grid';
            container.appendChild(grid);
            
            // Создание графиков
            const charts = [
                { id: 'statusChart', type: 'taskStatus', title: 'Статус задач' },
                { id: 'priorityChart', type: 'taskPriority', title: 'Приоритеты задач' },
                { id: 'categoryChart', type: 'taskCategory', title: 'Задачи по категориям' },
                { id: 'dueDateChart', type: 'taskDueDate', title: 'Задачи по срокам' },
                { id: 'progressChart', type: 'dailyProgress', title: 'Динамика задач' },
                { id: 'radarChart', type: 'taskRadar', title: 'Категории' }
            ];
            
            // Создание элементов для графиков
            for (const chart of charts) {
                const chartContainer = document.createElement('div');
                chartContainer.className = 'chart-container';
                
                chartContainer.innerHTML = `
                    <div class="chart-header">
                        <h3 class="chart-title">${chart.title}</h3>
                    </div>
                    <div class="chart-body">
                        <canvas id="${chart.id}"></canvas>
                    </div>
                `;
                
                grid.appendChild(chartContainer);
            }
            
            // Инициализация графиков
            setTimeout(async () => {
                // Создание каждого графика
                await this.createTaskStatusChart('statusChart');
                await this.createTaskPriorityChart('priorityChart');
                await this.createTaskCategoryChart('categoryChart');
                await this.createTaskDueDateChart('dueDateChart');
                await this.createDailyProgressChart('progressChart');
                await this.createTaskRadarChart('radarChart');
                
                console.log('Все графики успешно созданы');
            }, 0);
            
            return container;
        } catch (error) {
            console.error('Ошибка создания панели статистики:', error);
            return null;
        }
    }

    /**
     * Обновление всех графиков
     */
    async refreshAllCharts() {
        const chartIds = Object.keys(this.charts);
        
        for (const id of chartIds) {
            const chart = this.charts[id];
            const type = chart.config.type;
            
            try {
                if (id === 'statusChart') {
                    await this.createTaskStatusChart(id);
                } else if (id === 'priorityChart') {
                    await this.createTaskPriorityChart(id);
                } else if (id === 'categoryChart') {
                    await this.createTaskCategoryChart(id);
                } else if (id === 'dueDateChart') {
                    await this.createTaskDueDateChart(id);
                } else if (id === 'progressChart') {
                    await this.createDailyProgressChart(id);
                } else if (id === 'radarChart') {
                    await this.createTaskRadarChart(id);
                }
            } catch (error) {
                console.error(`Ошибка обновления графика ${id}:`, error);
            }
        }
    }

    /**
     * Получение текстового названия категории
     * @param {string} category ID категории
     * @returns {string} Название категории
     */
    getCategoryName(category) {
        const categoryNames = {
            'design': 'Дизайн',
            'development': 'Разработка',
            'documentation': 'Документация',
            'meeting': 'Встречи',
            'presentation': 'Презентации',
            'none': 'Без категории',
            'other': 'Другое'
        };
        
        return categoryNames[category] || category;
    }

    /**
     * Генерация набора цветов для графика
     * @param {number} count Количество цветов
     * @returns {Array} Массив цветов
     */
    generateColors(count) {
        // Базовые цвета для небольшого количества значений
        const baseColors = [
            this.colors.primary,
            this.colors.success,
            this.colors.warning,
            this.colors.danger,
            this.colors.info,
            this.colors.secondary
        ];
        
        if (count <= baseColors.length) {
            return baseColors.slice(0, count);
        }
        
        // Для большого количества генерируем цвета с помощью HSL
        const colors = [];
        const saturation = 75;
        const lightness = 65;
        
        for (let i = 0; i < count; i++) {
            // Равномерное распределение оттенков по цветовому кругу
            const hue = Math.floor((i * 360) / count);
            colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
        }
        
        return colors;
    }
}

// Создание стилей
document.addEventListener('DOMContentLoaded', () => {
    // Проверка загрузки Chart.js
    if (typeof Chart === 'undefined') {
        // Загрузка Chart.js
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.1/chart.min.js';
        script.integrity = 'sha512-QSkVNOCYLtj73J4hbmVoOV6KVZuMluZlioC+trLpewV8qMjsWqlIQvkn1KGX2StWvPMdWGBqim1xlC8krl1EKQ==';
        script.crossOrigin = 'anonymous';
        script.referrerPolicy = 'no-referrer';
        document.head.appendChild(script);
        
        console.log('Chart.js загружен динамически');
    }
    
    const style = document.createElement('style');
    style.textContent = `
        /* Стили для графиков */
        .charts-header {
            margin-bottom: 1.5rem;
        }
        
        .charts-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--gray-900);
        }
        
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        
        .chart-container {
            background-color: var(--white);
            border-radius: var(--radius);
            box-shadow: var(--shadow-sm);
            overflow: hidden;
            transition: var(--transition);
        }
        
        .chart-container:hover {
            box-shadow: var(--shadow);
        }
        
        .chart-header {
            padding: 1rem;
            border-bottom: 1px solid var(--gray-200);
        }
        
        .chart-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--gray-800);
            margin: 0;
        }
        
        .chart-body {
            padding: 1rem;
            height: 300px;
            position: relative;
        }
        
        /* Адаптивность */
        @media (max-width: 768px) {
            .charts-grid {
                grid-template-columns: 1fr;
            }
        }
    `;
    
    document.head.appendChild(style);
});

// Создание и экспорт экземпляра
const chartManager = new ChartManager();

// Глобальные функции для использования в других модулях
window.initTaskTimeChart = function(canvasId, timeData) {
    return chartManager.createTaskTimeChart(canvasId, timeData);
};

window.initDailyTimeChart = function(canvasId, dailyData) {
    return chartManager.createDailyTimeChart(canvasId, dailyData);
};

// Интеграция с основным интерфейсом
document.addEventListener('DOMContentLoaded', () => {
    // Добавление пункта меню "Аналитика"
    const navItems = document.querySelector('.menu-items');
    
    if (navItems) {
        const analyticsMenuItem = document.createElement('li');
        analyticsMenuItem.className = 'menu-item';
        analyticsMenuItem.innerHTML = `
            <a href="#" class="menu-link" id="analyticsLink">
                <i class="menu-icon fas fa-chart-bar"></i>
                <span class="menu-text">Аналитика</span>
            </a>
        `;
        
        // Вставка после пункта "Канбан-доска"
        const kanbanMenuItem = Array.from(navItems.querySelectorAll('.menu-link')).find(item => 
            item.textContent.includes('Канбан')
        );
        
        if (kanbanMenuItem) {
            kanbanMenuItem.closest('.menu-item').after(analyticsMenuItem);
        } else {
            navItems.appendChild(analyticsMenuItem);
        }
        
        // Обработчик для отображения аналитики
        document.getElementById('analyticsLink').addEventListener('click', async (e) => {
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
                navbarTitle.textContent = 'Аналитика';
            }
            
            // Изменение хлебных крошек
            const breadcrumb = document.querySelector('.navbar-breadcrumb');
            if (breadcrumb) {
                breadcrumb.innerHTML = `
                    <span class="breadcrumb-item">Главная</span>
                    <span class="breadcrumb-separator">
                        <i class="fas fa-chevron-right"></i>
                    </span>
                    <span class="breadcrumb-item active">Аналитика</span>
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
                    <p>Загрузка аналитики...</p>
                `;
                pageContent.appendChild(loader);
                
                // Создание контейнера для графиков
                const chartsContainer = document.createElement('div');
                chartsContainer.id = 'dashboardCharts';
                
                // Замена индикатора загрузки на контейнер графиков
                pageContent.innerHTML = '';
                pageContent.appendChild(chartsContainer);
                
                // Создание графиков
                await chartManager.createDashboardCharts('dashboardCharts');
            }
        });
    }
    
    // Обработчики для интеграции с существующими задачами
    window.addEventListener('taskUpdated', () => {
        chartManager.refreshAllCharts();
    });
    
    window.addEventListener('taskAdded', () => {
        chartManager.refreshAllCharts();
    });
    
    window.addEventListener('taskDeleted', () => {
        chartManager.refreshAllCharts();
    });
});

// Экспорт
export default chartManager;