from fastapi.testclient import TestClient
import pytest
import server
from game import Event, Game
from server import ADMIN_TOKEN, app


@pytest.fixture(autouse=True)
def fresh_server(monkeypatch):
    monkeypatch.setattr(server, 'game', Game())


def event(uid, **kwargs):
    return Event(event_id=kwargs.pop('event_id', uid), user_id=uid,
                 nickname=uid, type=kwargs.pop('type', 'comment'),
                 text=kwargs.pop('text', '!katil'), **kwargs)


def test_capacity_fifo_and_duplicate_join():
    game = Game(capacity=2)
    for uid in ['a', 'b', 'c', 'd']:
        game.apply(event(uid))
    game.apply(event('a', event_id='again'))
    assert list(game.players) == ['a', 'b']
    assert list(game.waiting) == ['c', 'd']
    game.apply(event('a', event_id='leave', text='!cik'))
    assert list(game.players) == ['b', 'c']


def test_gift_deduplication_and_support_after_rejoin():
    game = Game()
    gift = event('a', type='gift', count=3, diamonds=2)
    assert game.apply(gift)
    assert not game.apply(gift)
    assert game.snapshot()['leaderboard'][0]['score'] == 6
    game.apply(event('a', event_id='leave', text='!cik'))
    game.apply(event('a', event_id='gift-2', type='gift'))
    assert game.snapshot()['leaderboard'][0]['score'] == 7


def test_http_authorization_and_websocket_delivery():
    with TestClient(app) as client:
        assert client.get('/health').status_code == 200
        payload = event('integration').model_dump()
        assert client.post('/events', json=payload).status_code == 401
        with client.websocket_connect('/ws/game') as ws:
            ws.receive_json()
            response = client.post('/events', json=payload, headers={'x-admin-token': ADMIN_TOKEN})
            assert response.json()['applied']
            assert any(p['id'] == 'integration' for p in ws.receive_json()['state']['players'])


def test_100_events_and_snapshot_after_reconnect():
    with TestClient(app) as client:
        for i in range(100):
            result = client.post('/events', json=event(f'load-{i}').model_dump(),
                                 headers={'x-admin-token': ADMIN_TOKEN})
            assert result.status_code == 200
        with client.websocket_connect('/ws/game') as ws:
            state = ws.receive_json()['state']
            assert len(state['players']) == 100
            assert state['waiting'] == 0


def test_default_capacity_supports_200_dancers():
    game = Game()
    for i in range(201):
        game.apply(event(f'ring-{i}'))
    assert game.capacity == 200
    assert len(game.players) == 200
    assert list(game.waiting) == ['ring-200']


def test_move_vote_requires_active_unique_users_and_triggers_winner():
    game = Game()
    for i in range(10):
        game.apply(event(f'voter-{i}'))
    assert game.move_vote_target() == 2
    assert not game.apply(event('outsider', event_id='outside-vote', text='!sol'))
    assert game.apply(event('voter-0', event_id='vote-1', text='!sol'))
    assert not game.apply(event('voter-0', event_id='vote-duplicate', text='!sol'))
    assert game.snapshot()['vote']['counts']['sol'] == 1
    assert game.apply(event('voter-1', event_id='vote-2', text='!sol'))
    assert game.snapshot()['move'] == {'name': 'sol', 'revision': 1}
    assert game.snapshot()['vote']['counts']['sol'] == 0


def test_wave_needs_unique_active_supporters_and_can_expire():
    game = Game()
    for i in range(16):
        game.apply(event(f'wave-{i}'))
    assert game.apply(event('wave-0', event_id='wave-start', text='!dalga'))
    wave_revision = game.snapshot()['wave']['revision']
    assert game.snapshot()['wave']['target'] == 2
    assert not game.apply(event('outsider', event_id='fire-outside', text='🔥'))
    assert game.apply(event('wave-0', event_id='fire-1', text='🔥'))
    assert not game.apply(event('wave-0', event_id='fire-repeat', text='!ates'))
    assert game.apply(event('wave-1', event_id='fire-2', text='!ateş'))
    assert game.snapshot()['wave']['status'] == 'success'
    assert not game.expire_wave(wave_revision)

    assert game.apply(event('wave-2', event_id='wave-restart', text='!dalga'))
    wave_revision = game.snapshot()['wave']['revision']
    assert game.expire_wave(wave_revision)
    assert game.snapshot()['wave']['status'] == 'failed'
