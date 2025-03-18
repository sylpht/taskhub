/**
 * dataExport.js
 * Модуль для экспорта и импорта данных TaskHub
 */

class DataExporter {
    constructor(storageManager) {
        this.storageManager = storageManager || {
            getTasks: () => {
                // Временная реализация, если модуль storageManager не передан
                return JSON.parse(localStorage.getItem('tasks') || '[]');
            },
            saveTasks: (tasks) => {
                localStorage.setItem('tasks', JSON.stringify(tasks));
            }
        };
    }

    /**
     * Экспорт данных в формате JSON
     * @returns {string} JSON-строка с данными
     */
    exportToJSON() {
        const tasks = this.storageManager.getTasks();
        return JSON.stringify(tasks, null, 2);
    }

    /**
     * Скачивание файла с данными в формате JSON
     */
    downloadJSON() {
        const jsonData = this.exportToJSON();
        const blob = new Blob([jsonData], { type: 'application/json' });
        this.downloadFile(blob, 'taskhub-data.json');
    }

    /**
     * Экспорт данных в формате CSV
     * @returns {string} CSV-строка с данными
     */
    exportToCSV() {
        const tasks = this.storageManager.getTasks();
        
        if (tasks.length === 0) {
            return 'No data';
        }
        
        // Определение заголовков CSV
        const headers = [
            'id',
            'title',
            'description',
            'category',
            'priority',
            'dueDate',
            'completed',
            'createdAt',
            'assignee',
            'timeSpent'
        ];
        
        let csv = headers.join(',') + '\n';
        
        // Добавление данных задач
        tasks.forEach(task => {
            const row = [
                task.id,
                this.escapeCSV(task.title),
                this.escapeCSV(task.description || ''),
                task.category,
                task.priority,
                task.dueDate,
                task.completed ? 'true' : 'false',
                this.escapeCSV(task.createdAt),
                this.escapeCSV(task.assignee || ''),
                task.timeSpent || 0
            ];
            
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }

    /**
     * Экранирование значений для CSV
     * @param {string} value Исходное значение
     * @returns {string} Экранированное значение
     */
    escapeCSV(value) {
        if (value === null || value === undefined) {
            return '';
        }
        
        const stringValue = String(value);
        
        // Если значение содержит запятые, кавычки или переводы строк, обернуть в кавычки
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            // Экранирование кавычек внутри строки
            return '"' + stringValue.replace(/"/g, '""') + '"';
        }
        
        return stringValue;
    }

    /**
     * Скачивание файла с данными в формате CSV
     */
    downloadCSV() {
        const csvData = this.exportToCSV();
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        this.downloadFile(blob, 'taskhub-data.csv');
    }

    /**
     * Вспомогательный метод для скачивания файла
     * @param {Blob} blob Содержимое файла
     * @param {string} filename Имя файла
     */
    downloadFile(blob, filename) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    }

    /**
     * Импорт данных из JSON
     * @param {string} jsonData JSON-строка с данными
     * @param {object} options Параметры импорта
     * @returns {object} Результат импорта
     */
    importFromJSON(jsonData, options = { replace: false }) {
        try {
            const data = JSON.parse(jsonData);
            
            if (!Array.isArray(data)) {
                throw new Error('Некорректный формат данных. Ожидается массив задач.');
            }
            
            // Валидация задач
            const validTasks = data.filter(task => {
                return (
                    task && 
                    typeof task === 'object' &&
                    task.title &&
                    task.id
                );
            });
            
            if (validTasks.length === 0) {
                throw new Error('Нет корректных задач для импорта.');
            }
            
            if (options.replace) {
                // Полная замена текущих задач
                this.storageManager.saveTasks(validTasks);
            } else {
                // Добавление к существующим задачам
                const currentTasks = this.storageManager.getTasks();
                const existingIds = new Set(currentTasks.map(task => task.id));
                
                // Фильтрация задач с уже существующими ID
                const newTasks = validTasks.filter(task => !existingIds.has(task.id));
                
                this.storageManager.saveTasks([...currentTasks, ...newTasks]);
            }
            
            return {
                success: true,
                imported: validTasks.length,
                message: `Успешно импортировано ${validTasks.length} задач.`
            };
        } catch (error) {
            console.error('Ошибка импорта из JSON:', error);
            return {
                success: false,
                message: `Ошибка импорта: ${error.message}`
            };
        }
    }

    /**
     * Импорт данных из CSV
     * @param {string} csvData CSV-строка с данными
     * @param {object} options Параметры импорта
     * @returns {object} Результат импорта
     */
    importFromCSV(csvData, options = { replace: false }) {
        try {
            const lines = csvData.split('\n');
            
            if (lines.length < 2) {
                throw new Error('Недостаточно данных для импорта.');
            }
            
            const headers = this.parseCSVLine(lines[0]);
            const tasks = [];
            
            // Поиск обязательных полей
            const idIndex = headers.indexOf('id');
            const titleIndex = headers.indexOf('title');
            
            if (idIndex === -1 || titleIndex === -1) {
                throw new Error('Отсутствуют обязательные поля (id, title).');
            }
            
            // Преобразование каждой строки в объект задачи
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const values = this.parseCSVLine(lines[i]);
                const task = {};
                
                headers.forEach((header, index) => {
                    if (index < values.length) {
                        let value = values[index];
                        
                        // Преобразование типов данных
                        if (header === 'completed') {
                            task[header] = value.toLowerCase() === 'true';
                        } else if (header === 'timeSpent') {
                            task[header] = parseFloat(value) || 0;
                        } else if (header === 'id') {
                            // Поддержка как числовых, так и строковых идентификаторов
                            task[header] = /^\d+$/.test(value) ? parseInt(value) : value;
                        } else {
                            task[header] = value;
                        }
                    }
                });
                
                if (task.id && task.title) {
                    tasks.push(task);
                }
            }
            
            if (tasks.length === 0) {
                throw new Error('Нет корректных задач для импорта.');
            }
            
            if (options.replace) {
                // Полная замена текущих задач
                this.storageManager.saveTasks(tasks);
            } else {
                // Добавление к существующим задачам
                const currentTasks = this.storageManager.getTasks();
                const existingIds = new Set(currentTasks.map(task => task.id));
                
                // Фильтрация задач с уже существующими ID
                const newTasks = tasks.filter(task => !existingIds.has(task.id));
                
                this.storageManager.saveTasks([...currentTasks, ...newTasks]);
            }
            
            return {
                success: true,
                imported: tasks.length,
                message: `Успешно импортировано ${tasks.length} задач.`
            };
        } catch (error) {
            console.error('Ошибка импорта из CSV:', error);
            return {
                success: false,
                message: `Ошибка импорта: ${error.message}`
            };
        }
    }

