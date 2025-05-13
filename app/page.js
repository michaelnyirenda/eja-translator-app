"use client";

import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import { ArrowRightLeft, Copy, Star, Trash2, Volume2, X } from 'lucide-react';

// sample dictionary based on excel

const dictionary = [
  { id: "1", english: "elephant", ju_hoansi: "Ιχό", afrikaans: "olifant" },
  { id: "2", english: "lion", ju_hoansi: "nihal", afrikaans: "leeu" },
  { id: "3", english: "bird", ju_hoansi: "tzàmà", afrikaans: "voël" },
  { id: "14", english: "star", ju_hoansi: "‡uhnsi", afrikaans: "sterre" },
  { id: "16", english: "cry", ju_hoansi: "tjim", afrikaans: "huil" },
  { id: "17", english: "laugh", ju_hoansi: "tshi", afrikaans: "lag" },
  { id: "21", english: "jump", ju_hoansi: "khu", afrikaans: "spring" },
  { id: "22", english: "night", ju_hoansi: "glu", afrikaans: "nag" }, // Note: 'glu' also means 'water' later
  { id: "23", english: "rain", ju_hoansi: "gla", afrikaans: "reën" },
  { id: "29", english: "moon", ju_hoansi: "nlui", afrikaans: "maan" },
  { id: "30", english: "sit", ju_hoansi: "g!hoo", afrikaans: "sit" },
  { id: "56", english: "father", ju_hoansi: "ba", afrikaans: "pa" },
  { id: "114", english: "mother", ju_hoansi: "aia", afrikaans: "ma" },
  { id: "150", english: "water", ju_hoansi: "glu", afrikaans: "water" },
  { id: "154", english: "fire", ju_hoansi: "da'a", afrikaans: "vuur" },
  { id: "172", english: "house", ju_hoansi: "tjù", afrikaans: "huis" },
  { id: "149", english: "dog", ju_hoansi: "g‡huin", afrikaans: "hond" },
  { id: "72", english: "arrow", ju_hoansi: "tchi", afrikaans: "pyl" },
  { id: "73", english: "bow", ju_hoansi: "nlaoh", afrikaans: "boog" },
  { id: "95", english: "food", ju_hoansi: "msi", afrikaans: "kos" },
];

// Preprocess dictionary for faster lookups
const translationMap = {};
dictionary.forEach(entry => {
  const eng = entry.english?.toLowerCase();
  const juh = entry.ju_hoansi?.toLowerCase(); // Ju/'hoansi might have case sensitivity, but for lookup make it consistent
  const afr = entry.afrikaans?.toLowerCase();

  if (eng) {
    if (!translationMap.english) translationMap.english = {};
    translationMap.english[eng] = { ju_hoansi: entry.ju_hoansi, afrikaans: entry.afrikaans };
  }
  if (juh) {
    if (!translationMap.ju_hoansi) translationMap.ju_hoansi = {};
    // Handle potential duplicate keys if Ju/'hoansi words are not unique after toLowerCase()
    translationMap.ju_hoansi[juh] = { english: entry.english, afrikaans: entry.afrikaans, ...translationMap.ju_hoansi[juh] };
  }
  if (afr) {
    if (!translationMap.afrikaans) translationMap.afrikaans = {};
    translationMap.afrikaans[afr] = { english: entry.english, ju_hoansi: entry.ju_hoansi };
  }
});

// Helper function to translate word by word
const translateText = (text, sourceLang, targetLang) => {
  if (!text || !sourceLang || !targetLang || sourceLang === targetLang) {
    return text;
  }
  const words = text.split(/(\s+)/); // Split by spaces, keeping spaces for reconstruction
  const translatedWords = words.map(word => {
    if (word.trim() === '') return word; // Keep spaces
    const lowerWord = word.toLowerCase();
    const sourceDict = translationMap[sourceLang];
    if (sourceDict && sourceDict[lowerWord]) {
      return sourceDict[lowerWord][targetLang] || word; // Return target translation or original word if not found
    }
    return word; // Word not found in dictionary
  });
  return translatedWords.join('');
};


const languages = [
  { code: 'english', name: 'English' },
  { code: 'ju_hoansi', name: 'Ju/’hoansi' },
  { code: 'afrikaans', name: 'Afrikaans' },
];

