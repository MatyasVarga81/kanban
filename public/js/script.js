// WS kapcsolat (real-time frissítés)
const socket = io('http://localhost:8080');
socket.on('task-changed', loadBoard);

// Notifications API kérés
if ('Notification' in window) {
    Notification.requestPermission();
}

// Board betöltése
const boardId = 1;
function loadBoard() {
    fetch(`api/tasks.php?board_id=${boardId}`)
        .then(res => res.json())
        .then(tasks => renderBoard(tasks))
        .catch(err => console.error('Board betöltési hiba:', err));
}

function renderBoard(tasks) {
    const statuses = ['Backlog', 'To Do', 'In Progress', 'Waiting for approval', 'Done'];
    const board = document.getElementById('board');
    board.innerHTML = '';

    statuses.forEach(status => {
        const col = document.createElement('div');
        col.className = 'column';
        col.dataset.status = status;
        col.innerHTML = `<h2>${status}</h2>`;

        tasks
            .filter(t => t.status === status)
            .forEach(task => {
                const card = document.createElement('div');
                card.className = 'card';
                card.draggable = true;
                card.dataset.id = task.id;

                // A kártya teljes HTML-je, beleértve a due-input mezőt
                card.innerHTML = `
          <button class="delete-btn">&times;</button>
          <div class="card-title">${task.title}</div>
          <div class="card-field owner">
            <strong>Owner:</strong><br>${task.assignee || '<i>–</i>'}
          </div>
          <div class="card-field priority">
            <strong>Priority:</strong><br>
            <span class="priority-label priority-${task.priority}">
              ${task.priority}
            </span>
          </div>
          <div class="card-field note">
            <strong>Information:</strong><br>${task.description || '<i>–</i>'}
          </div>
          <div class="card-field due">
            <strong>Due date:</strong><br>
            <span class="due-text">${task.due_date || '<i>–</i>'}</span>
            <input type="text" class="due-input" style="display:none;">
          </div>
        `;

                // Segédfüggvény a dupla-katt szerkesztőkhoz
                const bindEditable = (selector, label, key) => {
                    const el = card.querySelector(selector);
                    if (!el) return;
                    el.ondblclick = e => {
                        e.stopPropagation();
                        const current = task[key] || '';
                        const newVal = prompt(`${label} szerkesztése:`, current);
                        if (newVal !== null) {
                            updateTask({ ...task, [key]: newVal });
                        }
                    };
                };

                bindEditable('.card-title', 'Cím', 'title');
                bindEditable('.card-field.owner', 'Felelős', 'assignee');
                bindEditable('.card-field.priority', 'Prioritás (low, medium, high, highest)', 'priority');
                bindEditable('.card-field.note', 'Jegyzet', 'description');
                // a due-date promptot eltávolítjuk, helyette Flatpickr-et használunk

                // Flatpickr inicializálása a due-input mezőn
                const dueField = card.querySelector('.card-field.due');
                const dueText = dueField.querySelector('.due-text');
                const dueInput = dueField.querySelector('.due-input');

                const fp = flatpickr(dueInput, {
                  enableTime: true,
                  time_24hr: true,
                  dateFormat: "Y-m-d H:i",
                  altInput: true,
                  altFormat: "Y-m-d H:i",
                  monthSelectorType: "dropdown",
                  onClose: (selectedDates, dateStr) => {
                    if (dateStr) {
                      updateTask({ ...task, due_date: dateStr });
                      dueText.textContent = dateStr;
                    }
                    dueInput.style.display = 'none';
                    dueText.style.display = 'block';
                  }
                });

                // dupla-katt a due-text-re, hogy előhozza a naptárat
                dueText.ondblclick = e => {
                    e.stopPropagation();
                    dueText.style.display = 'none';
                    dueInput.style.display = 'block';
                    fp.open();
                };

                // Törlés gomb
                card.querySelector('.delete-btn').onclick = e => {
                    e.stopPropagation();
                    if (!confirm('Biztosan törlöd ezt a feladatot?')) return;
                    fetch(`api/tasks.php?id=${task.id}`, { method: 'DELETE' })
                        .then(res => {
                            console.log('← DELETE status:', res.status);
                            return res.json().catch(() => null);
                        })
                        .then(data => {
                            console.log('← DELETE data:', data);
                            socket.emit('task-changed', { id: task.id });
                            loadBoard();
                        })
                        .catch(err => console.error('Törlés hiba:', err));
                };

                col.appendChild(card);
            });

        board.appendChild(col);
    });

    addDragDrop();
}

// PUT frissítés
function updateTask(task) {
    console.log('→ PUT payload:', task);

    fetch('api/tasks.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    })
        .then(res => {
            console.log('← PUT status:', res.status);
            return res.json().catch(() => null);
        })
        .then(data => {
            console.log('← PUT data:', data);
            socket.emit('task-changed', { id: task.id });
            loadBoard();
        })
        .catch(err => console.error('Frissítés hiba:', err));
}

// Drag & drop
function addDragDrop() {
    document.querySelectorAll('.card').forEach(card => {
        card.ondragstart = e => {
            e.dataTransfer.setData('text', card.dataset.id);
        };
    });
    document.querySelectorAll('.column').forEach(col => {
        col.ondragover = e => e.preventDefault();
        col.ondrop = e => {
            const id = e.dataTransfer.getData('text');
            const newStatus = col.dataset.status;
            updateTask({ id, status: newStatus });
        };
    });
}

// Új feladat létrehozása
document.getElementById('add-task-btn').onclick = () => {
    const title = prompt('Cím?');
    if (!title) return;
    const assignee = prompt('Felelős?');
    const dueDate = prompt('Határidő (YYYY-MM-DD HH:MM)?');
    const priority = prompt('Prioritás? (low, medium, high, highest)') || 'low';

    const task = {
        board_id: boardId,
        title,
        description: '',
        status: 'Backlog',
        assignee,
        due_date: dueDate,
        priority
    };

    console.log('→ POST payload:', task);
    fetch('api/tasks.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    })
        .then(res => {
            console.log('← POST status:', res.status);
            return res.json();
        })
        .then(data => {
            console.log('← POST data:', data);
            task.id = data.id;
            socket.emit('task-changed', task);
            loadBoard();
            if (Notification.permission === 'granted') {
                new Notification('Új feladat', { body: title });
            }
        })
        .catch(err => console.error('Felvitel hiba:', err));
};

// Kezdeti betöltés
loadBoard();