    /**
     * Разбор строки CSV с учетом кавычек и экранирования
     * @param {string} line Строка CSV
     * @returns {string[]} Массив значений
     */
    parseCSVLine(line) {
        const result = [];
        let inQuotes = false;
        let currentValue = '';
        let cursor = 0;
        
        while (cursor < line.length) {
            const char = line[cursor];
            
            if (char === '"') {
                // Проверка на экранированные кавычки
                if (cursor + 1 < line.length && line[cursor + 1] === '"') {
                    currentValue += '"';
                    cursor += 2;
                } else {
                    // Переключение режима кавычек
                    inQuotes = !inQuotes;
                    cursor++;
                }
            } else if (char === ',' && !inQuotes) {
                // Завершение значения
                result.push(currentValue);
                currentValue = '';
                cursor++;
            } else {
                // Обычный символ
                currentValue += char;
                cursor++;
            }
        }
        
        // Добавление последнего значения
        result.push(currentValue);
        
        return result;
    }

    /**
     * Импорт данных из файла
     * @param {File} file Файл для импорта
     * @param {object} options Параметры импорта
     * @returns {Promise<object>} Промис с результатом импорта
     */
    importFromFile(file, options = { replace: false }) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const fileContent = event.target.result;
                
                if (file.name.endsWith('.json')) {
                    const result = this.importFromJSON(fileContent, options);
                    resolve(result);
                } else if (file.name.endsWith('.csv')) {
                    const result = this.importFromCSV(fileContent, options);
                    resolve(result);
                } else {
                    reject({
                        success: false,
                        message: 'Неподдерживаемый формат файла. Используйте .json или .csv'
                    });
                }
            };
            
            reader.onerror = () => {
                reject({
                    success: false,
                    message: 'Ошибка чтения файла'
                });
            };
            
            if (file.name.endsWith('.json')) {
                reader.readAsText(file);
            } else if (file.name.endsWith('.csv')) {
                reader.readAsText(file);
            } else {
                reject({
                    success: false,
                    message: 'Неподдерживаемый формат файла. Используйте .json или .csv'
                });
            }
        });
    }

    /**
     * Создание интерфейса для экспорта/импорта
     * @returns {HTMLElement} DOM-элемент с интерфейсом
     */
    createExportImportUI() {
        const container = document.createElement('div');
        container.className = 'export-import-container';
        
        const style = document.createElement('style');
        style.textContent = `
            .export-import-container {
                padding: 1.5rem;
            }
            
            .export-import-section {
                margin-bottom: 2rem;
            }
            
            .export-import-title {
                font-size: 1.25rem;
                font-weight: 600;
                margin-bottom: 1rem;
                color: var(--gray-900);
            }
            
            .export-buttons {
                display: flex;
                gap: 1rem;
                margin-bottom: 1rem;
            }
            
            .import-dropzone {
                border: 2px dashed var(--gray-300);
                border-radius: var(--radius);
                padding: 2rem;
                text-align: center;
                margin-bottom: 1rem;
                cursor: pointer;
                transition: var(--transition);
            }
            
            .import-dropzone:hover, .import-dropzone.dragover {
                border-color: var(--primary);
                background-color: rgba(67, 97, 238, 0.05);
            }
            
            .import-dropzone-icon {
                font-size: 2rem;
                color: var(--gray-400);
                margin-bottom: 1rem;
            }
            
            .import-dropzone-text {
                font-size: 1rem;
                color: var(--gray-700);
                margin-bottom: 0.5rem;
            }
            
            .import-dropzone-subtext {
                font-size: 0.875rem;
                color: var(--gray-500);
            }
            
            .import-options {
                margin-top: 1rem;
            }
            
            .import-option {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }
            
            .import-file-info {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                background-color: var(--gray-100);
                border-radius: var(--radius);
                margin-bottom: 1rem;
            }
            
            .import-file-icon {
                font-size: 1.5rem;
                color: var(--primary);
            }
            
            .import-file-details {
                flex: 1;
            }
            
            .import-file-name {
                font-weight: 500;
                color: var(--gray-900);
                margin-bottom: 0.25rem;
            }
            
            .import-file-size {
                font-size: 0.75rem;
                color: var(--gray-600);
            }
            
            .import-file-remove {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--gray-500);
                background-color: var(--gray-200);
                cursor: pointer;
                transition: var(--transition);
            }
            
            .import-file-remove:hover {
                background-color: var(--gray-300);
                color: var(--danger);
            }
        `;
        
        document.head.appendChild(style);
        
        // Секция экспорта
        const exportSection = document.createElement('div');
        exportSection.className = 'export-import-section';
        exportSection.innerHTML = `
            <h3 class="export-import-title">Экспорт данных</h3>
            <p>Выберите формат для экспорта ваших задач:</p>
            <div class="export-buttons">
                <button class="btn btn-primary" id="exportJSONBtn">
                    <i class="fas fa-download"></i>
                    Экспорт в JSON
                </button>
                <button class="btn btn-primary" id="exportCSVBtn">
                    <i class="fas fa-file-csv"></i>
                    Экспорт в CSV
                </button>
            </div>
        `;
        
        // Секция импорта
        const importSection = document.createElement('div');
        importSection.className = 'export-import-section';
        importSection.innerHTML = `
            <h3 class="export-import-title">Импорт данных</h3>
            <p>Загрузите файл JSON или CSV с задачами:</p>
            <div class="import-dropzone" id="importDropzone">
                <i class="import-dropzone-icon fas fa-cloud-upload-alt"></i>
                <div class="import-dropzone-text">Перетащите файл сюда или кликните для выбора</div>
                <div class="import-dropzone-subtext">Поддерживаемые форматы: .json, .csv</div>
            </div>
            <input type="file" id="importFileInput" accept=".json,.csv" style="display: none;">
            <div id="importFileInfo" style="display: none;"></div>
            <div class="import-options">
                <div class="import-option">
                    <input type="checkbox" id="replaceExistingData">
                    <label for="replaceExistingData">Заменить существующие данные (иначе будут добавлены к текущим)</label>
                </div>
            </div>
            <button class="btn btn-primary" id="importBtn" style="display: none;">
                <i class="fas fa-file-import"></i>
                Импортировать
            </button>
        `;
        
        container.appendChild(exportSection);
        container.appendChild(importSection);
        
        // Добавление обработчиков событий после добавления элемента в DOM
        setTimeout(() => {
            // Обработчики экспорта
            document.getElementById('exportJSONBtn').addEventListener('click', () => {
                this.downloadJSON();
                showToast('Экспорт завершен', 'Данные успешно экспортированы в JSON', 'success');
            });
            
            document.getElementById('exportCSVBtn').addEventListener('click', () => {
                this.downloadCSV();
                showToast('Экспорт завершен', 'Данные успешно экспортированы в CSV', 'success');
            });
            
            // Обработчики импорта
            const dropzone = document.getElementById('importDropzone');
            const fileInput = document.getElementById('importFileInput');
            const fileInfo = document.getElementById('importFileInfo');
            const importBtn = document.getElementById('importBtn');
            
            dropzone.addEventListener('click', () => {
                fileInput.click();
            });
            
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });
            
            dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('dragover');
            });
            
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                
                if (e.dataTransfer.files.length > 0) {
                    handleSelectedFile(e.dataTransfer.files[0]);
                }
            });
            
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    handleSelectedFile(fileInput.files[0]);
                }
            });
            
            function handleSelectedFile(file) {
                if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
                    showToast('Ошибка', 'Неподдерживаемый формат файла. Используйте .json или .csv', 'error');
                    return;
                }
                
                // Отображение информации о файле
                let fileIcon = 'fa-file';
                if (file.name.endsWith('.json')) fileIcon = 'fa-file-code';
                else if (file.name.endsWith('.csv')) fileIcon = 'fa-file-csv';
                
                let fileSize;
                if (file.size < 1024) fileSize = `${file.size} B`;
                else if (file.size < 1024 * 1024) fileSize = `${(file.size / 1024).toFixed(1)} KB`;
                else fileSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
                
                fileInfo.innerHTML = `
                    <div class="import-file-info">
                        <i class="import-file-icon fas ${fileIcon}"></i>
                        <div class="import-file-details">
                            <div class="import-file-name">${file.name}</div>
                            <div class="import-file-size">${fileSize}</div>
                        </div>
                        <div class="import-file-remove" id="removeImportFile">
                            <i class="fas fa-times"></i>
                        </div>
                    </div>
                `;
                
                fileInfo.style.display = 'block';
                importBtn.style.display = 'inline-flex';
                
                // Обработчик удаления файла
                document.getElementById('removeImportFile').addEventListener('click', () => {
                    fileInput.value = '';
                    fileInfo.style.display = 'none';
                    importBtn.style.display = 'none';
                });
            }
            
            // Обработчик импорта
            importBtn.addEventListener('click', async () => {
                if (fileInput.files.length === 0) {
                    showToast('Ошибка', 'Выберите файл для импорта', 'error');
                    return;
                }
                
                const file = fileInput.files[0];
                const replaceExisting = document.getElementById('replaceExistingData').checked;
                
                try {
                    const result = await this.importFromFile(file, { replace: replaceExisting });
                    
                    if (result.success) {
                        showToast('Импорт завершен', result.message, 'success');
                        fileInput.value = '';
                        fileInfo.style.display = 'none';
                        importBtn.style.display = 'none';
                        
                        // Обновление интерфейса приложения
                        if (typeof updateUI === 'function') {
                            updateUI();
                        } else if (typeof window.applyFilters === 'function') {
                            window.applyFilters();
                        } else {
                            console.warn('Функция обновления интерфейса не найдена');
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                        }
                    } else {
                        showToast('Ошибка импорта', result.message, 'error');
                    }
                } catch (error) {
                    showToast('Ошибка импорта', error.message || 'Произошла ошибка при импорте', 'error');
                }
            });
        }, 0);
        
        return container;
    }
}

// Вспомогательная функция для отображения уведомлений
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

// Инициализация и экспорт экземпляра класса
const dataExporter = new DataExporter();

// Добавление кнопок экспорта/импорта в интерфейс
document.addEventListener('DOMContentLoaded', () => {
    // Добавление обработчика для кнопки экспорта в навигационной панели
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            showExportImportDialog();
        });
    }
    
    // Создание модального окна для экспорта/импорта
    function showExportImportDialog() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">Экспорт и импорт данных</h2>
                <button class="modal-close" id="closeExportImportModal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" id="exportImportModalBody">
                <!-- Здесь будет UI для экспорта/импорта -->
            </div>
        `;
        
        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);
        
        // Добавление UI для экспорта/импорта
        document.getElementById('exportImportModalBody').appendChild(dataExporter.createExportImportUI());
        
        // Активация модального окна
        setTimeout(() => {
            modalOverlay.classList.add('active');
        }, 10);
        
        // Обработчик закрытия
        function closeModal() {
            modalOverlay.classList.remove('active');
            setTimeout(() => {
                document.body.removeChild(modalOverlay);
            }, 300);
        }
        
        document.getElementById('closeExportImportModal').addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }
});

export default dataExporter;
