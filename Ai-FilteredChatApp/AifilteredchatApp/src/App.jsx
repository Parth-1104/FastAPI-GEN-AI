import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'; // Removed signInWithCustomToken as it's not needed for anonymous auth
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

// --- START: CONFIGURATION FOR LOCAL DEVELOPMENT ---
// IMPORTANT: Replace these with your actual Firebase project configuration
// You obtained this from your Firebase Console in Step 3.

const firebaseConfig = {
     apiKey: "AIzaSyChpsl6JILY1uyaC9gFRHSsIcDppixu-tU",
     authDomain: "edtechchatapp.firebaseapp.com",
     projectId: "edtechchatapp",
     storageBucket: "edtechchatapp.firebasestorage.app",
     messagingSenderId: "40405114302",
     appId: "1:40405114302:web:bed8eb10e97f11bd4c6def",
     measurementId: "G-1212GXZDYE"
   };

// IMPORTANT: Replace this with your actual Google Gemini API Key
// You obtained this from Google AI Studio in Step 3.
const GEMINI_API_KEY = "AIzaSyC5SRkt1aEwH95h1Qn8tuBB4hXKyRpjL4A"; // <--- REPLACE THIS
// --- END: CONFIGURATION FOR LOCAL DEVELOPMENT ---

// Firebase collection path for chat messages
// Changed to a simpler path for local development, not tied to Canvas's appId structure.
const CHAT_COLLECTION_PATH = `class_questions`;

