<?php
header('Content-Type: application/json');
include __DIR__ . '/db.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: [];

$fullName = trim($data['fullName'] ?? '');
$email = trim($data['email'] ?? '');
$password = (string)($data['password'] ?? '');
$role = trim($data['role'] ?? '');

if ($fullName === '' || $email === '' || $password === '' || $role === '') {
  http_response_code(400);
  echo json_encode(['message' => 'All fields are required']);
  exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(['message' => 'Invalid email format']);
  exit;
}

if (strlen($password) < 8) {
  http_response_code(400);
  echo json_encode(['message' => 'Password must be at least 8 characters']);
  exit;
}

if (!in_array($role, ['applicant', 'hirer'], true)) {
  http_response_code(400);
  echo json_encode(['message' => 'Invalid role']);
  exit;
}

$check = $conn->prepare('SELECT id FROM users WHERE email = ?');
$check->bind_param('s', $email);
$check->execute();
$exists = $check->get_result()->fetch_assoc();
$check->close();

if ($exists) {
  http_response_code(409);
  echo json_encode(['message' => 'Email already registered']);
  exit;
}

$passwordHash = password_hash($password, PASSWORD_BCRYPT);

$conn->begin_transaction();
try {
  $stmt = $conn->prepare('INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  $stmt->bind_param('ssss', $fullName, $email, $passwordHash, $role);
  $stmt->execute();
  $userId = $stmt->insert_id;
  $stmt->close();

  $headline = $role === 'hirer' ? 'Hiring Talent' : 'Open to opportunities';
  $location = 'Add your location';
  $about = 'Add your about summary';
  $profile = $conn->prepare('INSERT INTO profiles (user_id, headline, location, about) VALUES (?, ?, ?, ?)');
  $profile->bind_param('isss', $userId, $headline, $location, $about);
  $profile->execute();
  $profile->close();

  $cred = $conn->prepare('INSERT INTO login_credentials (username, password, roll) VALUES (?, ?, ?)');
  $cred->bind_param('sss', $email, $passwordHash, $role);
  $cred->execute();
  $cred->close();

  $conn->commit();
  echo json_encode([
    'message' => 'Registration successful',
    'user' => ['id' => $userId, 'fullName' => $fullName, 'email' => $email, 'role' => $role]
  ]);
} catch (Throwable $e) {
  $conn->rollback();
  http_response_code(500);
  echo json_encode(['message' => 'Server error']);
}
