"""Transport-independent, single-session horon rules."""
from collections import Counter, OrderedDict
from typing import Literal
from pydantic import BaseModel, Field

DEFAULT_CAPACITY = 200
MOVE_COMMANDS = {
    '!sol': 'sol', '!sag': 'sag', '!sağ': 'sag',
    '!cok': 'cok', '!çök': 'cok', '!kalk': 'kalk',
}
WAVE_START_COMMAND = '!dalga'
WAVE_SUPPORT_COMMANDS = {'🔥', '!ates', '!ateş'}
WEATHER_CLEAR_COMMAND = '!tempo'
REGIONS = {'trabzon', 'rize', 'ordu', 'giresun', 'artvin', 'samsun'}
DUEL_START_COMMAND = '!duello'
DUEL_VOTES = {'!a': 'a', '!b': 'b'}


class Event(BaseModel):
    event_id: str = Field(min_length=1, max_length=128)
    type: Literal['comment', 'gift']
    user_id: str = Field(min_length=1, max_length=128)
    nickname: str = Field(min_length=1, max_length=32)
    text: str = Field(default='', max_length=256)
    gift_id: str | None = Field(default=None, max_length=128)
    count: int = Field(default=1, ge=1, le=10000)
    diamonds: int = Field(default=1, ge=0, le=10000)


