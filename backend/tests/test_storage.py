from storage import ProfileStore, loyalty_for


def test_loyalty_thresholds():
    assert loyalty_for(1) == 'new'
    assert loyalty_for(2) == 'bronze'
    assert loyalty_for(5) == 'silver'
    assert loyalty_for(10) == 'gold'


def test_profiles_survive_reopen_and_same_session_can_skip_visit(tmp_path):
    path = tmp_path / 'profiles.db'
    store = ProfileStore(path)
    assert store.record('viewer', 'Horoncu', new_visit=True)['visits'] == 1
    assert store.record('viewer', 'Horoncu', new_visit=False)['visits'] == 1
    store.close()

    reopened = ProfileStore(path)
    profile = reopened.record('viewer', 'Horoncu Yeni', new_visit=True, activity=3)
    assert profile['visits'] == 2
    assert profile['activity'] == 5
    assert profile['nickname'] == 'Horoncu Yeni'
    assert profile['loyalty'] == 'bronze'
    reopened.close()
