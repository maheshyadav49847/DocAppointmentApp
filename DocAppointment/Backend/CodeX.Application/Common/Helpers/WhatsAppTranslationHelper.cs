using System.Collections.Generic;

namespace CodeX.Application.Common.Helpers
{
    public static class WhatsAppTranslationHelper
    {
        public static string Get(string lang, string key, params object[] args)
        {
            var code = string.IsNullOrWhiteSpace(lang) ? "1" : lang;
            if (!_translations.ContainsKey(code))
                code = "1"; // Default to Hindi

            var dict = _translations[code];
            if (!dict.TryGetValue(key, out var template))
            {
                // Fallback to English if missing in selected language
                template = _translations["3"].GetValueOrDefault(key, key);
            }

            try
            {
                return string.Format(template, args);
            }
            catch
            {
                return template;
            }
        }

        // 1 = Hindi, 2 = Marathi, 3 = English
        private static readonly Dictionary<string, Dictionary<string, string>> _translations = new()
        {
            { "1", new Dictionary<string, string> // HINDI
                {
                    { "WELCOME_LANGUAGE", "🙏 नमस्कार!\n\n🏥 {0} में आपका स्वागत है।\n\nबेहतर सेवा प्रदान करने के लिए कृपया अपनी पसंदीदा भाषा चुनें।\n\n1️⃣ हिन्दी\n2️⃣ मराठी\n3️⃣ English\n\n👉 कृपया केवल नंबर भेजें।" },
                    { "ASK_NAME", "😊 धन्यवाद।\n\nअपॉइंटमेंट बुक करने से पहले हमें आपका नाम चाहिए।\nकृपया अपना पूरा नाम लिखकर भेजें।\n\n✍️ उदाहरण:\nRahul Sharma" },
                    { "SELECT_DOCTOR", "🙏 धन्यवाद {0}।\n\nकृपया डॉक्टर का चयन करें।\n\n{1}\n👉 कृपया केवल नंबर भेजें।" },
                    { "SELECT_SESSION", "👨‍⚕️ आपने\n\nDr. {0}\n{1}\n\nका चयन किया है।\n\nकृपया उपलब्ध सत्र चुनें।\n\n{2}\n👉 कृपया केवल नंबर भेजें।" },
                    { "CONFIRM_DETAILS", "📋 कृपया अपना विवरण जांचें。\n\n👤 मरीज़\n{0}\n\n👨‍⚕️ डॉक्टर\nDr. {1}\n\n🩺 विशेषज्ञता\n{2}\n\n📅 सत्र\n{3}\n\n🕘 समय\n{4}\n\n1️⃣ अपॉइंटमेंट पक्की करने के लिए 1 भेजें\n2️⃣ वापस जाने के लिए 2 भेजें\n\n👉 कृपया सिर्फ 1 या 2 टाइप करके भेजें。" },
                    { "SUCCESS_BOOKING", "🎉 आपकी अपॉइंटमेंट सफलतापूर्वक बुक हो गई है।\n\n🎟️ टोकन नंबर\n#{0}\n\n👨‍⚕️ डॉक्टर\nDr. {1}\n\n📅 सत्र\n{2}\n\n🕘 समय\n{3}\n\n📍 कृपया अपनी बारी से 10 मिनट पहले क्लिनिक पहुंचें\n\n📊 कतार देखने के लिए:\nSTATUS\nटाइप करके भेजें।\n\n🙏 धन्यवाद।" },
                    { "ACTIVE_APPOINTMENT", "ℹ️ आपके नाम पर पहले से एक सक्रिय अपॉइंटमेंट मौजूद है।\n\n👨‍⚕️ डॉक्टर\nDr. {0}\n🎟️ टोकन\n#{1}\n📌 स्थिति\nप्रतीक्षारत\n\nकृपया विकल्प चुनें।\n\n1️⃣ कतार की स्थिति\n2️⃣ अपॉइंटमेंट विवरण\n3️⃣ अपॉइंटमेंट बदलें\n4️⃣ अपॉइंटमेंट रद्द करें\n\n👉 केवल नंबर भेजें।" },
                    { "APPOINTMENT_DETAILS", "📋 आपकी अपॉइंटमेंट जानकारी\n\n👤 मरीज\n{0}\n\n👨‍⚕️ डॉक्टर\nDr. {1}\n🎟️ टोकन\n#{2}\n📅 सत्र\n{3}\n📌 स्थिति\nप्रतीक्षारत" },
                    { "QUEUE_STATUS", "📊 आपकी वर्तमान कतार स्थिति\n\n👨‍⚕️ डॉक्टर\nDr. {0}\n🔢 वर्तमान टोकन\n#{1}\n🎟️ आपका टोकन\n#{2}\n👥 आपसे पहले\n{3} मरीज\n⏳ अनुमानित प्रतीक्षा\n{4} मिनट\n\n🙏 कृपया प्रतीक्षा करें।" },
                    { "CANCEL_PROMPT", "⚠️ क्या आप अपनी अपॉइंटमेंट रद्द करना चाहते हैं?\n\n1️⃣ हाँ\n2️⃣ नहीं\n\n👉 केवल नंबर भेजें।" },
                    { "CANCEL_SUCCESS", "✅ आपकी अपॉइंटमेंट सफलतापूर्वक रद्द कर दी गई है।\n\nधन्यवाद。" },
                    { "RESCHEDULE_PROMPT", "🔄 कृपया नया सत्र चुनें।\n\n{0}\n👉 केवल नंबर भेजें。" },
                    { "REJOIN_SUCCESS", "🔄 आपको पुनः कतार में जोड़ दिया गया है।\n\n🎟️ नया टोकन\n#{0}\n\n🙏 कृपया प्रतीक्षा करें。" },
                    { "SESSION_FULL", "⚠️ चयनित सत्र पूर्ण हो चुका है।\n\nकृपया कोई अन्य सत्र चुनें。" },
                    { "NO_SESSIONS", "😔 वर्तमान में कोई सक्रिय सत्र उपलब्ध नहीं है।\n\nकृपया बाद में पुनः प्रयास करें。" },
                    { "NO_DOCTORS", "😔 वर्तमान में कोई डॉक्टर उपलब्ध नहीं है।\n\nकृपया बाद में पुनः प्रयास करें。" },
                    { "INVALID_INPUT", "⚠️ कृपया सूची में दिए गए विकल्पों में से सही नंबर चुनें।\n\nउदाहरण:\n1\n2\n3" },
                    { "INVALID_INPUT_HELP", "🆘 सहायता के लिए:\nHELP\nटाइप करके भेजें。" },
                    { "RATING_PROMPT", "🌟 आपकी मुलाकात पूरी हो गई है।\n\nकृपया अपने अनुभव को 1 से 5 के बीच रेट करें।\n\n⭐ 1 = बहुत खराब\n⭐⭐ 2 = खराब\n⭐⭐⭐ 3 = ठीक\n⭐⭐⭐⭐ 4 = अच्छा\n⭐⭐⭐⭐⭐ 5 = उत्कृष्ट\n\n👉 केवल संख्या भेजें。" },
                    { "COMMENT_PROMPT", "🙏 धन्यवाद।\n\nयदि आप कोई सुझाव देना चाहते हैं तो कृपया लिखें।\nया\nSKIP\nटाइप करके भेजें。" },
                    { "FEEDBACK_SUCCESS", "❤️ आपके सुझाव के लिए धन्यवाद।\n\nआपकी प्रतिक्रिया हमारे लिए महत्वपूर्ण है।\nस्वस्थ रहें। 😊" },
                    { "BOOKING_CONFIRMED_ALERT", "🏥 *APPOINTMENT CONFIRMED* 🏥\n━━━━━━━━━━━━━━━━━━━━━\n\nHello *{0}* 🙏,\n\nAapka doctor appointment safaltapoorvak book ho gaya hai.\n\n🔢 *Aapka Token Number:* #{1}\n\n{2}📌 *Zaroori Baatein:*\n• Kripya samay par clinic pahunchein.\n• Aapko baar-baar poochna nahi padega, aapka number aane se pehle hum aapko WhatsApp par alert bhej denge.\n\n✨ _Aapke acche swasthya ke liye humari shubhkaamnayein!_" },
                    { "ESTIMATED_WAIT_MSG", "⏱️ *Estimated Wait:* ~{0} mins\n\n" },
                    { "DOCTOR_ARRIVED_ALERT", "👨‍⚕️ *DOCTOR CLINIC ME HAIN* 👨‍⚕️\n━━━━━━━━━━━━━━━━━━━━━\n\nNamaste 🙏,\n\nAapko batate hue khushi ho rahi hai ki *Dr. {0}* clinic pahunch chuke hain aur check-up shuru ho gaya hai.\n\n👉 Kripya clinic ke waiting area me tayyar rahein.\n\n✨ _Humari team aapki sahayata ke liye hamesha tatpar hai._" },
                    { "YOUR_TURN_ALERT", "🔔 *AAPKA NUMBER AA GAYA HAI!* 🔔\n━━━━━━━━━━━━━━━━━━━━━\n\n👉 *Token #{0}*\n\nKripya turant doctor ke consultation room me check-up ke liye andar aaiye. Doctor aapka intezaar kar rahe hain.\n\n✨ _Swasth rahein, mast rahein!_" },
                    { "UPCOMING_TURN_ALERT", "⏳ *AAPKA NUMBER AANE WALA HAI* ⏳\n━━━━━━━━━━━━━━━━━━━━━\n\nNamaste 🙏,\n\nAapke aage ab sirf *{0} patient(s)* bache hain.\n\n👉 Kripya doctor ke cabin ke paas aakar tayyar rahein. Aapka number agla ho sakta hai!\n\n✨ _Aapke samay aur dhairya ke liye dhanyawad._" },
                    { "FEEDBACK_REQUEST_ALERT", "🌟 *AAPKA EXPERIENCE KAISA RAHA?* 🌟\n━━━━━━━━━━━━━━━━━━━━━\n\nNamaste 🙏,\n\nAaj *Dr. {0}* se consultation ke liye dhanyawad.\n\nKripya is message ke reply me *1 se 5* ke beech koi ek number bhej kar apna anubhav batayein:\n\n⭐⭐⭐⭐⭐ - *5* (Bahut Accha)\n⭐⭐⭐⭐ - *4* (Accha)\n⭐⭐⭐ - *3* (Theek)\n⭐⭐ - *2* (Sudhaar ki zaroorat)\n⭐ - *1* (Khaas nahi)\n\nAapka feedback humari service ko behtar banane me madad karega. 🙌\n_Ref: {1}_" }
                }
            },
            { "2", new Dictionary<string, string> // MARATHI
                {
                    { "WELCOME_LANGUAGE", "🙏 नमस्कार!\n\n🏥 {0} मध्ये आपले स्वागत आहे.\n\nचांगली सेवा देण्यासाठी कृपया आपली आवडती भाषा निवडा.\n\n1️⃣ हिन्दी\n2️⃣ मराठी\n3️⃣ English\n\n👉 कृपया फक्त नंबर पाठवा." },
                    { "ASK_NAME", "😊 धन्यवाद.\n\nअपॉइंटमेंट बुक करण्यापूर्वी आम्हाला तुमचे नाव आवश्यक आहे.\nकृपया तुमचे पूर्ण नाव लिहून पाठवा.\n\n✍️ उदाहरण:\nRahul Sharma" },
                    { "SELECT_DOCTOR", "🙏 धन्यवाद {0}.\n\nकृपया डॉक्टर निवडा.\n\n{1}\n👉 कृपया फक्त नंबर पाठवा." },
                    { "SELECT_SESSION", "👨‍⚕️ तुम्ही\n\nDr. {0}\n{1}\n\nनिवडले आहे.\n\nकृपया उपलब्ध सत्र निवडा.\n\n{2}\n👉 कृपया फक्त नंबर पाठवा." },
                    { "CONFIRM_DETAILS", "📋 कृपया तुमची माहिती तपासा.\n\n👤 रुग्ण\n{0}\n\n👨‍⚕️ डॉक्टर\nDr. {1}\n\n🩺 विशेषज्ञता\n{2}\n\n📅 सत्र\n{3}\n\n🕘 वेळ\n{4}\n\n1️⃣ अपॉइंटमेंट निश्चित करण्यासाठी 1 पाठवा\n2️⃣ मागे जाण्यासाठी 2 पाठवा\n\n👉 कृपया फक्त 1 किंवा 2 टाइप करून पाठवा." },
                    { "SUCCESS_BOOKING", "🎉 तुमची अपॉइंटमेंट यशस्वीरित्या बुक झाली आहे.\n\n🎟️ टोकन नंबर\n#{0}\n\n👨‍⚕️ डॉक्टर\nDr. {1}\n\n📅 सत्र\n{2}\n\n🕘 वेळ\n{3}\n\n📍 कृपया आपल्या वेळेच्या 10 मिनिटे आधी क्लिनिकवर पोहोचा.\n\n📊 रांग पाहण्यासाठी:\nSTATUS\ntype करून पाठवा.\n\n🙏 धन्यवाद." },
                    { "ACTIVE_APPOINTMENT", "ℹ️ तुमच्या नावावर आधीच एक सक्रिय अपॉइंटमेंट आहे.\n\n👨‍⚕️ डॉक्टर\nDr. {0}\n🎟️ टोकन\n#{1}\n📌 स्थिती\nWaiting\n\nकृपया पर्याय निवडा.\n\n1️⃣ Queue Status\n2️⃣ Appointment Details\n3️⃣ Reschedule\n4️⃣ Cancel Appointment\n\n👉 फक्त नंबर पाठवा." },
                    { "APPOINTMENT_DETAILS", "📋 तुमची अपॉइंटमेंट माहिती\n\n👤 रुग्ण\n{0}\n\n👨‍⚕️ डॉक्टर\nDr. {1}\n🎟️ टोकन\n#{2}\n📅 Session\n{3}\n📌 स्थिती\nWaiting" },
                    { "QUEUE_STATUS", "📊 तुमची सध्याची रांग स्थिती\n\n👨‍⚕️ डॉक्टर\nDr. {0}\n🔢 सध्याचा टोकन\n#{1}\n🎟️ तुमचा टोकन\n#{2}\n👥 तुमच्या आधी\n{3} रुग्ण\n⏳ अंदाजे वेळ\n{4} मिनिटे\n\n🙏 कृपया प्रतीक्षा करा." },
                    { "CANCEL_PROMPT", "⚠️ तुम्हाला तुमची अपॉइंटमेंट रद्द करायची आहे का?\n\n1️⃣ होय\n2️⃣ नाही\n\n👉 फक्त नंबर पाठवा." },
                    { "CANCEL_SUCCESS", "✅ तुमची अपॉइंटमेंट यशस्वीरित्या रद्द केली गेली आहे.\n\nधन्यवाद." },
                    { "RESCHEDULE_PROMPT", "🔄 कृपया नवीन सत्र निवडा.\n\n{0}\n👉 फक्त नंबर पाठवा." },
                    { "REJOIN_SUCCESS", "🔄 तुम्हाला पुन्हा रांगेत जोडले गेले आहे.\n\n🎟️ नवीन टोकन\n#{0}\n\n🙏 कृपया प्रतीक्षा करा." },
                    { "SESSION_FULL", "⚠️ निवडलेले सत्र पूर्ण झाले आहे.\n\nकृपया दुसरे सत्र निवडा." },
                    { "NO_SESSIONS", "😔 सध्या कोणतेही सक्रिय सत्र उपलब्ध नाही.\n\nकृपया नंतर पुन्हा प्रयत्न करा." },
                    { "NO_DOCTORS", "😔 सध्या कोणतेही डॉक्टर उपलब्ध नाहीत.\n\nकृपया नंतर पुन्हा प्रयत्न करा." },
                    { "INVALID_INPUT", "⚠️ कृपया सूचीमध्ये दिलेल्या पर्यायांमधून योग्य नंबर निवडा.\n\nउदाहरण:\n1\n2\n3" },
                    { "INVALID_INPUT_HELP", "🆘 मदतीसाठी:\nHELP\ntype करून पाठवा." },
                    { "RATING_PROMPT", "🌟 तुमची भेट पूर्ण झाली आहे.\n\nकृपया तुमचा अनुभव 1 ते 5 मध्ये रेट करा.\n\n⭐ 1 = खूप वाईट\n⭐⭐ 2 = वाईट\n⭐⭐⭐ 3 = ठीक\n⭐⭐⭐⭐ 4 = छान\n⭐⭐⭐⭐⭐ 5 = उत्कृष्ट\n\n👉 फक्त संख्या पाठवा." },
                    { "COMMENT_PROMPT", "🙏 धन्यवाद.\n\nतुम्हाला काही सूचना द्यायची असल्यास कृपया लिहा.\nकिंवा\nSKIP\ntype करून पाठवा." },
                    { "FEEDBACK_SUCCESS", "❤️ तुमच्या सूचनेबद्दल धन्यवाद.\n\nतुमचा अभिप्राय आमच्यासाठी महत्त्वाचा आहे.\nनिरोगी रहा. 😊" },
                    { "EMERGENCY_ALERT", "🚨 वैद्यकीय आपत्कालीन स्थिती\n\nकृपया त्वरित जवळच्या रुग्णालयात जा किंवा आपत्कालीन सेवेशी संपर्क साधा.\n\n⚠️ हा चॅटबॉट वैद्यकीय आपत्कालीन मदत देत नाही." },
                    { "HELP_MENU", "❓ मदत केंद्र / Help Menu\n\nउपलब्ध कमांड (Type the word):\n📊 *STATUS* - रांग क्रमांक तपासा\n📋 *APPOINTMENT* - अपॉइंटमेंट तपशील\n🔄 *RESCHEDULE* - वेळ/डॉक्टर बदला\n❌ *CANCEL* - अपॉइंटमेंट रद्द करा\n🔁 *REJOIN* - रांगेत परत सामील व्हा\n🌐 *LANGUAGE* - भाषा बदला\n🏠 *HI* - मुख्य मेन्यू" },
                    { "SESSION_CANCELLED", "⚠️ निवडलेले सत्र आता उपलब्ध नाही.\n\nकृपया दुसरे सत्र निवडा." },
                    { "NO_ACTIVE_APP", "ℹ️ तुमची कोणतीही सक्रिय अपॉइंटमेंट उपलब्ध नाही." },
                    { "NO_SKIPPED_APP", "ℹ️ तुमची कोणतीही सोडलेली अपॉइंटमेंट आढळली नाही." },
                    { "BOOKING_CONFIRMED_ALERT", "🏥 *अपॉइंटमेंट निश्चित झाली* 🏥\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्कार *{0}* 🙏,\n\nतुमची डॉक्टरांची अपॉइंटमेंट यशस्वीरीत्या बुक झाली आहे.\n\n🔢 *तुमचा टोकन नंबर:* #{1}\n\n{2}📌 *महत्त्वाच्या सूचना:*\n• कृपया वेळेवर क्लिनिकमध्ये पोहोचा.\n• तुम्हाला वारंवार विचारण्याची गरज नाही, तुमचा नंबर येण्यापूर्वी आम्ही तुम्हाला WhatsApp वर अलर्ट पाठवू.\n\n✨ _तुमच्या उत्तम आरोग्यासाठी आमच्या शुभेच्छा!_" },
                    { "ESTIMATED_WAIT_MSG", "⏱️ *अंदाजे प्रतीक्षा:* ~{0} मिनिटे\n\n" },
                    { "DOCTOR_ARRIVED_ALERT", "👨‍⚕️ *डॉक्टर क्लिनिकमध्ये आहेत* 👨‍⚕️\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्कार 🙏,\n\nतुम्हाला हे सांगताना आनंद होत आहे की *Dr. {0}* क्लिनिकमध्ये पोहोचले आहेत आणि तपासणी सुरू झाली आहे.\n\n👉 कृपया क्लिनिकच्या प्रतीक्षा कक्षात तयार राहा.\n\n✨ _आमची टीम तुमच्या मदतीसाठी नेहमी तत्पर आहे._" },
                    { "YOUR_TURN_ALERT", "🔔 *तुमचा नंबर आला आहे!* 🔔\n━━━━━━━━━━━━━━━━━━━━━\n\n👉 *टोकन #{0}*\n\nकृपया त्वरित डॉक्टरांच्या कन्सल्टेशन रूममध्ये तपासणीसाठी आत या. डॉक्टर तुमची वाट पाहत आहेत.\n\n✨ _निरोगी राहा, आनंदी राहा!_" },
                    { "UPCOMING_TURN_ALERT", "⏳ *तुमचा नंबर येणार आहे* ⏳\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्कार 🙏,\n\nतुमच्या आधी आता फक्त *{0} रुग्ण* राहिले आहेत.\n\n👉 कृपया डॉक्टरांच्या केबिनजवळ येऊन तयार राहा. तुमचा नंबर पुढचा असू शकतो!\n\n✨ _तुमच्या वेळेबद्दल आणि संयमाबद्दल धन्यवाद._" },
                    { "FEEDBACK_REQUEST_ALERT", "🌟 *तुमचा अनुभव कसा होता?* 🌟\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्कार 🙏,\n\nआज *Dr. {0}* यांच्याशी सल्लामसलत केल्याबद्दल धन्यवाद.\n\nकृपया या मेसेजला रिप्लाय म्हणून *1 ते 5* च्या दरम्यान कोणताही एक नंबर पाठवून तुमचा अनुभव सांगा:\n\n⭐⭐⭐⭐⭐ - *5* (खूप छान)\n⭐⭐⭐⭐ - *4* (छान)\n⭐⭐⭐ - *3* (ठीक)\n⭐⭐ - *2* (सुधारणेची गरज)\n⭐ - *1* (काही खास नाही)\n\nतुमचा अभिप्राय आम्हाला आमची सेवा अधिक चांगली बनवण्यास मदत करेल. 🙌\n_Ref: {1}_" },
                    { "ALREADY_BOOKED", "ℹ️ तुमची या सत्रामध्ये आधीच एक अपॉइंटमेंट बुक केली आहे.\n\nतुमची थेट स्थिती पाहण्यासाठी कोणत्याही वेळी *STATUS* लिहून पाठवा. ✨" },
                    { "BOOKING_ERROR", "⚠️ अपॉइंटमेंट बुक करताना समस्या आली: {0}\n\nकृपया थोड्या वेळानंतर *HI* लिहून पुन्हा प्रयत्न करा. 🙏" }
                }
            },
            { "3", new Dictionary<string, string> // ENGLISH
                {
                    { "WELCOME_LANGUAGE", "🙏 Welcome!\n\n🏥 Welcome to {0}.\n\nTo serve you better, please select your preferred language.\n\n1️⃣ हिन्दी\n2️⃣ मराठी\n3️⃣ English\n\n👉 Please reply with a number." },
                    { "ASK_NAME", "😊 Thank you.\n\nBefore booking an appointment, we need your name.\nPlease type your full name.\n\n✍️ Example:\nRahul Sharma" },
                    { "SELECT_DOCTOR", "🙏 Thank you {0}.\n\nPlease select a doctor.\n\n{1}\n👉 Please reply with a number." },
                    { "SELECT_SESSION", "👨‍⚕️ You have selected\n\nDr. {0}\n{1}\n\nPlease select an available session.\n\n{2}\n👉 Please reply with a number." },
                    { "CONFIRM_DETAILS", "📋 Please verify your details.\n\n👤 Patient\n{0}\n\n👨‍⚕️ Doctor\nDr. {1}\n\n🩺 Specialization\n{2}\n\n📅 Session\n{3}\n\n🕘 Time\n{4}\n\n1️⃣ Type 1 to Confirm Appointment\n2️⃣ Type 2 to Go Back\n\n👉 Please reply with only 1 or 2." },
                    { "SUCCESS_BOOKING", "🎉 Your appointment has been booked successfully.\n\n🎟️ Token Number\n#{0}\n\n👨‍⚕️ Doctor\nDr. {1}\n\n📅 Session\n{2}\n\n🕘 Time\n{3}\n\n📍 Please reach the clinic 10 minutes before your turn.\n\n📊 To view queue status type:\nSTATUS\n\n🙏 Thank you." },
                    { "ACTIVE_APPOINTMENT", "ℹ️ You already have an active appointment.\n\n👨‍⚕️ Doctor\nDr. {0}\n🎟️ Token\n#{1}\n📌 Status\nWaiting\n\nSelect an option:\n\n1️⃣ Queue Status\n2️⃣ Appointment Details\n3️⃣ Reschedule\n4️⃣ Cancel Appointment\n\n👉 Please reply with a number." },
                    { "APPOINTMENT_DETAILS", "📋 Your Appointment Details\n\n👤 Patient\n{0}\n\n👨‍⚕️ Doctor\nDr. {1}\n🎟️ Token\n#{2}\n📅 Session\n{3}\n📌 Status\nWaiting" },
                    { "QUEUE_STATUS", "📊 Your Current Queue Status\n\n👨‍⚕️ Doctor\nDr. {0}\n🔢 Current Token\n#{1}\n🎟️ Your Token\n#{2}\n👥 People Ahead\n{3} patients\n⏳ Est. Wait Time\n{4} mins\n\n🙏 Please wait." },
                    { "CANCEL_PROMPT", "⚠️ Do you want to cancel your appointment?\n\n1️⃣ Yes\n2️⃣ No\n\n👉 Please reply with a number." },
                    { "CANCEL_SUCCESS", "✅ Your appointment has been cancelled successfully.\n\nThank you." },
                    { "RESCHEDULE_PROMPT", "🔄 Please select a new session.\n\n{0}\n👉 Please reply with a number." },
                    { "REJOIN_SUCCESS", "🔄 You have been added back to the queue.\n\n🎟️ New Token\n#{0}\n\n🙏 Please wait." },
                    { "SESSION_FULL", "⚠️ The selected session is full.\n\nPlease select another session." },
                    { "NO_SESSIONS", "😔 No active sessions available right now.\n\nPlease try again later." },
                    { "NO_DOCTORS", "😔 No doctors available right now.\n\nPlease try again later." },
                    { "INVALID_INPUT", "⚠️ Please select a valid number from the options provided.\n\nExample:\n1\n2\n3" },
                    { "INVALID_INPUT_HELP", "🆘 For help type:\nHELP" },
                    { "RATING_PROMPT", "🌟 Your consultation is complete.\n\nPlease rate your experience between 1 and 5.\n\n⭐ 1 = Terrible\n⭐⭐ 2 = Poor\n⭐⭐⭐ 3 = Average\n⭐⭐⭐⭐ 4 = Good\n⭐⭐⭐⭐⭐ 5 = Excellent\n\n👉 Please reply with a number." },
                    { "COMMENT_PROMPT", "🙏 Thank you.\n\nIf you have any feedback, please write it down.\nOr type\nSKIP" },
                    { "FEEDBACK_SUCCESS", "❤️ Thank you for your feedback.\n\nYour response is important to us.\nStay healthy. 😊" },
                    { "EMERGENCY_ALERT", "🚨 Medical Emergency\n\nPlease visit the nearest hospital immediately or contact emergency services.\n\n⚠️ This chatbot does not provide emergency medical assistance." },
                    { "HELP_MENU", "❓ Help Menu\n\nAvailable Commands (Type the word):\n📊 *STATUS* - Check your queue number\n📋 *APPOINTMENT* - View booking details\n🔄 *RESCHEDULE* - Change your doctor/time\n❌ *CANCEL* - Cancel your booking\n🔁 *REJOIN* - Rejoin queue if skipped\n🌐 *LANGUAGE* - Change Language\n🏠 *HI* - Main Menu" },
                    { "SESSION_CANCELLED", "⚠️ The selected session is no longer available.\n\nPlease select another session." },
                    { "NO_ACTIVE_APP", "ℹ️ You do not have any active appointments." },
                    { "NO_SKIPPED_APP", "ℹ️ You do not have any skipped appointments." },
                    { "BOOKING_CONFIRMED_ALERT", "🏥 *APPOINTMENT CONFIRMED* 🏥\n━━━━━━━━━━━━━━━━━━━━━\n\nHello *{0}* 🙏,\n\nYour doctor appointment has been booked successfully.\n\n🔢 *Your Token Number:* #{1}\n\n{2}📌 *Important Notes:*\n• Please reach the clinic on time.\n• You do not need to ask repeatedly, we will send you an alert on WhatsApp before your turn comes.\n\n✨ _Wishing you good health!_" },
                    { "ESTIMATED_WAIT_MSG", "⏱️ *Estimated Wait:* ~{0} mins\n\n" },
                    { "DOCTOR_ARRIVED_ALERT", "👨‍⚕️ *DOCTOR IS AT THE CLINIC* 👨‍⚕️\n━━━━━━━━━━━━━━━━━━━━━\n\nHello 🙏,\n\nWe are happy to inform you that *Dr. {0}* has arrived at the clinic and check-ups have started.\n\n👉 Please be ready in the waiting area of the clinic.\n\n✨ _Our team is always ready to assist you._" },
                    { "YOUR_TURN_ALERT", "🔔 *YOUR TURN HAS ARRIVED!* 🔔\n━━━━━━━━━━━━━━━━━━━━━\n\n👉 *Token #{0}*\n\nPlease proceed inside the doctor's consultation room for your check-up immediately. The doctor is waiting for you.\n\n✨ _Stay healthy!_" },
                    { "UPCOMING_TURN_ALERT", "⏳ *YOUR NUMBER IS APPROACHING* ⏳\n━━━━━━━━━━━━━━━━━━━━━\n\nHello 🙏,\n\nThere are only *{0} patient(s)* ahead of you now.\n\n👉 Please come near the doctor's cabin and be ready. Your turn might be next!\n\n✨ _Thank you for your time and patience._" },
                    { "FEEDBACK_REQUEST_ALERT", "🌟 *HOW WAS YOUR EXPERIENCE?* 🌟\n━━━━━━━━━━━━━━━━━━━━━\n\nHello 🙏,\n\nThank you for consulting with *Dr. {0}* today.\n\nPlease share your experience by replying to this message with a number between *1 and 5*:\n\n⭐⭐⭐⭐⭐ - *5* (Excellent)\n⭐⭐⭐⭐ - *4* (Good)\n⭐⭐⭐ - *3* (Average)\n⭐⭐ - *2* (Needs improvement)\n⭐ - *1* (Terrible)\n\nYour feedback will help us improve our service. 🙌\n_Ref: {1}_" },
                    { "ALREADY_BOOKED", "ℹ️ You already have an appointment booked for this session.\n\nTo check your live status at any time, type and send *STATUS*. ✨" },
                    { "BOOKING_ERROR", "⚠️ There was a problem booking your appointment: {0}\n\nPlease type *HI* and try again after some time. 🙏" }
                }
            }
        };
    }
}
