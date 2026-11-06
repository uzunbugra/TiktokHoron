import asyncio
import os
import secrets
import anyio
from fastapi import FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from game import DEFAULT_CAPACITY, Event, Game

app = FastAPI(title='Horon LIVE — local prototype')
game = Game(capacity=int(os.environ.get('GAME_CAPACITY', DEFAULT_CAPACITY)))
lock = asyncio.Lock()
clients: set[asyncio.Queue] = set()
ADMIN_TOKEN = os.environ.get('ADMIN_TOKEN', 'local-dev-token')


def broadcast(message):
    for queue in clients:
        if queue.full():
            queue.get_nowait()
        queue.put_nowait(message)


async def expire_wave(wave_revision: int):
    await asyncio.sleep(8)
    async with lock:
        if game.expire_wave(wave_revision):
            broadcast({'state': game.snapshot(), 'effect': None})


@app.get('/health')
async def health():
    return {'status': 'ok', 'mode': 'simulation', 'revision': game.revision}


@app.post('/events')
async def events(event: Event, x_admin_token: str = Header(default='')):
    if not secrets.compare_digest(x_admin_token, ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail='Invalid admin token')
    async with lock:
        applied = game.apply(event)
        if applied:
            message = {'state': game.snapshot(), 'effect': event.model_dump() if event.type == 'gift' else None}
            broadcast(message)
            if event.type == 'comment' and event.text.strip().casefold() == '!dalga':
                asyncio.create_task(expire_wave(game.wave['revision']))
    return {'applied': applied, 'revision': game.revision}


@app.websocket('/ws/game')
async def websocket(ws: WebSocket):
    if ws.headers.get('origin') not in {None, 'http://127.0.0.1:5173', 'http://localhost:5173'}:
        await ws.close(code=1008)
        return
    await ws.accept()
    queue: asyncio.Queue = asyncio.Queue(maxsize=32)
    async with lock:
        clients.add(queue)
        queue.put_nowait({'state': game.snapshot(), 'effect': None})

    async def send():
        while True:
            await ws.send_json(await queue.get())

    async def receive():
        while True:
            await ws.receive_text()

    try:
        async with anyio.create_task_group() as group:
            group.start_soon(send)
            try:
                await receive()
            except WebSocketDisconnect:
                pass
            finally:
                group.cancel_scope.cancel()
    finally:
        clients.discard(queue)
