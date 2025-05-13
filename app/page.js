// app/page.js
"use client"; // Keep this for client-side interactivity

import { useState, useEffect, useCallback } from 'react';
import { ArrowRightLeft, Copy, Star, Trash2, Volume2, X, Loader2, AlertTriangle } from 'lucide-react';

// REMOVED: const dictionary = [ ... ]; // Hardcoded dictionary is removed

// Initialize an empty translationMap
let translationMap = {}; // This will be populated after fetching data

// Helper function to build the translationMap from the fetched dictionary
const buildTranslationMap = (fetchedDictionary) => {
  const newMap = {};
  if (!fetchedDictionary || fetchedDictionary.length === 0) {
    console.warn("Fetched dictionary is empty or undefined. Translation map will be empty.");
    return newMap; // Return an empty map if no dictionary
  }

  fetchedDictionary.forEach(entry => {
    // Use the keys from your API response (id, english, ju_hoansi, afrikaans)
    const eng = entry.english?.toLowerCase();
    const juh = entry.ju_hoansi?.toLowerCase();
    const afr = entry.afrikaans?.toLowerCase();

    if (eng) {
      if (!newMap.english) newMap.english = {};
      newMap.english[eng] = { ju_hoansi: entry.ju_hoansi, afrikaans: entry.afrikaans };
    }
    if (juh) {
      if (!newMap.ju_hoansi) newMap.ju_hoansi = {};
      newMap.ju_hoansi[juh] = { english: entry.english, afrikaans: entry.afrikaans, ...newMap.ju_hoansi[juh] };
    }
    if (afr) {
      if (!newMap.afrikaans) newMap.afrikaans = {};
      newMap.afrikaans[afr] = { english: entry.english, ju_hoansi: entry.ju_hoansi };
    }
  });
  return newMap;
};


// Helper function to translate word by word (uses the global translationMap)
const translateText = (text, sourceLang, targetLang) => {
  if (!text || !sourceLang || !targetLang || sourceLang === targetLang) {
    return text;
  }
  // Ensure translationMap is populated
  if (Object.keys(translationMap).length === 0 || !translationMap[sourceLang]) {
    console.warn(`Translation map for source language "${sourceLang}" is not ready or empty.`);
    // Optionally, you could return a message like "Dictionary loading..." or just the original text
    return text; // Or handle as "dictionary not ready"
  }

  const words = text.split(/(\s+)/); // Split by spaces, keeping spaces for reconstruction
  const translatedWords = words.map(word => {
    if (word.trim() === '') return word; // Keep spaces
    const lowerWord = word.toLowerCase();
    const sourceDict = translationMap[sourceLang];

    if (sourceDict && sourceDict[lowerWord] && sourceDict[lowerWord][targetLang]) {
      return sourceDict[lowerWord][targetLang];
    } else if (sourceDict && sourceDict[lowerWord] && targetLang === sourceLang) { // If target is same as source
      return word;
    } else if (sourceDict && sourceDict[lowerWord]) { // Word found, but no translation for targetLang
      return word + ` (*no ${targetLang} translation)`;
    }
    return word; // Word not found in dictionary
  });
  return translatedWords.join('');
};


const languages = [
  { code: 'english', name: 'English' },
  { code: 'ju_hoansi', name: 'Ju/hoansi' },
  { code: 'afrikaans', name: 'Afrikaans' },
];

const MAX_TEXT_LENGTH = 5000;

