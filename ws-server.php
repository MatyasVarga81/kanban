use Ratchet\MessageComponentInterface; use Ratchet\ConnectionInterface;
require 'vendor/autoload.php';
class TaskPusher implements MessageComponentInterface { ... }
$server = Ratchet\Server\IoServer::factory(new Ratchet\WebSocket\WsServer(new TaskPusher()),8080);
$server->run();