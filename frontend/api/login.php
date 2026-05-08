<?php
header('Content-Type: application/json');
include __DIR__ . '/db.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: [];

$email = trim($data['email'] ?? '');
$password = (string)($data['password'] ?? '');

if ($email === '' || $password === '') {
  http_response_code(400);
  echo json_encode(['message' => 'Email and password are required']);
  exit;
}

$stmt = $conn->prepare('SELECT id, full_name, email, role, password_hash FROM users WHERE email = ?');
$stmt->bind_param('s', $email);
$stmt->execute();
$res = $stmt->get_result();
$user = $res->fetch_assoc();
$stmt->close();

if (!$user || !password_verify($password, $user['password_hash'])) {
  http_response_code(401);
  echo json_encode(['message' => 'Invalid credentials']);
  exit;
}

echo json_encode([
  'message' => 'Login successful',
  'user' => [
    'id' => (int)$user['id'],
    'fullName' => $user['full_name'],
    'email' => $user['email'],
    'role' => $user['role']
  ]
]);
