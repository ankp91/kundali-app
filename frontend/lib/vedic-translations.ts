export const VEDIC_HI: Record<string, string> = {
  // Paksha
  'Shukla': 'शुक्ल', 'Krishna': 'कृष्ण',

  // Tithi names
  'Pratipada': 'प्रतिपदा', 'Dwitiya': 'द्वितीया', 'Tritiya': 'तृतीया',
  'Chaturthi': 'चतुर्थी', 'Panchami': 'पंचमी', 'Shashthi': 'षष्ठी',
  'Saptami': 'सप्तमी', 'Ashtami': 'अष्टमी', 'Navami': 'नवमी',
  'Dashami': 'दशमी', 'Ekadashi': 'एकादशी', 'Dwadashi': 'द्वादशी',
  'Trayodashi': 'त्रयोदशी', 'Chaturdashi': 'चतुर्दशी',
  'Purnima': 'पूर्णिमा', 'Amavasya': 'अमावस्या',

  // Yoga names (27)
  'Vishkambha': 'विष्कम्भ', 'Priti': 'प्रीति', 'Ayushman': 'आयुष्मान',
  'Saubhagya': 'सौभाग्य', 'Shobhana': 'शोभन', 'Atiganda': 'अतिगण्ड',
  'Sukarma': 'सुकर्मा', 'Dhriti': 'धृति', 'Shoola': 'शूल',
  'Ganda': 'गण्ड', 'Vriddhi': 'वृद्धि', 'Dhruva': 'ध्रुव',
  'Vyaghata': 'व्याघात', 'Harshana': 'हर्षण', 'Vajra': 'वज्र',
  'Siddhi': 'सिद्धि', 'Vyatipata': 'व्यतीपात', 'Variyana': 'वरीयान',
  'Parigha': 'परिघ', 'Shiva': 'शिव', 'Siddha': 'सिद्ध',
  'Sadhya': 'साध्य', 'Shubha': 'शुभ', 'Brahma': 'ब्रह्म',
  'Indra': 'ऐन्द्र', 'Vaidhriti': 'वैधृति',

  // Karana names (11)
  'Bava': 'बव', 'Balava': 'बालव', 'Kaulava': 'कौलव',
  'Taitila': 'तैतिल', 'Garaja': 'गरज', 'Vanija': 'वणिज',
  'Vishti': 'विष्टि', 'Bhadra': 'भद्रा', 'Shakuni': 'शकुनि',
  'Chatushpada': 'चतुष्पद', 'Nagava': 'नाग', 'Kimstughna': 'किंस्तुघ्न',

  // Masa names
  'Chaitra': 'चैत्र', 'Vaishakha': 'वैशाख', 'Jyeshtha': 'ज्येष्ठ',
  'Ashadha': 'आषाढ़', 'Shravana': 'श्रावण', 'Bhadrapada': 'भाद्रपद',
  'Ashwin': 'आश्विन', 'Kartik': 'कार्तिक', 'Margashirsha': 'मार्गशीर्ष',
  'Pausha': 'पौष', 'Magha': 'माघ', 'Phalguna': 'फाल्गुन',

  // Ritu (6 seasons)
  'Vasanta': 'वसन्त', 'Grishma': 'ग्रीष्म', 'Varsha': 'वर्षा',
  'Sharad': 'शरद', 'Hemanta': 'हेमंत', 'Shishira': 'शिशिर',

  // Ayana
  'Uttarayana': 'उत्तरायण', 'Dakshinayana': 'दक्षिणायन',

  // Planet names
  'Sun': 'सूर्य', 'Moon': 'चंद्र', 'Mars': 'मंगल',
  'Mercury': 'बुध', 'Jupiter': 'गुरु', 'Venus': 'शुक्र',
  'Saturn': 'शनि', 'Rahu': 'राहु', 'Ketu': 'केतु',

  // Choghadiya slot names
  'Amrit': 'अमृत', 'Kaal': 'काल', 'Laabh': 'लाभ',
  'Shubh': 'शुभ', 'Rog': 'रोग', 'Udveg': 'उद्वेग', 'Char': 'चर',

  // Weekday names
  'Sunday': 'रविवार', 'Monday': 'सोमवार', 'Tuesday': 'मंगलवार',
  'Wednesday': 'बुधवार', 'Thursday': 'गुरुवार', 'Friday': 'शुक्रवार',
  'Saturday': 'शनिवार',
}

export function tv(value: string, lang: string): string {
  if (lang !== 'hi' || !value) return value
  if (value.startsWith('Adhika ')) {
    const base = value.slice(7)
    return 'अधिक ' + (VEDIC_HI[base] ?? base)
  }
  return VEDIC_HI[value] ?? value
}
