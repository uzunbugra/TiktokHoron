"""Transport-independent, single-session horon rules."""
from collections import Counter, OrderedDict
from typing import Literal
from pydantic import BaseModel, Field

DEFAULT_CAPACITY = 200
MOVE_COMMANDS = {
    '!sol': 'sol', '!sag': 'sag', '!sağ': 'sag',
    '!cok': 'cok', '!çök': 'cok', '!kalk': 'kalk',
}


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
        self.seen: OrderedDict[str, None] = OrderedDict()
        self.revision = 0

    def move_vote_target(self):
        return max(1, min(8, (len(self.players) + 6) // 7))

    def snapshot(self):
        move_counts = Counter(self.move_voters.values())
        return {'revision': self.revision, 'players': list(self.players.values()),
                'waiting': len(self.waiting), 'capacity': self.capacity,
                'move': dict(self.move),
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
        if event.type == 'comment' and text == '!cik':
            self.players.pop(uid, None)
            self.waiting.pop(uid, None)
            self.move_voters.pop(uid, None)
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
        elif event.type == 'gift' or text == '!katil':
            player = self.players.get(uid) or self.waiting.get(uid)
            if player is None:
                player = {'id': uid, 'nickname': event.nickname, 'score': 0}
                target = self.players if len(self.players) < self.capacity else self.waiting
                target[uid] = player
            player['nickname'] = event.nickname
            if event.type == 'gift':
                previous = self.supporters.get(uid, {}).get('score', 0)
                player['score'] = previous + event.count * event.diamonds
                self.supporters[uid] = dict(player)
        else:
            return False
        self.revision += 1
        return True
