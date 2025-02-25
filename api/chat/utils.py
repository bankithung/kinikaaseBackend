import requests

def send_fcm_notification(fcm_token, title, body):
    url = 'https://fcm.googleapis.com/fcm/send'
    headers = {
        'Authorization': 'key=YOUR_FCM_SERVER_KEY',  # Replace with your FCM server key
        'Content-Type': 'application/json',
    }
    data = {
        'to': fcm_token,
        'notification': {
            'title': title,
            'body': body,
        },
    }
    response = requests.post(url, headers=headers, json=data)
    return response.json()