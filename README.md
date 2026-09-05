# Personal Gemini Journal

An AI-powered personal journal designed to help users **think, reflect, brainstorm, connect ideas, and turn thoughts into meaningful actions**.

Personal Gemini Journal goes beyond traditional journaling by giving users an intelligent space where their thoughts can evolve over time, connect with previous ideas, and become actionable insights.

---

## ✨ What Makes It Different?

Traditional journaling stores what you write.

**Personal Gemini Journal helps you understand what you write.**

It combines journaling, brainstorming, AI conversations, memory, idea evolution, mood awareness, visual thinking, and action planning into one connected experience.

The core idea is:

> **Capture a thought → Explore it with Gemini → Understand it → Connect it with previous thoughts → Evolve it → Turn it into action.**

---

## 🚀 Key Features

### 🧠 Thought Memory — Chat with Your Journal

Users can interact with their previous journal entries through Gemini.

Instead of searching through old entries manually, users can ask questions and explore their own history of thoughts and ideas.

---

### 🔗 Connect the Dots

The application identifies meaningful relationships between different thoughts, journal entries, and ideas.

This helps users discover connections they may not have noticed themselves.

---

### 🌱 Idea Evolution / Brainstorm Tree

Ideas can evolve through multiple stages of thinking.

The Brainstorm Tree provides a visual representation of how an initial thought develops into related ideas, branches, and possible outcomes.

---

### ⚡ Thought → Action

The Action Engine converts thoughts and ideas into actionable tasks.

It can identify potential actions from journal conversations and organize them into a more practical sequence.

---

### 🧩 Intelligent Task Dependencies

Tasks can have relationships and dependencies.

The system can determine logical ordering and suggest which tasks should come first based on their dependencies and context.

---

### 🔄 Continue Where I Left Off

Users can continue previous thinking sessions without starting from scratch.

The application preserves relevant context so an unfinished thought or brainstorming session can be revisited later.

---

### 😊 Mood Detection & Mood Calendar

Gemini analyzes journal conversations to detect emotional context.

Users can view their mood over time through a Mood Calendar and understand how their emotional state changes across different periods.

---

### 📊 Mood + Context Correlation

Mood information can be connected with journal context to help users understand patterns between their thoughts, activities, and reflections.

---

### 🎯 Goals

Users can record and work with personal goals while using the journal as a space for reflection and planning.

---

### 📚 Study

The journal supports learning and study-related entries, allowing users to reflect on their learning progress and thoughts.

---

### 💼 Projects

Users can maintain project-related thoughts, ideas, planning, and reflections within the same thinking environment.

---

### 🗺️ Mind Maps, Concept Maps & Flowcharts

Thoughts can be transformed into visual structures such as:

* Mind Maps
* Concept Maps
* Flowcharts
* Relationship diagrams

This provides an alternative way to understand complex ideas and their relationships.

---

### 🌳 Mind Garden — Living Thought Tree

The Mind Garden provides a visual representation of the user's evolving thought journey.

A living tree represents the development of ideas over time:

* **Roots** represent core ideas
* **Trunk** represents the overall thinking journey
* **Branches** represent evolving thoughts and ideas
* **Leaves** represent current or ongoing thoughts
* **Apples** represent outcomes, results, or breakthroughs

The environment can visually change with different seasons and weather conditions.

---

## 💬 Gemini-Powered Interaction

The application uses Gemini for intelligent, multi-turn conversations.

Users can:

1. Start a journal or brainstorming session
2. Talk with Gemini
3. Explore and refine their thoughts
4. Receive AI-generated insights
5. Generate a summary
6. Save the session
7. Continue the conversation later

---

## 🔐 Security & Privacy

Personal journal data is isolated between users.

The application uses:

* Firebase Authentication
* Google Sign-In
* Cloud Firestore
* Per-user data isolation
* Google Cloud Secret Manager
* Secure server-side Gemini API access
* Firestore Security Rules

Sensitive API credentials are kept outside the client-side application.

---

## 🏗️ Technology Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Backend

* Node.js
* Express
* TypeScript

### AI

* Google Gemini API
* Google AI Studio

### Authentication & Database

* Firebase Authentication
* Cloud Firestore

### Cloud & Security

* Google Cloud Run
* Google Cloud Secret Manager
* Firebase Security Rules

---

## 🔄 Application Flow

```text
Landing Page
     ↓
Login / Sign Up
     ↓
Dashboard
     ↓
Choose Activity
     ↓
Journal / Brainstorm
     ↓
Multi-turn Gemini Conversation
     ↓
AI Processing
     ↓
Summary / Insights
     ↓
Save / Continue / Discard
```

---

## ☁️ Deployment

The application is deployed on **Google Cloud Run**.

To deploy an updated version from the project directory:

```bash
gcloud run deploy personal-gemini-journal --source .
```

The Cloud Run service uses the label:

```text
dev-tutorial=cloud-run-ai-challenge
```

---

## 🔒 Firestore Data Isolation

Firestore Security Rules ensure that authenticated users can access only their own journal data.

User authentication and authorization are handled through Firebase Authentication and Firestore Security Rules.

---

## 🎯 Project Goal

Personal Gemini Journal is designed to make AI-assisted journaling and brainstorming feel like an ongoing conversation with one's own journal.

Rather than becoming a generic productivity or timetable application, the project focuses on **reflection, brainstorming, idea exploration, memory, connections, and turning meaningful thoughts into action**.

---

## 🏆 Challenge

Built for the **AccelerateAIwithCloudRun / Ideathon Challenge**.

The project demonstrates the use of Gemini and Google Cloud services in a deployed, authenticated AI application.
