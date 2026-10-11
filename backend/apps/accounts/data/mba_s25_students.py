from apps.accounts.data.student_rolls import records_from_rows

STUDENTS = [
    ("Mohammad Usama Bin Ijaz", "001"),
    ("Laraib Yaqoob", "005"),
    ("Azhar Iqbal", "006"),
    ("Fatima Naeem", "007"),
    ("Faiza Asghar", "008"),
    ("Shahzad Nadeem", "009"),
    ("Muhammad Zafar", "010"),
    ("Nisar Ahmad", "011"),
    ("Aqsa Latif", "012"),
]

ROLL_PREFIX = "SU92-MBATW-S25"


def student_records():
    return records_from_rows(STUDENTS, ROLL_PREFIX)
