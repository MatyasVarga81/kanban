<?php
header('Content-Type: application/json');
require __DIR__ . '/../../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];
parse_str(file_get_contents('php://input'), $input);

switch ($method) {
  case 'GET':
    $stmt = $pdo->prepare('SELECT * FROM tasks WHERE board_id = ?');
    $stmt->execute([$_GET['board_id']]);
    echo json_encode($stmt->fetchAll());
    break;

  case 'POST':
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare(
      'INSERT INTO tasks (board_id, title, description, status, assignee, due_date) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
      $data['board_id'], $data['title'], $data['description'],
      $data['status'], $data['assignee'], $data['due_date']
    ]);
    echo json_encode(['id' => $pdo->lastInsertId()]);
    break;

  case 'PUT':
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare(
      'UPDATE tasks SET title=?, description=?, status=?, assignee=?, due_date=? WHERE id=?'
    );
    $stmt->execute([
      $data['title'], $data['description'],
      $data['status'], $data['assignee'], $data['due_date'], $data['id']
    ]);
    echo json_encode(['status'=> 'updated']);
    break;

  case 'DELETE':
    $stmt = $pdo->prepare('DELETE FROM tasks WHERE id=?');
    $stmt->execute([$_GET['id']]);
    echo json_encode(['status'=> 'deleted']);
    break;
}