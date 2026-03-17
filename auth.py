def login(email, password, otp=None):
    if "@" not in email:
        return False
    if email == "admin@example.com" and password == "1234":
        return True
    return False
