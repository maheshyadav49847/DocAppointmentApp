# WhatsApp Bot Flow — Patient Interface

> [!IMPORTANT]
> This flow is **Dynamic**. The list of doctors and their session timings are fetched in real-time from the database. If an admin adds/removes a doctor or changes a timing in the dashboard, the bot will automatically update the options shown to the patient.

This document describes the step-by-step interaction:

## 1. Flow for New Patients

1. **Patient**: "Hi" / "Hello"
2. **Bot**: "Namaste! Aapka Hospital Queue System mein swagat hai. Aapka naam kya hai?"
3. **Patient**: "Rajesh Kumar"
4. **Bot**: "Dhanyawad Rajesh! Aap kis doctor se milna chahte hain?
   1. Dr. Sharma (Pediatrician)
   2. Dr. Gupta (General Physician)"
5. **Patient**: "1"
6. **Bot**: "Dr. Sharma ke liye aap kaunse session mein token book karna chahte hain?
   1. Morning (10:00 AM - 12:30 PM)
   2. Evening (07:00 PM - 09:30 PM)"
7. **Patient**: "1"
8. **Bot**: "Aapka Dr. Sharma ke liye Morning token #15 book ho gaya hai. Abhi token #5 chal raha hai. Hum aapko alert karenge jab aapka number aane wala hoga."

## 2. Flow for Returning Patients (Phone recognized)

1. **Patient**: "Hi"
2. **Bot**: "Namaste Rajesh! Hospital Queue System mein aapka phir se swagat hai. Aap kis doctor se milna chahte hain?
   1. Dr. Sharma (Pediatrician)
   2. Dr. Gupta (General Physician)"
3. **Patient**: "2"
4. **Bot**: "Dr. Gupta ke liye session select karein: 1. Morning, 2. Evening"

## 3. Proactive Alerts (Triggered by System)

- **Doctor Arrived**: "Dr. Sharma hospital pahunch gaye hain aur unhone session shuru kar diya hai. Kripya apni position track karte rahein."
- **3 Tokens Away**: "Aapka number jaldi aane wala hai (#15). Kripya 10-15 minute mein hospital pahunch jayein."
- **Current Turn**: "Aapki baari aa gayi hai! Kripya reception counter pe sampark karein."
- **Missed Token**: "Aapka token #15 skip ho gaya hai kyunki aap counter pe nahi the. Kya aap wapas queue mein aana chahte hain? Reply 'HAAN'."

## 4. Post-Visit Feedback (Ratings)

1. **Bot (after visit marked complete)**: "Hi Rajesh! Ummeed hai aapka Dr. Sharma ke saath consultation accha raha. Aap apne experience ko 1 se 5 ke beech mein kya rating dena chahenge? (5 sabse accha)"
2. **Patient**: "5"
3. **Bot**: "Dhanyawad! Kya aap koi feedback likhna chahenge?"
4. **Patient**: "Very professional doctor."
5. **Bot**: "Aapka feedback record kar liya gaya hai. Thank you!"

## 5. On-Demand Status Check

1. **Patient**: "Status"
2. **Bot**: "Aapka token #15 hai. Abhi queue mein #10 chal raha hai. Aapka approx wait time 20 mins hai."
