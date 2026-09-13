STUDENTS = [
    ("Fasi Saad", "02"),
    ("Muhammad Haseeb Jawad", "03"),
    ("Mohammad Suleman Nawaz", "04"),
    ("Yasir Mazhar", "05"),
    ("Muhammad Asad Qayyum", "06"),
    ("Muawiz Bashir", "07"),
    ("Muhammad Toseef Alam", "08"),
    ("Hafiz Adil", "09"),
    ("Aman Batool", "10"),
    ("Haris Zia Bajwa", "11"),
    ("Adnan Shehzad", "12"),
    ("Umm-ul-Baneen", "13"),
    ("Laiba", "14"),
    ("Naveed Ali", "16"),
    ("Rana Sami Ullah", "17"),
    ("Ijaz Ahmed", "18"),
    ("Ayesha Waris", "19"),
    ("Muhammad Talha Butt", "20"),
    ("Muhammad Saad Abdullah", "22"),
    ("Hurmet Ejaz", "24"),
    ("Sania Komal", "25"),
    ("Maham Seemab", "26"),
    ("Fahila Saleem", "27"),
    ("Alvina Khalid Butt", "28"),
    ("Ahmad Tariq", "30"),
    ("Iman Shahzad", "31"),
    ("Muhammad Mustafa Kazmi", "32"),
    ("Hassan Muhi Ud Din", "34"),
    ("Noor Ashraf", "35"),
    ("Farhan Shakeel", "36"),
    ("Arsa Ghazal", "37"),
    ("Momina Nawal", "38"),
    ("Iram Batool", "39"),
    ("Shoaib Watto", "40"),
    ("Jasim Iqbal", "41"),
    ("Manahil Ijaz", "42"),
    ("Imran Ali", "43"),
    ("Waqas Ali", "44"),
    ("Muhammad Shahzad", "45"),
    ("Sharoz Patras", "46"),
    ("Sheeraz Ahmed", "47"),
    ("Usama Tahir", "48"),
    ("Waqed Ali", "49"),
    ("Narmeen", "50"),
    ("Asif Hussain", "51"),
    ("Junaid Hafeez", "52"),
    ("Ali zaidi", "53"),
    ("Fakiha Bashir", "54"),
]

ROLL_PREFIX = "SU92-MBATW-F25"
EMAIL_DOMAIN = "superior.edu.com"
DEFAULT_PASSWORD = "12345678"


def pad_roll(number):
    return f"{ROLL_PREFIX}-{int(str(number).strip()):03d}"


def split_name(full_name):
    parts = " ".join(full_name.split()).split(" ")
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def student_records():
    records = []
    for full_name, number in STUDENTS:
        roll = pad_roll(number)
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
