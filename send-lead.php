<?php
header('Content-Type: application/json; charset=utf-8');

$TG_TOKEN   = 'PUT_TELEGRAM_BOT_TOKEN_HERE';
$TG_CHAT_ID = '-1001901576849';

$smtpHost = 'smtp.beget.com';
$smtpPort = 465;
$smtpUser = 'noreply@tochka-club.ru';
$smtpPass = 'PUT_SMTP_PASSWORD_HERE';

$recipients = ['sokerimiess@gmail.com', 'coo@pro-strip.ru'];

$allowedOrigins = [
    'https://tochka-club.ru',
    'https://www.tochka-club.ru',
    'https://tochka-a1f4f.web.app',
    'https://tochka-a1f4f.firebaseapp.com',
    'http://localhost:63342',
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']); exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON']); exit;
}

function clean($v) {
    return htmlspecialchars(trim((string)($v === null ? '' : $v)), ENT_QUOTES, 'UTF-8');
}

$type    = (isset($data['type']) && $data['type'] === 'vacancy') ? 'vacancy' : 'booking';
$name    = clean(isset($data['name'])    ? $data['name']    : '');
$phone   = clean(isset($data['phone'])   ? $data['phone']   : '');
$contact = clean(isset($data['contact']) ? $data['contact'] : '');
$comment = clean(isset($data['comment']) ? $data['comment'] : '');
$source  = clean(isset($data['source'])  ? $data['source']  : '');

if ($type === 'vacancy' && !$phone && !$contact && !$comment) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing required fields']); exit;
}
if ($type === 'booking' && !$phone && !$contact) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing required fields']); exit;
}

$title = $type === 'vacancy'
    ? '💼 Новый отклик на вакансию'
    : '🔥 Новая бронь';

$lines = [
    'Имя: '     . ($name  ? $name  : '—'),
    'Телефон: ' . ($phone ? $phone : '—'),
];
if ($type === 'vacancy') {
    $lines[] = 'Контакт: '     . ($contact ? $contact : '—');
    $lines[] = 'Комментарий: ' . ($comment ? $comment : '—');
}
if ($source) $lines[] = 'Источник: ' . $source;

$plain  = $title . "\n\n" . implode("\n", $lines) . "\n";
$tgText = '<b>' . $title . '</b>' . "\n" . implode("\n", $lines);

function sendTelegram($token, $chatId, $text) {
    if (!function_exists('curl_init')) throw new Exception('cURL не установлен на сервере');

    $ch = curl_init("https://api.telegram.org/bot{$token}/sendMessage");
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode([
            'chat_id'    => $chatId,
            'text'       => $text,
            'parse_mode' => 'HTML',
        ], JSON_UNESCAPED_UNICODE),
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($resp === false) throw new Exception("cURL: $err");
    if ($code !== 200)   throw new Exception("Telegram HTTP $code: $resp");
    return true;
}

function sendViaSmtp($host, $port, $user, $pass, $to, $subject, $body) {
    $socket = @stream_socket_client("ssl://$host:$port", $errno, $errstr, 15, STREAM_CLIENT_CONNECT);
    if (!$socket) throw new Exception("Не удалось подключиться к SMTP: $errstr ($errno)");

    $read = function () use ($socket) {
        $d = '';
        while ($line = fgets($socket, 515)) {
            $d .= $line;
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        return $d;
    };
    $write = function ($cmd) use ($socket) { fwrite($socket, $cmd . "\r\n"); };

    $read();
    $write("EHLO tochka-club.ru");  $read();
    $write("AUTH LOGIN");           $read();
    $write(base64_encode($user));   $read();
    $write(base64_encode($pass));   $authResp = $read();

    if (strpos($authResp, '235') === false) {
        fclose($socket);
        throw new Exception("Ошибка авторизации SMTP: $authResp");
    }

    $write("MAIL FROM:<$user>");    $read();
    $write("RCPT TO:<$to>");        $read();
    $write("DATA");                 $read();

    $headers = "From: Точка Доступа <$user>\r\n"
             . "To: <$to>\r\n"
             . "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n"
             . "MIME-Version: 1.0\r\n"
             . "Content-Type: text/plain; charset=UTF-8\r\n"
             . "Content-Transfer-Encoding: base64\r\n";

    $write($headers . "\r\n" . chunk_split(base64_encode($body)) . "\r\n.");
    $sendResp = $read();

    $write("QUIT");
    fclose($socket);

    if (strpos($sendResp, '250') === false) throw new Exception("Ошибка отправки: $sendResp");
    return true;
}

$results = [];
$anyOk   = false;

if ($type === 'vacancy') {
    $subject = "Точка Доступа — отклик на вакансию от " . ($name ? $name : 'без имени');

    foreach ($recipients as $to) {
        try {
            sendViaSmtp($smtpHost, $smtpPort, $smtpUser, $smtpPass, $to, $subject, $plain);
            $results["mail:$to"] = 'ok';
            $anyOk = true;
        } catch (Exception $e) {
            $results["mail:$to"] = 'error: ' . $e->getMessage();
        }
    }
} else {
    try {
        sendTelegram($TG_TOKEN, $TG_CHAT_ID, $tgText);
        $results['telegram'] = 'ok';
        $anyOk = true;
    } catch (Exception $e) {
        $results['telegram'] = 'error: ' . $e->getMessage();
    }
}

if (!$anyOk) http_response_code(502);
echo json_encode(['ok' => $anyOk, 'results' => $results], JSON_UNESCAPED_UNICODE);