export default function TranslatorPage() {
  const [sourceLang, setSourceLang] = useState('english');
  const [targetLang, setTargetLang] = useState('ju_hoansi');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [history, setHistory] = useState([]);

  // NEW: State for dictionary loading and errors
  const [dictionaryLoading, setDictionaryLoading] = useState(true);
  const [dictionaryError, setDictionaryError] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);


  // NEW: Fetch dictionary from API and build translationMap
  useEffect(() => {
    const fetchDictionary = async () => {
      setDictionaryLoading(true);
      setDictionaryError(null);
      setIsMapReady(false);
      try {
        const response = await fetch('/api/words');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.words && Array.isArray(data.words)) {
          translationMap = buildTranslationMap(data.words); // Update global translationMap
          setIsMapReady(true); // Signal that the map is ready
          console.log("Translation map built successfully:", translationMap);
        } else {
          throw new Error("Fetched data is not in the expected format (missing 'words' array).");
        }
      } catch (error) {
        console.error("Failed to fetch or build dictionary:", error);
        setDictionaryError(error.message);
      } finally {
        setDictionaryLoading(false);
      }
    };

    fetchDictionary();
  }, []); // Empty dependency array means this runs once on component mount

  // Perform translation when input text, languages, or map readiness change
  useEffect(() => {
    if (!isMapReady || inputText.trim() === '') {
      setOutputText('');
      return;
    }
    const translated = translateText(inputText, sourceLang, targetLang);
    setOutputText(translated);
  }, [inputText, sourceLang, targetLang, isMapReady]); // Add isMapReady dependency

  const handleSwapLanguages = () => {
    const currentSource = sourceLang;
    const currentTarget = targetLang;
    setSourceLang(currentTarget);
    setTargetLang(currentSource);
    if (outputText.trim() !== '') {
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
    setInputText('');
    setOutputText('');
  };

  const handleCopyToClipboard = async (text) => {
    if (!text || !navigator.clipboard) {
      alert('Clipboard API not available.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy text.');
    }
  };

  const handleSpeak = (text, langCode) => {
    if (!text || !window.speechSynthesis) {
      alert("Your browser doesn't support text-to-speech.");
      return;
    }
    let voiceLang = 'en-US';
    if (langCode === 'afrikaans') voiceLang = 'af-ZA';
    else if (langCode === 'ju_hoansi') {
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
      if (history.length > 0 &&
        history[0].original === inputText &&
        history[0].translated === outputText &&
        history[0].from === sourceLang &&
        history[0].to === targetLang) {
        return;
      }
      const newEntry = {
        id: Date.now(),
        from: sourceLang,
        to: targetLang,
        original: inputText,
        translated: outputText,
        saved: false,
      };
      setHistory(prevHistory => [newEntry, ...prevHistory.slice(0, 9)]);
    }
  }, [inputText, outputText, sourceLang, targetLang, history]);

  const toggleSaveHistoryItem = (id) => {
    setHistory(prevHistory =>
      prevHistory.map(item =>
        item.id === id ? { ...item, saved: !item.saved } : item
      )
    );
  };

  const deleteHistoryItem = (id) => {
    setHistory(prevHistory => prevHistory.filter(item => item.id !== id));
  };

  const handleTranslateButtonClick = () => {
    if (inputText.trim()) {
      handleAddToHistory();
    }
  };

  const LanguageButton = ({ lang, onClick, type, isActive }) => (
    <button
      onClick={onClick}
      disabled={dictionaryLoading} // Disable while dictionary is loading
      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900
                        ${isActive
          ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 focus:ring-blue-500'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-400'
        }
                        ${dictionaryLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
    >
      {lang.name}
    </button>
  );

  // NEW: UI for loading and error states
  if (dictionaryLoading) {
    return (
      <main className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <Loader2 size={48} className="text-blue-500 animate-spin" />
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">Loading dictionary...</p>
      </main>
    );
  }

  if (dictionaryError) {
    return (
      <main className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangle size={48} className="text-red-500" />
        <p className="mt-4 text-lg text-red-600 dark:text-red-400">Error loading dictionary:</p>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-red-100 dark:bg-red-900 p-3 rounded-md">{dictionaryError}</p>
        <button
          onClick={() => window.location.reload()} // Simple reload to retry
          className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
        >
          Try Again
        </button>
      </main>
    );
  }

  return (
    <>
      {/* Metadata is typically handled in app/layout.js or via exported metadata object if this page wasn't "use client" */}
      <main className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center py-6 sm:py-8 px-2 sm:px-4 font-sans">
        <div className="w-full max-w-2xl lg:max-w-4xl">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">Multilingual Translator</h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">English - Ju/&apos;hoansi - Afrikaans</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between mb-4 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-2 sm:space-y-0">
            <div className="flex flex-wrap justify-center sm:justify-start gap-1">
              {languages.map(lang => (
                <LanguageButton key={`source-${lang.code}`} lang={lang} onClick={() => setSourceLang(lang.code)} type="source" isActive={sourceLang === lang.code} />
              ))}
            </div>

            <button
              onClick={handleSwapLanguages}
              disabled={dictionaryLoading}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Swap languages"
            >
              <ArrowRightLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>

            <div className="flex flex-wrap justify-center sm:justify-end gap-1">
              {languages.map(lang => (
                <LanguageButton key={`target-${lang.code}`} lang={lang} onClick={() => setTargetLang(lang.code)} type="target" isActive={targetLang === lang.code} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg flex flex-col">
              <textarea
                value={inputText}
                onChange={handleInputChange}
                placeholder={isMapReady ? `Enter text in ${languages.find(l => l.code === sourceLang)?.name || 'selected language'}...` : "Dictionary loading..."}
                className="w-full flex-grow h-40 sm:h-48 p-3 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                maxLength={MAX_TEXT_LENGTH}
                aria-label="Input text for translation"
                disabled={!isMapReady} // Disable if map isn't ready
              />
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">{inputText.length}/{MAX_TEXT_LENGTH}</span>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  {inputText.length > 0 && (
                    <button onClick={handleClearInput} className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" aria-label="Clear input">
                      <X size={18} />
                    </button>
                  )}
                  <button onClick={() => handleSpeak(inputText, sourceLang)} className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" aria-label="Speak input text">
                    <Volume2 size={18} />
                  </button>
                  <button onClick={() => handleCopyToClipboard(inputText)} className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" aria-label="Copy input text">
                    <Copy size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg flex flex-col">
              <textarea
                value={outputText}
                readOnly
                placeholder="Translation..."
                className="w-full flex-grow h-40 sm:h-48 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg resize-none outline-none text-sm sm:text-base"
                aria-label="Translated text"
              />
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleTranslateButtonClick}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                  title="Save to history"
                  disabled={!inputText.trim() || !outputText.trim() || !isMapReady}
                >
                  Save
                </button>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button onClick={() => handleSpeak(outputText, targetLang)} className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" aria-label="Speak translated text">
                    <Volume2 size={18} />
                  </button>
                  <button onClick={() => handleCopyToClipboard(outputText)} className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" aria-label="Copy translated text">
                    <Copy size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {history.length > 0 && (
            <div className="mt-8 sm:mt-10">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-700 dark:text-gray-300">Translation History</h2>
              <div className="space-y-3">
                {history.map(item => (
                  <div key={item.id} className={`p-3 sm:p-4 rounded-lg shadow-md transition-all ${item.saved ? 'bg-blue-50 dark:bg-blue-900/50 border-l-4 border-blue-500' : 'bg-white dark:bg-gray-800'}`}>
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {languages.find(l => l.code === item.from)?.name} → {languages.find(l => l.code === item.to)?.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <button onClick={() => toggleSaveHistoryItem(item.id)} className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ${item.saved ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`} aria-label={item.saved ? "Unsave translation" : "Save translation"}>
                          <Star size={16} fill={item.saved ? 'currentColor' : 'none'} />
                        </button>
                        <button onClick={() => deleteHistoryItem(item.id)} className="p-1 rounded-full text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Delete translation">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-1 break-words"><strong>Original:</strong> {item.original}</p>
                    <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 break-words"><strong>Translated:</strong> {item.translated}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
