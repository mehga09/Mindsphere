# MindSphere Demo Script

## 1. Introduction
"MindSphere is a learning recommender system designed to break the doomscrolling cycle by offering bite-sized learning content as an alternative."

## 2. Onboarding Flow
1.  **Register**: Go to `/register`. create a new user (e.g., "Demo User").
2.  **Survey**: You are redirected to the Preference Survey.
3.  **Selection**: Select "Technology" and "Science".
4.  **Submit**: Click "Save & Continue".

## 3. Personalized Feed
1.  **Dashboard**: You land on the Home Dashboard.
2.  **Verification**: Notice the "Welcome back, Demo User" greeting.
3.  **Recommendations**: Observe the cards. They should match "Technology" or "Science" tags (or be popular fallbacks).
4.  **Gamification**: Note the Streak (0) and XP (0) on the right.

## 4. Learning Session (The Core Loop)
1.  **Start**: Click "Start Session" on a "Micro Module" or "Video" card.
2.  **Runner**: You enter the Focus Mode (`/session/:id`).
3.  **Experience**:
    - "Running Session..." indicates active tracking.
    - Timer counts up.
    - (Simulate watching content for > 1 minute).
4.  **End**: Click "End Session".
5.  **Redirect**: You return to the Dashboard.

## 5. Gamification Feedback
1.  **XP Update**: Check the XP bar. It should have increased (10 XP per minute).
2.  **Streak**: If this is the first session of the day, Streak should be 1.

## 6. Technical Highlights (Optional)
- **Offline Sync**: (DevTools -> Application -> IndexedDB) Inspect `events` table to see logged interactions.
- **Performance**: Recommendations are cached in Redis (check server logs for "Redis Connected").
- **Security**: Rate limiting protects the Auth endpoints.
