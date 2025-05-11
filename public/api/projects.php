<?php
// api/projects.php
header('Content-Type: application/json');
require __DIR__ . '/../../config/db.php';

$action   = $_GET['action']   ?? '';
$userId   = $_GET['user_id'] ?? null;  // opcionális filter a listáláshoz
$data     = json_decode(file_get_contents('php://input'), true);

try {
    switch ($action) {
        // 1) LIST: visszaadja az összes projektet (vagy ha megadtad user_id-t, csak azokat)
        case 'list':
            if ($userId) {
                $stmt = $pdo->prepare("SELECT p.*, u.email AS owner_email
                                       FROM projects p
                                       LEFT JOIN users u ON p.owner_id = u.id
                                       WHERE p.owner_id = :uid
                                       ORDER BY p.name ASC");
                $stmt->execute([':uid' => $userId]);
            } else {
                $stmt = $pdo->query("SELECT p.*, u.email AS owner_email
                                     FROM projects p
                                     LEFT JOIN users u ON p.owner_id = u.id
                                     ORDER BY p.name ASC");
            }
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        // 2) CREATE: új projekt létrehozása
        case 'create':
            // elvárjuk: name, owner_id
            $stmt = $pdo->prepare("INSERT INTO projects (name, owner_id)
                                   VALUES (:name, :owner_id)");
            $stmt->execute([
                ':name'     => $data['name']     ?? '',
                ':owner_id' => $data['owner_id'] ?? null,
            ]);
            echo json_encode(['id' => $pdo->lastInsertId()]);
            break;

        // 3) UPDATE: meglévő projekt módosítása
        case 'update':
            // elvárjuk: id, name
            $stmt = $pdo->prepare("UPDATE projects
                                   SET name = :name
                                   WHERE id = :id");
            $stmt->execute([
                ':id'   => $data['id'],
                ':name' => $data['name'] ?? '',
            ]);
            echo json_encode(['updated' => $stmt->rowCount()]);
            break;

        // 4) DELETE: projekt törlése
        case 'delete':
            // elvárt GET param: id
            $projId = $_GET['id'] ?? 0;
            // (opcionális: itt előbb törölheted a kapcsolódó feladatokat)
            $pdo->prepare("DELETE FROM tasks WHERE project_id = :pid")
                ->execute([':pid' => $projId]);
            $stmt = $pdo->prepare("DELETE FROM projects WHERE id = :id");
            $stmt->execute([':id' => $projId]);
            echo json_encode(['deleted' => $stmt->rowCount()]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
