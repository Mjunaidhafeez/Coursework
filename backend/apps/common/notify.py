from apps.accounts.models import User
from apps.common.models import Notification
from apps.common.whatsapp import notify_event


def push_notifications(users, title, body=""):
    people = []
    for item in users or []:
        if item is None:
            continue
        if hasattr(item, "pk"):
            people.append(item)
        else:
            person = User.objects.filter(pk=item).first()
            if person:
                people.append(person)
    unique = []
    seen = set()
    for person in people:
        if person.id in seen:
            continue
        seen.add(person.id)
        unique.append(person)
    if not unique:
        return
    title = str(title or "Portal update")[:200]
    body = str(body or "")
    Notification.objects.bulk_create(
        [Notification(user=person, title=title, body=body) for person in unique]
    )
    notify_event(unique, f"{title}\n{body}".strip())
