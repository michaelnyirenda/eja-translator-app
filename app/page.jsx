// app/page.js
"use client"; // this is for client-side interactivity

import { useState, useEffect, useCallback,useRef } from "react";
import {
  ArrowRightLeft,
  Copy,
  Star,
  Trash2,
  Volume2,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";

// key for localStorage
const LOCAL_STORAGE_HISTORY_KEY = "translatorAppHistory";

// initialize an empty translationMap
let translationMap = {}; // This will be populated after fetching data

// helper function to build the translationMap from the fetched dictionary
const buildTranslationMap = (fetchedDictionary) => {
  const newMap = {};
  if (!fetchedDictionary || fetchedDictionary.length === 0) {
    console.warn(
      "Fetched dictionary is empty or undefined. Translation map will be empty.",
    );
    return newMap;
  }
  fetchedDictionary.forEach((entry) => {
    const eng = entry.english?.toLowerCase();
    const juh = entry.ju_hoansi?.toLowerCase();
    const afr = entry.afrikaans?.toLowerCase();
    if (eng) {
      if (!newMap.english) newMap.english = {};
      newMap.english[eng] = {
        ju_hoansi: entry.ju_hoansi,
        afrikaans: entry.afrikaans,
      };
    }
    if (juh) {
      if (!newMap.ju_hoansi) newMap.ju_hoansi = {};
      newMap.ju_hoansi[juh] = {
        english: entry.english,
        afrikaans: entry.afrikaans,
        ...newMap.ju_hoansi[juh],
      };
    }
    if (afr) {
      if (!newMap.afrikaans) newMap.afrikaans = {};
      newMap.afrikaans[afr] = {
        english: entry.english,
        ju_hoansi: entry.ju_hoansi,
      };
    }
  });
  return newMap;
};

// helper function to translate word by word (uses the global translationMap)
const translateText = (text, sourceLang, targetLang) => {
  if (!text || !sourceLang || !targetLang || sourceLang === targetLang) {
    return text;
  }
  if (Object.keys(translationMap).length === 0 || !translationMap[sourceLang]) {
    console.warn(
      `Translation map for source language "${sourceLang}" is not ready or empty.`,
    );
    return text;
  }
  const words = text.split(/(\s+)/);
  const translatedWords = words.map((word) => {
    if (word.trim() === "") return word;
    const lowerWord = word.toLowerCase();
    const sourceDict = translationMap[sourceLang];
    if (
      sourceDict &&
      sourceDict[lowerWord] &&
      sourceDict[lowerWord][targetLang]
    ) {
      return sourceDict[lowerWord][targetLang];
    } else if (
      sourceDict &&
      sourceDict[lowerWord] &&
      targetLang === sourceLang
    ) {
      return word;
    } else if (sourceDict && sourceDict[lowerWord]) {
      return word + ` (*no ${targetLang} translation)`;
    }
    return word;
  });
  return translatedWords.join("");
};

const languages = [
  { code: "english", name: "English" },
  { code: "ju_hoansi", name: "Ju/’hoansi" },
  { code: "afrikaans", name: "Afrikaans" },
];

const MAX_TEXT_LENGTH = 5000;

export default function TranslatorPage() {
  const [sourceLang, setSourceLang] = useState("english");
  const [targetLang, setTargetLang] = useState("ju_hoansi");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");

  const [sentenceLoading, setSentenceLoading] = useState(false);
  const [sentenceError, setSentenceError] = useState(null);

  const [mode, setMode] = useState("words");
  // initialize history from localStorage or as an empty array
  const [history, setHistory] = useState(() => {
    if (typeof window !== "undefined") {
      // Ensure localStorage is available (client-side)
      const savedHistory = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      try {
        return savedHistory ? JSON.parse(savedHistory) : [];
      } catch (error) {
        console.error("Error parsing history from localStorage:", error);
        return [];
      }
    }
    return []; // default for server-side rendering or if localStorage fails
  });

  const [dictionaryLoading, setDictionaryLoading] = useState(true);
  const [dictionaryError, setDictionaryError] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // effect to fetch dictionary from API
  // Cache dictionary for "words" mode
  useEffect(() => {
    if (mode !== "words") return;
    let isMounted = true;
    const fetchDictionary = async () => {
      setDictionaryLoading(true);
      setDictionaryError(null);
      setIsMapReady(false);

      // Try localStorage cache first
      let cached = null;
      if (typeof window !== "undefined") {
        try {
          cached = JSON.parse(localStorage.getItem("dictionaryCache"));
        } catch {}
      }
      if (cached && Array.isArray(cached.words)) {
        translationMap = buildTranslationMap(cached.words);
        if (isMounted) setIsMapReady(true);
        setDictionaryLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/words");
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`,
          );
        }
        const data = await response.json();
        if (data.words && Array.isArray(data.words)) {
          translationMap = buildTranslationMap(data.words);
          if (typeof window !== "undefined") {
            localStorage.setItem("dictionaryCache", JSON.stringify({ words: data.words }));
          }
          if (isMounted) setIsMapReady(true);
        } else {
          throw new Error(
            "Fetched data is not in the expected format (missing 'words' array).",
          );
        }
      } catch (error) {
        console.error("Failed to fetch or build dictionary:", error);
        if (isMounted) setDictionaryError(error.message);
      } finally {
        if (isMounted) setDictionaryLoading(false);
      }
    };
    fetchDictionary();
    return () => { isMounted = false; };
  }, [mode]);

// Add this effect here: to clear output so it dont fuck shit uppppp!!!
useEffect(() => {
  setOutputText("");
  setSentenceError(null);
}, [mode]);
  // effect to fetch sentence translation (only for "sentences" mode)
    // Remove auto-fetch for sentences mode
  // Instead, handle with a button click:
  const handleSentenceTranslate = async () => {
    setSentenceLoading(true);
    setSentenceError(null);
    setOutputText("");
    try {
      const response = await fetch("/api/sentences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: inputText }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }
      const data = await response.json();
      setOutputText(data.translation || "");
    } catch (error) {
      setSentenceError(error.message);
      setOutputText("");
    } finally {
      setSentenceLoading(false);
    }
  };

// perform translation (only for "words" mode)
useEffect(() => {
  if (mode !== "words") return;
  if (!isMapReady || inputText.trim() === "") {
    setOutputText("");
    return;
  }
  const translated = translateText(inputText, sourceLang, targetLang);
  setOutputText(translated);
}, [inputText, sourceLang, targetLang, isMapReady, mode]);


  // effect to save history to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          LOCAL_STORAGE_HISTORY_KEY,
          JSON.stringify(history),
        );
      } catch (error) {
        console.error("Error saving history to localStorage:", error);
      }
    }
  }, [history]);

  // perform translation
  useEffect(() => {
    if (!isMapReady || inputText.trim() === "") {
      setOutputText("");
      return;
    }
    const translated = translateText(inputText, sourceLang, targetLang);
    setOutputText(translated);
  }, [inputText, sourceLang, targetLang, isMapReady]);

  const handleSwapLanguages = () => {
    const currentSource = sourceLang;
    const currentTarget = targetLang;
    setSourceLang(currentTarget);
    setTargetLang(currentSource);
    if (outputText.trim() !== "") {
      setInputText(outputText);
    }
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    if (text.length <= MAX_TEXT_LENGTH) {
      setInputText(text);
    }
  };

  const handleClearInput = () => {
    setInputText("");
    setOutputText("");
  };

  const handleCopyToClipboard = async (text) => {
    if (!text || !navigator.clipboard) {
      alert("Clipboard API not available.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy text: ", err);
      alert("Failed to copy text.");
    }
  };

  const handleSpeak = (text, langCode) => {
    if (!text || !window.speechSynthesis) {
      alert("Your browser doesn't support text-to-speech.");
      return;
    }
    let voiceLang = "en-US";
    if (langCode === "afrikaans") voiceLang = "af-ZA";
    else if (langCode === "ju_hoansi") {
      alert("Text-to-speech for Ju/'hoansi is not currently supported.");
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    speechSynthesis.speak(utterance);
  };

  const handleAddToHistory = useCallback(() => {
    if (inputText.trim() && outputText.trim()) {
      if (
        history.length > 0 &&
        history[0].original === inputText &&
        history[0].translated === outputText &&
        history[0].from === sourceLang &&
        history[0].to === targetLang
      ) {
        return; // prevent adding the same entry again
      }
      const newEntry = {
        id: Date.now(),
        from: sourceLang,
        to: targetLang,
        original: inputText,
        translated: outputText,
        saved: false, // new items are not saved by default
      };
      // check if an identical entry (ignoring 'saved' status and id) already exists
      const exists = history.some(
        (item) =>
          item.original === newEntry.original &&
          item.translated === newEntry.translated &&
          item.from === newEntry.from &&
          item.to === newEntry.to,
      );

      if (!exists) {
        setHistory((prevHistory) => [newEntry, ...prevHistory.slice(0, 9)]);
      } else if (
        !history.find(
          (item) => item.original === newEntry.original && item.saved,
        )
      ) {
      }
    }
  }, [inputText, outputText, sourceLang, targetLang, history]);

  const toggleSaveHistoryItem = (id) => {
    setHistory((prevHistory) =>
      prevHistory.map((item) =>
        item.id === id ? { ...item, saved: !item.saved } : item,
      ),
    );
  };

  const deleteHistoryItem = (id) => {
    setHistory((prevHistory) => prevHistory.filter((item) => item.id !== id));
  };

  const handleTranslateButtonClick = () => {
    // this button is primarily for "saving to history"
    if (inputText.trim() && outputText.trim()) {
      // ensure there's something to save
      handleAddToHistory();
    }
  };

  const LanguageButton = ({ lang, onClick, type, isActive }) => (
    <button
      onClick={onClick}
      disabled={dictionaryLoading}
      className={`
      px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2
      shadow-md
      ${
        isActive
          ? "bg-amber-600 text-white shadow-lg hover:bg-amber-700"
          : "bg-white/70 text-amber-900 hover:bg-amber-200/80"
      }
      ${dictionaryLoading ? "opacity-50 cursor-not-allowed" : ""}
    `}
    >
      {lang.name}
    </button>
  );

  if (dictionaryLoading) {
    return (
      <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-x-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/indigenous-bg.jpg')",
            filter: "brightness(0.7) blur(0.5px)",
          }}
        />
        {/* Amber radial gradient overlay */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-200/60 via-amber-300/40 to-amber-600/30" />
        {/* Subtle vignette */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-amber-900/10" />

        <main className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
          <Loader2 size={48} className="text-amber-500 animate-spin" />
          <p className="mt-4 text-lg text-amber-900">Loading dictionary...</p>
        </main>
      </div>
    );
  }

  if (dictionaryError) {
    return (
      <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-x-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/indigenous-bg.jpg')",
            filter: "brightness(0.7) blur(0.5px)",
          }}
        />
        {/* Amber radial gradient overlay */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-200/60 via-amber-300/40 to-amber-600/30" />
        {/* Subtle vignette */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-amber-900/10" />

        <main className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 text-center">
          <AlertTriangle size={48} className="text-red-500" />
          <p className="mt-4 text-lg text-red-600">Error loading dictionary:</p>
          <p className="mt-2 text-sm text-amber-900 bg-amber-100 p-3 rounded-md">
            {dictionaryError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-amber-600 text-white rounded-full hover:bg-amber-700"
          >
            Try Again
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-x-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/new2.jpg')",
          filter: "brightness(0.7) blur(2px)",
        }}
      />
      {/* Amber radial gradient overlay */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-200/60 via-amber-300/40 to-amber-600/30" />
      {/* Subtle vignette */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-amber-900/10" />

      <main className="relative z-10 w-full max-w-2xl lg:max-w-4xl py-6 sm:py-8 px-2 sm:px-4 font-sans text-gray-900">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-amber-700 drop-shadow">
            JU/'H Multilingual Translator
          </h1>
          <p className="text-xs sm:text-sm text-white">
            English - Ju/&apos;hoansi - Afrikaans
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/40 space-y-2 sm:space-y-0">
          <div>
  <select
    value={sourceLang}
    onChange={e => setSourceLang(e.target.value)}
    className={`
      px-4 py-2 rounded-full border border-amber-300
      bg-white text-amber-900 font-semibold shadow
      focus:outline-none focus:ring-2 focus:ring-amber-400
      transition-all duration-200
      cursor-pointer
      ${dictionaryLoading ? "opacity-50 cursor-not-allowed" : ""}
    `}
    disabled={dictionaryLoading}
    aria-label="Select source language"
    style={{
      appearance: "none",
      WebkitAppearance: "none",
      MozAppearance: "none",
      backgroundPosition: "right 1rem top 50%, right 1.5rem top 50%",
      backgroundSize: "0.65em 0.65em, 0.65em 0.65em",
      backgroundRepeat: "no-repeat",
    }}
  >
    {languages.map(lang => (
      <option key={lang.code} value={lang.code}>
        {lang.name}
      </option>
    ))}
  </select>
</div>

          <button
            onClick={handleSwapLanguages}
            disabled={dictionaryLoading}
            className="p-2 rounded-full hover:bg-amber-200/80 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Swap languages"
          >
            <ArrowRightLeft size={20} className="text-amber-700" />
          </button>

          <div>
  <select
    value={targetLang}
    onChange={e => setTargetLang(e.target.value)}
    className={`
      px-4 py-2 rounded-full border border-amber-300
      bg-white text-amber-900 font-semibold shadow
      focus:outline-none focus:ring-2 focus:ring-amber-400
      transition-all duration-200
      cursor-pointer
      ${dictionaryLoading ? "opacity-50 cursor-not-allowed" : ""}
    `}
    disabled={dictionaryLoading}
    aria-label="Select target language"
    style={{
      appearance: "none",
      WebkitAppearance: "none",
      MozAppearance: "none",
      backgroundPosition: "right 1rem top 50%, right 1.5rem top 50%",
      backgroundSize: "0.65em 0.65em, 0.65em 0.65em",
      backgroundRepeat: "no-repeat",
    }}
  >
    {languages.map(lang => (
      <option key={lang.code} value={lang.code}>
        {lang.name}
      </option>
    ))}
  </select>
</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
  <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-amber-200/40 p-4 flex flex-col">
    {/* input div */}
    <textarea
      value={inputText}
      onChange={handleInputChange}
      placeholder={
        mode === "words"
          ? isMapReady
            ? `Enter text in ${languages.find((l) => l.code === sourceLang)?.name || "selected language"}...`
            : "Dictionary loading..."
          : `Enter text in ${languages.find((l) => l.code === sourceLang)?.name || "selected language"}...`
      }
      className="w-full flex-grow h-40 sm:h-48 p-3 bg-transparent border border-amber-200/40 rounded-lg resize-none focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none text-sm sm:text-base"
      maxLength={MAX_TEXT_LENGTH}
      aria-label="Input text for translation"
      disabled={mode === "words" ? !isMapReady : false}
    />
    <div className="flex justify-between items-center mt-2 pt-2 border-t border-amber-100">
      <span className="text-xs text-amber-700">
        {inputText.length}/{MAX_TEXT_LENGTH}
      </span>
      <div className="col-span-1 md:col-span-2 flex justify-center items-center my-2">
        <div className="flex items-center bg-amber-100/80 rounded-full shadow px-1">
          <button
            className={`px-4 py-1 rounded-l-full font-medium text-sm transition-colors ${
              mode === "words"
                ? "bg-amber-600 text-white shadow"
                : "bg-transparent text-amber-700"
            }`}
            onClick={() => setMode("words")}
            type="button"
          >
            Words
          </button>
          <button
            className={`px-4 py-1 rounded-r-full font-medium text-sm transition-colors ${
              mode === "sentences"
                ? "bg-amber-600 text-white shadow"
                : "bg-transparent text-amber-700"
            }`}
            onClick={() => setMode("sentences")}
            type="button"
          >
            Sentences
          </button>
        </div>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2">
        {inputText.length > 0 && (
          <button
            onClick={handleClearInput}
            className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-full"
            aria-label="Clear input"
          >
            <X size={18} />
          </button>
        )}
        <button
          onClick={() => handleSpeak(inputText, sourceLang)}
          className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-full"
          aria-label="Speak input text"
        >
          <Volume2 size={18} />
        </button>
        <button
          onClick={() => handleCopyToClipboard(inputText)}
          className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-full"
          aria-label="Copy input text"
        >
          <Copy size={18} />
        </button>
      </div>
    </div>
    {/* Show Translate button only in sentences mode */}
    {mode === "sentences" && (
      <div className="flex justify-center mt-3">
        <button
          onClick={handleSentenceTranslate}
          className="px-4 py-2 bg-amber-600 text-white rounded-full hover:bg-amber-700 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
          disabled={sentenceLoading || !inputText.trim()}
        >
          {sentenceLoading ? "Translating..." : "Translate"}
        </button>
        {sentenceError && (
          <span className="ml-3 text-xs text-red-600">{sentenceError}</span>
        )}
      </div>
    )}
  </div>
  {/* output div */}
  <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-amber-200/40 p-4 flex flex-col">
    <textarea
      value={outputText}
      readOnly
      placeholder="Translation..."
      className="w-full flex-grow h-40 sm:h-48 p-3 bg-amber-50 border border-amber-200/40 rounded-lg resize-none outline-none text-sm sm:text-base"
      aria-label="Translated text"
    />
    <div className="flex justify-between items-center mt-2 pt-2 border-t border-amber-100">
      <button
        onClick={handleTranslateButtonClick}
        className="px-3 py-1.5 bg-amber-600 text-white rounded-full hover:bg-amber-700 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-50"
        title="Save to history"
        disabled={
          !inputText.trim() ||
          !outputText.trim() ||
          (mode === "words" && !isMapReady)
        }
      >
        Save
      </button>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <button
          onClick={() => handleSpeak(outputText, targetLang)}
          className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-full"
          aria-label="Speak translated text"
        >
          <Volume2 size={18} />
        </button>
        <button
          onClick={() => handleCopyToClipboard(outputText)}
          className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-full"
          aria-label="Copy translated text"
        >
          <Copy size={18} />
        </button>
      </div>
    </div>
  </div>
</div>

        {/* hiistory stuff */}
        {history.length > 0 && (
          <div className="mt-8 sm:mt-10">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-amber-900">
              Translation History
            </h2>
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 sm:p-4 rounded-lg shadow-md transition-all ${item.saved ? "bg-amber-50 border-l-4 border-amber-600" : "bg-white/80"}`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <span className="text-xs font-medium text-amber-700">
                        {languages.find((l) => l.code === item.from)?.name} →{" "}
                        {languages.find((l) => l.code === item.to)?.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <button
                        onClick={() => toggleSaveHistoryItem(item.id)}
                        className={`p-1 rounded-full hover:bg-amber-100 ${item.saved ? "text-amber-600" : "text-amber-400"}`}
                        aria-label={
                          item.saved ? "Unsave translation" : "Save translation"
                        }
                      >
                        <Star
                          size={16}
                          fill={item.saved ? "currentColor" : "none"}
                        />
                      </button>
                      <button
                        onClick={() => deleteHistoryItem(item.id)}
                        className="p-1 rounded-full text-amber-400 hover:text-red-500 hover:bg-amber-100"
                        aria-label="Delete translation"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-900 mb-1 break-words">
                    <strong>Original:</strong> {item.original}
                  </p>
                  <p className="text-xs sm:text-sm text-amber-700 break-words">
                    <strong>Translated:</strong> {item.translated}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 text-center">
          <div className="inline-block bg-amber-100/50 text-amber-900 rounded-lg px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-sm">
            "Every Ju/'hoansi word saved is a piece of culture shared with the
            world."{" "}
          </div>
        </div>
      </main>
    </div>
  );
}