export default function App() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [classContext, setClassContext] = useState('Select the Subject or Topic for better results');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize Firebase and handle authentication
  useEffect(() => {
    try {
      // Initialize Firebase app with your provided configuration.
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);
      setDb(firestore);
      setAuth(firebaseAuth);

      // Set up an authentication state listener.
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          // If a user is logged in (e.g., anonymously), set their UID.
          setUserId(user.uid);
          setIsAuthReady(true);
        } else {
          // If no user, sign in anonymously.
          // In a real app, you might offer email/password, Google Sign-In, etc.
          try {
            await signInAnonymously(firebaseAuth);
          } catch (error) {
            console.error("Firebase anonymous authentication failed:", error);
            // Fallback: If auth fails, generate a random ID.
            setUserId(crypto.randomUUID());
            setIsAuthReady(true);
          }
        }
      });

      // Clean up the authentication listener when the component unmounts.
      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
      // Fallback: If Firebase initialization fails, generate a random ID.
      setUserId(crypto.randomUUID());
      setIsAuthReady(true);
    }
  }, []); // Empty dependency array ensures this runs only once on mount.

  // Listen for real-time updates from Firestore
  useEffect(() => {
    if (db && isAuthReady) {
      // Create a query to fetch messages from the specified collection, ordered by timestamp.
      const q = query(collection(db, CHAT_COLLECTION_PATH), orderBy('timestamp'));

      // Subscribe to real-time updates using onSnapshot.
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Filter messages to only display those explicitly marked for display by the AI.
        setMessages(fetchedMessages.filter(msg => msg.display));
      }, (error) => {
        console.error("Error fetching messages:", error);
      });

      // Clean up the Firestore listener when the component unmounts or dependencies change.
      return () => unsubscribe();
    }
  }, [db, isAuthReady]); // Dependencies ensure this effect re-runs if db or auth state changes.

  // Scroll to the bottom of the chat when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]); // Re-run whenever the messages array updates.

  // Function to handle sending a new message
  const handleSendMessage = async () => {
    // Prevent sending if message is empty, user ID is not available, or Firestore is not initialized.
    if (!newMessage.trim() || !userId || !db) {
      return;
    }

    setIsLoadingAI(true); // Indicate that AI processing is in progress.
    let isQuestion = false;
    let displayMessage = false;

    try {
      // Construct the prompt for the Gemini AI to determine if the message is a relevant question.
      const prompt = `Given the class topic: "${classContext}", is the following text a question anyhow related to this topic make sure the text dont contain any abusive language and if any connection of the text to the field of education importantly do not include any sexual comments ? Answer only "YES" or "NO". Do not add any other text.
      Text: "${newMessage}"`;

      const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
      const payload = { contents: chatHistory };
      // Use your manually provided GEMINI_API_KEY for local development.
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

      // Make the API call to Gemini.
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      // Parse the AI's response to determine if it's a relevant question.
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const aiResponseText = result.candidates[0].content.parts[0].text.trim().toUpperCase();
        if (aiResponseText === 'YES') {
          isQuestion = true;
          displayMessage = true; // Only display if the AI confirms it's a relevant question.
        }
      } else {
        console.warn("AI response structure unexpected:", result);
        // Fallback: If AI response is unexpected, do not display the message to be safe.
        displayMessage = false;
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      // Fallback: If AI API call fails, do not display the message.
      displayMessage = false;
    } finally {
      setIsLoadingAI(false); // End AI loading state.
    }

    try {
      // Add the message to Firestore, including the AI's determination for display.
      await addDoc(collection(db, CHAT_COLLECTION_PATH), {
        text: newMessage,
        senderId: userId,
        timestamp: serverTimestamp(), // Use serverTimestamp for consistent time across clients.
        isQuestion: isQuestion,
        display: displayMessage, // This flag controls whether the message appears in the chat.
        classContextUsed: classContext // Store the context used for filtering for debugging/analysis.
      });
      setNewMessage(''); // Clear the input field after sending.
    } catch (error) { 
      console.error("Error sending message to Firestore:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-50 to-white flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl flex flex-col h-[85vh] border border-blue-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-600 text-white py-4 px-6 text-xl font-semibold tracking-wide">
  🎓 Stimulated Live Chat 
</div>

<div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 px-6 text-sm font-medium">
  ⚠️ Note: This AI doesn’t answer questions—it filters out irrelevant messages so teachers can focus on real doubts during live classes.
</div>

  
        {/* Context Input */}
        <div className="bg-blue-50 px-6 py-3 border-b border-blue-200">
          <label className="block text-blue-800 font-medium mb-1">
            Class Topic:
          </label>
          <select
  className="w-full p-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
  value={classContext}
  onChange={(e) => setClassContext(e.target.value)}
>
  <option disabled value="Select the Subject or Topic for better results">Select your class or exam</option>
  <option value="Class 11">Class 11</option>
  <option value="Class 12">Class 12</option>
  <option value="Engineering">Engineering</option>
  <option value="Medical (NEET)">Medical (NEET)</option>
  <option value="Engineering JEE">JEE</option>
  <option value="IAS">IAS</option>
  <option value="Banking">Banking</option>
  <option value="SSC">SSC</option>
  <option value="CA/CS">CA/CS</option>
  <option value="complete coding field Coding Bootcamp">Coding Bootcamp</option>
  <option value="Other">Other</option>
</select>

        </div>
  
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">No messages yet. Be the first to ask!</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-4 p-3 rounded-lg max-w-[75%] text-sm shadow-md relative
                  ${msg.senderId === userId ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-200 text-gray-800'}
                `}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <div className="text-xs opacity-70 mt-1 text-right">
                  {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleString() : 'Sending...'}
                </div>
                <div className="absolute top-0 left-0 bg-white px-2 py-0.5 text-xs rounded-br-lg rounded-tl-lg text-gray-600 font-semibold">
                  {msg.senderId === userId ? "You" : "Student"}
                </div>
              </div>
            ))
          )}
          {isLoadingAI && (
            <div className="text-sm text-gray-500 mt-2 animate-pulse text-center">
              ⏳ Filtering with AI...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
  
        {/* Message Input */}
        <div className="bg-white p-4 border-t border-gray-200 flex items-center space-x-2">
          <input
            className="flex-1 p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoadingAI && handleSendMessage()}
            placeholder="Type a question..."
            autoFocus
            disabled={!isAuthReady}
          />
          <button
            onClick={handleSendMessage}
            disabled={!isAuthReady || isLoadingAI}
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-all duration-200
              ${!isAuthReady || isLoadingAI
                ? 'bg-blue-300 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
          >
            {isLoadingAI ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
  
}
