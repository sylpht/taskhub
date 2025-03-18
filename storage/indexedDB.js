/**
 * indexedDB.js
 * Модуль для работы с IndexedDB - хранилище данных приложения
 */

class IndexedDBStorage {
    constructor() {
        // Имя базы данных и версия
        this.dbName = 'taskhubDB';
        this.dbVersion = 1;
        this.db = null;
        
        // Инициализация хранилища
        this.init();
    }

    /**
     * Инициализация IndexedDB
     * @returns {Promise} Промис, который разрешается после инициализации
     */
    async init() {
        if (this.db) {
            return Promise.resolve(this.db);
        }
        
        return new Promise((resolve, reject) => {
            // Открытие базы данных
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            // Событие обновления/создания базы данных
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Создание хранилища задач (если не существует)
                if (!db.objectStoreNames.contains('tasks')) {
                    const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    taskStore.createIndex('completed', 'completed', { unique: false });
                    taskStore.createIndex('priority', 'priority', { unique: false });
                    taskStore.createIndex('category', 'category', { unique: false });
                    taskStore.createIndex('dueDate', 'dueDate', { unique: false });
                    taskStore.createIndex('kanbanColumn', 'kanbanColumn', { unique: false });
                }
                
                // Создание хранилища записей времени (если не существует)
                if (!db.objectStoreNames.contains('timeEntries')) {
                    const timeStore = db.createObjectStore('timeEntries', { keyPath: 'id', autoIncrement: true });
                    timeStore.createIndex('taskId', 'taskId', { unique: false });
                    timeStore.createIndex('date', 'date', { unique: false });
                }
                
                console.log('База данных создана/обновлена');
            };
            
            // Обработка успешного открытия базы данных
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('База данных успешно открыта');
                
                // Миграция данных из localStorage (если есть)
                this.migrateFromLocalStorage()
                    .then(() => resolve(this.db))
                    .catch(error => {
                        console.error('Ошибка миграции:', error);
                        resolve(this.db);
                    });
            };
            
            // Обработка ошибок
            request.onerror = (event) => {
                console.error('Ошибка открытия базы данных:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Миграция данных из localStorage (если они там есть)
     * @returns {Promise} Промис миграции
     */
    async migrateFromLocalStorage() {
        // Проверка наличия данных в localStorage
        const tasksData = localStorage.getItem('tasks');
        
        if (!tasksData) {
            return Promise.resolve();
        }
        
        try {
            // Парсинг данных из localStorage
            const tasks = JSON.parse(tasksData);
            
            // Проверка наличия задач в IndexedDB
            const existingTasks = await this.getTasks();
            
            // Если в IndexedDB уже есть задачи, не мигрируем
            if (existingTasks.length > 0) {
                return Promise.resolve();
            }
            
            // Добавление всех задач в IndexedDB
            const promises = tasks.map(task => this.saveTask(task));
            
            // Ожидание завершения добавления всех задач
            await Promise.all(promises);
            
            console.log('Миграция данных из localStorage завершена');
        } catch (error) {
            console.error('Ошибка миграции из localStorage:', error);
            return Promise.reject(error);
        }
    }

    /**
     * Получение всех задач
     * @returns {Promise<Array>} Промис с массивом задач
     */
    async getTasks() {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                console.error('Ошибка получения задач:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Получение задачи по ID
     * @param {string|number} id ID задачи
     * @returns {Promise<Object|null>} Промис с объектом задачи или null
     */
    async getTask(id) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = (event) => {
                console.error('Ошибка получения задачи:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Сохранение задачи (создание или обновление)
     * @param {Object} task Объект задачи
     * @returns {Promise<Object>} Промис с сохраненной задачей
     */
    async saveTask(task) {
        await this.init();
        
        // Если не указан ID, генерируем новый
        if (!task.id) {
            task.id = Date.now();
        }
        
        // Если не указана дата создания, устанавливаем текущую
        if (!task.createdAt) {
            task.createdAt = new Date().toISOString().substring(0, 10);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            const request = store.put(task);
            
            request.onsuccess = () => {
                resolve(task);
                
                // Генерация события для обновления UI
                if (typeof window.dispatchTaskEvent === 'function') {
                    window.dispatchTaskEvent('taskUpdated', task.id);
                } else {
                    window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { taskId: task.id } }));
                }
            };
            
            request.onerror = (event) => {
                console.error('Ошибка сохранения задачи:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Удаление задачи
     * @param {string|number} id ID задачи
     * @returns {Promise<boolean>} Промис с результатом удаления
     */
    async deleteTask(id) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                resolve(true);
                
                // Генерация события для обновления UI
                if (typeof window.dispatchTaskEvent === 'function') {
                    window.dispatchTaskEvent('taskDeleted', id);
                } else {
                    window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { taskId: id } }));
                }
            };
            
            request.onerror = (event) => {
                console.error('Ошибка удаления задачи:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Сохранение всех задач (полная замена)
     * @param {Array} tasks Массив задач
     * @returns {Promise<boolean>} Промис с результатом операции
     */
    async saveTasks(tasks) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            
            // Очистка хранилища
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                // Добавление всех задач
                const addPromises = tasks.map(task => {
                    return new Promise((resolveAdd, rejectAdd) => {
                        // Если не указан ID, генерируем новый
                        if (!task.id) {
                            task.id = Date.now() + Math.floor(Math.random() * 1000);
                        }
                        
                        // Если не указана дата создания, устанавливаем текущую
                        if (!task.createdAt) {
                            task.createdAt = new Date().toISOString().substring(0, 10);
                        }
                        
                        const addRequest = store.add(task);
                        
                        addRequest.onsuccess = () => resolveAdd();
                        addRequest.onerror = (event) => rejectAdd(event.target.error);
                    });
                });
                
                // Ожидание завершения добавления всех задач
                Promise.all(addPromises)
                    .then(() => {
                        resolve(true);
                        
                        // Генерация события для обновления UI
                        window.dispatchEvent(new CustomEvent('tasksUpdated'));
                    })
                    .catch(error => {
                        console.error('Ошибка добавления задач:', error);
                        reject(error);
                    });
            };
            
            clearRequest.onerror = (event) => {
                console.error('Ошибка очистки хранилища:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Добавление записи о затраченном времени
     * @param {Object} timeEntry Запись о времени
     * @returns {Promise<Object>} Промис с сохраненной записью
     */
    async addTimeEntry(timeEntry) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['timeEntries'], 'readwrite');
            const store = transaction.objectStore('timeEntries');
            const request = store.add(timeEntry);
            
            request.onsuccess = (event) => {
                // Добавляем ID в объект записи
                timeEntry.id = event.target.result;
                resolve(timeEntry);
                
                // Генерация события для обновления UI
                window.dispatchEvent(new CustomEvent('timeEntryAdded', { detail: { entry: timeEntry } }));
            };
            
            request.onerror = (event) => {
                console.error('Ошибка добавления записи времени:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Получение записи о времени по ID
     * @param {string|number} id ID записи
     * @returns {Promise<Object|null>} Промис с объектом записи или null
     */
    async getTimeEntry(id) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['timeEntries'], 'readonly');
            const store = transaction.objectStore('timeEntries');
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = (event) => {
                console.error('Ошибка получения записи времени:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Удаление записи времени
     * @param {string|number} id ID записи
     * @returns {Promise<boolean>} Промис с результатом удаления
     */
    async deleteTimeEntry(id) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['timeEntries'], 'readwrite');
            const store = transaction.objectStore('timeEntries');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                resolve(true);
                
                // Генерация события для обновления UI
                window.dispatchEvent(new CustomEvent('timeEntryDeleted', { detail: { entryId: id } }));
            };
            
            request.onerror = (event) => {
                console.error('Ошибка удаления записи времени:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Получение всех записей времени для задачи
     * @param {string|number} taskId ID задачи
     * @returns {Promise<Array>} Промис с массивом записей
     */
    async getTimeEntriesForTask(taskId) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['timeEntries'], 'readonly');
            const store = transaction.objectStore('timeEntries');
            const index = store.index('taskId');
            const request = index.getAll(taskId);
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('Ошибка получения записей времени:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Получение записей времени за период
     * @param {string} startDate Начальная дата (YYYY-MM-DD)
     * @param {string} endDate Конечная дата (YYYY-MM-DD)
     * @returns {Promise<Array>} Промис с массивом записей
     */
    async getTimeEntriesByDateRange(startDate, endDate) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['timeEntries'], 'readonly');
            const store = transaction.objectStore('timeEntries');
            const index = store.index('date');
            const range = IDBKeyRange.bound(startDate, endDate);
            const request = index.getAll(range);
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('Ошибка получения записей времени по диапазону:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Получение общего времени для задачи
     * @param {string|number} taskId ID задачи
     * @returns {Promise<number>} Промис с общим временем в миллисекундах
     */
    async getTotalTimeForTask(taskId) {
        try {
            // Получение всех записей для задачи
            const entries = await this.getTimeEntriesForTask(taskId);
            
            // Суммирование времени
            const totalTime = entries.reduce((total, entry) => {
                return total + (entry.duration || 0);
            }, 0);
            
            return totalTime;
        } catch (error) {
            console.error('Ошибка получения общего времени:', error);
            return 0;
        }
    }
}

// Создание и экспорт экземпляра хранилища
const indexedDBStorage = new IndexedDBStorage();
window.indexedDBStorage = indexedDBStorage;

export default indexedDBStorage;
