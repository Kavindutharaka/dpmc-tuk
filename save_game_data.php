<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get POST data
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    echo json_encode(['success' => false, 'error' => 'Invalid data']);
    exit();
}

// CSV file path
$csvFile = 'game_data.csv';

// Check if file exists, if not create with headers
$fileExists = file_exists($csvFile);

// Open file for appending
$file = fopen($csvFile, 'a');

if ($file === false) {
    echo json_encode(['success' => false, 'error' => 'Cannot open file']);
    exit();
}

// If file is new, write headers
if (!$fileExists || filesize($csvFile) === 0) {
    fputcsv($file, ['Name', 'Phone', 'Score', 'Date', 'Time']);
}

// Prepare data row
$row = [
    isset($data['name']) ? $data['name'] : 'Anonymous',
    isset($data['phone']) ? $data['phone'] : 'N/A',
    isset($data['score']) ? $data['score'] : 0,
    isset($data['date']) ? $data['date'] : date('Y-m-d'),
    isset($data['time']) ? $data['time'] : date('H:i:s')
];

// Write data to CSV
if (fputcsv($file, $row)) {
    fclose($file);
    echo json_encode([
        'success' => true,
        'message' => 'Game data saved successfully',
        'data' => $row
    ]);
} else {
    fclose($file);
    echo json_encode(['success' => false, 'error' => 'Failed to write data']);
}
?>
