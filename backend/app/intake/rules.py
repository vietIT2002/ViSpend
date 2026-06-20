import re
import unicodedata

# Default-category key -> trigger keywords (already diacritic-free, lowercase).
_RULES: dict[str, tuple[str, ...]] = {
    "food_drink": ("highlands", "starbucks", "coffee", "ca phe", "tra sua", "grabfood",
                   "shopeefood", "baemin", "nha hang", "quan", "an uong", "lotteria", "kfc"),
    "transport": ("grab", "be", "gojek", "taxi", "xe", "xang", "petrolimex", "parking", "gui xe"),
    "bills": ("evn", "tien dien", "tien nuoc", "internet", "fpt", "viettel", "vnpt", "hoa don"),
    "shopping": ("shopee", "lazada", "tiki", "sendo", "dien may", "the gioi di dong",
                 "winmart", "vinmart", "co.opmart", "coopmart", "bach hoa xanh", "bhx",
                 "sieu thi", "lotte mart", "mega market"),
    "entertainment": ("cgv", "galaxy", "netflix", "spotify", "game", "rap phim"),
    "health": ("pharmacy", "nha thuoc", "benh vien", "phong kham", "long chau", "pharmacity"),
    "salary": ("tra luong", "luong", "salary"),
    "bonus": ("thuong", "bonus"),
}


def normalize(text: str) -> str:
    s = unicodedata.normalize("NFD", text.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")  # drop accents
    s = s.replace("đ", "d")
    s = re.sub(r"\b[\w]*\d[\w]*\b", " ", s)  # drop tokens containing digits (codes/amounts)
    s = re.sub(r"[^a-z\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def rule_category_key(note: str) -> str | None:
    n = normalize(note)
    for key, kws in _RULES.items():
        if any(kw in n for kw in kws):
            return key
    return None


# Known brand (normalized substring) -> display name for the note fallback.
_MERCHANTS: tuple[tuple[str, str], ...] = (
    ("bebike", "beBike"),
    ("becar", "beCar"),
    ("grabfood", "GrabFood"),
    ("grab", "Grab"),
    ("gojek", "Gojek"),
    ("highlands", "Highlands Coffee"),
    ("starbucks", "Starbucks"),
    ("phuc long", "Phúc Long"),
    ("shopeefood", "ShopeeFood"),
    ("shopeepay", "ShopeePay"),
    ("shopee", "Shopee"),
    ("lazada", "Lazada"),
    ("tiki", "Tiki"),
    ("momo", "MoMo"),
    ("zalopay", "ZaloPay"),
    ("winmart", "WinMart"),
    ("vinmart", "WinMart"),
    ("co.opmart", "Co.opmart"),
    ("coopmart", "Co.opmart"),
    ("bach hoa xanh", "Bách Hóa Xanh"),
    ("lotteria", "Lotteria"),
    ("kfc", "KFC"),
    ("evn", "EVN"),
)


def merchant_label(note: str) -> str | None:
    n = normalize(note)
    for key, label in _MERCHANTS:
        if key in n:
            return label
    return None
