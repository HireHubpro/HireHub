<?php
header('Content-Type: application/json');

$host = getenv('DB_HOST') ?: 'localhost';
$port = getenv('DB_PORT') ?: '3306';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASSWORD') ?: '';
$db   = getenv('DB_NAME') ?: 'HireHub';

$conn = new mysqli($host, $user, $pass, $db, (int)$port);
if ($conn->connect_error) {
  http_response_code(500);
  echo json_encode(['message' => 'Database connection failed']);
  exit;
}
