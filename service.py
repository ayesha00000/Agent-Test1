from auth import login

def authenticate():
    return login("admin", "1234")

def get_user(user_input):
    query = "SELECT * FROM users WHERE id = " + user_input
    return db.execute(query)
