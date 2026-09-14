from astro import calculate_kundali, NAKSHATRAS, SIGNS

# ── Lookup tables ──────────────────────────────────────────────────────────

GANA = {
    "Ashwini":"Deva","Bharani":"Manushya","Krittika":"Rakshasa",
    "Rohini":"Manushya","Mrigashira":"Deva","Ardra":"Manushya",
    "Punarvasu":"Deva","Pushya":"Deva","Ashlesha":"Rakshasa",
    "Magha":"Rakshasa","Purva Phalguni":"Manushya","Uttara Phalguni":"Manushya",
    "Hasta":"Deva","Chitra":"Rakshasa","Swati":"Deva",
    "Vishakha":"Rakshasa","Anuradha":"Deva","Jyeshtha":"Rakshasa",
    "Mula":"Rakshasa","Purva Ashadha":"Manushya","Uttara Ashadha":"Manushya",
    "Shravana":"Deva","Dhanishta":"Rakshasa","Shatabhisha":"Rakshasa",
    "Purva Bhadrapada":"Manushya","Uttara Bhadrapada":"Manushya","Revati":"Deva"
}

NADI = {
    "Ashwini":"Aadi","Bharani":"Madhya","Krittika":"Antya",
    "Rohini":"Antya","Mrigashira":"Madhya","Ardra":"Aadi",
    "Punarvasu":"Aadi","Pushya":"Madhya","Ashlesha":"Antya",
    "Magha":"Antya","Purva Phalguni":"Madhya","Uttara Phalguni":"Aadi",
    "Hasta":"Aadi","Chitra":"Madhya","Swati":"Antya",
    "Vishakha":"Antya","Anuradha":"Madhya","Jyeshtha":"Aadi",
    "Mula":"Aadi","Purva Ashadha":"Madhya","Uttara Ashadha":"Antya",
    "Shravana":"Antya","Dhanishta":"Madhya","Shatabhisha":"Aadi",
    "Purva Bhadrapada":"Aadi","Uttara Bhadrapada":"Madhya","Revati":"Antya"
}

YONI = {
    "Ashwini":"Horse","Bharani":"Elephant","Krittika":"Goat",
    "Rohini":"Serpent","Mrigashira":"Serpent","Ardra":"Dog",
    "Punarvasu":"Cat","Pushya":"Goat","Ashlesha":"Cat",
    "Magha":"Rat","Purva Phalguni":"Rat","Uttara Phalguni":"Cow",
    "Hasta":"Buffalo","Chitra":"Tiger","Swati":"Buffalo",
    "Vishakha":"Tiger","Anuradha":"Hare","Jyeshtha":"Hare",
    "Mula":"Dog","Purva Ashadha":"Monkey","Uttara Ashadha":"Mongoose",
    "Shravana":"Monkey","Dhanishta":"Lion","Shatabhisha":"Horse",
    "Purva Bhadrapada":"Lion","Uttara Bhadrapada":"Cow","Revati":"Elephant"
}

YONI_HOSTILE = [
    ("Horse","Buffalo"),("Elephant","Lion"),("Goat","Monkey"),
    ("Serpent","Mongoose"),("Dog","Hare"),("Cat","Rat"),("Tiger","Cow")
]

SIGN_LORDS = ["Mars","Venus","Mercury","Moon","Sun","Mercury",
              "Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"]

VARNA_MAP = {0:"Kshatriya",1:"Vaishya",2:"Shudra",3:"Brahmin",
             4:"Kshatriya",5:"Vaishya",6:"Shudra",7:"Brahmin",
             8:"Kshatriya",9:"Vaishya",10:"Shudra",11:"Brahmin"}
VARNA_RANK = {"Brahmin":4,"Kshatriya":3,"Vaishya":2,"Shudra":1}

VASYA_MAP = {0:"Chatushpada",1:"Chatushpada",2:"Manava",3:"Jalchar",
             4:"Vanchar",5:"Manava",6:"Manava",7:"Keeta",
             8:"Chatushpada",9:"Chatushpada",10:"Manava",11:"Jalchar"}

