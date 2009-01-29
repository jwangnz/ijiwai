<?php
$conf = 'updateDescriptor.xml';

if (empty($_GET['version'])) {
    bad_request();
    exit();
}

$version = $_GET['version'];
if ($version == 'latest') $version = parse_version($conf);

$location = "http://s3.amazonaws.com/labs.geowhy.org/ijiwai_{$version}.air";
header("Location: $location");

function bad_request() {
    header("HTTP/1.1 400 Bad Request");
    echo "Bad Request";
}

function parse_version($file) {
    $lines = file($file);
    if (! is_array($lines) || empty($lines)) {
        return false;
    }
    foreach ($lines as $data) {
        if (preg_match("/\<version\>([\d\.]+)\<\/version\>/", $data, $matches)) {
            return $matches[1];
        }
    } 
    return false;
}