const MAX_TEXT_LENGTH = 5000;

export default function TranslatorPage() {
  const [sourceLang, setSourceLang] = useState('english');
  const [targetLang, setTargetLang] = useState('ju_hoansi');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [history, setHistory] = useState([]); // [{ id, from, to, original, translated, saved }]
  // const [showSourceDropdown, setShowSourceDropdown] = useState(false); // These states are not used
  // const [showTargetDropdown, setShowTargetDropdown] = useState(false); // These states are not used

  // Perform translation when input text or languages change
  useEffect(() => {
    if (inputText.trim() === '') {
      setOutputText('');
      return;
    }
    const translated = translateText(inputText, sourceLang, targetLang);
    setOutputText(translated);
  }, [inputText, sourceLang, targetLang]);

  const handleSwapLanguages = () => {
    const currentSource = sourceLang;
    const currentTarget = targetLang;
    setSourceLang(currentTarget);
    setTargetLang(currentSource);
    // Optionally swap text as well, only if output text is not empty
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
      alert('Copied to clipboard!'); // Consider using a less intrusive notification
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
    // Basic language mapping for speech synthesis
    // Ju/'hoansi is unlikely to be supported by standard browser TTS engines.
    // This is a placeholder and would need a specialized TTS for Ju/'hoansi.
    let voiceLang = 'en-US'; // Default
    if (langCode === 'afrikaans') voiceLang = 'af-ZA';
    else if (langCode === 'ju_hoansi') {
      alert("Text-to-speech for Ju/'hoansi is not currently supported.");
      return;
    }

    speechSynthesis.cancel(); // Cancel any previous speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    speechSynthesis.speak(utterance);
  };

  const handleAddToHistory = useCallback(() => {
    if (inputText.trim() && outputText.trim()) {
      // Prevent adding duplicate of the most recent entry
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
      setHistory(prevHistory => [newEntry, ...prevHistory.slice(0, 9)]); // Keep last 10
    }
  }, [inputText, outputText, sourceLang, targetLang, history]);

  // Removed the automatic history addition from useEffect to rely on the button
  // useEffect(() => {
  //     if (outputText.trim() && inputText.trim()) {
  //        // Debounce or add a specific action to trigger history add
  //     }
  // }, [outputText, inputText]);


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
      // Translation is already live, this button now primarily adds to history
      handleAddToHistory();
    }
  };


  const LanguageButton = ({ lang, onClick, type, isActive }) => (
    <button
      onClick={onClick}
      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900
                        ${isActive
          ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 focus:ring-blue-500'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-400'
        }`}
    >
      {lang.name}
    </button>
  );


  return (
    <>
              
      <Head>
        <title>Ju/&apos;hoansi Translator</title>
        <meta name="description" content="Translate between English, Ju/'hoansi, and Afrikaans" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
           

      <main className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center py-6 sm:py-8 px-2 sm:px-4 font-sans">
        <div className="w-full max-w-2xl lg:max-w-4xl"> {/* Adjusted max-width for better responsiveness */}
          {/* Header/Logo Area */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">Multilingual Translator</h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">English - Ju/&apos;hoansi - Afrikaans</p>
          </div>

          {/* Language Selection */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-2 sm:space-y-0">
            <div className="flex flex-wrap justify-center sm:justify-start gap-1">
              {languages.map(lang => (
                <LanguageButton key={`source-${lang.code}`} lang={lang} onClick={() => setSourceLang(lang.code)} type="source" isActive={sourceLang === lang.code} />
              ))}
            </div>

            <button
              onClick={handleSwapLanguages}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Translation IO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Input Text Area */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg flex flex-col">
              <textarea
                value={inputText}
                onChange={handleInputChange}
                placeholder={`Enter text in ${languages.find(l => l.code === sourceLang)?.name || 'selected language'}...`}
                className="w-full flex-grow h-40 sm:h-48 p-3 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                maxLength={MAX_TEXT_LENGTH}
                aria-label="Input text for translation"
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

            {/* Output Text Area */}
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
                  className="px-3 py-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  title="Save to history"
                  disabled={!inputText.trim() || !outputText.trim()} // Disable if no text to save
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

          {/* History Section */}
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