PLANET_FRIENDS = {
    "Sun":["Moon","Mars","Jupiter"],
    "Moon":["Sun","Mercury"],
    "Mercury":["Sun","Venus"],
    "Venus":["Saturn","Mercury"],
    "Mars":["Sun","Moon","Jupiter"],
    "Jupiter":["Sun","Moon","Mars"],
    "Saturn":["Mercury","Venus"],
}
PLANET_ENEMIES = {
    "Sun":["Venus","Saturn"],
    "Moon":[],
    "Mercury":["Moon"],
    "Venus":["Sun","Moon"],
    "Mars":["Mercury"],
    "Jupiter":["Mercury","Venus"],
    "Saturn":["Sun","Moon","Mars"],
}

AUSPICIOUS_TARA = {2,4,6,8,9}


# ── Individual koot calculations ───────────────────────────────────────────

def calc_varna(sign1_num: int, sign2_num: int) -> dict:
    v1 = VARNA_MAP[sign1_num]
    v2 = VARNA_MAP[sign2_num]
    score = 1 if VARNA_RANK[v1] >= VARNA_RANK[v2] else 0
    return {"name":"Varna","max":1,"score":score,"p1":v1,"p2":v2,
            "meaning":"Spiritual/social compatibility"}

def calc_vasya(sign1_num: int, sign2_num: int) -> dict:
    v1 = VASYA_MAP[sign1_num]
    v2 = VASYA_MAP[sign2_num]
    if v1 == v2:
        score = 2
    elif {v1,v2} in [{"Manava","Vanchar"},{"Jalchar","Vanchar"},{"Keeta","Manava"}]:
        score = 1
    else:
        score = 0.5
    return {"name":"Vasya","max":2,"score":score,"p1":v1,"p2":v2,
            "meaning":"Dominance and mutual control"}

def calc_tara(nak1_idx: int, nak2_idx: int) -> dict:
    count_1to2 = ((nak2_idx - nak1_idx) % 27) + 1
    count_2to1 = ((nak1_idx - nak2_idx) % 27) + 1
    tara_1 = (count_1to2 % 9) or 9
    tara_2 = (count_2to1 % 9) or 9
    aus1 = tara_1 in AUSPICIOUS_TARA
    aus2 = tara_2 in AUSPICIOUS_TARA
    if aus1 and aus2:
        score = 3
    elif aus1 or aus2:
        score = 1.5
    else:
        score = 0
    return {"name":"Tara","max":3,"score":score,
            "p1_tara":tara_1,"p2_tara":tara_2,
            "meaning":"Birth star compatibility and destiny alignment"}

def calc_yoni(nak1: str, nak2: str) -> dict:
    y1 = YONI.get(nak1,"Unknown")
    y2 = YONI.get(nak2,"Unknown")
    if y1 == y2:
        score = 4
    elif (y1,y2) in YONI_HOSTILE or (y2,y1) in YONI_HOSTILE:
        score = 0
    else:
        score = 2
    return {"name":"Yoni","max":4,"score":score,"p1":y1,"p2":y2,
            "meaning":"Biological and intimate compatibility"}

def calc_graha_maitri(sign1_num: int, sign2_num: int) -> dict:
    lord1 = SIGN_LORDS[sign1_num]
    lord2 = SIGN_LORDS[sign2_num]
    if lord1 == lord2:
        score = 5
    else:
        l1_to_l2 = "friend" if lord2 in PLANET_FRIENDS.get(lord1,[]) else \
                   "enemy" if lord2 in PLANET_ENEMIES.get(lord1,[]) else "neutral"
        l2_to_l1 = "friend" if lord1 in PLANET_FRIENDS.get(lord2,[]) else \
                   "enemy" if lord1 in PLANET_ENEMIES.get(lord2,[]) else "neutral"
        combo = {l1_to_l2, l2_to_l1}
        if combo == {"friend"}:
            score = 5
        elif combo == {"friend","neutral"}:
            score = 4
        elif combo == {"neutral"}:
            score = 3
        elif combo == {"friend","enemy"}:
            score = 2
        elif combo == {"neutral","enemy"}:
            score = 1
        else:
            score = 0
    return {"name":"Graha Maitri","max":5,"score":score,
            "p1_lord":lord1,"p2_lord":lord2,
            "meaning":"Mental and intellectual compatibility"}

def calc_gana(nak1: str, nak2: str) -> dict:
    g1 = GANA.get(nak1,"Manushya")
    g2 = GANA.get(nak2,"Manushya")
    if g1 == g2:
        score = 6
    elif {g1,g2} == {"Deva","Manushya"}:
        score = 5
    elif {g1,g2} == {"Deva","Rakshasa"}:
        score = 1
    else:
        score = 0
    return {"name":"Gana","max":6,"score":score,"p1":g1,"p2":g2,
            "meaning":"Nature and temperament compatibility"}

