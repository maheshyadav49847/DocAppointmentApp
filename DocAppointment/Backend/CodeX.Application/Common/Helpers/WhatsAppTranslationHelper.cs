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
                    { "WELCOME_LANGUAGE", "🙏 नमस्कार!\n\n🏥 {0} में आपका स्वागत है।\n\nसुविधाजनक अनुभव के लिए कृपया अपनी भाषा चुनें:\n\n1️⃣ हिन्दी\n2️⃣ मराठी\n3️⃣ English\n\n👉 (कृपया 1, 2 या 3 लिखकर भेजें)" },
                    { "ASK_NAME", "😊 धन्यवाद!\n\nबुकिंग शुरू करने से पहले, कृपया हमें अपना पूरा नाम बताएं।\n\n✍️ (जैसे: राहुल शर्मा)" },
                    { "SELECT_DOCTOR", "🙏 धन्यवाद {0}।\n\nआप किस डॉक्टर से मिलना चाहते हैं? कृपया नंबर चुनें:\n\n{1}\n9️⃣ मुख्य मेन्यू (Main Menu)\n\n👉 (सिर्फ नंबर लिखकर भेजें)" },
                    { "SELECT_SESSION", "👨‍⚕️ आपने Dr. {0} को चुना है。\n({1})\n\nकृपया अपनी सुविधानुसार समय (सत्र) चुनें:\n\n{2}\n9️⃣ मुख्य मेन्यू (Main Menu)\n\n👉 (सिर्फ नंबर लिखकर भेजें)" },
                    { "CONFIRM_DETAILS", "📋 कृपया अपनी बुकिंग की जानकारी जांचें:\n\n👤 मरीज़: {0}\n👨‍⚕️ डॉक्टर: Dr. {1}\n🩺 विशेषज्ञता: {2}\n📅 दिन/सत्र: {3}\n🕘 समय: {4}\n\n✅ 1 - अपॉइंटमेंट पक्की करें\n❌ 2 - वापस जाएं\n9️⃣ मुख्य मेन्यू (Main Menu)\n\n👉 (1, 2 या 9 लिखकर भेजें)" },
                    { "SUCCESS_BOOKING", "🎉 *अपॉइंटमेंट बुक हो गई है!*\n\n🎟️ *टोकन नंबर:* #{0}\n👨‍⚕️ डॉक्टर: Dr. {1}\n📅 सत्र: {2}\n🕘 समय: {3}\n\n📍 कृपया अपने नंबर से 10-15 मिनट पहले क्लिनिक पहुंचें।\n\n📊 अपना नंबर लाइव देखने के लिए कभी भी *1* (या STATUS) लिखकर भेजें।\n\n🙏 धन्यवाद!" },
                    { "ACTIVE_APPOINTMENT", "ℹ️ आपकी एक अपॉइंटमेंट पहले से बुक है:\n\n👨‍⚕️ डॉक्टर: Dr. {0}\n🎟️ टोकन: #{1}\n📌 स्थिति: लाइन में हैं\n\nआप क्या करना चाहेंगे?\n\n1️⃣ लाइव स्टेटस (नंबर) देखें\n2️⃣ अपॉइंटमेंट की जानकारी देखें\n3️⃣ अपॉइंटमेंट बदलें\n4️⃣ अपॉइंटमेंट रद्द (Cancel) करें\n0️⃣ भाषा बदलें (Change Language)\n\n👉 (सिर्फ नंबर लिखकर भेजें)" },
                    { "APPOINTMENT_DETAILS", "📋 *आपकी अपॉइंटमेंट की जानकारी:*\n\n👤 मरीज़: {0}\n👨‍⚕️ डॉक्टर: Dr. {1}\n🎟️ टोकन नंबर: #{2}\n📅 सत्र: {3}\n📌 स्थिति: आपकी बारी का इंतज़ार है" },
                    { "QUEUE_STATUS", "📊 *लाइव कतार (लाइन) का स्टेटस:*\n\n👨‍⚕️ डॉक्टर: Dr. {0}\n🔢 अभी चल रहा टोकन: #{1}\n🎟️ आपका टोकन: #{2}\n👥 आपसे पहले: {3} मरीज़\n⏳ अनुमानित समय: {4} मिनट\n\n🙏 कृपया अपनी बारी का इंतज़ार करें।" },
                    { "CANCEL_PROMPT", "⚠️ क्या आप सच में अपनी अपॉइंटमेंट रद्द (Cancel) करना चाहते हैं?\n\n1️⃣ हाँ, रद्द करें\n2️⃣ नहीं, रहने दें\n\n👉 (सिर्फ 1 या 2 लिखकर भेजें)" },
                    { "CANCEL_SUCCESS", "✅ आपकी अपॉइंटमेंट रद्द (Cancel) कर दी गई है।\n\nनई बुकिंग के लिए कभी भी *HI* लिखकर भेजें। धन्यवाद! 🙏" },
                    { "RESCHEDULE_PROMPT", "🔄 कृपया नया समय (सत्र) चुनें:\n\n{0}\n👉 (सिर्फ नंबर लिखकर भेजें)" },
                    { "REJOIN_SUCCESS", "🔄 आपको वापस लाइन में जोड़ दिया गया है!\n\n🎟️ आपका नया टोकन नंबर है: #{0}\n\n🙏 कृपया इंतज़ार करें।" },
                    { "SESSION_FULL", "⚠️ माफ़ करें, यह सत्र पूरा भर चुका है (Full है)।\n\nकृपया कोई दूसरा समय चुनें।" },
                    { "NO_SESSIONS", "😔 माफ़ करें, अभी कोई भी सत्र (Session) चालू नहीं है।\n\nकृपया कुछ समय बाद कोशिश करें।" },
                    { "NO_DOCTORS", "😔 माफ़ करें, अभी कोई डॉक्टर उपलब्ध नहीं हैं।\n\nकृपया कुछ समय बाद कोशिश करें।" },
                    { "INVALID_INPUT", "⚠️ क्षमा करें, हमें आपका जवाब समझ नहीं आया।\n\nअगर आप इस प्रोसेस को बंद करके वापस मेन्यू पर जाना चाहते हैं, तो कृपया *9* लिखकर भेजें।\n\nया फिर सही विकल्प (जैसे: 1, 2) चुनें।" },
                    { "INVALID_INPUT_HELP", "🆘 इस प्रोसेस को बंद करने और मेन्यू पर वापस जाने के लिए *9* लिखकर भेजें।" },
                    { "RATING_PROMPT", "🌟 आपका चेक-अप पूरा हो गया है!\n\nकृपया 1 से 5 के बीच नंबर भेजकर बताएं कि आपका अनुभव कैसा रहा:\n\n5️⃣ - बहुत अच्छा (Excellent)\n4️⃣ - अच्छा (Good)\n3️⃣ - ठीक-ठाक (Average)\n2️⃣ - ख़राब (Poor)\n1️⃣ - बहुत ख़राब (Terrible)\n\n👉 (सिर्फ एक नंबर लिखकर भेजें)" },
                    { "COMMENT_PROMPT", "🙏 बहुत-बहुत धन्यवाद!\n\nअगर आप कोई सुझाव देना चाहते हैं, तो कृपया यहाँ टाइप करें।\nया फिर इसे छोड़ने के लिए *SKIP* लिखकर भेजें।" },
                    { "FEEDBACK_SUCCESS", "❤️ आपके कीमती सुझाव के लिए धन्यवाद!\n\nआपकी सेहत हमारे लिए सबसे अहम है। स्वस्थ रहें! 😊" },
                    { "EMERGENCY_ALERT", "🚨 *मेडिकल इमरजेंसी*\n\nकृपया तुरंत किसी नज़दीकी अस्पताल जाएं या एम्बुलेंस बुलाएं।\n\n⚠️ यह WhatsApp नंबर इमरजेंसी के लिए नहीं है।" },
                    { "HELP_MENU", "❓ *मदद (Help Menu)*\n\nइन सुविधाओं का इस्तेमाल करने के लिए यह शब्द लिखकर भेजें:\n\n*STATUS* - अपना नंबर/लाइव कतार देखें\n*HI* - शुरुआत से शुरू करें" },
                    { "SESSION_CANCELLED", "⚠️ माफ़ करें, चुना गया सत्र अब उपलब्ध नहीं है।\n\nकृपया कोई दूसरा सत्र चुनें।" },
                    { "NO_ACTIVE_APP", "ℹ️ अभी आपकी कोई अपॉइंटमेंट बुक नहीं है।" },
                    { "NO_SKIPPED_APP", "ℹ️ आपकी कोई छूटी हुई (Skipped) अपॉइंटमेंट नहीं मिली।" },
                    { "BOOKING_CONFIRMED_ALERT", "🏥 *अपॉइंटमेंट पक्की हो गई है* 🏥\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्ते *{0}* 🙏,\n\nआपकी डॉक्टर अपॉइंटमेंट बुक हो गई है।\n\n🔢 *आपका टोकन नंबर:* #{1}\n\n{2}📌 *ज़रूरी बातें:*\n• कृपया समय पर क्लिनिक पहुंचें।\n• आपको बार-बार पूछने की ज़रूरत नहीं है, आपका नंबर आने से थोड़ा पहले हम आपको खुद WhatsApp पर मैसेज भेज देंगे।\n\n✨ _स्वस्थ रहें, सुरक्षित रहें!_" },
                    { "ESTIMATED_WAIT_MSG", "⏱️ *अनुमानित इंतज़ार:* लगभग {0} मिनट\n\n" },
                    { "DOCTOR_ARRIVED_ALERT", "👨‍⚕️ *डॉक्टर क्लिनिक आ गए हैं* 👨‍⚕️\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्ते 🙏,\n\n*Dr. {0}* क्लिनिक पहुँच चुके हैं और मरीजों को देखना शुरू कर दिया है।\n\n👉 कृपया अपनी बारी आने तक क्लिनिक के वेटिंग एरिया में आराम से बैठें।\n\n✨ _हम आपकी सेवा में हाज़िर हैं।_" },
                    { "YOUR_TURN_ALERT", "🔔 *आपका नंबर आ गया है!* 🔔\n━━━━━━━━━━━━━━━━━━━━━\n\n👉 *टोकन #{0}*\n\nकृपया तुरंत डॉक्टर के केबिन में अंदर आएं। डॉक्टर आपका इंतज़ार कर रहे हैं।\n\n✨ _जल्दी ठीक हों!_" },
                    { "UPCOMING_TURN_ALERT", "⏳ *बस थोड़ी देर और...* ⏳\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्ते 🙏,\n\nआपके आगे अब सिर्फ *{0} मरीज़* बचे हैं।\n\n👉 कृपया डॉक्टर के केबिन के पास आ जाएं। अगला नंबर आपका हो सकता है!\n\n✨ _आपके धैर्य (patience) के लिए धन्यवाद।_" },
                    { "FEEDBACK_REQUEST_ALERT", "🌟 *आपका अनुभव कैसा रहा?* 🌟\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्ते 🙏,\n\nआज *Dr. {0}* से दिखाने के लिए धन्यवाद।\n\nकृपया इस मैसेज का रिप्लाई करके *1 से 5* के बीच एक नंबर चुनें और हमें बताएं:\n\n5️⃣ (बहुत अच्छा)\n4️⃣ (अच्छा)\n3️⃣ (ठीक-ठाक)\n2️⃣ (सुधार की ज़रूरत)\n1️⃣ (बहुत ख़राब)\n\nआपका फीडबैक हमारे लिए बहुत कीमती है। 🙌\n_Ref: {1}_" },
                    { "ALREADY_BOOKED", "ℹ️ आपकी इस सत्र (Session) में पहले से अपॉइंटमेंट है।\n\nअपना लाइव नंबर देखने के लिए कभी भी *1* लिखकर भेजें। ✨" },
                    { "MULTIPLE_PATIENTS", "👥 इस नंबर से एक से अधिक मरीज़ जुड़े हैं।\n\nआप किसके लिए बुकिंग करना चाहते हैं?\n\n{0}\n👉 (कृपया सिर्फ नंबर लिखकर भेजें)" },
                    { "INVALID_PATIENT_SELECTION", "⚠️ क्षमा करें, कृपया ऊपर दी गई सूची में से सही मरीज़ का नंबर चुनें।" },
                    { "BOOKING_ERROR", "⚠️ अपॉइंटमेंट बुक करने में कोई समस्या आई: {0}\n\nकृपया *HI* लिखकर थोड़ी देर बाद फिर से कोशिश करें। 🙏" },
                    { "APPOINTMENT_MISSED_ALERT", "⚠️ *अपॉइंटमेंट छूट गई* ⚠️\n━━━━━━━━━━━━━━━━━━━━━\n\nआपका *टोकन #{0}* (Dr. {1}) बुलाया गया था, पर आप वहाँ नहीं थे।\n\nइसलिए हमने अगले मरीज़ को बुला लिया है और आपका नंबर *SKIP* कर दिया गया है।\n\n👉 अगर आप क्लिनिक में हैं और वापस लाइन में लगना चाहते हैं, तो कृपया *1* लिखकर भेजें। ✨" },
                    { "MISSED_APP_MENU", "⚠️ *अपॉइंटमेंट छूट गई* ⚠️\n\nआपकी Dr. {0} के साथ टोकन #{1} की अपॉइंटमेंट छूट गई है।\n\n👉 वापस लाइन में लगने के लिए *1* भेजें\n👉 भाषा बदलने के लिए *0* भेजें\n👉 शुरुआत से शुरू करने के लिए *HI* भेजें" },
                    { "APPOINTMENT_CANCELLED_ALERT", "⚠️ *अपॉइंटमेंट कैंसल* ⚠️\n🏢 *{0}*\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्ते {1} 🙏,\n\nज़रूरी सूचना: किसी इमरजेंसी या छुट्टी के कारण *Dr. {2}* का आज का समय (Session) रद्द कर दिया गया है।\n\nआपका टोकन #{3} कैंसल हो गया है। हमें इस परेशानी के लिए बहुत खेद है। 🙏\n\n👉 नया अपॉइंटमेंट बुक करने के लिए कृपया *HI* लिखकर भेजें। ✨" },
                    { "SESSION_CANCELLED_ALERT", "⚠️ *सत्र (Session) समाप्त* ⚠️\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्ते 🙏,\n\nमाफ़ करें, *Dr. {0}* का यह सत्र खत्म हो गया है और आपका नंबर नहीं आ पाया। आपका टोकन रद्द कर दिया गया है।\n\n👉 नई बुकिंग के लिए कृपया *HI* लिखकर भेजें। ✨" },
                    { "SESSION_TRANSFERRED_ALERT", "🔄 *अपॉइंटमेंट आगे बढ़ा दी गई है* 🔄\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्ते 🙏,\n\n*Dr. {0}* का पिछला सत्र खत्म हो गया है। आपकी अपॉइंटमेंट को अगले सत्र (*{1}*) में अपने-आप शिफ्ट कर दिया गया है。\n\n🎟️ आपका नया टोकन नंबर है: *#{2}*\n\nहम अगले सत्र में आपका इंतज़ार करेंगे। ✨" },
                    { "QUEUE_PAUSED_ALERT", "⏸️ *कतार (Line) रोक दी गई है* ⏸️\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्ते 🙏,\n\nDr. {0} की कतार कुछ समय ({1} मिनट) के लिए रोक दी गई है।{2}\n\n👉 कृपया प्रतीक्षा करें। कतार जल्द ही फिर से शुरू होगी। ✨" }
                }
            },
            { "2", new Dictionary<string, string> // MARATHI
                {
                    { "WELCOME_LANGUAGE", "🙏 नमस्कार!\n\n🏥 {0} मध्ये आपले स्वागत आहे.\n\nसोयीस्कर अनुभवासाठी कृपया आपली भाषा निवडा:\n\n1️⃣ हिन्दी\n2️⃣ मराठी\n3️⃣ English\n\n👉 (कृपया 1, 2 किंवा 3 लिहून पाठवा)" },
                    { "ASK_NAME", "😊 धन्यवाद!\n\nबुकिंग सुरू करण्यापूर्वी, कृपया तुमचे पूर्ण नाव सांगा.\n\n✍️ (उदा: राहुल शर्मा)" },
                    { "SELECT_DOCTOR", "🙏 धन्यवाद {0}.\n\nतुम्हाला कोणत्या डॉक्टरांना भेटायचे आहे? कृपया नंबर निवडा:\n\n{1}\n9️⃣ मुख्य मेनू (Main Menu)\n\n👉 (फक्त नंबर लिहून पाठवा)" },
                    { "SELECT_SESSION", "👨‍⚕️ तुम्ही Dr. {0} यांना निवडले आहे.\n({1})\n\nकृपया तुमच्या सोयीची वेळ (सत्र) निवडा:\n\n{2}\n9️⃣ मुख्य मेनू (Main Menu)\n\n👉 (फक्त नंबर लिहून पाठवा)" },
                    { "CONFIRM_DETAILS", "📋 कृपया तुमची बुकिंग माहिती तपासा:\n\n👤 रुग्ण: {0}\n👨‍⚕️ डॉक्टर: Dr. {1}\n🩺 विशेषज्ञता: {2}\n📅 सत्र: {3}\n🕘 वेळ: {4}\n\n✅ 1 - अपॉइंटमेंट पक्की करा\n❌ 2 - मागे जा\n9️⃣ मुख्य मेनू (Main Menu)\n\n👉 (1, 2 किंवा 9 लिहून पाठवा)" },
                    { "SUCCESS_BOOKING", "🎉 *अपॉइंटमेंट बुक झाली आहे!*\n\n🎟️ *टोकन नंबर:* #{0}\n👨‍⚕️ डॉक्टर: Dr. {1}\n📅 सत्र: {2}\n🕘 वेळ: {3}\n\n📍 कृपया तुमच्या नंबरच्या 10-15 मिनिटे आधी क्लिनिकमध्ये पोहोचा.\n\n📊 तुमचा नंबर लाइव्ह पाहण्यासाठी कधीही *1* (किंवा STATUS) लिहून पाठवा.\n\n🙏 धन्यवाद!" },
                    { "ACTIVE_APPOINTMENT", "ℹ️ तुमची एक अपॉइंटमेंट आधीच बुक आहे:\n\n👨‍⚕️ डॉक्टर: Dr. {0}\n🎟️ टोकन: #{1}\n📌 स्थिती: रांगेत आहात\n\nतुम्हाला काय करायचे आहे?\n\n1️⃣ लाइव्ह स्टेटस (नंबर) पहा\n2️⃣ अपॉइंटमेंटची माहिती पहा\n3️⃣ अपॉइंटमेंटची वेळ बदला\n4️⃣ अपॉइंटमेंट रद्द (Cancel) करा\n0️⃣ भाषा बदला (Change Language)\n\n👉 (फक्त नंबर लिहून पाठवा)" },
                    { "APPOINTMENT_DETAILS", "📋 *तुमची अपॉइंटमेंट माहिती:*\n\n👤 रुग्ण: {0}\n👨‍⚕️ डॉक्टर: Dr. {1}\n🎟️ टोकन नंबर: #{2}\n📅 सत्र: {3}\n📌 स्थिती: तुमच्या नंबरची प्रतीक्षा आहे" },
                    { "QUEUE_STATUS", "📊 *लाइव्ह रांग (Line) स्टेटस:*\n\n👨‍⚕️ डॉक्टर: Dr. {0}\n🔢 सध्या चालू असलेला टोकन: #{1}\n🎟️ तुमचा टोकन: #{2}\n👥 तुमच्या आधी: {3} रुग्ण\n⏳ अंदाजे वेळ: {4} मिनिटे\n\n🙏 कृपया तुमची वेळ येईपर्यंत प्रतीक्षा करा." },
                    { "CANCEL_PROMPT", "⚠️ तुम्हाला नक्की तुमची अपॉइंटमेंट रद्द (Cancel) करायची आहे का?\n\n1️⃣ होय, रद्द करा\n2️⃣ नाही, राहू द्या\n\n👉 (फक्त 1 किंवा 2 लिहून पाठवा)" },
                    { "CANCEL_SUCCESS", "✅ तुमची अपॉइंटमेंट रद्द (Cancel) करण्यात आली आहे.\n\nनवीन बुकिंगसाठी कधीही *HI* लिहून पाठवा. धन्यवाद! 🙏" },
                    { "RESCHEDULE_PROMPT", "🔄 कृपया नवीन वेळ (सत्र) निवडा:\n\n{0}\n👉 (फक्त नंबर लिहून पाठवा)" },
                    { "REJOIN_SUCCESS", "🔄 तुम्हाला पुन्हा रांगेत जोडले गेले आहे!\n\n🎟️ तुमचा नवीन टोकन नंबर आहे: #{0}\n\n🙏 कृपया प्रतीक्षा करा." },
                    { "SESSION_FULL", "⚠️ क्षमस्व, हे सत्र पूर्ण भरले आहे (Full आहे).\n\nकृपया दुसरी वेळ निवडा." },
                    { "NO_SESSIONS", "😔 क्षमस्व, सध्या कोणतेही सत्र (Session) चालू नाही.\n\nकृपया थोड्या वेळानंतर प्रयत्न करा." },
                    { "NO_DOCTORS", "😔 क्षमस्व, सध्या कोणतेही डॉक्टर उपलब्ध नाहीत.\n\nकृपया थोड्या वेळानंतर प्रयत्न करा." },
                    { "INVALID_INPUT", "⚠️ क्षमस्व, आम्हाला समजले नाही.\n\nजर तुम्हाला ही प्रोसेस थांबवून परत मेनूवर जायचे असेल, तर कृपया *1* लिहून पाठवा.\n\nकिंवा योग्य पर्याय (उदा: 1, 2) निवडा." },
                    { "CONFIRM_DISCONTINUE_PROMPT", "⚠️ क्षमस्व, आम्हाला समजले नाही.\n\nतुम्हाला ही प्रक्रिया मध्येच थांबवायची आहे का?\n\n1️⃣ हो, थांबवायची आहे\n2️⃣ नाही, पुढे चालू ठेवा\n\n👉 (कृपया 1 किंवा 2 लिहून पाठवा)" },
                    { "INVALID_INPUT_HELP", "🆘 ही प्रोसेस थांबवून मेनूवर परत जाण्यासाठी *HI* लिहून पाठवा." },
                    { "HELP_MENU", "❓ *मदत (Help Menu)*\n\nया सुविधा वापरण्यासाठी हे शब्द लिहून पाठवा:\n\n*STATUS* - तुमचा नंबर/लाइव्ह रांग पहा\n*HI* - सुरुवातीपासून सुरू करा" },
                    { "SESSION_CANCELLED", "⚠️ क्षमस्व, निवडलेले सत्र आता उपलब्ध नाही.\n\nकृपया दुसरे सत्र निवडा." },
                    { "NO_ACTIVE_APP", "ℹ️ सध्या तुमची कोणतीही अपॉइंटमेंट बुक नाही." },
                    { "NO_SKIPPED_APP", "ℹ️ तुमची कोणतीही सुटलेली (Skipped) अपॉइंटमेंट आढळली नाही." },
                    { "BOOKING_CONFIRMED_ALERT", "🏥 *अपॉइंटमेंट पक्की झाली* 🏥\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्कार *{0}* 🙏,\n\nतुमची डॉक्टरांची अपॉइंटमेंट बुक झाली आहे.\n\n🔢 *तुमचा टोकन नंबर:* #{1}\n\n{2}📌 *महत्त्वाच्या गोष्टी:*\n• कृपया वेळेवर क्लिनिकमध्ये पोहोचा.\n• तुम्हाला वारंवार विचारण्याची गरज नाही, तुमचा नंबर येण्यापूर्वी आम्ही स्वतः WhatsApp वर मेसेज पाठवू.\n\n✨ _निरोगी राहा, सुरक्षित राहा!_" },
                    { "ESTIMATED_WAIT_MSG", "⏱️ *अंदाजे प्रतीक्षा:* सुमारे {0} मिनिटे\n\n" },
                    { "DOCTOR_ARRIVED_ALERT", "👨‍⚕️ *डॉक्टर क्लिनिकमध्ये आले आहेत* 👨‍⚕️\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्कार 🙏,\n\n*Dr. {0}* क्लिनिकमध्ये पोहोचले आहेत आणि रुग्णांना तपासण्यास सुरुवात केली आहे.\n\n👉 कृपया तुमचा नंबर येईपर्यंत क्लिनिकच्या वेटिंग एरियामध्ये आरामात बसा.\n\n✨ _आम्ही तुमच्या सेवेसाठी हजर आहोत._" },
                    { "YOUR_TURN_ALERT", "🔔 *तुमचा नंबर आला आहे!* 🔔\n━━━━━━━━━━━━━━━━━━━━━\n\n👉 *टोकन #{0}*\n\nकृपया त्वरित डॉक्टरांच्या केबिनमध्ये आत या. डॉक्टर तुमची वाट पाहत आहेत.\n\n✨ _लवकर बरे व्हा!_" },
                    { "UPCOMING_TURN_ALERT", "⏳ *फक्त थोडा वेळ आणखी...* ⏳\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्कार 🙏,\n\nतुमच्या आधी आता फक्त *{0} रुग्ण* उरले आहेत.\n\n👉 कृपया डॉक्टरांच्या केबिनजवळ या. पुढचा नंबर तुमचा असू शकतो!\n\n✨ _तुमच्या संयमासाठी (patience) धन्यवाद._" },
                    { "FEEDBACK_REQUEST_ALERT", "🌟 *तुमचा अनुभव कसा राहिला?* 🌟\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्कार 🙏,\n\nआज *Dr. {0}* यांना दाखवल्याबद्दल धन्यवाद.\n\nकृपया या मेसेजला रिप्लाय देऊन *1 ते 5* मधील एक नंबर निवडा आणि आम्हाला सांगा:\n\n5️⃣ (खूप छान)\n4️⃣ (छान)\n3️⃣ (ठीक)\n2️⃣ (सुधारणेची गरज)\n1️⃣ (खूप वाईट)\n\nतुमचा फीडबॅक आमच्यासाठी खूप मोलाचा आहे. 🙌\n_Ref: {1}_" },
                    { "ALREADY_BOOKED", "ℹ️ तुमची या सत्रामध्ये (Session) आधीच अपॉइंटमेंट आहे.\n\nतुमचा लाइव्ह नंबर पाहण्यासाठी कधीही *1* लिहून पाठवा. ✨" },
                    { "MULTIPLE_PATIENTS", "👥 या नंबरशी एकापेक्षा जास्त रुग्ण जोडले गेले आहेत.\n\nतुम्हाला कोणासाठी बुकिंग करायचे आहे?\n\n{0}\n👉 (कृपया फक्त नंबर लिहून पाठवा)" },
                    { "INVALID_PATIENT_SELECTION", "⚠️ क्षमस्व, कृपया वरील यादीतून योग्य रुग्णाचा नंबर निवडा." },
                    { "BOOKING_ERROR", "⚠️ अपॉइंटमेंट बुक करताना काही समस्या आली: {0}\n\nकृपया *HI* लिहून थोड्या वेळानंतर पुन्हा प्रयत्न करा. 🙏" },
                    { "APPOINTMENT_MISSED_ALERT", "⚠️ *अपॉइंटमेंट सुटली* ⚠️\n━━━━━━━━━━━━━━━━━━━━━\n\nतुमचा *टोकन #{0}* (Dr. {1}) बोलावण्यात आला होता, पण तुम्ही तिथे नव्हता.\n\nत्यामुळे आम्ही पुढच्या रुग्णाला बोलावले आहे आणि तुमचा नंबर *SKIP* केला गेला आहे.\n\n👉 जर तुम्ही क्लिनिकमध्ये असाल आणि पुन्हा रांगेत लागायचे असेल, तर कृपया *1* लिहून पाठवा. ✨" },
                    { "MISSED_APP_MENU", "⚠️ *अपॉइंटमेंट सुटली* ⚠️\n\nतुमची Dr. {0} यांच्यासोबत टोकन #{1} ची अपॉइंटमेंट सुटली आहे.\n\n👉 पुन्हा रांगेत लागण्यासाठी *1* पाठवा\n👉 भाषा बदलण्यासाठी *0* पाठवा\n👉 सुरुवातीपासून सुरू करण्यासाठी *HI* पाठवा" },
                    { "APPOINTMENT_CANCELLED_ALERT", "⚠️ *अपॉइंटमेंट कॅन्सल* ⚠️\n🏢 *{0}*\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्कार {1} 🙏,\n\nमहत्त्वाची सूचना: काही आणीबाणी (Emergency) किंवा सुट्टीमुळे *Dr. {2}* यांचे आजचे सत्र (Session) रद्द करण्यात आले आहे.\n\nतुमचा टोकन #{3} कॅन्सल झाला आहे. या त्रासाबद्दल आम्हाला खूप खेद आहे. 🙏\n\n👉 नवीन अपॉइंटमेंट बुक करण्यासाठी कृपया *HI* लिहून पाठवा. ✨" },
                    { "SESSION_CANCELLED_ALERT", "⚠️ *सत्र (Session) समाप्त* ⚠️\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्कार 🙏,\n\nक्षमस्व, *Dr. {0}* यांचे हे सत्र संपले आहे आणि तुमचा नंबर येऊ शकला नाही. तुमचा टोकन रद्द करण्यात आला आहे.\n\n👉 नवीन बुकिंगसाठी कृपया *HI* लिहून पाठवा. ✨" },
                    { "SESSION_TRANSFERRED_ALERT", "🔄 *अपॉइंटमेंट पुढे ढकलली आहे* 🔄\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्कार 🙏,\n\n*Dr. {0}* यांचे मागील सत्र संपले आहे. तुमची अपॉइंटमेंट पुढच्या सत्रात (*{1}*) आपोआप शिफ्ट केली गेली आहे.\n\n🎟️ तुमचा नवीन टोकन नंबर आहे: *#{2}*\n\nआम्ही पुढच्या सत्रात तुमची वाट पाहू. ✨" },
                    { "QUEUE_PAUSED_ALERT", "⏸️ *रांग (Line) थांबवली आहे* ⏸️\n━━━━━━━━━━━━━━━━━━━━━\n\nनमस्कार 🙏,\n\nDr. {0} यांची रांग काही काळासाठी ({1} मिनिटे) थांबवली आहे.{2}\n\n👉 कृपया प्रतीक्षा करा. रांग लवकरच पुन्हा सुरू होईल. ✨" }
                }
            },
            { "3", new Dictionary<string, string> // ENGLISH
                {
                    { "WELCOME_LANGUAGE", "🙏 Hello!\n\n🏥 Welcome to {0}.\n\nFor a smooth experience, please choose your language:\n\n1️⃣ हिन्दी\n2️⃣ मराठी\n3️⃣ English\n\n👉 (Please reply with 1, 2, or 3)" },
                    { "ASK_NAME", "😊 Thank you!\n\nBefore we book your appointment, please tell us your full name.\n\n✍️ (Example: Rahul Sharma)" },
                    { "SELECT_DOCTOR", "🙏 Thank you, {0}.\n\nWhich doctor would you like to consult? Please select a number:\n\n{1}\n9️⃣ Main Menu\n\n👉 (Reply with just the number)" },
                    { "SELECT_SESSION", "👨‍⚕️ You chose Dr. {0}.\n({1})\n\nPlease select a convenient time (session):\n\n{2}\n9️⃣ Main Menu\n\n👉 (Reply with just the number)" },
                    { "CONFIRM_DETAILS", "📋 Please check your booking details:\n\n👤 Patient: {0}\n👨‍⚕️ Doctor: Dr. {1}\n🩺 Specialization: {2}\n📅 Session: {3}\n🕘 Time: {4}\n\n✅ 1 - Confirm Appointment\n❌ 2 - Go Back\n9️⃣ Main Menu\n\n👉 (Reply with 1, 2 or 9)" },
                    { "SUCCESS_BOOKING", "🎉 *Appointment Confirmed!*\n\n🎟️ *Token Number:* #{0}\n👨‍⚕️ Doctor: Dr. {1}\n📅 Session: {2}\n🕘 Time: {3}\n\n📍 Please arrive at the clinic 10-15 minutes before your turn.\n\n📊 Reply with *1* (or STATUS) anytime to check your live queue status.\n\n🙏 Thank you!" },
                    { "ACTIVE_APPOINTMENT", "ℹ️ You already have an active appointment:\n\n👨‍⚕️ Doctor: Dr. {0}\n🎟️ Token: #{1}\n📌 Status: Waiting in queue\n\nWhat would you like to do?\n\n1️⃣ Check Live Status\n2️⃣ View Appointment Details\n3️⃣ Change Appointment Time\n4️⃣ Cancel Appointment\n0️⃣ Change Language\n\n👉 (Please reply with just the number)" },
                    { "APPOINTMENT_DETAILS", "📋 *Your Appointment Details:*\n\n👤 Patient: {0}\n👨‍⚕️ Doctor: Dr. {1}\n🎟️ Token: #{2}\n📅 Session: {3}\n📌 Status: Waiting for your turn" },
                    { "QUEUE_STATUS", "📊 *Live Queue Status:*\n\n👨‍⚕️ Doctor: Dr. {0}\n🔢 Ongoing Token: #{1}\n🎟️ Your Token: #{2}\n👥 Patients Ahead: {3}\n⏳ Estimated Wait: {4} mins\n\n🙏 Please wait for your turn." },
                    { "CANCEL_PROMPT", "⚠️ Are you sure you want to cancel your appointment?\n\n1️⃣ Yes, Cancel\n2️⃣ No, Keep it\n\n👉 (Reply with 1 or 2)" },
                    { "CANCEL_SUCCESS", "✅ Your appointment has been cancelled.\n\nType *HI* anytime to book a new appointment. Thank you! 🙏" },
                    { "RESCHEDULE_PROMPT", "🔄 Please select a new time (session):\n\n{0}\n👉 (Reply with just the number)" },
                    { "REJOIN_SUCCESS", "🔄 You have been added back to the queue!\n\n🎟️ Your new Token Number is: #{0}\n\n🙏 Please wait for your turn." },
                    { "SESSION_FULL", "⚠️ Sorry, the selected session is completely full.\n\nPlease choose another time." },
                    { "NO_SESSIONS", "😔 Sorry, there are no active sessions available right now.\n\nPlease try again later." },
                    { "NO_DOCTORS", "😔 Sorry, no doctors are available right now.\n\nPlease try again later." },
                    { "INVALID_INPUT", "⚠️ Sorry, we didn't understand that.\n\nIf you want to discontinue this process and return to the main menu, please reply with *1*.\n\nOtherwise, reply with a valid number (e.g., 1 or 2)." },
                    { "CONFIRM_DISCONTINUE_PROMPT", "⚠️ Sorry, we didn't understand that.\n\nDo you want to discontinue the current process?\n\n1️⃣ Yes, Discontinue\n2️⃣ No, Continue\n\n👉 (Reply with 1 or 2)" },
                    { "INVALID_INPUT_HELP", "🆘 To return to the main menu, please reply with *HI*." },
                    { "RATING_PROMPT", "🌟 Your check-up is complete!\n\nPlease rate your experience by replying with a number between 1 and 5:\n\n5️⃣ - Excellent\n4️⃣ - Good\n3️⃣ - Average\n2️⃣ - Poor\n1️⃣ - Terrible\n\n👉 (Reply with just one number)" },
                    { "COMMENT_PROMPT", "🙏 Thank you so much!\n\nIf you have any feedback or suggestions, please type them here.\nOr reply with *SKIP* to ignore." },
                    { "FEEDBACK_SUCCESS", "❤️ Thank you for your valuable feedback!\n\nYour health is our priority. Stay healthy! 😊" },
                    { "EMERGENCY_ALERT", "🚨 *MEDICAL EMERGENCY*\n\nPlease visit the nearest hospital or call an ambulance immediately.\n\n⚠️ This WhatsApp number is not for emergencies." },
                    { "HELP_MENU", "❓ *Help Menu*\n\nReply with these words to use features:\n\n*STATUS* - Check your live queue number\n*HI* - Start over" },
                    { "SESSION_CANCELLED", "⚠️ Sorry, the selected session is no longer available.\n\nPlease choose a different session." },
                    { "NO_ACTIVE_APP", "ℹ️ You don't have any booked appointments right now." },
                    { "NO_SKIPPED_APP", "ℹ️ We couldn't find any skipped appointments for you." },
                    { "BOOKING_CONFIRMED_ALERT", "🏥 *APPOINTMENT CONFIRMED* 🏥\n━━━━━━━━━━━━━━━━━━━━━\n\nHello *{0}* 🙏,\n\nYour doctor appointment is booked.\n\n🔢 *Your Token Number:* #{1}\n\n{2}📌 *Important Notes:*\n• Please reach the clinic on time.\n• No need to ask repeatedly—we will automatically send you a WhatsApp message shortly before your turn.\n\n✨ _Wishing you good health!_" },
                    { "ESTIMATED_WAIT_MSG", "⏱️ *Estimated Wait:* approx {0} mins\n\n" },
                    { "DOCTOR_ARRIVED_ALERT", "👨‍⚕️ *DOCTOR HAS ARRIVED* 👨‍⚕️\n━━━━━━━━━━━━━━━━━━━━━\n\nHello 🙏,\n\n*Dr. {0}* has arrived at the clinic and started seeing patients.\n\n👉 Please take a seat in the waiting area until your turn comes.\n\n✨ _We are here to help you._" },
                    { "YOUR_TURN_ALERT", "🔔 *IT'S YOUR TURN!* 🔔\n━━━━━━━━━━━━━━━━━━━━━\n\n👉 *Token #{0}*\n\nPlease come inside the doctor's cabin immediately. The doctor is waiting for you.\n\n✨ _Get well soon!_" },
                    { "UPCOMING_TURN_ALERT", "⏳ *JUST A LITTLE LONGER...* ⏳\n━━━━━━━━━━━━━━━━━━━━━\n\nHello 🙏,\n\nThere are only *{0} patient(s)* ahead of you.\n\n👉 Please come near the doctor's cabin. Your turn could be next!\n\n✨ _Thank you for your patience._" },
                    { "FEEDBACK_REQUEST_ALERT", "🌟 *HOW WAS YOUR EXPERIENCE?* 🌟\n━━━━━━━━━━━━━━━━━━━━━\n\nHello 🙏,\n\nThank you for consulting *Dr. {0}* today.\n\nPlease reply to this message with a number between *1 and 5* to rate your experience:\n\n5️⃣ (Excellent)\n4️⃣ (Good)\n3️⃣ (Average)\n2️⃣ (Needs Improvement)\n1️⃣ (Terrible)\n\nYour feedback is very valuable to us. 🙌\n_Ref: {1}_" },
                    { "ALREADY_BOOKED", "ℹ️ You already have an appointment booked in this session.\n\nReply with *1* anytime to check your live queue number. ✨" },
                    { "MULTIPLE_PATIENTS", "👥 Multiple patients are associated with this number.\n\nWho would you like to book for?\n\n{0}\n👉 (Please reply with just the number)" },
                    { "INVALID_PATIENT_SELECTION", "⚠️ Sorry, please select a valid patient number from the list above." },
                    { "BOOKING_ERROR", "⚠️ There was an issue booking your appointment: {0}\n\nPlease type *HI* and try again in a few minutes. 🙏" },
                    { "APPOINTMENT_MISSED_ALERT", "⚠️ *APPOINTMENT MISSED* ⚠️\n━━━━━━━━━━━━━━━━━━━━━\n\nYour *Token #{0}* (Dr. {1}) was called, but you were not present.\n\nWe have called the next patient and your number has been *SKIPPED*.\n\n👉 If you are at the clinic and want to rejoin the line, please reply with *1*. ✨" },
                    { "MISSED_APP_MENU", "⚠️ *APPOINTMENT MISSED* ⚠️\n\nYou missed your appointment for Token #{1} with Dr. {0}.\n\n👉 Send *1* to Rejoin the queue\n👉 Send *0* to Change Language\n👉 Send *HI* to start over" },
                    { "APPOINTMENT_CANCELLED_ALERT", "⚠️ *APPOINTMENT CANCELLED* ⚠️\n🏢 *{0}*\n━━━━━━━━━━━━━━━━━━━━━\n\nHello {1} 🙏,\n\nImportant Notice: Due to an emergency or leave, *Dr. {2}'s* session for today has been cancelled.\n\nYour Token #{3} has been cancelled. We are very sorry for the inconvenience. 🙏\n\n👉 Please reply with *HI* to book a new appointment. ✨" },
                    { "SESSION_CANCELLED_ALERT", "⚠️ *SESSION ENDED* ⚠️\n━━━━━━━━━━━━━━━━━━━━━\n\nHello 🙏,\n\nWe're sorry, but *Dr. {0}'s* session has ended before your turn came. Your token has been cancelled.\n\n👉 Please reply with *HI* to book a new appointment. ✨" },
                    { "SESSION_TRANSFERRED_ALERT", "🔄 *APPOINTMENT TRANSFERRED* 🔄\n━━━━━━━━━━━━━━━━━━━━━\n\nHello 🙏,\n\n*Dr. {0}'s* previous session has ended. Your appointment has been automatically shifted to the next session (*{1}*).\n\n🎟️ Your new Token Number is: *#{2}*\n\nWe will see you in the next session. ✨" },
                    { "QUEUE_PAUSED_ALERT", "⏸️ *QUEUE PAUSED* ⏸️\n━━━━━━━━━━━━━━━━━━━━━\n\nHello 🙏,\n\nDr. {0}'s queue has been paused for {1} minutes.{2}\n\n👉 Please wait. The queue will resume shortly. ✨" }
                }
            }
        };
    }
}
