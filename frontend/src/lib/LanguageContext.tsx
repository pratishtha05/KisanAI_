"use client";
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Globe, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const translations: Record<string, Record<string, string>> = {
  en: {
    "auth.mobile.title": "📱 Enter your mobile number",
    "auth.mobile.subtitle": "We will send you a one-time verification code.",
    "auth.mobile.send": "Send OTP",
    "auth.mobile.sending": "Sending...",
    "auth.mobile.error_length": "Please enter a valid 10-digit number",
    "auth.mobile.error_failed": "Failed to send OTP. Please try again.",

    "auth.otp.title": "🔒 Enter Verification Code",
    "auth.otp.subtitle": "Enter the 6-digit code sent to",
    "auth.otp.verify": "Verify & Login",
    "auth.otp.verifying": "Verifying...",
    "auth.otp.error_length": "Please enter a 6-digit OTP",
    "auth.otp.error_invalid": "Invalid OTP. Please try again.",

    "onboarding.title": "Welcome! Let's get to know your farm.",
    "onboarding.step1.q": "What should we call you?",
    "onboarding.step1.placeholder": "Your name",
    
    "onboarding.step2.q": "What are you growing? (Select all that apply)",
    "onboarding.step2.apple": "Apple",
    "onboarding.step2.cornmaize": "Corn/Maize",
    "onboarding.step2.potato": "Potato",
    "onboarding.step2.rice": "Rice",
    "onboarding.step2.sugarcane": "Sugarcane",
    "onboarding.step2.tea": "Tea",
    "onboarding.step2.cassava": "Cassava",
    "onboarding.step2.tomato": "Tomato",
    "onboarding.step2.wheat": "Wheat",
    
    "onboarding.step2b.q": "Tell us about your selected crops",
    "onboarding.step2b.stage_title": "Current Stage",
    "onboarding.step2b.stage_sown": "Just Sown",
    "onboarding.step2b.stage_veg": "Growing",
    "onboarding.step2b.stage_flower": "Flowering",
    "onboarding.step2b.stage_harvest": "Harvesting",
    "onboarding.step2b.cycle_title": "Expected Cycle",
    "onboarding.step2b.cycle_short": "Short (~3 mo)",
    "onboarding.step2b.cycle_med": "Medium (~4 mo)",
    "onboarding.step2b.cycle_long": "Long (5+ mo)",

    "onboarding.step3.q": "Where is your farm?",
    "onboarding.step3.state": "State",
    "onboarding.step3.district": "District",
    
    "onboarding.step4.choice.gps": "Use My Current Location",
    "onboarding.step4.choice.gps_desc": "Automatically detect location",
    "onboarding.step4.choice.manual": "Enter Location Manually",
    "onboarding.step4.choice.manual_desc": "Select your state, district and village",
    "onboarding.step4.gps.loading": "Finding your location...",
    "onboarding.step4.gps.error": "Couldn't access your location.",
    "onboarding.step4.gps.error_desc": "Please allow location access or enter your location manually.",
    "onboarding.step4.gps.try_again": "Try Again",
    "onboarding.step4.gps.success": "Location Found",
    "onboarding.step4.change": "Change Location Method",
    "onboarding.step4.select_state": "Select State",
    "onboarding.step4.select_district": "Select District",
    "onboarding.step4.manual.village": "Village / Town",
    "onboarding.step4.select_village": "Select Village",
    
    "onboarding.step4.q": "How much land do you farm?",
    "onboarding.step4.acres": "acres",
    
    "onboarding.step5.q": "What type of soil do you have?",
    "onboarding.step5.loamy": "Loamy",
    "onboarding.step5.sandy": "Sandy",
    "onboarding.step5.clay": "Clay",
    "onboarding.step5.black": "Black Soil",
    
    "onboarding.btn.continue": "Continue",
    "onboarding.btn.finish": "Finish",
    "onboarding.error_saving": "Error saving farm data.",
    "lang.switch": "Change Language",

    "disease.crop_health": "Crop Health",
    "disease.title": "Check your crop for disease",
    "disease.subtitle": "Select your crop and upload a clear photo of a leaf to check for signs of disease.",
    "disease.select_crop": "Select your crop",
    "disease.add_leaf_photo": "Add a leaf photo",
    "disease.close_photo": "Take a close photo of one affected leaf whenever possible.",
    "disease.better_result": "For a better result",
    "disease.good.close": "Take a close photo of one leaf",
    "disease.good.light": "Use natural or good lighting",
    "disease.good.visible": "Keep the affected area visible",
    "disease.good.focus": "Keep the image sharp and focused",
    "disease.avoid.screenshots": "Avoid screenshots or documents",
    "disease.avoid.field": "Avoid whole-field photographs",
    "disease.avoid.dark": "Avoid very dark or blurry images",
    "disease.avoid.no_leaf": "Avoid photos without a visible leaf",
    "disease.upload_leaf": "Upload a leaf photo",
    "disease.clear_image": "Use a clear, well-lit image where the leaf and affected area can be seen.",
    "disease.upload_photo": "Upload photo",
    "disease.take_photo": "Take photo",
    "disease.change_photo": "Change photo",
    "disease.check_leaf": "Check leaf",
    "disease.checking": "Checking image...",
    "disease.how_it_works": "How it works",
    "disease.how_it_works_desc": "Choose the crop, upload a clear leaf photo, and KisanAI will check the image for signs of disease.",
    "disease.choose_crop": "Choose your crop",
    "disease.choose_crop_desc": "Select the crop that matches the leaf you want to check.",
    "disease.upload_clear": "Upload a clear photo",
    "disease.upload_clear_desc": "A close-up photo with the affected part of the leaf clearly visible gives a better result.",
    "disease.simple_guidance": "Get simple guidance",
    "disease.simple_guidance_desc": "If a disease is found, you will see its signs, possible reasons, what you can do, and how to prevent it.",
    "disease.model_note": "KisanAI currently checks the crops and diseases included in its trained model.",
    "disease.unclear_label": "Unable to identify clearly",
    "disease.clearer_photo": "We need a clearer leaf photo",
    "disease.upload_another": "Upload another photo",
    "disease.check_crop": "Please check the crop",
    "disease.other_crop": "The photo may be from another crop",
    "disease.selected_crop": "Selected crop",
    "disease.looks_like": "Photo looks more like",
    "disease.no_disease_reported": "No disease is being reported from this result. Please check the crop selection or upload a clearer photo.",
    "disease.try_another": "Try another photo",
    "disease.no_disease": "No disease pattern detected",
    "disease.possible_disease": "Possible disease detected",
    "disease.looks_healthy": "looks healthy",
    "disease.healthy_message": "The photo does not show a disease pattern supported by KisanAI.",
    "disease.confidence": "Detection confidence",
    "disease.confidence_desc": "Indicates the confidence level of KisanAI in detecting the disease",
    "disease.about": "About this disease",
    "disease.signs": "Signs you may see",
    "disease.why": "Why it may happen",
    "disease.actions": "What you can do",
    "disease.prevention": "How to prevent it",
    "disease.farming_guidance": "Farming guidance",
    "disease.guidance_reference": "This guidance is based on agricultural references used by KisanAI.",
    "disease.view_source": "View source →",
    "disease.pesticide_tip": "Tip: If you plan to use a pesticide, it is best to confirm the problem with a local agriculture expert first.",
    "disease.check_another": "Check another leaf",
    "disease.retry_title": "Try another photo",
    "disease.retry.close": "Take a close photo of one leaf.",
    "disease.retry.focus": "Keep the affected area clear and in focus.",
    "disease.retry.light": "Use natural daylight where possible.",
    "disease.error_crop": "Please select your crop first.",
    "disease.error_photo": "Please upload a clear photo of the affected leaf.",
    "disease.error_generic": "We could not check this image. Please try again.",
    "disease.crop.apple": "Apple",
    "disease.crop.cassava": "Cassava",
    "disease.crop.corn": "Corn",
    "disease.crop.potato": "Potato",
    "disease.crop.rice": "Rice",
    "disease.crop.sugarcane": "Sugarcane",
    "disease.crop.tea": "Tea",
    "disease.crop.tomato": "Tomato",
    "disease.crop.wheat": "Wheat",
    "weather.guidance": "Weather-based farm guidance",
    "weather.title": "Weather Intelligence",
    "weather.subtitle": "Understand the forecast and what it means for your crop.",

    "weather.today": "Today",
    "weather.temperature": "Maximum / minimum temperature",
    "weather.rainProbability": "Rain probability",
    "weather.rainfall": "Rainfall",
    "weather.wind": "Wind",
    "weather.windGusts": "Wind gusts",
    "weather.evapotranspiration": "Evapotranspiration",

    "weather.rainLikelihood": "Rain likelihood",
    "weather.rainfallIntensity": "Rainfall intensity",
    "weather.etReference": "ET₀ = reference evapotranspiration",

    "weather.cropNotSpecified": "Crop not specified",
    "weather.stage": "stage",

    "weather.thisWeek": "This week",
    "weather.noWeatherAlerts": "No weather alerts for your crop this week.",

    "weather.whatToDo": "What to do",
    "weather.recommendedAction": "Recommended action",
    "weather.forecast": "Forecast",
    "weather.source": "Source",

    "weather.bestTimeToSpray": "Best time to spray",
    "weather.sprayDescription": "Periods with low rain and manageable wind.",
    "weather.good": "Good",
    "weather.okay": "Okay",
    "weather.noGoodSprayingTime": "No good spraying time found after",
    "weather.noSuitableSprayWindows": "No suitable spray windows found in the forecast period.",

    "weather.sevenDayForecast": "7-Day Forecast",
    "weather.tapDay": "Tap a day for more detail.",
    "weather.strongWind": "Strong wind",
    "weather.rain": "Rain",
    "weather.windGust": "Wind gusts",
    "weather.etDescription": "Evapotranspiration (ET₀): water lost from soil and crop",

    "weather.loading": "Loading weather intelligence...",
    "weather.noFarm": "No farm information found",
    "weather.addFarm": "Please add your crop and farm details before viewing weather intelligence.",
    "weather.unableToLoad": "Unable to load weather intelligence",
    "weather.tryAgain": "Please try again after checking your connection.",
    "weather.alert":"alert",
    "weather.warning":"warning",
  },

  hi: {
    "auth.mobile.title": "📱 अपना मोबाइल नंबर दर्ज करें",
    "auth.mobile.subtitle": "हम आपको एक वन-टाइम सत्यापन कोड भेजेंगे।",
    "auth.mobile.send": "OTP भेजें",
    "auth.mobile.sending": "भेजा जा रहा है...",
    "auth.mobile.error_length": "कृपया एक वैध 10-अंकीय नंबर दर्ज करें",
    "auth.mobile.error_failed": "OTP भेजने में विफल। कृपया पुनः प्रयास करें।",

    "auth.otp.title": "🔒 सत्यापन कोड दर्ज करें",
    "auth.otp.subtitle": "पर भेजे गए 6-अंकीय कोड को दर्ज करें",
    "auth.otp.verify": "सत्यापित करें और लॉगिन करें",
    "auth.otp.verifying": "सत्यापित किया जा रहा है...",
    "auth.otp.error_length": "कृपया 6-अंकीय OTP दर्ज करें",
    "auth.otp.error_invalid": "अमान्य OTP। कृपया पुनः प्रयास करें।",

    "onboarding.title": "स्वागत है! आइए आपके खेत को जानें।",
    "onboarding.step1.q": "हम आपको क्या कह कर बुलाएँ?",
    "onboarding.step1.placeholder": "आपका नाम",
    
    "onboarding.step2.q": "आप क्या उगा रहे हैं? (सभी लागू चुनें)",
    "onboarding.step2.apple": "सेब",
    "onboarding.step2.cornmaize": "मक्का",
    "onboarding.step2.potato": "आलू",
    "onboarding.step2.rice": "चावल",
    "onboarding.step2.sugarcane": "गन्ना",
    "onboarding.step2.tea": "चाय",
    "onboarding.step2.cassava": "कसावा",
    "onboarding.step2.tomato": "टमाटर",
    "onboarding.step2.wheat": "गेहूँ",
    
    "onboarding.step2b.q": "अपनी फसलों के बारे में बताएं",
    "onboarding.step2b.stage_title": "वर्तमान चरण",
    "onboarding.step2b.stage_sown": "अभी बोया है",
    "onboarding.step2b.stage_veg": "बढ़ रहा है",
    "onboarding.step2b.stage_flower": "फूल आ रहे हैं",
    "onboarding.step2b.stage_harvest": "कटाई",
    "onboarding.step2b.cycle_title": "अपेक्षित चक्र",
    "onboarding.step2b.cycle_short": "छोटा (~3 माह)",
    "onboarding.step2b.cycle_med": "मध्यम (~4 माह)",
    "onboarding.step2b.cycle_long": "लंबा (5+ माह)",

    "onboarding.step3.q": "आपका खेत कहाँ है?",
    "onboarding.step3.state": "राज्य",
    "onboarding.step3.district": "ज़िला",
    
    "onboarding.step4.choice.gps": "मेरे वर्तमान स्थान का उपयोग करें",
    "onboarding.step4.choice.gps_desc": "स्वचालित रूप से स्थान का पता लगाएं",
    "onboarding.step4.choice.manual": "स्थान मैन्युअल रूप से दर्ज करें",
    "onboarding.step4.choice.manual_desc": "अपना राज्य, ज़िला और गाँव चुनें",
    "onboarding.step4.gps.loading": "आपका स्थान खोजा जा रहा है...",
    "onboarding.step4.gps.error": "आपके स्थान तक नहीं पहुंच सके।",
    "onboarding.step4.gps.error_desc": "कृपया स्थान पहुंच की अनुमति दें या अपना स्थान मैन्युअल रूप से दर्ज करें।",
    "onboarding.step4.gps.try_again": "पुनः प्रयास करें",
    "onboarding.step4.gps.success": "स्थान मिल गया",
    "onboarding.step4.change": "स्थान की विधि बदलें",
    "onboarding.step4.select_state": "राज्य चुनें",
    "onboarding.step4.select_district": "ज़िला चुनें",
    "onboarding.step4.manual.village": "गाँव / शहर",
    "onboarding.step4.select_village": "गाँव चुनें",
    
    "onboarding.step4.q": "आप कितने क्षेत्र में खेती करते हैं?",
    "onboarding.step4.acres": "एकड़",
    
    "onboarding.step5.q": "आपके पास किस प्रकार की मिट्टी है?",
    "onboarding.step5.loamy": "दोमट",
    "onboarding.step5.sandy": "बलुई",
    "onboarding.step5.clay": "चिकनी",
    "onboarding.step5.black": "काली मिट्टी",
    
    "onboarding.btn.continue": "आगे बढ़ें",
    "onboarding.btn.finish": "समाप्त करें",
    "onboarding.error_saving": "खेत का डेटा सहेजने में त्रुटि।",
    "lang.switch": "भाषा बदलें",

    "disease.crop_health": "फसल स्वास्थ्य",
    "disease.title": "अपनी फसल में रोग की जाँच करें",
    "disease.subtitle": "अपनी फसल चुनें और पत्ते की साफ़ तस्वीर अपलोड करके रोग के संकेतों की जाँच करें।",
    "disease.select_crop": "अपनी फसल चुनें",
    "disease.add_leaf_photo": "पत्ते की तस्वीर जोड़ें",
    "disease.close_photo": "जहाँ संभव हो, प्रभावित पत्ते की पास से तस्वीर लें।",
    "disease.better_result": "बेहतर परिणाम के लिए",
    "disease.good.close": "एक पत्ते की पास से तस्वीर लें",
    "disease.good.light": "प्राकृतिक या अच्छी रोशनी का उपयोग करें",
    "disease.good.visible": "प्रभावित हिस्सा साफ़ दिखाई देना चाहिए",
    "disease.good.focus": "तस्वीर साफ़ और फोकस में रखें",
    "disease.avoid.screenshots": "स्क्रीनशॉट या दस्तावेज़ की तस्वीर न लें",
    "disease.avoid.field": "पूरे खेत की तस्वीर न लें",
    "disease.avoid.dark": "बहुत अंधेरी या धुंधली तस्वीर न लें",
    "disease.avoid.no_leaf": "ऐसी तस्वीर न लें जिसमें पत्ता दिखाई न दे",
    "disease.upload_leaf": "पत्ते की तस्वीर अपलोड करें",
    "disease.clear_image": "ऐसी साफ़ और अच्छी रोशनी वाली तस्वीर लें जिसमें पत्ता और प्रभावित हिस्सा स्पष्ट दिखाई दे।",
    "disease.upload_photo": "तस्वीर अपलोड करें",
    "disease.take_photo": "तस्वीर लें",
    "disease.change_photo": "तस्वीर बदलें",
    "disease.check_leaf": "पत्ते की जाँच करें",
    "disease.checking": "तस्वीर की जाँच हो रही है...",
    "disease.how_it_works": "यह कैसे काम करता है",
    "disease.how_it_works_desc": "फसल चुनें, पत्ते की साफ़ तस्वीर अपलोड करें और KisanAI तस्वीर में रोग के संकेतों की जाँच करेगा।",
    "disease.choose_crop": "अपनी फसल चुनें",
    "disease.choose_crop_desc": "जिस पत्ते की जाँच करनी है, उसकी सही फसल चुनें।",
    "disease.upload_clear": "साफ़ तस्वीर अपलोड करें",
    "disease.upload_clear_desc": "पत्ते के प्रभावित हिस्से की साफ़ और पास से ली गई तस्वीर बेहतर परिणाम देती है।",
    "disease.simple_guidance": "सरल जानकारी प्राप्त करें",
    "disease.simple_guidance_desc": "यदि रोग पाया जाता है, तो आपको उसके संकेत, संभावित कारण, क्या करें और बचाव की जानकारी मिलेगी।",
    "disease.model_note": "KisanAI फिलहाल अपने प्रशिक्षित मॉडल में शामिल फसलों और रोगों की जाँच करता है।",
    "disease.unclear_label": "स्पष्ट पहचान नहीं हो सकी",
    "disease.clearer_photo": "हमें पत्ते की अधिक साफ़ तस्वीर चाहिए",
    "disease.upload_another": "दूसरी तस्वीर अपलोड करें",
    "disease.check_crop": "कृपया फसल की जाँच करें",
    "disease.other_crop": "तस्वीर किसी दूसरी फसल की हो सकती है",
    "disease.selected_crop": "चुनी गई फसल",
    "disease.looks_like": "तस्वीर इससे अधिक मिलती है",
    "disease.no_disease_reported": "इस परिणाम के आधार पर किसी रोग की पुष्टि नहीं की जा रही है। फसल का चयन जाँचें या अधिक साफ़ तस्वीर अपलोड करें।",
    "disease.try_another": "दूसरी तस्वीर आज़माएँ",
    "disease.no_disease": "रोग के संकेत नहीं मिले",
    "disease.possible_disease": "संभावित रोग पाया गया",
    "disease.looks_healthy": "स्वस्थ दिखती है",
    "disease.healthy_message": "तस्वीर में KisanAI द्वारा पहचाने जाने वाले रोग के संकेत नहीं दिखाई दे रहे हैं।",
    "disease.confidence": "पहचान का भरोसा",
    "disease.confidence_desc": "यह बताता है कि रोग की पहचान को लेकर KisanAI का भरोसा कितना है",
    "disease.about": "इस रोग के बारे में",
    "disease.signs": "आपको दिखाई देने वाले संकेत",
    "disease.why": "यह क्यों हो सकता है",
    "disease.actions": "आप क्या कर सकते हैं",
    "disease.prevention": "इससे कैसे बचें",
    "disease.farming_guidance": "कृषि संबंधी जानकारी",
    "disease.guidance_reference": "यह जानकारी KisanAI द्वारा उपयोग किए गए कृषि संदर्भों पर आधारित है।",
    "disease.view_source": "स्रोत देखें →",
    "disease.pesticide_tip": "सलाह: यदि आप कीटनाशक का उपयोग करना चाहते हैं, तो पहले स्थानीय कृषि विशेषज्ञ से समस्या की पुष्टि करना बेहतर है।",
    "disease.check_another": "दूसरे पत्ते की जाँच करें",
    "disease.retry_title": "दूसरी तस्वीर लें",
    "disease.retry.close": "एक पत्ते की पास से तस्वीर लें।",
    "disease.retry.focus": "प्रभावित हिस्सा साफ़ और फोकस में रखें।",
    "disease.retry.light": "जहाँ संभव हो प्राकृतिक रोशनी का उपयोग करें।",
    "disease.error_crop": "कृपया पहले अपनी फसल चुनें।",
    "disease.error_photo": "कृपया प्रभावित पत्ते की साफ़ तस्वीर अपलोड करें।",
    "disease.error_generic": "हम इस तस्वीर की जाँच नहीं कर सके। कृपया दोबारा प्रयास करें।",
    "disease.crop.apple": "सेब",
    "disease.crop.cassava": "कसावा",
    "disease.crop.corn": "मक्का",
    "disease.crop.potato": "आलू",
    "disease.crop.rice": "चावल",
    "disease.crop.sugarcane": "गन्ना",
    "disease.crop.tea": "चाय",
    "disease.crop.tomato": "टमाटर",
    "disease.crop.wheat": "गेहूँ",
    "weather.guidance": "मौसम आधारित कृषि मार्गदर्शन",
    "weather.title": "मौसम संबंधी जानकारी",
    "weather.subtitle": "मौसम के पूर्वानुमान को समझें और जानें कि इसका आपकी फसल पर क्या प्रभाव पड़ सकता है।",

    "weather.today": "आज",
    "weather.temperature": "अधिकतम / न्यूनतम तापमान",
    "weather.rainProbability": "वर्षा की संभावना",
    "weather.rainfall": "वर्षा",
    "weather.wind": "हवा",
    "weather.windGusts": "हवा के झोंके",
    "weather.evapotranspiration": "वाष्पोत्सर्जन",

    "weather.rainLikelihood": "वर्षा की संभावना",
    "weather.rainfallIntensity": "वर्षा की तीव्रता",
    "weather.etReference": "ET₀ = संदर्भ वाष्पोत्सर्जन",

    "weather.cropNotSpecified": "फसल निर्दिष्ट नहीं है",
    "weather.stage": "अवस्था",

    "weather.thisWeek": "इस सप्ताह",
    "weather.noWeatherAlerts": "इस सप्ताह आपकी फसल के लिए कोई मौसम चेतावनी नहीं है।",

    "weather.whatToDo": "क्या करें",
    "weather.recommendedAction": "अनुशंसित कार्य",
    "weather.forecast": "मौसम पूर्वानुमान",
    "weather.source": "स्रोत",

    "weather.bestTimeToSpray": "स्प्रे करने का सही समय",
    "weather.sprayDescription": "कम वर्षा और अनुकूल हवा वाले समय।",
    "weather.good": "अच्छा",
    "weather.okay": "उपयुक्त",
    "weather.noGoodSprayingTime": "इसके बाद कोई अच्छा स्प्रे समय नहीं मिला",
    "weather.noSuitableSprayWindows": "पूर्वानुमान अवधि में कोई उपयुक्त स्प्रे समय नहीं मिला।",

    "weather.sevenDayForecast": "7-दिन का मौसम पूर्वानुमान",
    "weather.tapDay": "अधिक जानकारी के लिए किसी दिन पर क्लिक करें।",
    "weather.strongWind": "तेज़ हवा",
    "weather.rain": "वर्षा",
    "weather.windGust": "हवा के झोंके",
    "weather.etDescription": "वाष्पोत्सर्जन (ET₀): मिट्टी और फसल से खोया हुआ पानी",

    "weather.loading": "मौसम की जानकारी लोड हो रही है...",
    "weather.noFarm": "खेत की जानकारी नहीं मिली",
    "weather.addFarm": "मौसम की जानकारी देखने से पहले अपनी फसल और खेत की जानकारी जोड़ें।",
    "weather.unableToLoad": "मौसम की जानकारी लोड नहीं हो सकी",
    "weather.tryAgain": "कृपया अपना इंटरनेट कनेक्शन जांचकर दोबारा प्रयास करें।",
  },
  pa: {
    "auth.mobile.title": "📱 ਆਪਣਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ",
    "auth.mobile.subtitle": "ਅਸੀਂ ਤੁਹਾਨੂੰ ਇੱਕ ਵਨ-ਟਾਈਮ ਵੈਰੀਫਿਕੇਸ਼ਨ ਕੋਡ ਭੇਜਾਂਗੇ।",
    "auth.mobile.send": "OTP ਭੇਜੋ",
    "auth.mobile.sending": "ਭੇਜ ਰਿਹਾ ਹੈ...",
    "auth.mobile.error_length": "ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਵੈਧ 10-ਅੰਕਾਂ ਵਾਲਾ ਨੰਬਰ ਦਰਜ ਕਰੋ",
    "auth.mobile.error_failed": "OTP ਭੇਜਣ ਵਿੱਚ ਅਸਫਲ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",

    "auth.otp.title": "🔒 ਵੈਰੀਫਿਕੇਸ਼ਨ ਕੋਡ ਦਰਜ ਕਰੋ",
    "auth.otp.subtitle": "ਤੇ ਭੇਜਿਆ 6-ਅੰਕਾਂ ਵਾਲਾ ਕੋਡ ਦਰਜ ਕਰੋ",
    "auth.otp.verify": "ਪੁਸ਼ਟੀ ਕਰੋ ਅਤੇ ਲਾਗਇਨ ਕਰੋ",
    "auth.otp.verifying": "ਪੁਸ਼ਟੀ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ...",
    "auth.otp.error_length": "ਕਿਰਪਾ ਕਰਕੇ 6-ਅੰਕਾਂ ਵਾਲਾ OTP ਦਰਜ ਕਰੋ",
    "auth.otp.error_invalid": "ਅਵੈਧ OTP। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",

    "onboarding.title": "ਜੀ ਆਇਆਂ ਨੂੰ! ਆਓ ਤੁਹਾਡੇ ਖੇਤ ਬਾਰੇ ਜਾਣੀਏ।",
    "onboarding.step1.q": "ਅਸੀਂ ਤੁਹਾਨੂੰ ਕੀ ਕਹਿ ਕੇ ਬੁਲਾਈਏ?",
    "onboarding.step1.placeholder": "ਤੁਹਾਡਾ ਨਾਮ",
    
    "onboarding.step2.q": "ਤੁਸੀਂ ਕੀ ਉਗਾ ਰਹੇ ਹੋ? (ਸਾਰੇ ਲਾਗੂ ਚੁਣੋ)",
    "onboarding.step2.apple": "ਸੇਬ",
    "onboarding.step2.cornmaize": "ਮੱਕੀ",
    "onboarding.step2.potato": "ਆਲੂ",
    "onboarding.step2.rice": "ਚਾਵਲ",
    "onboarding.step2.sugarcane": "ਗੰਨਾ",
    "onboarding.step2.tea": "ਚਾਹ",
    "onboarding.step2.cassava": "ਕਸਾਵਾ",
    "onboarding.step2.tomato": "ਟਮਾਟਰ",
    "onboarding.step2.wheat": "ਕਣਕ",
    
    "onboarding.step2b.q": "ਆਪਣੀਆਂ ਫਸਲਾਂ ਬਾਰੇ ਦੱਸੋ",
    "onboarding.step2b.stage_title": "ਮੌਜੂਦਾ ਪੜਾਅ",
    "onboarding.step2b.stage_sown": "ਹੁਣੇ ਬੀਜਿਆ",
    "onboarding.step2b.stage_veg": "ਵੱਧ ਰਿਹਾ ਹੈ",
    "onboarding.step2b.stage_flower": "ਫੁੱਲ ਆ ਰਹੇ ਹਨ",
    "onboarding.step2b.stage_harvest": "ਕਟਾਈ",
    "onboarding.step2b.cycle_title": "ਉਮੀਦ ਅਨੁਸਾਰ ਚੱਕਰ",
    "onboarding.step2b.cycle_short": "ਛੋਟਾ (~3 ਮਹੀਨੇ)",
    "onboarding.step2b.cycle_med": "ਦਰਮਿਆਨਾ (~4 ਮਹੀਨੇ)",
    "onboarding.step2b.cycle_long": "ਲੰਬਾ (5+ ਮਹੀਨੇ)",

    "onboarding.step3.q": "ਤੁਹਾਡਾ ਖੇਤ ਕਿੱਥੇ ਹੈ?",
    "onboarding.step3.state": "ਰਾਜ",
    "onboarding.step3.district": "ਜ਼ਿਲ੍ਹਾ",

    "onboarding.step4.choice.gps": "ਮੇਰੇ ਮੌਜੂਦਾ ਟਿਕਾਣੇ ਦੀ ਵਰਤੋਂ ਕਰੋ",
    "onboarding.step4.choice.gps_desc": "ਆਪਣੇ ਆਪ ਟਿਕਾਣਾ ਲੱਭੋ",
    "onboarding.step4.choice.manual": "ਆਪਣੇ ਆਪ ਟਿਕਾਣਾ ਦਰਜ ਕਰੋ",
    "onboarding.step4.choice.manual_desc": "ਆਪਣਾ ਰਾਜ, ਜ਼ਿਲ੍ਹਾ ਅਤੇ ਪਿੰਡ ਚੁਣੋ",
    "onboarding.step4.gps.loading": "ਤੁਹਾਡਾ ਟਿਕਾਣਾ ਲੱਭਿਆ ਜਾ ਰਿਹਾ ਹੈ...",
    "onboarding.step4.gps.error": "ਤੁਹਾਡੇ ਟਿਕਾਣੇ ਤੱਕ ਪਹੁੰਚ ਨਹੀਂ ਹੋ ਸਕੀ।",
    "onboarding.step4.gps.error_desc": "ਕਿਰਪਾ ਕਰਕੇ ਟਿਕਾਣੇ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ ਜਾਂ ਆਪਣਾ ਟਿਕਾਣਾ ਆਪਣੇ ਆਪ ਦਰਜ ਕਰੋ।",
    "onboarding.step4.gps.try_again": "ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
    "onboarding.step4.gps.success": "ਟਿਕਾਣਾ ਮਿਲ ਗਿਆ",
    "onboarding.step4.change": "ਟਿਕਾਣੇ ਦਾ ਤਰੀਕਾ ਬਦਲੋ",
    "onboarding.step4.select_state": "ਰਾਜ ਚੁਣੋ",
    "onboarding.step4.select_district": "ਜ਼ਿਲ੍ਹਾ ਚੁਣੋ",
    "onboarding.step4.manual.village": "ਪਿੰਡ / ਸ਼ਹਿਰ",
    "onboarding.step4.select_village": "ਪਿੰਡ ਚੁਣੋ",
    
    "onboarding.step4.q": "ਤੁਸੀਂ ਕਿੰਨੀ ਜ਼ਮੀਨ 'ਤੇ ਖੇਤੀ ਕਰਦੇ ਹੋ?",
    "onboarding.step4.acres": "ਏਕੜ",
    
    "onboarding.step5.q": "ਤੁਹਾਡੇ ਕੋਲ ਕਿਸ ਕਿਸਮ ਦੀ ਮਿੱਟੀ ਹੈ?",
    "onboarding.step5.loamy": "ਦੋਮਟ",
    "onboarding.step5.sandy": "ਰੇਤਲੀ",
    "onboarding.step5.clay": "ਚੀਕਣੀ",
    "onboarding.step5.black": "ਕਾਲੀ ਮਿੱਟੀ",
    
    "onboarding.btn.continue": "ਜਾਰੀ ਰੱਖੋ",
    "onboarding.btn.finish": "ਖਤਮ ਕਰੋ",
    "onboarding.error_saving": "ਖੇਤ ਦਾ ਡੇਟਾ ਸੇਵ ਕਰਨ ਵਿੱਚ ਤਰੁੱਟੀ।",
    "lang.switch": "ਭਾਸ਼ਾ ਬਦਲੋ",

    "disease.crop_health": "ਫਸਲ ਦੀ ਸਿਹਤ",
    "disease.title": "ਆਪਣੀ ਫਸਲ ਵਿੱਚ ਬਿਮਾਰੀ ਦੀ ਜਾਂਚ ਕਰੋ",
    "disease.subtitle": "ਆਪਣੀ ਫਸਲ ਚੁਣੋ ਅਤੇ ਬਿਮਾਰੀ ਦੇ ਸੰਕੇਤਾਂ ਦੀ ਜਾਂਚ ਲਈ ਪੱਤੇ ਦੀ ਸਾਫ਼ ਤਸਵੀਰ ਅਪਲੋਡ ਕਰੋ।",
    "disease.select_crop": "ਆਪਣੀ ਫਸਲ ਚੁਣੋ",
    "disease.add_leaf_photo": "ਪੱਤੇ ਦੀ ਤਸਵੀਰ ਸ਼ਾਮਲ ਕਰੋ",
    "disease.close_photo": "ਜਿੱਥੇ ਸੰਭਵ ਹੋਵੇ, ਪ੍ਰਭਾਵਿਤ ਪੱਤੇ ਦੀ ਨੇੜੇ ਤੋਂ ਤਸਵੀਰ ਲਓ।",
    "disease.better_result": "ਬਿਹਤਰ ਨਤੀਜੇ ਲਈ",
    "disease.good.close": "ਇੱਕ ਪੱਤੇ ਦੀ ਨੇੜੇ ਤੋਂ ਤਸਵੀਰ ਲਓ",
    "disease.good.light": "ਕੁਦਰਤੀ ਜਾਂ ਚੰਗੀ ਰੌਸ਼ਨੀ ਵਰਤੋ",
    "disease.good.visible": "ਪ੍ਰਭਾਵਿਤ ਹਿੱਸਾ ਸਾਫ਼ ਦਿਖਾਈ ਦੇਵੇ",
    "disease.good.focus": "ਤਸਵੀਰ ਸਾਫ਼ ਅਤੇ ਫੋਕਸ ਵਿੱਚ ਰੱਖੋ",
    "disease.avoid.screenshots": "ਸਕ੍ਰੀਨਸ਼ਾਟ ਜਾਂ ਦਸਤਾਵੇਜ਼ਾਂ ਦੀਆਂ ਤਸਵੀਰਾਂ ਤੋਂ ਬਚੋ",
    "disease.avoid.field": "ਪੂਰੇ ਖੇਤ ਦੀ ਤਸਵੀਰ ਨਾ ਲਓ",
    "disease.avoid.dark": "ਬਹੁਤ ਹਨੇਰੀ ਜਾਂ ਧੁੰਦਲੀ ਤਸਵੀਰ ਤੋਂ ਬਚੋ",
    "disease.avoid.no_leaf": "ਅਜਿਹੀ ਤਸਵੀਰ ਨਾ ਲਓ ਜਿਸ ਵਿੱਚ ਪੱਤਾ ਦਿਖਾਈ ਨਾ ਦੇਵੇ",
    "disease.upload_leaf": "ਪੱਤੇ ਦੀ ਤਸਵੀਰ ਅਪਲੋਡ ਕਰੋ",
    "disease.clear_image": "ਸਾਫ਼ ਅਤੇ ਚੰਗੀ ਰੌਸ਼ਨੀ ਵਾਲੀ ਤਸਵੀਰ ਵਰਤੋ ਜਿਸ ਵਿੱਚ ਪੱਤਾ ਅਤੇ ਪ੍ਰਭਾਵਿਤ ਹਿੱਸਾ ਸਪਸ਼ਟ ਦਿਖਾਈ ਦੇਵੇ।",
    "disease.upload_photo": "ਤਸਵੀਰ ਅਪਲੋਡ ਕਰੋ",
    "disease.take_photo": "ਤਸਵੀਰ ਲਓ",
    "disease.change_photo": "ਤਸਵੀਰ ਬਦਲੋ",
    "disease.check_leaf": "ਪੱਤੇ ਦੀ ਜਾਂਚ ਕਰੋ",
    "disease.checking": "ਤਸਵੀਰ ਦੀ ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ...",
    "disease.how_it_works": "ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ",
    "disease.how_it_works_desc": "ਫਸਲ ਚੁਣੋ, ਪੱਤੇ ਦੀ ਸਾਫ਼ ਤਸਵੀਰ ਅਪਲੋਡ ਕਰੋ ਅਤੇ KisanAI ਤਸਵੀਰ ਵਿੱਚ ਬਿਮਾਰੀ ਦੇ ਸੰਕੇਤਾਂ ਦੀ ਜਾਂਚ ਕਰੇਗਾ।",
    "disease.choose_crop": "ਆਪਣੀ ਫਸਲ ਚੁਣੋ",
    "disease.choose_crop_desc": "ਜਿਸ ਪੱਤੇ ਦੀ ਜਾਂਚ ਕਰਨੀ ਹੈ, ਉਸ ਨਾਲ ਮਿਲਦੀ ਫਸਲ ਚੁਣੋ।",
    "disease.upload_clear": "ਸਾਫ਼ ਤਸਵੀਰ ਅਪਲੋਡ ਕਰੋ",
    "disease.upload_clear_desc": "ਪੱਤੇ ਦੇ ਪ੍ਰਭਾਵਿਤ ਹਿੱਸੇ ਦੀ ਨੇੜੇ ਤੋਂ ਸਾਫ਼ ਤਸਵੀਰ ਬਿਹਤਰ ਨਤੀਜਾ ਦਿੰਦੀ ਹੈ।",
    "disease.simple_guidance": "ਸੌਖੀ ਜਾਣਕਾਰੀ ਪ੍ਰਾਪਤ ਕਰੋ",
    "disease.simple_guidance_desc": "ਜੇ ਬਿਮਾਰੀ ਮਿਲਦੀ ਹੈ, ਤਾਂ ਤੁਹਾਨੂੰ ਇਸਦੇ ਸੰਕੇਤ, ਸੰਭਾਵਿਤ ਕਾਰਨ, ਕੀ ਕਰਨਾ ਹੈ ਅਤੇ ਬਚਾਅ ਦੀ ਜਾਣਕਾਰੀ ਮਿਲੇਗੀ।",
    "disease.model_note": "KisanAI ਇਸ ਸਮੇਂ ਆਪਣੇ ਟ੍ਰੇਨ ਕੀਤੇ ਮਾਡਲ ਵਿੱਚ ਸ਼ਾਮਲ ਫਸਲਾਂ ਅਤੇ ਬਿਮਾਰੀਆਂ ਦੀ ਜਾਂਚ ਕਰਦਾ ਹੈ।",
    "disease.unclear_label": "ਸਪਸ਼ਟ ਪਛਾਣ ਨਹੀਂ ਹੋ ਸਕੀ",
    "disease.clearer_photo": "ਸਾਨੂੰ ਪੱਤੇ ਦੀ ਹੋਰ ਸਾਫ਼ ਤਸਵੀਰ ਚਾਹੀਦੀ ਹੈ",
    "disease.upload_another": "ਹੋਰ ਤਸਵੀਰ ਅਪਲੋਡ ਕਰੋ",
    "disease.check_crop": "ਕਿਰਪਾ ਕਰਕੇ ਫਸਲ ਦੀ ਜਾਂਚ ਕਰੋ",
    "disease.other_crop": "ਤਸਵੀਰ ਕਿਸੇ ਹੋਰ ਫਸਲ ਦੀ ਹੋ ਸਕਦੀ ਹੈ",
    "disease.selected_crop": "ਚੁਣੀ ਗਈ ਫਸਲ",
    "disease.looks_like": "ਤਸਵੀਰ ਇਸ ਨਾਲ ਵਧੇਰੇ ਮਿਲਦੀ ਹੈ",
    "disease.no_disease_reported": "ਇਸ ਨਤੀਜੇ ਦੇ ਆਧਾਰ 'ਤੇ ਕਿਸੇ ਬਿਮਾਰੀ ਦੀ ਪੁਸ਼ਟੀ ਨਹੀਂ ਕੀਤੀ ਜਾ ਰਹੀ। ਫਸਲ ਦੀ ਚੋਣ ਜਾਂਚੋ ਜਾਂ ਹੋਰ ਸਾਫ਼ ਤਸਵੀਰ ਅਪਲੋਡ ਕਰੋ।",
    "disease.try_another": "ਹੋਰ ਤਸਵੀਰ ਅਜ਼ਮਾਓ",
    "disease.no_disease": "ਬਿਮਾਰੀ ਦੇ ਸੰਕੇਤ ਨਹੀਂ ਮਿਲੇ",
    "disease.possible_disease": "ਸੰਭਾਵਿਤ ਬਿਮਾਰੀ ਮਿਲੀ",
    "disease.looks_healthy": "ਸਿਹਤਮੰਦ ਦਿਖਾਈ ਦਿੰਦੀ ਹੈ",
    "disease.healthy_message": "ਤਸਵੀਰ ਵਿੱਚ KisanAI ਵੱਲੋਂ ਪਛਾਣੇ ਜਾਣ ਵਾਲੀ ਬਿਮਾਰੀ ਦੇ ਸੰਕੇਤ ਨਹੀਂ ਦਿਖ ਰਹੇ।",
    "disease.confidence": "ਪਛਾਣ ਦਾ ਭਰੋਸਾ",
    "disease.confidence_desc": "ਇਹ ਦੱਸਦਾ ਹੈ ਕਿ ਬਿਮਾਰੀ ਦੀ ਪਛਾਣ ਬਾਰੇ KisanAI ਦਾ ਭਰੋਸਾ ਕਿੰਨਾ ਹੈ",
    "disease.about": "ਇਸ ਬਿਮਾਰੀ ਬਾਰੇ",
    "disease.signs": "ਤੁਹਾਨੂੰ ਦਿਖਾਈ ਦੇਣ ਵਾਲੇ ਸੰਕੇਤ",
    "disease.why": "ਇਹ ਕਿਉਂ ਹੋ ਸਕਦੀ ਹੈ",
    "disease.actions": "ਤੁਸੀਂ ਕੀ ਕਰ ਸਕਦੇ ਹੋ",
    "disease.prevention": "ਇਸ ਤੋਂ ਕਿਵੇਂ ਬਚੀਏ",
    "disease.farming_guidance": "ਖੇਤੀਬਾੜੀ ਸੰਬੰਧੀ ਜਾਣਕਾਰੀ",
    "disease.guidance_reference": "ਇਹ ਜਾਣਕਾਰੀ KisanAI ਵੱਲੋਂ ਵਰਤੇ ਗਏ ਖੇਤੀਬਾੜੀ ਸੰਦਰਭਾਂ 'ਤੇ ਆਧਾਰਿਤ ਹੈ।",
    "disease.view_source": "ਸਰੋਤ ਵੇਖੋ →",
    "disease.pesticide_tip": "ਸਲਾਹ: ਜੇ ਤੁਸੀਂ ਕੀਟਨਾਸ਼ਕ ਵਰਤਣ ਦੀ ਯੋਜਨਾ ਬਣਾ ਰਹੇ ਹੋ, ਤਾਂ ਪਹਿਲਾਂ ਸਥਾਨਕ ਖੇਤੀਬਾੜੀ ਮਾਹਿਰ ਤੋਂ ਸਮੱਸਿਆ ਦੀ ਪੁਸ਼ਟੀ ਕਰਨਾ ਬਿਹਤਰ ਹੈ।",
    "disease.check_another": "ਹੋਰ ਪੱਤੇ ਦੀ ਜਾਂਚ ਕਰੋ",
    "disease.retry_title": "ਹੋਰ ਤਸਵੀਰ ਲਓ",
    "disease.retry.close": "ਇੱਕ ਪੱਤੇ ਦੀ ਨੇੜੇ ਤੋਂ ਤਸਵੀਰ ਲਓ।",
    "disease.retry.focus": "ਪ੍ਰਭਾਵਿਤ ਹਿੱਸਾ ਸਾਫ਼ ਅਤੇ ਫੋਕਸ ਵਿੱਚ ਰੱਖੋ।",
    "disease.retry.light": "ਜਿੱਥੇ ਸੰਭਵ ਹੋਵੇ ਕੁਦਰਤੀ ਰੌਸ਼ਨੀ ਵਰਤੋ।",
    "disease.error_crop": "ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਆਪਣੀ ਫਸਲ ਚੁਣੋ।",
    "disease.error_photo": "ਕਿਰਪਾ ਕਰਕੇ ਪ੍ਰਭਾਵਿਤ ਪੱਤੇ ਦੀ ਸਾਫ਼ ਤਸਵੀਰ ਅਪਲੋਡ ਕਰੋ।",
    "disease.error_generic": "ਅਸੀਂ ਇਸ ਤਸਵੀਰ ਦੀ ਜਾਂਚ ਨਹੀਂ ਕਰ ਸਕੇ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
    "disease.crop.apple": "ਸੇਬ",
    "disease.crop.cassava": "ਕਸਾਵਾ",
    "disease.crop.corn": "ਮੱਕੀ",
    "disease.crop.potato": "ਆਲੂ",
    "disease.crop.rice": "ਚਾਵਲ",
    "disease.crop.sugarcane": "ਗੰਨਾ",
    "disease.crop.tea": "ਚਾਹ",
    "disease.crop.tomato": "ਟਮਾਟਰ",
    "disease.crop.wheat": "ਕਣਕ",
    "weather.guidance": "ਮੌਸਮ ਅਧਾਰਿਤ ਖੇਤੀਬਾੜੀ ਮਾਰਗਦਰਸ਼ਨ",
    "weather.title": "ਮੌਸਮ ਸੰਬੰਧੀ ਜਾਣਕਾਰੀ",
    "weather.subtitle": "ਮੌਸਮ ਦੀ ਭਵਿੱਖਬਾਣੀ ਨੂੰ ਸਮਝੋ ਅਤੇ ਜਾਣੋ ਕਿ ਇਸ ਦਾ ਤੁਹਾਡੀ ਫਸਲ 'ਤੇ ਕੀ ਪ੍ਰਭਾਵ ਪੈ ਸਕਦਾ ਹੈ।",

    "weather.today": "ਅੱਜ",
    "weather.temperature": "ਵੱਧ ਤੋਂ ਵੱਧ / ਘੱਟ ਤੋਂ ਘੱਟ ਤਾਪਮਾਨ",
    "weather.rainProbability": "ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ",
    "weather.rainfall": "ਮੀਂਹ",
    "weather.wind": "ਹਵਾ",
    "weather.windGusts": "ਹਵਾ ਦੇ ਝੋਕੇ",
    "weather.evapotranspiration": "ਵਾਸ਼ਪੋਤਸਰਜਨ",

    "weather.rainLikelihood": "ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ",
    "weather.rainfallIntensity": "ਮੀਂਹ ਦੀ ਤੀਬਰਤਾ",
    "weather.etReference": "ET₀ = ਸੰਦਰਭ ਵਾਸ਼ਪੋਤਸਰਜਨ",

    "weather.cropNotSpecified": "ਫਸਲ ਦਰਜ ਨਹੀਂ ਕੀਤੀ ਗਈ",
    "weather.stage": "ਅਵਸਥਾ",

    "weather.thisWeek": "ਇਸ ਹਫ਼ਤੇ",
    "weather.noWeatherAlerts": "ਇਸ ਹਫ਼ਤੇ ਤੁਹਾਡੀ ਫਸਲ ਲਈ ਕੋਈ ਮੌਸਮੀ ਚੇਤਾਵਨੀ ਨਹੀਂ ਹੈ।",

    "weather.whatToDo": "ਕੀ ਕਰਨਾ ਹੈ",
    "weather.recommendedAction": "ਸੁਝਾਅ",
    "weather.forecast": "ਮੌਸਮ ਦੀ ਭਵਿੱਖਬਾਣੀ",
    "weather.source": "ਸਰੋਤ",

    "weather.bestTimeToSpray": "ਸਪਰੇਅ ਕਰਨ ਦਾ ਸਹੀ ਸਮਾਂ",
    "weather.sprayDescription": "ਘੱਟ ਮੀਂਹ ਅਤੇ ਅਨੁਕੂਲ ਹਵਾ ਵਾਲੇ ਸਮੇਂ।",
    "weather.good": "ਵਧੀਆ",
    "weather.okay": "ਠੀਕ",
    "weather.noGoodSprayingTime": "ਇਸ ਤੋਂ ਬਾਅਦ ਕੋਈ ਵਧੀਆ ਸਪਰੇਅ ਸਮਾਂ ਨਹੀਂ ਮਿਲਿਆ",
    "weather.noSuitableSprayWindows": "ਭਵਿੱਖਬਾਣੀ ਦੀ ਮਿਆਦ ਵਿੱਚ ਕੋਈ ਢੁਕਵਾਂ ਸਪਰੇਅ ਸਮਾਂ ਨਹੀਂ ਮਿਲਿਆ।",

    "weather.sevenDayForecast": "7 ਦਿਨਾਂ ਦੀ ਮੌਸਮ ਭਵਿੱਖਬਾਣੀ",
    "weather.tapDay": "ਹੋਰ ਜਾਣਕਾਰੀ ਲਈ ਕਿਸੇ ਦਿਨ 'ਤੇ ਕਲਿੱਕ ਕਰੋ।",
    "weather.strongWind": "ਤੇਜ਼ ਹਵਾ",
    "weather.rain": "ਮੀਂਹ",
    "weather.windGust": "ਹਵਾ ਦੇ ਝੋਕੇ",
    "weather.etDescription": "ਵਾਸ਼ਪੋਤਸਰਜਨ (ET₀): ਮਿੱਟੀ ਤੇ ਫਸਲ ਤੋਂ ਗੁੰਮ ਹੋਇਆ ਪਾਣੀ",

    "weather.loading": "ਮੌਸਮ ਦੀ ਜਾਣਕਾਰੀ ਲੋਡ ਹੋ ਰਹੀ ਹੈ...",
    "weather.noFarm": "ਖੇਤ ਦੀ ਜਾਣਕਾਰੀ ਨਹੀਂ ਮਿਲੀ",
    "weather.addFarm": "ਮੌਸਮ ਦੀ ਜਾਣਕਾਰੀ ਦੇਖਣ ਤੋਂ ਪਹਿਲਾਂ ਆਪਣੀ ਫਸਲ ਅਤੇ ਖੇਤ ਦੀ ਜਾਣਕਾਰੀ ਸ਼ਾਮਲ ਕਰੋ।",
    "weather.unableToLoad": "ਮੌਸਮ ਦੀ ਜਾਣਕਾਰੀ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕੀ",
    "weather.tryAgain": "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਇੰਟਰਨੈੱਟ ਕਨੈਕਸ਼ਨ ਜਾਂਚ ਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
  }
};

