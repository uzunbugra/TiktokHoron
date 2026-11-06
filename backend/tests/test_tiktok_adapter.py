from types import SimpleNamespace

from game import Event, Game
from tiktok_adapter import normalize_comment, normalize_gift


def obj(**values):
    return SimpleNamespace(**values)


def user():
    return obj(id=12345, unique_id="horoncu", nickname="Karadenizli")


def test_only_game_commands_are_normalized():
    common = obj(msg_id=700)
    join = normalize_comment(obj(user=user(), common=common, comment="  !KATIL "))
    assert join == {
        "event_id": "tiktok:comment:700",
        "type": "comment",
        "user_id": "12345",
        "nickname": "Karadenizli",
        "text": "!KATIL",
    }
    assert normalize_comment(obj(user=user(), common=common, comment="selam")) is None
    move = normalize_comment(obj(user=user(), common=obj(msg_id=701), comment="!sağ"))
    assert move is not None
    assert move["text"] == "!sağ"
    regional = normalize_comment(obj(user=user(), common=obj(msg_id=702), comment="!katil trabzon"))
    assert regional is not None
    assert regional["text"] == "!katil trabzon"
    raid = normalize_comment(obj(user=user(), common=obj(msg_id=703), comment="!baskin Rize Ekibi"))
    assert raid is not None
    assert raid["text"] == "!baskin Rize Ekibi"


def test_intermediate_gift_streak_is_ignored_and_final_total_is_used():
    gift = obj(id=5655, diamond_count=1)
    intermediate = obj(user=user(), common=obj(msg_id=800), gift=gift,
                       gift_id=5655, repeat_count=3, streaking=True)
    final = obj(user=user(), common=obj(msg_id=801), gift=gift,
                gift_id=5655, repeat_count=4, streaking=False)

    assert normalize_gift(intermediate) is None
    normalized = normalize_gift(final)
    assert normalized == {
        "event_id": "tiktok:gift:801",
        "type": "gift",
        "user_id": "12345",
        "nickname": "Karadenizli",
        "gift_id": "5655",
        "count": 4,
        "diamonds": 1,
    }

    game = Game()
    assert game.apply(Event(**normalized))
    assert not game.apply(Event(**normalized))
    assert game.snapshot()["leaderboard"][0]["score"] == 4


def test_non_streak_gift_is_emitted_immediately():
    normalized = normalize_gift(obj(
        user=user(), common=obj(msg_id=900), gift=obj(id=999, diamond_count=10),
        gift_id=999, repeat_count=1, streaking=False,
    ))
    assert normalized is not None
    assert normalized["count"] == 1
    assert normalized["diamonds"] == 10


def test_unidentified_events_are_rejected():
    assert normalize_comment(obj(user=None, common=obj(msg_id=1), comment="!katil")) is None
    assert normalize_gift(obj(user=user(), common=None, gift=obj(id=1, diamond_count=1),
                              repeat_count=1, streaking=False)) is None