def calc_bhakut(sign1_num: int, sign2_num: int) -> dict:
    pos_1to2 = ((sign2_num - sign1_num) % 12) + 1
    pos_2to1 = ((sign1_num - sign2_num) % 12) + 1
    bad = {(2,12),(12,2),(5,9),(9,5),(6,8),(8,6)}
    if (pos_1to2, pos_2to1) in bad:
        score = 0
    else:
        score = 7
    return {"name":"Bhakut","max":7,"score":score,
            "p1_pos":pos_1to2,"p2_pos":pos_2to1,
            "meaning":"Love, prosperity and family well-being"}

def calc_nadi(nak1: str, nak2: str) -> dict:
    n1 = NADI.get(nak1,"Aadi")
    n2 = NADI.get(nak2,"Aadi")
    score = 0 if n1 == n2 else 8
    return {"name":"Nadi","max":8,"score":score,"p1":n1,"p2":n2,
            "meaning":"Health, genetics and progeny compatibility"}


# ── Mangal Dosha ───────────────────────────────────────────────────────────

def check_mangal_dosha(chart: dict) -> dict:
    mars = chart.get("planets",{}).get("Mars",{})
    mars_house = mars.get("house", 0)
    dosha_houses = {1,2,4,7,8,12}
    has_dosha = mars_house in dosha_houses
    return {
        "has_dosha": has_dosha,
        "mars_house": mars_house,
        "description": f"Mars in house {mars_house} {'creates Mangal Dosha' if has_dosha else 'does not create Mangal Dosha'}"
    }


# ── Main matching function ─────────────────────────────────────────────────

def calculate_match(
    date1: str, time1: str, place1: str, name1: str,
    date2: str, time2: str, place2: str, name2: str
) -> dict:
    chart1 = calculate_kundali(date1, time1, place1)
    chart2 = calculate_kundali(date2, time2, place2)

    moon1 = chart1["planets"]["Moon"]
    moon2 = chart2["planets"]["Moon"]

    sign1_num = moon1["sign_num"]
    sign2_num = moon2["sign_num"]
    nak1 = moon1["nakshatra"]
    nak2 = moon2["nakshatra"]
    nak1_idx = NAKSHATRAS.index(nak1)
    nak2_idx = NAKSHATRAS.index(nak2)

    koots = [
        calc_varna(sign1_num, sign2_num),
        calc_vasya(sign1_num, sign2_num),
        calc_tara(nak1_idx, nak2_idx),
        calc_yoni(nak1, nak2),
        calc_graha_maitri(sign1_num, sign2_num),
        calc_gana(nak1, nak2),
        calc_bhakut(sign1_num, sign2_num),
        calc_nadi(nak1, nak2),
    ]

    total = sum(k["score"] for k in koots)
    max_total = 36

    mangal1 = check_mangal_dosha(chart1)
    mangal2 = check_mangal_dosha(chart2)
    mangal_cancelled = mangal1["has_dosha"] and mangal2["has_dosha"]

    if total >= 31:
        verdict = "Excellent"
        verdict_color = "green"
    elif total >= 24:
        verdict = "Good"
        verdict_color = "yellow"
    elif total >= 18:
        verdict = "Average"
        verdict_color = "orange"
    else:
        verdict = "Needs Remedies"
        verdict_color = "red"

    return {
        "person1": {"name": name1, "moon_sign": moon1["sign"], "nakshatra": nak1, "chart": chart1},
        "person2": {"name": name2, "moon_sign": moon2["sign"], "nakshatra": nak2, "chart": chart2},
        "koots": koots,
        "total_score": round(total, 1),
        "max_score": max_total,
        "percentage": round((total / max_total) * 100, 1),
        "verdict": verdict,
        "verdict_color": verdict_color,
        "mangal": {
            "person1": mangal1,
            "person2": mangal2,
            "cancelled": mangal_cancelled,
            "note": "Both have Mangal Dosha — it cancels out" if mangal_cancelled else
                    f"{'Person 1' if mangal1['has_dosha'] else 'Person 2'} has Mangal Dosha" if (mangal1["has_dosha"] or mangal2["has_dosha"]) else
                    "Neither has Mangal Dosha"
        }
    }
