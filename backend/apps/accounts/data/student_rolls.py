EMAIL_DOMAIN = "superior.edu.com"
DEFAULT_PASSWORD = "12345678"


def split_name(full_name):
    parts = " ".join(full_name.split()).split(" ")
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def pad_roll(prefix, number):
    return f"{prefix}-{int(str(number).strip()):03d}"


def records_from_rows(students, roll_prefix):
    records = []
    for full_name, number in students:
        roll = pad_roll(roll_prefix, number)
        first_name, last_name = split_name(full_name)
        records.append(
            {
                "name": " ".join(full_name.split()),
                "first_name": first_name,
                "last_name": last_name,
                "roll_no": roll,
                "username": roll,
                "email": f"{roll}@{EMAIL_DOMAIN}",
                "password": DEFAULT_PASSWORD,
            }
        )
    return records
