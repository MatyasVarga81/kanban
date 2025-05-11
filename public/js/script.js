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
    .then(tasks => renderBoard(tasks));
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

        // Új HTML-szerkezet a kártyához
        card.innerHTML = `
          <button class="delete-btn">&times;</button>
          <div class="card-title">${task.title}</div>
          <div class="card-field owner">
            <strong>Owner:</strong><br>
            ${task.assignee || '<i>–</i>'}
          </div>
          <div class="card-field priority">
            <strong>Priority:</strong><br>
            <span class="priority-label priority-${task.priority}">
              ${task.priority}
            </span>
          </div>
          <div class="card-field note">
            <strong>Information:</strong><br>
            ${task.description || '<i>nincs jegyzet</i>'}
          </div>
          <div class="card-field due">
            <strong>Due date:</strong><br>
            ${task.due_date || '<i>–</i>'}
          </div>
        `;

        // dupla-kattintás a jegyzet szerkesztéséhez
        card.querySelector('.note').ondblclick = e => {
          e.stopPropagation();
          const newDesc = prompt('Jegyzet szerkesztése:', task.description || '');
          if (newDesc !== null) {
            fetch('api/tasks.php', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: task.id,
                title: task.title,
                description: newDesc,
                status: task.status,
                assignee: task.assignee,
                due_date: task.due_date,
                priority: task.priority
              })
            }).then(() => {
              socket.emit('task-changed', { id: task.id, description: newDesc });
              loadBoard();
            });
          }
        };

        // törlés gomb eseménykezelő
        card.querySelector('.delete-btn').onclick = e => {
          e.stopPropagation();
          if (!confirm('Biztosan törlöd ezt a feladatot?')) return;
          fetch(`api/tasks.php?id=${task.id}`, { method: 'DELETE' })
            .then(() => {
              socket.emit('task-changed', { id: task.id });
              loadBoard();
            });
        };

        col.appendChild(card);
      });

    board.appendChild(col);
  });

  addDragDrop();
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
      updateTaskStatus(id, newStatus);
    };
  });
}

// Feladat státusz frissítése
function updateTaskStatus(id, status) {
  fetch('api/tasks.php', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status })
  })
    .then(() => {
      socket.emit('task-changed', { id, status });
      loadBoard();
      // értesítés az állapotváltozásról
      if (Notification.permission === 'granted') {
        new Notification('Státusz változott', {
          body: `#${id} → ${status}`
        });
      }
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

  fetch('api/tasks.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  })
    .then(res => res.json())
    .then(data => {
      task.id = data.id;
      socket.emit('task-changed', task);
      loadBoard();
      // értesítés az új feladatról
      if (Notification.permission === 'granted') {
        new Notification('Új feladat', { body: title });
      }
    });
};

// Kezdeti betöltés
loadBoard();
