<?php
// Опциональное серверное хранение задач (JSON-файл).
// GET  api.php -> вернуть все задачи
// POST api.php -> перезаписать все задачи (тело: JSON-массив)

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$dataFile = __DIR__ . '/tasks.json';

if (!file_exists($dataFile)) {
    file_put_contents($dataFile, '[]');
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    echo file_get_contents($dataFile);
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data) || (count($data) && array_keys($data) !== range(0, count($data) - 1))) {
        http_response_code(400);
        echo json_encode(['error' => 'Ожидается JSON-массив задач']);
        exit;
    }

    file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    echo json_encode(['ok' => true, 'count' => count($data)]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Метод не поддерживается']);
