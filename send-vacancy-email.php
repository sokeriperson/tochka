<?php
header('Content-Type: application/json; charset=utf-8');

$allowedOrigins = [
    'https://tochka-club.ru',
    'https://www.tochka-club.ru',
    'http://localhost:63342'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
    exit;
}

function clean($v) {
    return htmlspecialchars(trim((string)($v ?? '')), ENT_QUOTES, 'UTF-8');
}

$name    = clean($data['name']    ?? '');
$phone   = clean($data['phone']   ?? '');
$contact = clean($data['contact'] ?? '');
$comment = clean($data['comment'] ?? '');

if (!$phone && !$contact && !$comment) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing required fields']);
    exit;
}

// SMTP
$smtpHost = 'smtp.beget.com';
$smtpPort = 465;
$smtpUser = 'noreply@tochka-club.ru';
$smtpPass = 'PUT_SMTP_PASSWORD_HERE';

$recipients = ['sokerimiess@gmail.com', 'coo@pro-strip.ru'];
$subject    = "Точка Доступа — отклик на вакансию от $name";

$body = "Новый отклик на вакансию\n\n"
      . "Имя: " . ($name ?: '—') . "\n"
      . "Телефон: " . ($phone ?: '—') . "\n"
      . "Контакт: " . ($contact ?: '—') . "\n"
      . "Комментарий: " . ($comment ?: '—') . "\n";

function sendViaSmtp($host, $port, $user, $pass, $to, $subject, $body) {
    $socket = @stream_socket_client(
        "ssl://$host:$port",
        $errno, $errstr, 15,
        STREAM_CLIENT_CONNECT
    );

    if (!$socket) {
        throw new Exception("Не удалось подключиться к SMTP: $errstr ($errno)");
    }

    $read = function() use ($socket) {
        $data = '';
        while ($line = fgets($socket, 515)) {
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        return $data;
    };

    $write = function($cmd) use ($socket) {
        fwrite($socket, $cmd . "\r\n");
    };

    $read();

    $write("EHLO tochka-club.ru");
    $read();

    $write("AUTH LOGIN");
    $read();

    $write(base64_encode($user));
    $read();

    $write(base64_encode($pass));
    $authResp = $read();

    if (strpos($authResp, '235') === false) {
        fclose($socket);
        throw new Exception("Ошибка авторизации SMTP: $authResp");
    }

    $write("MAIL FROM:<$user>");
    $read();

    $write("RCPT TO:<$to>");
    $read();

    $write("DATA");
    $read();

    $headers = "From: Точка Доступа <$user>\r\n"
             . "To: <$to>\r\n"
             . "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n"
             . "MIME-Version: 1.0\r\n"
             . "Content-Type: text/plain; charset=UTF-8\r\n"
             . "Content-Transfer-Encoding: base64\r\n";

    $encodedBody = chunk_split(base64_encode($body));

    $write($headers . "\r\n" . $encodedBody . "\r\n.");
    $sendResp = $read();

    $write("QUIT");
    fclose($socket);

    if (strpos($sendResp, '250') === false) {
        throw new Exception("Ошибка отправки: $sendResp");
    }

    return true;
}

$results = [];
$hasError = false;

foreach ($recipients as $to) {
    try {
        sendViaSmtp($smtpHost, $smtpPort, $smtpUser, $smtpPass, $to, $subject, $body);
        $results[$to] = 'ok';
    } catch (Exception $e) {
        $results[$to] = 'error: ' . $e->getMessage();
        $hasError = true;
    }
}

if ($hasError) {
    http_response_code(207);
}

echo json_encode(['ok' => !$hasError, 'results' => $results]);