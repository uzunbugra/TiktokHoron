from fastapi.testclient import TestClient
import pytest
import server
from game import Event, Game
from server import ADMIN_TOKEN, app
from storage import ProfileStore


@pytest.fixture(autouse=True)
def fresh_server(monkeypatch):
    monkeypatch.setattr(server, 'game', Game())
    monkeypatch.setattr(server, 'profiles', ProfileStore(':memory:'))
    monkeypatch.setattr(server, 'session_visitors', set())


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


def test_http_rejoin_in_same_session_counts_one_persistent_visit():
    headers = {'x-admin-token': ADMIN_TOKEN}
    with TestClient(app) as client:
        client.post('/events', json=event('regular').model_dump(), headers=headers)
        client.post('/events', json=event('regular', event_id='regular-leave', text='!cik').model_dump(), headers=headers)
        client.post('/events', json=event('regular', event_id='regular-return').model_dump(), headers=headers)
    assert server.profiles.get('regular')['visits'] == 1


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


def test_leader_rotates_by_activity_and_is_replaced_on_leave():
    game = Game()
    for i in range(24):
        game.apply(event(f'leader-{i}'))
    game.apply(event('leader-7', event_id='leader-gift', type='gift', diamonds=5))
    assert game.snapshot()['leader']['id'] == 'leader-7'
    first_revision = game.snapshot()['leader']['revision']
    game.apply(event('leader-7', event_id='leader-leaves', text='!cik'))
    assert game.snapshot()['leader']['id'] != 'leader-7'
    assert game.snapshot()['leader']['revision'] == first_revision + 1


def test_weather_starts_on_activity_milestone_and_tempo_clears_it():
    game = Game()
    for i in range(40):
        game.apply(event(f'weather-{i}'))
    weather = game.snapshot()['weather']
    assert weather['kind'] == 'sis'
    assert weather['target'] == 4
    assert not game.apply(event('outsider', event_id='tempo-outside', text='!tempo'))
    for i in range(4):
        assert game.apply(event(f'weather-{i}', event_id=f'tempo-{i}', text='!tempo'))
    assert game.snapshot()['weather']['kind'] == 'clear'
    assert not game.apply(event('weather-4', event_id='tempo-clear', text='!tempo'))


def test_join_command_assigns_only_supported_region():
    game = Game()
    assert game.apply(event('regional', text='!katil trabzon'))
    assert game.players['regional']['region'] == 'trabzon'
    assert game.apply(event('regional', event_id='change-region', text='!katil rize'))
    assert game.players['regional']['region'] == 'rize'
    assert game.apply(event('unknown-region', text='!katil bilinmeyen'))
    assert game.players['unknown-region']['region'] is None


def test_duel_accepts_one_vote_per_active_user_and_finishes():
    game = Game()
    for i in range(12):
        game.apply(event(f'duel-{i}'))
    assert game.apply(event('duel-0', event_id='duel-start', text='!duello'))
    assert game.snapshot()['duel']['target'] == 3
    assert game.apply(event('duel-0', event_id='duel-a1', text='!a'))
    assert not game.apply(event('duel-0', event_id='duel-repeat', text='!b'))
    assert game.apply(event('duel-1', event_id='duel-a2', text='!a'))
    assert game.apply(event('duel-2', event_id='duel-b1', text='!b'))
    assert game.snapshot()['duel']['winner'] == 'a'
    assert game.snapshot()['duel']['status'] == 'finished'


def test_ring_breaks_on_milestone_and_unique_support_repairs_it():
    game = Game()
    for i in range(60):
        game.apply(event(f'repair-{i}'))
    assert game.snapshot()['ring']['status'] == 'broken'
    assert game.snapshot()['ring']['target'] == 6
    for i in range(6):
        assert game.apply(event(f'repair-{i}', event_id=f'repair-vote-{i}', text='🤝'))
    assert game.snapshot()['ring']['status'] == 'intact'


def test_photo_moments_trigger_on_crowd_milestone_and_celebration():
    game = Game()
    for i in range(50):
        game.apply(event(f'photo-{i}'))
    assert game.snapshot()['photo'] == {'revision': 1, 'reason': '50-horoncu'}
    game.apply(event('photo-0', event_id='photo-gift', type='gift', count=2, diamonds=5))
    assert game.snapshot()['photo'] == {'revision': 2, 'reason': 'celebration'}


def test_guest_raid_tags_only_next_ten_new_players():
    game = Game()
    game.apply(event('host'))
    assert game.apply(event('host', event_id='raid-start', text='!baskin Rize Ekibi'))
    for i in range(11):
        game.apply(event(f'guest-{i}'))
    assert game.players['guest-0']['raid'] == 'rize ekibi'
    assert game.players['guest-9']['raid'] == 'rize ekibi'
    assert game.players['guest-10']['raid'] is None
    assert game.snapshot()['raid']['remaining'] == 0
    assert not game.apply(event('outsider', event_id='bad-raid', text='!baskin ekip'))
