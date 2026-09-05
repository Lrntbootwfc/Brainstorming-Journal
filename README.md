# Gemini Reflection Journal

A secure, user-authenticated personal reflection and journaling web application powered by **Gemini 3.6 Flash** and **Cloud Firestore**. 

The application facilitates multi-turn philosophical, mindfulness, and brainstorming reflections with an empathetic AI partner, providing automatic session synthesis, key takeaways, and action items—all with strict user-isolated persistence in Cloud Firestore.

---

## 🌟 Key Features

1. **Federated Identity & Authentication**: Secure Google Sign-In managed via Firebase Authentication with zero custom password handling.
2. **Multi-Turn Reflection Conversations**: Multi-turn dialogue with Gemini with custom reflection focuses (*Deep Reflection*, *Brainstorm Ideas*, *Socratic Questions*, *Action Steps*).
3. **Resilient Model Fallback Ladder**: Backend automatically cascades through `gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash` with recovery handling for transient status codes (`503`, `429`, `404`, `500`).
4. **Strict Firestore User Isolation**: All journal documents and interactions are stored under `/users/{userId}/interactions/{interactionId}` protected by strict owner-bound security rules.
5. **Session Synthesis & Key Insights**: AI-generated title, executive summary, sentiment analysis, and actionable steps.
6. **Connect the Dots & Idea Evolution**: Interactive neural web mapping semantic and chronological links with typed relationships (`related`, `evolved_from`, `refined_from`, `expands`, `leads_to`, `diverges_from`).
7. **Hierarchical Mind Map**: Multi-tier structural visualization (*Central Thought* ➔ *Major Themes* ➔ *Related Ideas* ➔ *Sub-Ideas*).
8. **Process Flowchart**: Sequential workflow extraction (*Start* ➔ *Action* ➔ *Decision* ➔ *Outcome*) that only activates when workflows genuinely exist in journal entries.
9. **Thought ➔ Action Engine**: Structured task extraction with explainable prerequisite ordering (`orderReason`), deadline tracking, and real-time status toggling.
10. **Past Entries & Search**: Searchable history with date grouping, mood filters, Markdown export, and deletion controls.
11. **Vision Board & Visual Manifestation**: Turn life goals and aesthetic future moments into vivid visual anchor cards powered by Gemini visual synthesis, saved securely in isolated user collections (`/users/{userId}/vision_cards/*`) with direct links to journaling and goal planning.

---

## 🛡️ Architecture & Security Model

```
[ Client Browser (React + Vite) ]
        │  ▲
        │  │ Firebase Auth (Google OAuth)
        ▼  │
[ Google Firebase Auth ] ──> Verified User JWT (uid)
        │
        ├──> [ Cloud Firestore ] (/users/{uid}/interactions/*, /users/{uid}/goals/*, /users/{uid}/vision_cards/*)
        │
        └──> [ Express Backend Proxy ] (/api/gemini/reflect, /api/gemini/generate-vision, /api/gemini/summarize)
                   │
                   ▼
             [ Secret Manager ] -> GEMINI_API_KEY
                   │
                   ▼
             [ Gemini 3.6 Flash API ]
```

---

## 🔒 Firestore Security Rules

Deploy the following owner-bound security rules in `firestore.rules` to enforce strict multi-tenant isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Isolated user-level data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Reflection sessions and chat interactions
      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Personal goals and milestones
      match /goals/{goalId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // User preferences, themes, thread tracking, daily moods, custom folders
      match /settings/{settingId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Vision cards
      match /vision_cards/{cardId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Recursive fallback for any nested subcollections
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🚀 Deployment to Google Cloud Run

### 1. Prerequisites & GCP API Setup

Enable the required Google Cloud APIs:

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  artifactregistry.googleapis.com
```

### 2. Secret Manager Configuration

Create and store the Gemini API key in Secret Manager:

```bash
# Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Add your Gemini API key value
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant Cloud Run default compute service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy to Cloud Run

Deploy the container to Cloud Run with Secret Manager environment injection:

```bash
gcloud run deploy gemini-reflection-journal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000
```

### 4. Challenge Verification & Campaign Labeling

Apply the mandatory challenge verification label to your deployed Cloud Run service:

```bash
gcloud run services update gemini-reflection-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Functional Walkthrough & Test Guide

1. **Authentication Flow**:
   - Navigate to the landing page and click **Sign In with Google**.
   - Verify successful authentication and redirection to the private dashboard showing your name/avatar.
2. **First Reflection Entry**:
   - Type a personal reflection or choose one of the prompt inspirations (e.g. *Perspective & Gratitude*).
   - Click **Send** or press **Enter**.
   - Verify Gemini 3.6 Flash responds with empathetic Socratic reflections.
   - Verify the top status updates to `Synced to Firestore`.
3. **Session Synthesis**:
   - Click **Synthesize Session**.
   - Verify Gemini generates a title, summary, key insights list, sentiment badge, and practical action steps.
4. **Data Isolation & History Verification**:
   - Click **Past Entries** in the top navigation.
   - Verify the session appears in the drawer.
   - Search by keyword or filter by mood pill.
   - Click **Export** to download the reflection as a formatted Markdown file (`.md`).
5. **Vision Board & Manifestation Engine**:
   - Click **Vision Board** in the left dashboard sidebar.
   - In the text field, enter an aspiration (e.g., *"A timber cabin studio overlooking misty autumn mountains"*), or click an inspiration chip.
   - Click **Generate Visual Card** or press **⌘+Enter**.
   - Verify the visual manifestation is synthesized, categorized, and saved to your isolated Firestore collection (`/users/{userId}/vision_cards/*`).
   - Click the card to open the contemplation modal; test **Start Journal Entry from this Vision** or **Link with Goals**.
   - Test the card delete button to verify real-time Firestore removal.