const languagesList = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
];

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, fallback?: string) => string;
  setCustomBackAction: (action: (() => void) | null) => void;
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
  setCustomBackAction: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState("en");
  const [mounted, setMounted] = useState(false);
  const [customBackAction, setCustomBackActionState] = useState<(() => void) | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Reset custom back action on route change
  useEffect(() => {
    // Intentionally left empty or handle via ref if necessary.
    // Setting state synchronously inside useEffect is bad practice.
    // We can rely on per-page custom actions setting it themselves, but for cleanup:
    const timer = setTimeout(() => setCustomBackActionState(null), 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("language");
    if (saved) setLangState(saved);
    setMounted(true);
  }, []);

  const setLanguage = (lang: string) => {
    setLangState(lang);
    localStorage.setItem("language", lang);
  };

  const setCustomBackAction = useCallback((action: (() => void) | null) => {
    setCustomBackActionState(() => action);
  }, []);

  const t = useCallback((key: string, fallback?: string) => {
    return translations[language]?.[key] || translations["en"]?.[key] || fallback || key;
  }, [language]);

  const isDashboard = pathname?.startsWith("/app");
  const isWelcome = pathname === "/" || pathname === "/welcome";
  
  // Back button on Language, Mobile, OTP, Onboarding
  const showBackButton = mounted && pathname && !isWelcome && !isDashboard;
  // Switcher on Mobile, OTP, Onboarding
  const showSwitcher = mounted && pathname && !isWelcome && !isDashboard && pathname !== "/language";

  const handleBackClick = () => {
    if (customBackAction) {
      customBackAction();
    } else if (pathname === "/language") {
      router.push("/");
    } else {
      router.back();
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, setCustomBackAction }}>
      
      {/* Top Navigation Overlay */}
      {(showBackButton || showSwitcher) && (
        <div className="absolute top-4 left-0 w-full px-4 md:px-8 z-50 flex justify-between items-start pointer-events-none">
          
          {/* Back Button */}
          <div className="pointer-events-auto">
            {showBackButton && (
              <button 
                onClick={handleBackClick}
                className="flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-md border border-gray-200 text-gray-700 rounded-full shadow-sm hover:bg-white hover:scale-105 hover:shadow transition-all"
                aria-label="Go Back"
              >
                <ChevronLeft size={24} strokeWidth={2.5} className="ml-[-2px]" />
              </button>
            )}
          </div>

          {/* Language Switcher */}
          <div className="pointer-events-auto">
            {showSwitcher && (
              <LanguageSwitcherDropdown language={language} setLanguage={setLanguage} />
            )}
          </div>

        </div>
      )}

      {children}
    </LanguageContext.Provider>
  );
}

function LanguageSwitcherDropdown({ language, setLanguage }: { language: string, setLanguage: (l: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = languagesList.find(l => l.code === language) || languagesList[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-gray-200 text-gray-800 px-4 py-2 rounded-full shadow-sm hover:bg-white hover:shadow transition-all h-10"
      >
        <Globe size={18} className="text-green-600" />
        <span className="font-semibold text-sm">{currentLang.nativeName}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 mt-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto py-2 flex flex-col scrollbar-thin scrollbar-thumb-gray-200">
              {languagesList.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-3 text-left text-sm font-medium transition-colors ${
                    language === lang.code ? "bg-green-50 text-green-700" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {lang.nativeName} {lang.code !== "en" && <span className="text-gray-400 text-xs ml-1">({lang.name})</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const useLanguage = () => useContext(LanguageContext);
