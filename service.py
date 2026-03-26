from auth import login

def authenticate():
    return login("admin", "1234")

def get_all_users(users):
    result = []
    for user in users:
        data = db.get_data(user.id)
        result.append(data)
    return result
