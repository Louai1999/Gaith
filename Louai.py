import warnings
# تنظيف التيرمنال نهائياً من التحذيرات قبل أي شيء آخر
warnings.filterwarnings("ignore", category=RuntimeWarning)
warnings.filterwarnings("ignore", category=UserWarning)

import sounddevice as sd
from scipy.io.wavfile import write
import speech_recognition as sr
from groq import Groq  
import os
import asyncio
from playsound import playsound
import edge_tts
from duckduckgo_search import DDGS  
import webbrowser
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent / ".env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set. Copy .env.example to .env and add your key.")
client = Groq(api_key=GROQ_API_KEY)

# 🧠 ذاكرة الحوار
chat_history = []

# دالة التحكم بنظام الويندوز وتطبيق الأوامر الصوتية المنفردة
def execute_system_command(ai_response_text):
    # 1. أمر فتح جوجل كروم
    if "CMD_OPEN_CHROME" in ai_response_text:
        print("[ System Action: Opening Google Chrome... ]")
        webbrowser.open("https://www.google.com")
        return "تم فتح جوجل كروم بنجاح."
        
    # 2. أمر فتح اليوتيوب
    elif "CMD_OPEN_YOUTUBE" in ai_response_text:
        print("[ System Action: Opening YouTube... ]")
        webbrowser.open("https://www.youtube.com")
        return "تم فتح اليوتيوب."
        
    # 3. أمر وضع السكون المنفرد تماماً (Sleep Mode)
    elif "CMD_SYSTEM_SLEEP" in ai_response_text:
        print("[ System Action: Entering Sleep Mode... ]")
        asyncio.run(speak_local_async("جاري تفعيل وضع السكون للكمبيوتر، تسيير على خير يا لؤي."))
        os.system("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")
        return "سكون"
        
    return None

# دالة البحث في الويب (عند الحاجة)
def search_the_web(query):
    try:
        search_query = query
        if "مسقط" not in query and "السيب" not in query and "عمان" not in query:
            search_query = f"{query} في السيب عمان"
        else:
            search_query = query.replace("الان", "اليوم").replace("الآن", "اليوم")
            
        print(f"[ Searching the web for: '{search_query}'... ]")
        with DDGS() as ddgs:
            results = [r['body'] for r in ddgs.text(search_query, max_results=2)]
            if results:
                return "\n".join(results)
    except Exception as e:
        print(f"Search Skip: {e}")
    return "لا توجد نتائج حية إضافية."

async def speak_local_async(text_to_speak):
    try:
        has_arabic = any("\u0600" <= char <= "\u06FF" for char in text_to_speak)
        voice = "ar-AE-HamdanNeural" if has_arabic else "en-US-BrianNeural"
        
        filename = "reply.mp3"
        communicate = edge_tts.Communicate(text_to_speak, voice)
        await communicate.save(filename)
        
        playsound(filename)
        if os.path.exists(filename):
            os.remove(filename)
    except Exception as e:
        print(f"Audio Playback Error: {e}")

def ask_groq_smart(user_text_question):
    global chat_history
    try:
        web_info = ""
        keywords_need_web = ["الحراره", "الحرارة", "الطقس", "جو", "الوقت", "أخبار", "اخبار", "سعر", "كم هي"]
        if any(keyword in user_text_question for keyword in keywords_need_web):
            web_info = search_the_web(user_text_question)
        
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a smart AI assistant and OS Agent. Your name is Ghaith (غيث). The user's name is Louai (لؤي).\n"
                    "Your job is to control the PC based on Louai's request by embedding specific command codes in your response if needed:\n"
                    "- If he wants to open Google Chrome or search Google, end your text with: CMD_OPEN_CHROME\n"
                    "- If he wants to open YouTube, end your text with: CMD_OPEN_YOUTUBE\n"
                    "- If he wants to put the PC to sleep or standby, end your text with: CMD_SYSTEM_SLEEP\n\n"
                    "Rule 1: If Louai speaks in Arabic, reply in a very short, polite, and natural Arabic.\n"
                    "Rule 2: If Louai speaks in English, reply in short English.\n"
                    "Keep your response strictly under 1-2 sentences maximum.\n\n"
                    f"Live Web Context:\n{web_info}"
                )
            }
        ]
        
        for past_user, past_ai in chat_history:
            messages.append({"role": "user", "content": past_user})
            messages.append({"role": "assistant", "content": past_ai})
            
        messages.append({"role": "user", "content": user_text_question})
        
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.2,
            max_tokens=150
        )
        
        ai_reply = completion.choices[0].message.content
        print(f"Ghaith Raw: {ai_reply}")
        
        # فحص وتطبيق أمر النظام فوراً إذا وُجد
        system_feedback = execute_system_command(ai_reply)
        
        # تنظيف النص الراجع للمستخدم من أكواد النظام
        clean_reply = ai_reply.replace("CMD_OPEN_CHROME", "").replace("CMD_OPEN_YOUTUBE", "").replace("CMD_SYSTEM_SLEEP", "").strip()
        
        # إذا كان الأمر هو السكون، نوقف تتابع النطق العادي لأن الدالة تكلفت به واكتمل
        if system_feedback == "سكون":
            return

        chat_history.append((user_text_question, clean_reply))
        if len(chat_history) > 5:
            chat_history.pop(0)
            
        asyncio.run(speak_local_async(clean_reply))
                
    except Exception as e:
        print(f"Groq Error: {e}")

def listen_to_user_stable():
    fs = 16000  
    seconds = 4  
    filename = "temp_voice.wav"
    
    print("\n[>>> Listening... Speak Arabic or English! <<<]")
    try:
        myrecording = sd.rec(int(seconds * fs), samplerate=fs, channels=1, dtype='int16')
        sd.wait()  
        write(filename, fs, myrecording)  
        
        recognizer = sr.Recognizer()
        with sr.AudioFile(filename) as source:
            audio_data = recognizer.record(source)
            print("[ Processing... ]")
            
            try:
                text = recognizer.recognize_google(audio_data, language="ar-OM")
            except:
                try:
                    text = recognizer.recognize_google(audio_data, language="en-US")
                except:
                    text = None
            
        if os.path.exists(filename):
            os.remove(filename)
        return text
    except Exception as e:
        if os.path.exists(filename):
            os.remove(filename)
        return None

if __name__ == "__main__":
    print("--- 100% Ghaith Voice Assistant Ready ---")
    
    while True:
        user_voice_input = listen_to_user_stable()
        
        if user_voice_input:
            print(f"You said: {user_voice_input}")
            
            # 1. ميزة الإغلاق التلقائي المنفردة للكود (بدون سكون للكمبيوتر)
            exit_keywords = ["exit", "stop", "خروج", "توقف", "مع السلامه", "مع السلامة", "خلاص مشكور"]
            if any(keyword in user_voice_input.lower() for keyword in exit_keywords):
                goodbye_text = "مع السلامة يا لؤي، تم إغلاق البرنامج بنجاح!"
                print(f"Ghaith: {goodbye_text}")
                asyncio.run(speak_local_async(goodbye_text))
                print("Program Closed Cleanly. Goodbye!")
                break
                
            # 2. شرط الاستيقاظ: يجب نداء المساعد باسم "غيث" ليستجيب لباقي الأمور
            if "غيث" in user_voice_input or "ghaith" in user_voice_input.lower():
                ask_groq_smart(user_voice_input)
            else:
                print("[ Ghaith: Ignored. (Wake word 'غيث' not detected) ]")