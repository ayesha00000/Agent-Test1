from auth import login

def test_login_success():
    assert login("admin", "1234") is True
