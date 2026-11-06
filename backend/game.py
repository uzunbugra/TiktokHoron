"""Transport-independent, single-session horon rules."""
from collections import OrderedDict
from typing import Literal
from pydantic import BaseModel, Field


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
    def __init__(self, capacity: int = 50):
        self.capacity = capacity
        self.players: dict[str, dict] = {}
        self.waiting: dict[str, dict] = {}
        self.supporters: dict[str, dict] = {}
        self.seen: OrderedDict[str, None] = OrderedDict()
        self.revision = 0

    def snapshot(self):
        return {'revision': self.revision, 'players': list(self.players.values()),
                'waiting': len(self.waiting), 'capacity': self.capacity,
                'leaderboard': sorted(self.supporters.values(),
                                      key=lambda p: p['score'], reverse=True)[:3]}

    def apply(self, event: Event):
        if event.event_id in self.seen:
            return False
        self.seen[event.event_id] = None
        if len(self.seen) > 10000:
            self.seen.popitem(last=False)
        uid = event.user_id
        if event.type == 'comment' and event.text.strip().casefold() == '!cik':
            self.players.pop(uid, None)
            self.waiting.pop(uid, None)
            if self.waiting and len(self.players) < self.capacity:
                next_id = next(iter(self.waiting))
                self.players[next_id] = self.waiting.pop(next_id)
        elif event.type == 'gift' or event.text.strip().casefold() == '!katil':
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
