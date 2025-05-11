<?php
// ws-server.php
// Hibák kiíratása
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Írjunk egy üzenetet, hogy biztosan lássuk, elindult-e
echo "🔌 Starting WebSocket server on port 8080...\n";

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '1');

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Http\HttpServer;
use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;
use Throwable;

require __DIR__ . '/vendor/autoload.php';

class TaskPusher implements MessageComponentInterface {
    /**
     * A kliensek tárolására használt objektum.
     * @var \SplObjectStorage<ConnectionInterface>
     */
    protected \SplObjectStorage $clients;

    /**
     * Konstruktor: inicializáljuk a kliens-listát.
     */
    public function __construct() {
        $this->clients = new \SplObjectStorage();
        echo "🔌 TaskPusher initialized\n";
    }

    /**
     * Amikor egy új kliens csatlakozik.
     *
     * @param ConnectionInterface $conn Az új kapcsolat
     * @param Throwable $e
     */
    public function onOpen(ConnectionInterface $conn): void {
        // Elmentjük a klienst
        $this->clients->attach($conn);
        echo "[+] Connection opened ({$conn->resourceId})\n";
    }

    /**
     * Amikor a kliens üzenetet küld.
     *
     * @param ConnectionInterface $from A küldő kapcsolat
     * @param string              $msg  A beérkezett üzenet
     */
    public function onMessage(ConnectionInterface $from, $msg): void {
        echo "[>] Message from {$from->resourceId}: $msg\n";

        // Visszaküldjük minden más kliensnek ugyanazzal az üzenettel
        foreach ($this->clients as $client) {
            if ($client !== $from) {
                $client->send($msg);
            }
        }
    }

    /**
     * Amikor a kliens bezárja a kapcsolatot.
     *
     * @param ConnectionInterface $conn A bontó kapcsolat
     */
    public function onClose(ConnectionInterface $conn): void {
        // Eltávolítjuk a kliens listából
        $this->clients->detach($conn);
        echo "[-] Connection closed ({$conn->resourceId})\n";
    }

    /**
     * Hiba esetén ezt a metódust hívja a szerver.
     *
     * @param ConnectionInterface $conn A hibás kapcsolat
     * @param \Exception          $e    A kivétel objektum
     */
    public function onError(ConnectionInterface $conn, Throwable $e): void {
        echo "[!] Error on connection {$conn->resourceId}: {$e->getMessage()}\n";
        $conn->close();
    }
}

// A WebSocket-szerver indítása port 8080-on
$server = IoServer::factory(
    new HttpServer(           // ← ide csomagoljuk be
        new WsServer(         //   ez a WebSocket réteg
            new TaskPusher()  //     és ez a mi komponensünk
        )
    ),
    8080
);

echo "🔌 Starting WebSocket server on port 8080...\n";
$server->run();
