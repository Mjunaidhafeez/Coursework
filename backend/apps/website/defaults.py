PAGE_CATALOG = [
    {"key": "home", "label": "Home", "path": "/"},
    {"key": "about", "label": "About", "path": "/about"},
    {"key": "vc", "label": "VC Message", "path": "/vc"},
    {"key": "programs", "label": "Programs", "path": "/programs"},
    {"key": "admissions", "label": "Admissions", "path": "/admissions"},
    {"key": "teachers", "label": "Faculty", "path": "/teachers"},
    {"key": "alumni", "label": "Alumni", "path": "/alumni"},
    {"key": "results", "label": "Results", "path": "/results"},
    {"key": "students", "label": "Students", "path": "/students"},
    {"key": "activities", "label": "Activities", "path": "/activities"},
    {"key": "campus", "label": "Campus Life", "path": "/campus"},
    {"key": "scholarships", "label": "Scholarships", "path": "/scholarships"},
    {"key": "why", "label": "Why Choose Us", "path": "/why"},
    {"key": "announcements", "label": "Announcements", "path": "/announcements"},
    {"key": "gallery", "label": "Gallery", "path": "/gallery"},
    {"key": "downloads", "label": "Downloads", "path": "/downloads"},
    {"key": "contact", "label": "Contact", "path": "/contact"},
]


def default_page_flags():
    return {item["key"]: True for item in PAGE_CATALOG}


DEFAULT_PAGES = {
    "home": {
        "nav_label": "Home",
        "background_url": "",
        "hero_title": "Shape your future at a university built for professionals",
        "hero_subtitle": "Industry-led programs, distinguished faculty, and a campus culture of excellence.",
        "highlights": [
            {"title": "Career-ready degrees", "text": "Programs designed with employers and professional bodies."},
            {"title": "Experienced faculty", "text": "Teachers who bring classroom rigor and industry insight."},
            {"title": "Student support", "text": "Mentoring, a modern portal, and a clear path from admission to graduation."},
        ],
    },
    "about": {
        "nav_label": "About",
        "background_url": "",
        "title": "About the university",
        "mission": "To develop ethical, capable graduates who lead in business and society.",
        "history": "The university has grown as a centre for professional education, combining academic standards with practical learning.",
        "stats": [
            {"label": "Programmes", "value": "25+"},
            {"label": "Students", "value": "8,000+"},
            {"label": "Faculty", "value": "300+"},
        ],
    },
    "vc": {
        "nav_label": "VC Message",
        "background_url": "",
        "title": "Message from the Vice Chancellor",
        "name": "Vice Chancellor",
        "role": "Vice Chancellor",
        "photo_url": "",
        "body": "Welcome to our university. We are committed to academic excellence, character, and the success of every student who joins our community.",
    },
    "programs": {
        "nav_label": "Programs",
        "background_url": "",
        "title": "Academic programmes",
        "intro": "Choose a pathway that matches your ambition. Each programme blends theory, cases, and applied work.",
        "items": [
            {"name": "MBA", "summary": "A professional masters for managers and emerging leaders."},
            {"name": "BBA", "summary": "A foundation in business, analytics, and communication."},
            {"name": "MS Management", "summary": "Research-informed study for specialists and academics."},
        ],
    },
    "admissions": {
        "nav_label": "Admissions",
        "background_url": "",
        "title": "Admissions",
        "intro": "Join a community that takes your career seriously. Applications are reviewed on merit and readiness.",
        "steps": [
            {"title": "Apply online", "text": "Submit the admission form and required documents."},
            {"title": "Interview / test", "text": "Attend the scheduled assessment where required."},
            {"title": "Offer & enrollment", "text": "Accept your offer and complete fee and registration steps."},
        ],
        "requirements": "Undergraduate degree or equivalent as published for the chosen programme.",
    },
    "teachers": {
        "nav_label": "Faculty",
        "background_url": "",
        "title": "Our faculty",
        "intro": "Meet the teachers who bring academic depth and professional practice into every classroom.",
    },
    "alumni": {
        "nav_label": "Alumni",
        "background_url": "",
        "title": "Alumni network",
        "intro": "Graduates who lead in industry, public service, and entrepreneurship.",
    },
    "results": {
        "nav_label": "Results",
        "background_url": "",
        "title": "Student results",
        "intro": "Recognising academic achievement, with the faculty who guided each student.",
    },
    "campus": {
        "nav_label": "Campus Life",
        "background_url": "",
        "title": "Life on campus",
        "intro": "A professional campus with spaces for study, sport, and student societies.",
        "items": [
            {"title": "Learning spaces", "text": "Lecture theatres, seminar rooms, and quiet study corners."},
            {"title": "Student societies", "text": "Leadership, debate, sports, and community service."},
            {"title": "Support services", "text": "Counselling, career guidance, and academic advising."},
        ],
    },
    "scholarships": {
        "nav_label": "Scholarships",
        "background_url": "",
        "title": "Scholarships & aid",
        "intro": "Merit and need-based support so capable students can complete their degree.",
        "items": [
            {"title": "Merit awards", "text": "For outstanding academic performance at admission and each year."},
            {"title": "Need-based aid", "text": "Confidential support assessed on documented need."},
            {"title": "How to apply", "text": "Submit the scholarship form with your admission application."},
        ],
    },
    "why": {
        "nav_label": "Why Choose Us",
        "background_url": "",
        "title": "Why students choose us",
        "intro": "A focused professional university with teaching that is personal, current, and ambitious.",
        "items": [
            {"title": "Industry-linked teaching", "text": "Cases, projects, and faculty with real-world practice."},
            {"title": "Clear student pathway", "text": "From admission to coursework, results, and graduation."},
            {"title": "A trusted campus", "text": "Values, discipline, and a community that looks after its students."},
        ],
    },
    "students": {
        "nav_label": "Students",
        "background_url": "",
        "title": "Our students",
        "intro": "Browse the student body by semester and class. Only profiles published by the university office appear here.",
    },
    "activities": {
        "nav_label": "Activities",
        "background_url": "",
        "title": "Student activities",
        "intro": "Daily posts from campus — societies, visits, sports, and classroom moments.",
    },
    "announcements": {"nav_label": "Announcements", "background_url": "", "title": "Announcements", "intro": ""},
    "gallery": {"nav_label": "Gallery", "background_url": "", "title": "Gallery", "intro": "Moments from campus, convocations, and student life."},
    "downloads": {"nav_label": "Downloads", "background_url": "", "title": "Downloads", "intro": "Prospectuses, forms, and handbooks."},
    "contact": {
        "nav_label": "Contact",
        "background_url": "",
        "title": "Contact us",
        "intro": "Send an enquiry. The university office will reply by email.",
    },
}
