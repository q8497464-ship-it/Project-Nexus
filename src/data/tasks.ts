import { TaskCard } from "../types";

const rawTruthAndDareTasks: TaskCard[] = [
  // --- FEMALE AUDIO TASKS (10) ---
  {
    id: "task1",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Ek 30-second ka voice note bhejo jis mein tm moaning kr rahi ho AAhhh aahhh ki",
    penalty: "Massage your partner's hands or pay 5 pushups.",
    required_media: "audio"
  },
  {
    id: "task2",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Apne phone ke mic ke qareeb aa kar ek deep breath lo aur usay tease karte hue uska naam pukaaro.",
    penalty: "Whisper an embarrassing secret about yourself.",
    required_media: "audio"
  },
  {
    id: "task3",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "Bina hase, ek seductive tone mein koi funny si baat kaho.",
    penalty: "Sing a cute song chorus for your partner.",
    required_media: "audio"
  },
  {
    id: "task4",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Apna sbsy favourite bra partner ko dikhao.",
    penalty: "Wear your partner's shirt or jacket or take a penalty.",
    required_media: "image"
  },
  {
    id: "task5",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "Usay batao ke uski konsi physical feature tumhe sab se zyada attract karti hai.",
    penalty: "Allow your partner to trace a circle on your palm.",
    required_media: "audio"
  },
  {
    id: "task6",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Ek voice note bhejo jis mein sirf tumye bta rahi ho k tm ko uski body k andar kya pasand ha jo tumhara mood bnata ha.",
    penalty: "Let your partner style your hair for a turn.",
    required_media: "audio"
  },
  {
    id: "task7",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Usay ek aesa horny secret batao jo aaj tak kisi ko nahi bataya.",
    penalty: "Let your partner draft a message on your phone.",
    required_media: "audio"
  },
  {
    id: "task8",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Whisper karte hue batao ke agar wo abhi tumhare paas hota to tum sab se pehle kya karti (related to sexual desire).",
    penalty: "Perform a seductive runway walk.",
    required_media: "audio"
  },
  {
    id: "task9",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "Ek deeply kiss ki aawaz record karke bhejo.",
    penalty: "Kiss your partner gently on the cheek 3 times.",
    required_media: "audio"
  },
  {
    id: "task10",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "Usay French ya kisi aur language mein \"I love you\" kaho sexy tone mein.",
    penalty: "Trace your partner's jawline softly.",
    required_media: "audio"
  },

  // --- FEMALE IMAGE TASKS (15) ---
  {
    id: "task11",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Apni breast ka ek close-up shot capture karke bhejo.",
    penalty: "Dance for 30 seconds or blow 3 cute kisses.",
    required_media: "image"
  },
  {
    id: "task12",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Apni neck (gardan) aur collarbone ki ek aesthetic picture click karo.",
    penalty: "Let your partner whisper a phrase in your ear.",
    required_media: "image"
  },
  {
    id: "task13",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Koi t-shirt pehan kar ek horny si selfie bhejo.",
    penalty: "Do 10 jumping jacks slowly.",
    required_media: "image"
  },
  {
    id: "task14",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "Apni aankhon ka ek intense close-up bhejo jis mein direct eye contact ho.",
    penalty: "Maintain eye contact for 15 seconds.",
    required_media: "image"
  },
  {
    id: "task15",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Ek mirror selfie lo jis mein tum apny ass dikhao.",
    penalty: "Speak in a seductive tone for the next 1 minute.",
    required_media: "image"
  },
  {
    id: "task16",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Apne baalon ko ek side par karke apni neck expose karte hue picture bhejo (But uper kuch pehna na ho).",
    penalty: "Give your partner a slow 1-minute foot rub.",
    required_media: "image"
  },
  {
    id: "task17",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Bed par late kar messy hairs ko breast pr rakh kr nude selfie click karo(breast chupa kr hairs sy)",
    penalty: "Speak only in whispers for a turn.",
    required_media: "image"
  },
  {
    id: "task18",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Apni thighs ko nude kr k us par apna hath rakh kar ek close-up aesthetic shot bhejo.",
    penalty: "Trace your partner's lips gently.",
    required_media: "image"
  },
  {
    id: "task19",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "Apne favorite outfit ka ek chota sa hissa (zoom in) click karke bhejo aur usay guess karne do.",
    penalty: "Sing a romantic line for them.",
    required_media: "image"
  },
  {
    id: "task20",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "2 fingers ko mou ma daal kr selfie click karo.",
    penalty: "Let your partner choose your status name for 2 hours.",
    required_media: "image"
  },
  {
    id: "task21",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "Ek kiss wali selfie bhejo.",
    penalty: "Allow your partner to write a cute letter on your arm.",
    required_media: "image"
  },
  {
    id: "task22",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Apni waist ki picture bhejo.",
    penalty: "Wear your partner's shoes for 1 minute.",
    required_media: "image"
  },
  {
    id: "task23",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Shower ke baad, towel baand kr ek fresh selfie bhejo.",
    penalty: "Say three things that make you horny.",
    required_media: "image"
  },
  {
    id: "task24",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "Ek dark room mein sirf screen ki light se apni ek shadow selfie bhejo.",
    penalty: "Let your partner give you a warm gentle kiss.",
    required_media: "image"
  },
  {
    id: "task25",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "Apne paon ki ek aesthetic picture bhejo.",
    penalty: "Massage your partner's shoulders for 1 minute.",
    required_media: "image"
  },

  // --- VIDEO TASKS (15) ---
  {
    id: "task26",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "10 seconds ki video bhejo jis mein tum apne baal khol rahi ho.",
    penalty: "Imitate your partner's laughter.",
    required_media: "video"
  },
  {
    id: "task27",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Camera on karo aur sirf apne honton ko tease karte ya halka sa bite karte hue video bhejo.",
    penalty: "Wear socks on your hands for 1 turn.",
    required_media: "video"
  },
  {
    id: "task28",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "15 seconds ki video jis mein tum koi baat na karo, sirf breast ko press kro or horny expressions bnao.",
    penalty: "Stare at your partner for 30 seconds.",
    required_media: "video"
  },
  {
    id: "task29",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "Ek french kiss dete hue video record karo.",
    penalty: "Plant a sweet kiss on both cheeks of your partner.",
    required_media: "video"
  },
  {
    id: "task30",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Camera ko apne qareeb lao aur dheere se \"I want you to fuck me\" bol kar video end kar do.",
    penalty: "Whisper your deepest fantasy to them.",
    required_media: "video"
  },
  {
    id: "task31",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "Ek chota sa dance step (seductive ) record karke bhejo.",
    penalty: "Hum a melody for 30 seconds.",
    required_media: "video"
  },
  {
    id: "task32",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Apni ungli ko apni taangon k andar rub kro 10 sec tk or uski video bhejo.",
    penalty: "Tell your partner a deep hot secret.",
    required_media: "video"
  },
  {
    id: "task33",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Mirror ke samne khari ho kar apna outfit utarty howy hue video bhejo.",
    penalty: "Unbutton top two buttons of your shirt.",
    required_media: "video"
  },
  {
    id: "task34",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Ek ice cube ko apny nipples par rub karte hue video record karo.",
    penalty: "Tell your partner what physical feature attracts you most.",
    required_media: "video"
  },
  {
    id: "task35",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "Camera mein dekhte hue ek flirty expression banao aur video send karo.",
    penalty: "Gently kiss your partner's arm.",
    required_media: "video"
  },
  {
    id: "task36",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "Kisi romantic song par 15 seconds lip-sync karo or horny expressions bnao.",
    penalty: "Dramatically profess your love in Shakespearean style.",
    required_media: "video"
  },
  {
    id: "task37",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Apne bed par roll karte hue ek seductive si video bhejo.",
    penalty: "Let your partner feed you a glass of water.",
    required_media: "video"
  },
  {
    id: "task38",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "Ek video bhejo jisme tum tease karne ke liye apny haathon ka use kr rahi ho apni body pr.",
    penalty: "Bite your lip and maintain intense direct eye contact for 20 seconds.",
    required_media: "video"
  },
  {
    id: "task39",
    type: "dare",
    category: "intimate",
    forGender: "female",
    text: "favourite sex position ly kr moaning karty video bnao.",
    penalty: "Whisper what you would do if you were near them.",
    required_media: "video"
  },
  {
    id: "task40",
    type: "dare",
    category: "romantic",
    forGender: "female",
    text: "Ek video jisme tum deeply saans (breathe) le rahi ho.",
    penalty: "Let your partner ruffle your hair.",
    required_media: "video"
  },

  // --- MALE AUDIO TASKS (10) ---
  {
    id: "male_task1",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Deep aur husky aawaz mein usay batao ke tum abhi uske baare mein kya soch rahe ho.",
    penalty: "Perform 10 pushups or whisper a secret.",
    required_media: "audio"
  },
  {
    id: "male_task2",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Ek voice note bhejo jis mein whisper karte hue usay usky best body part ka btao.",
    penalty: "Drink a glass of water without hands.",
    required_media: "audio"
  },
  {
    id: "male_task3",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "Bina hase, full serious tone mein usay ek cheesy lekin romantic pickup line sunao.",
    penalty: "Do 5 sit-ups style.",
    required_media: "audio"
  },
  {
    id: "male_task4",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "Usay batao ke jab tum dono call pr hote ho to tumhe uska kesa mood pasand ha .",
    penalty: "Say 3 sweetest things about her eyes.",
    required_media: "audio"
  },
  {
    id: "male_task5",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Ek voice note bhejo jisme tum usay apni sab se badi romantic fantasy bata rahe ho.",
    penalty: "Give a 30 second gentle forehead kiss gesture.",
    required_media: "audio"
  },
  {
    id: "male_task6",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "Apni normal aawaz se thoda deep tone mein usay \"hey! my sexy lady\" kaho.",
    penalty: "Hum beautiful melody to her.",
    required_media: "audio"
  },
  {
    id: "male_task7",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "Ek romantic gaane ki do lines apni aawaz mein gungunao kar bhejo.",
    penalty: "Translate a sweet poetry verse.",
    required_media: "audio"
  },
  {
    id: "male_task8",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "Usay batao ke jab tm usy dekhty to tmhy kya feeling ati hain (30 seconds voice)",
    penalty: "Praise her style and smile for 30 seconds.",
    required_media: "audio"
  },
  {
    id: "male_task9",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "10 seconds tak koi baat na karo, sirf apni heavy breathing (deep saans) ki aawaz record karke bhejo (Sexual way).",
    penalty: "Say sorry sweetly in baby sound.",
    required_media: "audio"
  },
  {
    id: "male_task10",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Ek confidence bhari aawaz mein usay batao ke aaj raat tum us k sath kesay sex kro gy.",
    required_media: "audio"
  },

  // --- MALE IMAGE TASKS (15) ---
  {
    id: "male_task11",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Apne jawline aur neck ka ek sharp, aesthetic close-up shot bhejo.",
    required_media: "image"
  },
  {
    id: "male_task12",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Shirtless ho kar (chest/shoulders) ek mirror selfie lo aur usay tease karne ke liye bhejo.",
    required_media: "image"
  },
  {
    id: "male_task13",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Apne dick ko pakar kr ek picture capture karo.",
    required_media: "image"
  },
  {
    id: "male_task14",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "Ek messy hair wali \"just woke up\" ya relaxed look ki selfie click karo(Shirtless).",
    required_media: "image"
  },
  {
    id: "male_task15",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "apny trouser ma hath daal kar picture bhejo.",
    required_media: "image"
  },
  {
    id: "male_task16",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Shower ke foran baad, geelay baalon ke sath ek fresh nude picture bhejo.",
    required_media: "image"
  },
  {
    id: "male_task17",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Workout ke baad ki ya slightly sweaty ek aesthetic selfie bhejo.",
    required_media: "image"
  },
  {
    id: "male_task18",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "Apne honton ka ek close-up shot bhejo, halke se smirk ke sath.",
    required_media: "image"
  },
  {
    id: "male_task19",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "Ek dark room selfie bhejo jahan sirf tumhare chehre par light par rahi ho.",
    required_media: "image"
  },
  {
    id: "male_task20",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Underwear ma ek image bhejo",
    required_media: "image"
  },
  {
    id: "male_task21",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "kiss krty howy ek image bhejo.",
    required_media: "image"
  },
  {
    id: "male_task22",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "Ek picture jis mein tumhara pose aesa ho jaise tum usay apne paas bula rahe ho.",
    required_media: "image"
  },
  {
    id: "male_task23",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Apni shirt ka upper button khol kar collarbone area ki ek picture bhejo.",
    required_media: "image"
  },
  {
    id: "male_task24",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Apne hathon ma dick ko pkro or usky top view ki image bhejo.",
    required_media: "image"
  },
  {
    id: "male_task25",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Mirror selfie mein pori nude body dikhao or dick ko cover kro kisi b cheez sy.",
    required_media: "image"
  },

  // --- MALE VIDEO TASKS (15) ---
  {
    id: "male_task26",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "10 seconds ki video jisme tum eye-contact maintain karte hue apni shirt utar rahe ho.",
    required_media: "video"
  },
  {
    id: "male_task27",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "Camera ko dekhte hue ek slow wink (aankh marna) aur smirk record karke bhejo.",
    required_media: "video"
  },
  {
    id: "male_task28",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Apne trouser mein hath pherte (run your hands through your trouser) hue ek slow-motion video bhejo.",
    required_media: "video"
  },
  {
    id: "male_task29",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "Pushups lagate hue ya koi workout move karte hue 15 seconds ki video bhejo.",
    required_media: "video"
  },
  {
    id: "male_task30",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Camera ko qareeb la kar halke se apna lip bite karo aur video end kar do.",
    required_media: "video"
  },
  {
    id: "male_task31",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "Ek video jisme tum koi teasing face bana rahe ho, bina kuch bole.",
    required_media: "video"
  },
  {
    id: "male_task32",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Apny Kapry Utarty hue video record karo.",
    required_media: "video"
  },
  {
    id: "male_task33",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "10 seconds ki video jisme tum direct eye contact maintain kar rahe ho bina palke jhukaye.",
    required_media: "video"
  },
  {
    id: "male_task34",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Ek dominant look wali video bhejo jahan camera thoda neechay ho aur tum oopar se dekh rahe ho or phir kiss krty ho.",
    required_media: "video"
  },
  {
    id: "male_task35",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Apni neck ko stretch karte ya roll karte hue ek relaxing or upper nude body ki hot video bhejo.",
    required_media: "video"
  },
  {
    id: "male_task36",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Ek video record karo jisme tum usay bata rahe ho ke wo tumhe kitna turn-on karti hai.",
    required_media: "video"
  },
  {
    id: "male_task37",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "45 seconds ki video jisme tum usay step-by-step bata rahe ho ke tumhari perfect date night kaisi hogi.",
    required_media: "video"
  },
  {
    id: "male_task38",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "mirror k samny khary ho k dick ko hard kr k tease kro (20 sec video)",
    required_media: "video"
  },
  {
    id: "male_task39",
    type: "dare",
    category: "intimate",
    forGender: "male",
    text: "Dick ko pakar k 15 seconds tk masturbate kro.",
    required_media: "video"
  },
  {
    id: "male_task40",
    type: "dare",
    category: "romantic",
    forGender: "male",
    text: "ek pillow ko partner samajh kar french kiss krty howy video bna kar bhejo.",
    required_media: "video"
  }
];

export const truthAndDareTasks: TaskCard[] = rawTruthAndDareTasks.map((task, idx) => ({
  ...task,
  penalty: idx % 2 === 0 
    ? "Vinegar ka 1 spoon peena ho ga (video bna k share krni ho gi)" 
    : "Half lemon khana ho ga (video bna k share krni ho gi)"
}));