class Game:
    def __init__(self, capacity: int = DEFAULT_CAPACITY):
        self.capacity = capacity
        self.players: dict[str, dict] = {}
        self.waiting: dict[str, dict] = {}
        self.supporters: dict[str, dict] = {}
        self.move_voters: dict[str, str] = {}
        self.move = {'name': None, 'revision': 0}
        self.wave_supporters: set[str] = set()
        self.wave = {'revision': 0, 'support': 0, 'target': 1, 'status': 'idle'}
        self.activity: dict[str, int] = {}
        self.leader = {'id': None, 'revision': 0}
        self.weather_supporters: set[str] = set()
        self.weather = {'kind': 'clear', 'revision': 0, 'support': 0, 'target': 1}
        self.duel_voters: set[str] = set()
        self.duel = {'revision': 0, 'status': 'idle', 'a': 0, 'b': 0,
                     'target': 3, 'winner': None}
        self.seen: OrderedDict[str, None] = OrderedDict()
        self.revision = 0

    def move_vote_target(self):
        return max(1, min(8, (len(self.players) + 6) // 7))

    def wave_target(self):
        return max(1, min(12, (len(self.players) + 7) // 8))

    def expire_wave(self, wave_revision: int):
        if self.wave['revision'] != wave_revision or self.wave['status'] != 'active':
            return False
        self.wave['status'] = 'failed'
        self.revision += 1
        return True

    def rotate_leader(self):
        candidates = [uid for uid in self.players if uid != self.leader['id']]
        if not candidates:
            candidates = list(self.players)
        leader_id = max(candidates, key=lambda uid: self.activity.get(uid, 0), default=None)
        if leader_id == self.leader['id']:
            return False
        self.leader = {'id': leader_id, 'revision': self.leader['revision'] + 1}
        return True

    def weather_target(self):
        return max(1, min(10, (len(self.players) + 9) // 10))

    def start_weather(self):
        if self.weather['kind'] != 'clear':
            return False
        kinds = ('sis', 'yagmur', 'firtina')
        kind = kinds[self.weather['revision'] % len(kinds)]
        self.weather_supporters.clear()
        self.weather = {'kind': kind, 'revision': self.weather['revision'] + 1,
                        'support': 0, 'target': self.weather_target()}
        return True

    def duel_target(self):
        return max(3, min(20, (len(self.players) + 3) // 4))

    def finish_duel(self, duel_revision: int, advance_revision: bool = True):
        if self.duel['revision'] != duel_revision or self.duel['status'] != 'active':
            return False
        winner = 'a' if self.duel['a'] > self.duel['b'] else 'b' if self.duel['b'] > self.duel['a'] else 'tie'
        self.duel['status'] = 'finished'
        self.duel['winner'] = winner
        if advance_revision:
            self.revision += 1
        return True

    def snapshot(self):
        move_counts = Counter(self.move_voters.values())
        return {'revision': self.revision, 'players': list(self.players.values()),
                'waiting': len(self.waiting), 'capacity': self.capacity,
                'move': dict(self.move),
                'wave': dict(self.wave),
                'leader': dict(self.leader),
                'weather': dict(self.weather),
                'duel': dict(self.duel),
                'vote': {'counts': {name: move_counts.get(name, 0)
                                    for name in ('sol', 'sag', 'cok', 'kalk')},
                         'target': self.move_vote_target()},
                'leaderboard': sorted(self.supporters.values(),
                                      key=lambda p: p['score'], reverse=True)[:3]}

    def apply(self, event: Event):
        if event.event_id in self.seen:
            return False
        self.seen[event.event_id] = None
        if len(self.seen) > 10000:
            self.seen.popitem(last=False)
        uid = event.user_id
        text = event.text.strip().casefold()
        command, _, argument = text.partition(' ')
        leader_left = False
        if event.type == 'comment' and text == '!cik':
            leader_left = self.leader['id'] == uid
            self.players.pop(uid, None)
            self.waiting.pop(uid, None)
            self.move_voters.pop(uid, None)
            self.wave_supporters.discard(uid)
            self.weather_supporters.discard(uid)
            self.duel_voters.discard(uid)
            self.activity.pop(uid, None)
            if self.waiting and len(self.players) < self.capacity:
                next_id = next(iter(self.waiting))
                self.players[next_id] = self.waiting.pop(next_id)
        elif event.type == 'comment' and text in MOVE_COMMANDS:
            if uid not in self.players or uid in self.move_voters:
                return False
            move = MOVE_COMMANDS[text]
            self.move_voters[uid] = move
            if Counter(self.move_voters.values())[move] >= self.move_vote_target():
                self.move = {'name': move, 'revision': self.move['revision'] + 1}
                self.move_voters.clear()
        elif event.type == 'comment' and text == WAVE_START_COMMAND:
            if uid not in self.players:
                return False
            self.wave_supporters.clear()
            self.wave = {'revision': self.wave['revision'] + 1, 'support': 0,
                         'target': self.wave_target(), 'status': 'active'}
        elif event.type == 'comment' and text in WAVE_SUPPORT_COMMANDS:
            if (uid not in self.players or self.wave['status'] != 'active'
                    or uid in self.wave_supporters):
                return False
            self.wave_supporters.add(uid)
            self.wave['support'] = len(self.wave_supporters)
            if self.wave['support'] >= self.wave['target']:
                self.wave['status'] = 'success'
        elif event.type == 'comment' and text == WEATHER_CLEAR_COMMAND:
            if (uid not in self.players or self.weather['kind'] == 'clear'
                    or uid in self.weather_supporters):
                return False
            self.weather_supporters.add(uid)
            self.weather['support'] = len(self.weather_supporters)
            if self.weather['support'] >= self.weather['target']:
                self.weather_supporters.clear()
                self.weather = {'kind': 'clear', 'revision': self.weather['revision'] + 1,
                                'support': 0, 'target': self.weather_target()}
        elif event.type == 'comment' and text == DUEL_START_COMMAND:
            if uid not in self.players:
                return False
            self.duel_voters.clear()
            self.duel = {'revision': self.duel['revision'] + 1, 'status': 'active',
                         'a': 0, 'b': 0, 'target': self.duel_target(), 'winner': None}
        elif event.type == 'comment' and text in DUEL_VOTES:
            if uid not in self.players or self.duel['status'] != 'active' or uid in self.duel_voters:
                return False
            self.duel_voters.add(uid)
            choice = DUEL_VOTES[text]
            self.duel[choice] += 1
            if self.duel['a'] + self.duel['b'] >= self.duel['target']:
                self.finish_duel(self.duel['revision'], advance_revision=False)
        elif event.type == 'gift' or command == '!katil':
            player = self.players.get(uid) or self.waiting.get(uid)
            if player is None:
                player = {'id': uid, 'nickname': event.nickname, 'score': 0, 'region': None}
                target = self.players if len(self.players) < self.capacity else self.waiting
                target[uid] = player
            player['nickname'] = event.nickname
            if event.type == 'comment':
                player['region'] = argument if argument in REGIONS else player.get('region')
            if event.type == 'gift':
                previous = self.supporters.get(uid, {}).get('score', 0)
                player['score'] = previous + event.count * event.diamonds
                self.supporters[uid] = dict(player)
        else:
            return False
        if uid in self.players:
            self.activity[uid] = self.activity.get(uid, 0) + (3 if event.type == 'gift' else 1)
        self.revision += 1
        if leader_left or self.revision % 25 == 0:
            self.rotate_leader()
        if text != WEATHER_CLEAR_COMMAND and self.revision % 40 == 0:
            self.start_weather()
        return True
